// IndexedDB Offline Storage Layer for StitchFlow Garments POS & ERP
import {
  Product,
  ProductVariant,
  Category,
  Brand,
  GarmentSize,
  GarmentColor,
  Customer,
  Supplier,
  Employee,
  Sale,
  SalesReturn,
  Purchase,
  Expense,
  ExpenseCategory,
  StockMovement,
  HeldSale,
  SyncQueueItem,
  SyncConflict,
  AuditLog,
  ShopSettings
} from '../types';

const DB_NAME = 'StitchFlow_Garments_LocalDB';
const DB_VERSION = 1;

export class LocalIndexedDB {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        const stores = [
          { name: 'products', keyPath: 'id' },
          { name: 'product_variants', keyPath: 'id' },
          { name: 'categories', keyPath: 'id' },
          { name: 'brands', keyPath: 'id' },
          { name: 'sizes', keyPath: 'id' },
          { name: 'colors', keyPath: 'id' },
          { name: 'customers', keyPath: 'id' },
          { name: 'suppliers', keyPath: 'id' },
          { name: 'employees', keyPath: 'id' },
          { name: 'sales', keyPath: 'id' },
          { name: 'sales_returns', keyPath: 'id' },
          { name: 'purchases', keyPath: 'id' },
          { name: 'expenses', keyPath: 'id' },
          { name: 'expense_categories', keyPath: 'id' },
          { name: 'stock_movements', keyPath: 'id' },
          { name: 'held_sales', keyPath: 'id' },
          { name: 'sync_queue', keyPath: 'id' },
          { name: 'sync_conflicts', keyPath: 'id' },
          { name: 'audit_logs', keyPath: 'id' },
          { name: 'settings', keyPath: 'key' }
        ];

        stores.forEach((storeInfo) => {
          if (!db.objectStoreNames.contains(storeInfo.name)) {
            const store = db.createObjectStore(storeInfo.name, { keyPath: storeInfo.keyPath });
            if (storeInfo.name === 'product_variants') {
              store.createIndex('barcode', 'barcode', { unique: false });
              store.createIndex('sku', 'sku', { unique: false });
              store.createIndex('productId', 'productId', { unique: false });
            }
            if (storeInfo.name === 'sales') {
              store.createIndex('invoiceNumber', 'invoiceNumber', { unique: false });
              store.createIndex('clientTxId', 'clientTxId', { unique: true });
            }
            if (storeInfo.name === 'sync_queue') {
              store.createIndex('status', 'status', { unique: false });
            }
          }
        });
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.initPromise;
  }

  // Generic Get All
  async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(req.error);
    });
  }

  // Generic Get By ID
  async getById<T>(storeName: string, id: string): Promise<T | undefined> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
  }

  // Generic Put (Insert or Replace)
  async put<T>(storeName: string, item: T): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // Generic Batch Put
  async putBatch<T>(storeName: string, items: T[]): Promise<void> {
    if (items.length === 0) return;
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      items.forEach((item) => store.put(item));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // Generic Delete
  async delete(storeName: string, id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // Clear a store
  async clear(storeName: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}

export const localDB = new LocalIndexedDB();
