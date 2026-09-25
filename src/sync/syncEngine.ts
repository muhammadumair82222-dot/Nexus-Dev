// Bi-directional Synchronization Engine & Connectivity State
import { localDB } from '../db/indexedDb';
import { SyncQueueItem, SyncConflict, Sale, Purchase, SalesReturn, Expense, ShopSettings } from '../types';

export type SyncStatusState = 'ONLINE' | 'OFFLINE' | 'SYNCING';

type SyncListener = (state: {
  status: SyncStatusState;
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
  conflictsCount: number;
  simulatedOffline: boolean;
}) => void;

class SyncEngine {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSyncing: boolean = false;
  private simulatedOffline: boolean = false;
  private pendingCount: number = 0;
  private conflictsCount: number = 0;
  private lastSyncTime: string | null = null;
  private listeners: Set<SyncListener> = new Set();
  private autoSyncInterval: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
      this.init();
    }
  }

  private async init() {
    await this.updateCounts();
    this.startHeartbeat();
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    this.emit();
    return () => this.listeners.delete(listener);
  }

  private emit() {
    const effectiveOnline = this.isOnline && !this.simulatedOffline;
    const status: SyncStatusState = this.isSyncing ? 'SYNCING' : effectiveOnline ? 'ONLINE' : 'OFFLINE';

    this.listeners.forEach((listener) => {
      listener({
        status,
        isOnline: effectiveOnline,
        isSyncing: this.isSyncing,
        pendingCount: this.pendingCount,
        lastSyncTime: this.lastSyncTime,
        conflictsCount: this.conflictsCount,
        simulatedOffline: this.simulatedOffline
      });
    });
  }

  public async updateCounts() {
    try {
      const queue = await localDB.getAll<SyncQueueItem>('sync_queue');
      this.pendingCount = queue.filter((q) => q.status === 'PENDING').length;
      const conflicts = await localDB.getAll<SyncConflict>('sync_conflicts');
      this.conflictsCount = conflicts.filter((c) => !c.resolved).length;
    } catch (e) {
      console.error('Error updating queue counts:', e);
    }
    this.emit();
  }

  public toggleSimulatedOffline(): boolean {
    this.simulatedOffline = !this.simulatedOffline;
    this.emit();
    if (!this.simulatedOffline) {
      this.triggerSync();
    }
    return this.simulatedOffline;
  }

  private async handleNetworkChange(online: boolean) {
    this.isOnline = online;
    this.emit();
    if (online && !this.simulatedOffline) {
      await this.triggerSync();
    }
  }

  private startHeartbeat() {
    // Check server ping every 12 seconds
    setInterval(async () => {
      if (this.simulatedOffline) return;
      try {
        const res = await fetch('/api/health', { method: 'GET', headers: { 'Cache-Control': 'no-cache' } });
        if (res.ok) {
          if (!this.isOnline) {
            this.isOnline = true;
            this.emit();
            this.triggerSync();
          }
        } else {
          this.isOnline = false;
          this.emit();
        }
      } catch {
        this.isOnline = false;
        this.emit();
      }
    }, 12000);
  }

  // Queue a transaction locally
  public async queueTransaction(
    entityType: 'SALE' | 'PURCHASE' | 'RETURN' | 'EXPENSE',
    action: 'CREATE' | 'UPDATE',
    payload: any,
    clientTxId: string
  ): Promise<void> {
    const queueItem: SyncQueueItem = {
      id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      clientTxId,
      entityType,
      action,
      payload,
      status: 'PENDING',
      attempts: 0,
      createdAt: new Date().toISOString()
    };

    await localDB.put('sync_queue', queueItem);
    await this.updateCounts();

    // If online, trigger immediate sync
    if (this.isOnline && !this.simulatedOffline) {
      this.triggerSync();
    }
  }

  // Trigger sync process
  public async triggerSync(): Promise<{ success: boolean; syncedCount: number; errors: string[] }> {
    if (this.isSyncing) return { success: false, syncedCount: 0, errors: ['Sync already in progress'] };
    if (!this.isOnline || this.simulatedOffline) {
      return { success: false, syncedCount: 0, errors: ['Device is offline'] };
    }

    this.isSyncing = true;
    this.emit();

    const errors: string[] = [];
    let syncedCount = 0;

    try {
      const queue = await localDB.getAll<SyncQueueItem>('sync_queue');
      const pendingItems = queue.filter((item) => item.status === 'PENDING');

      if (pendingItems.length > 0) {
        const res = await fetch('/api/sync/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batch: pendingItems })
        });

        if (res.ok) {
          const result = await res.json();
          const { syncedIds, conflicts } = result;

          for (const syncedId of syncedIds || []) {
            const item = pendingItems.find((p) => p.id === syncedId);
            if (item) {
              item.status = 'SYNCED';
              item.syncedAt = new Date().toISOString();
              await localDB.put('sync_queue', item);
              syncedCount++;
            }
          }

          for (const conflict of conflicts || []) {
            await localDB.put('sync_conflicts', conflict);
          }
        } else {
          errors.push(`Server returned status ${res.status}`);
        }
      }

      // Also pull latest server updates to update local DB
      await this.pullServerState();

      this.lastSyncTime = new Date().toLocaleTimeString();
    } catch (err: any) {
      errors.push(err.message || 'Sync failed');
    } finally {
      this.isSyncing = false;
      await this.updateCounts();
      this.emit();
    }

    return {
      success: errors.length === 0,
      syncedCount,
      errors
    };
  }

  // Pull authoritative latest state from server
  public async pullServerState(): Promise<void> {
    try {
      const res = await fetch('/api/bootstrap');
      if (res.ok) {
        const serverData = await res.json();
        if (serverData.products) await localDB.putBatch('products', serverData.products);
        if (serverData.variants) await localDB.putBatch('product_variants', serverData.variants);
        if (serverData.categories) await localDB.putBatch('categories', serverData.categories);
        if (serverData.brands) await localDB.putBatch('brands', serverData.brands);
        if (serverData.sizes) await localDB.putBatch('sizes', serverData.sizes);
        if (serverData.colors) await localDB.putBatch('colors', serverData.colors);
        if (serverData.customers) await localDB.putBatch('customers', serverData.customers);
        if (serverData.suppliers) await localDB.putBatch('suppliers', serverData.suppliers);
        if (serverData.sales) await localDB.putBatch('sales', serverData.sales);
        if (serverData.purchases) await localDB.putBatch('purchases', serverData.purchases);
        if (serverData.expenses) await localDB.putBatch('expenses', serverData.expenses);
        if (serverData.expenseCategories) await localDB.putBatch('expense_categories', serverData.expenseCategories);
        if (serverData.employees) await localDB.putBatch('employees', serverData.employees);
        if (serverData.settings) await localDB.put('settings', { key: 'main', ...serverData.settings });
      }
    } catch (err) {
      console.warn('Could not pull server state (offline):', err);
    }
  }
}

export const syncEngine = new SyncEngine();
