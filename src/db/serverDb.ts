// Server-side Persistent Relational Data Store
import fs from 'fs';
import path from 'path';
import {
  User,
  Category,
  Brand,
  GarmentSize,
  GarmentColor,
  Product,
  ProductVariant,
  StockMovement,
  Customer,
  Supplier,
  Employee,
  Sale,
  SalesReturn,
  Purchase,
  Expense,
  ExpenseCategory,
  AuditLog,
  SyncQueueItem,
  SyncConflict,
  ShopSettings
} from '../types';
import {
  SEED_CATEGORIES,
  SEED_BRANDS,
  SEED_SIZES,
  SEED_COLORS,
  SEED_PRODUCTS,
  SEED_VARIANTS,
  SEED_CUSTOMERS,
  SEED_SUPPLIERS,
  SEED_EXPENSE_CATEGORIES,
  SEED_EMPLOYEES,
  SEED_USERS,
  DEFAULT_SETTINGS
} from './initialSeed';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'stitchflow_store.json');

export interface ServerDatabaseState {
  users: User[];
  categories: Category[];
  brands: Brand[];
  sizes: GarmentSize[];
  colors: GarmentColor[];
  products: Product[];
  variants: ProductVariant[];
  stockMovements: StockMovement[];
  customers: Customer[];
  suppliers: Supplier[];
  employees: Employee[];
  sales: Sale[];
  salesReturns: SalesReturn[];
  purchases: Purchase[];
  expenses: Expense[];
  expenseCategories: ExpenseCategory[];
  auditLogs: AuditLog[];
  syncConflicts: SyncConflict[];
  settings: ShopSettings;
}

class ServerDatabase {
  private state: ServerDatabaseState;

  constructor() {
    this.state = this.loadDatabase();
  }

  private loadDatabase(): ServerDatabaseState {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      } catch (err) {
        console.error('Error reading DB_FILE, recreating initial state:', err);
      }
    }

    const initialState: ServerDatabaseState = {
      users: [...SEED_USERS],
      categories: [...SEED_CATEGORIES],
      brands: [...SEED_BRANDS],
      sizes: [...SEED_SIZES],
      colors: [...SEED_COLORS],
      products: [...SEED_PRODUCTS],
      variants: [...SEED_VARIANTS],
      stockMovements: [],
      customers: [...SEED_CUSTOMERS],
      suppliers: [...SEED_SUPPLIERS],
      employees: [...SEED_EMPLOYEES],
      sales: [],
      salesReturns: [],
      purchases: [],
      expenses: [],
      expenseCategories: [...SEED_EXPENSE_CATEGORIES],
      auditLogs: [
        {
          id: 'audit-init',
          userId: 'system',
          userName: 'System Bootstrapper',
          action: 'INITIALIZE_DATABASE',
          module: 'SYSTEM',
          recordId: 'v1.0.0',
          createdAt: new Date().toISOString()
        }
      ],
      syncConflicts: [],
      settings: { ...DEFAULT_SETTINGS }
    };

    this.persistState(initialState);
    return initialState;
  }

  private persistState(state: ServerDatabaseState): void {
    try {
      const tempPath = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(state, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  public save(): void {
    this.persistState(this.state);
  }

  public getState(): ServerDatabaseState {
    return this.state;
  }

  public resetToSeeds(): void {
    this.state = {
      users: [...SEED_USERS],
      categories: [...SEED_CATEGORIES],
      brands: [...SEED_BRANDS],
      sizes: [...SEED_SIZES],
      colors: [...SEED_COLORS],
      products: [...SEED_PRODUCTS],
      variants: [...SEED_VARIANTS],
      stockMovements: [],
      customers: [...SEED_CUSTOMERS],
      suppliers: [...SEED_SUPPLIERS],
      employees: [...SEED_EMPLOYEES],
      sales: [],
      salesReturns: [],
      purchases: [],
      expenses: [],
      expenseCategories: [...SEED_EXPENSE_CATEGORIES],
      auditLogs: [
        {
          id: `audit-reset-${Date.now()}`,
          userId: 'admin',
          userName: 'Administrator',
          action: 'FACTORY_RESET_SEED',
          module: 'SYSTEM',
          createdAt: new Date().toISOString()
        }
      ],
      syncConflicts: [],
      settings: { ...DEFAULT_SETTINGS }
    };
    this.save();
  }

  // Transaction Log & Audit Trail
  public logAudit(log: Omit<AuditLog, 'id' | 'createdAt'>): void {
    const newLog: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date().toISOString(),
      ...log
    };
    this.state.auditLogs.unshift(newLog);
    if (this.state.auditLogs.length > 500) {
      this.state.auditLogs = this.state.auditLogs.slice(0, 500);
    }
    this.save();
  }

  // --- SALES PROCESSING ---
  public processSale(sale: Sale, user: { id: string; name: string }): { success: boolean; error?: string } {
    // Check idempotency
    const existing = this.state.sales.find((s) => s.clientTxId === sale.clientTxId || s.id === sale.id);
    if (existing) {
      return { success: true }; // already committed
    }

    // Check inventory stock if negative stock not allowed
    if (!this.state.settings.allowNegativeStock) {
      for (const item of sale.items) {
        const variant = this.state.variants.find((v) => v.id === item.variantId);
        if (!variant) {
          return { success: false, error: `Product variant ${item.variantId} not found.` };
        }
        if (variant.quantity < item.quantity) {
          // Log conflict if from sync
          this.state.syncConflicts.push({
            id: `conf-${Date.now()}`,
            clientTxId: sale.clientTxId,
            entityType: 'SALE',
            serverState: { variantId: variant.id, availableStock: variant.quantity },
            clientState: { requestedQuantity: item.quantity },
            reason: `Insufficient inventory for ${variant.sku} (Available: ${variant.quantity}, Requested: ${item.quantity})`,
            resolved: false,
            createdAt: new Date().toISOString()
          });
          return {
            success: false,
            error: `Insufficient stock for ${item.productName} (${item.sizeName} / ${item.colorName}). Available: ${variant.quantity}`
          };
        }
      }
    }

    // Deduct stock and record stock movements
    for (const item of sale.items) {
      const variant = this.state.variants.find((v) => v.id === item.variantId);
      if (variant) {
        variant.quantity -= item.quantity;
        const movement: StockMovement = {
          id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          variantId: variant.id,
          productName: item.productName,
          variantDescription: `${item.sizeName} / ${item.colorName}`,
          movementType: 'SALE',
          referenceType: 'SALE',
          referenceId: sale.invoiceNumber,
          quantityChange: -item.quantity,
          costPerUnit: variant.purchasePrice,
          balanceAfter: variant.quantity,
          reason: `POS Sale #${sale.invoiceNumber}`,
          userId: user.id,
          userName: user.name,
          createdAt: new Date().toISOString()
        };
        this.state.stockMovements.unshift(movement);
      }
    }

    // Update customer balance if credit sale
    if (sale.customerId && sale.customerId !== 'cust-walkin') {
      const customer = this.state.customers.find((c) => c.id === sale.customerId);
      if (customer) {
        customer.totalPurchases += sale.grandTotal;
        customer.totalPaid += sale.paidAmount;
        customer.currentBalance += sale.balanceDue; // balance due increases receivable
        customer.updatedAt = new Date().toISOString();
      }
    }

    this.state.sales.unshift(sale);
    this.logAudit({
      userId: user.id,
      userName: user.name,
      action: 'SALE_COMPLETED',
      module: 'POS',
      recordId: sale.invoiceNumber,
      newValues: `Total: ${sale.grandTotal}, Paid: ${sale.paidAmount}, Due: ${sale.balanceDue}`
    });

    this.save();
    return { success: true };
  }

  // --- SALES RETURN / EXCHANGE ---
  public processSalesReturn(salesReturn: SalesReturn, user: { id: string; name: string }): { success: boolean; error?: string } {
    const existing = this.state.salesReturns.find((r) => r.id === salesReturn.id);
    if (existing) return { success: true };

    for (const item of salesReturn.items) {
      const variant = this.state.variants.find((v) => v.id === item.variantId);
      if (variant) {
        variant.quantity += item.quantity;
        const movement: StockMovement = {
          id: `mov-ret-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          variantId: variant.id,
          productName: item.productName,
          variantDescription: `${item.sizeName} / ${item.colorName}`,
          movementType: 'RETURN',
          referenceType: 'RETURN',
          referenceId: salesReturn.returnNumber,
          quantityChange: item.quantity,
          costPerUnit: variant.purchasePrice,
          balanceAfter: variant.quantity,
          reason: `Return/Exchange: ${item.reason}`,
          userId: user.id,
          userName: user.name,
          createdAt: new Date().toISOString()
        };
        this.state.stockMovements.unshift(movement);
      }
    }

    if (salesReturn.customerId && salesReturn.customerId !== 'cust-walkin') {
      const customer = this.state.customers.find((c) => c.id === salesReturn.customerId);
      if (customer) {
        customer.currentBalance = Math.max(0, customer.currentBalance - salesReturn.totalRefundAmount);
        customer.updatedAt = new Date().toISOString();
      }
    }

    this.state.salesReturns.unshift(salesReturn);
    this.logAudit({
      userId: user.id,
      userName: user.name,
      action: 'RETURN_PROCESSED',
      module: 'RETURNS',
      recordId: salesReturn.returnNumber,
      newValues: `Refund: ${salesReturn.totalRefundAmount} (${salesReturn.refundType})`
    });

    this.save();
    return { success: true };
  }

  // --- PURCHASE INTAKE ---
  public processPurchase(purchase: Purchase, user: { id: string; name: string }): { success: boolean; error?: string } {
    const existing = this.state.purchases.find((p) => p.id === purchase.id || p.purchaseInvoiceNo === purchase.purchaseInvoiceNo);
    if (existing) return { success: true };

    for (const item of purchase.items) {
      let variant = this.state.variants.find((v) => v.id === item.variantId);
      if (variant) {
        variant.quantity += item.quantity;
        variant.purchasePrice = item.unitPurchasePrice; // Update purchase price layer
        const movement: StockMovement = {
          id: `mov-pur-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          variantId: variant.id,
          productName: item.productName,
          variantDescription: `${item.sizeName} / ${item.colorName}`,
          movementType: 'PURCHASE',
          referenceType: 'PURCHASE',
          referenceId: purchase.purchaseInvoiceNo,
          quantityChange: item.quantity,
          costPerUnit: item.unitPurchasePrice,
          balanceAfter: variant.quantity,
          reason: `Supplier Invoice #${purchase.purchaseInvoiceNo}`,
          userId: user.id,
          userName: user.name,
          createdAt: new Date().toISOString()
        };
        this.state.stockMovements.unshift(movement);
      }
    }

    const supplier = this.state.suppliers.find((s) => s.id === purchase.supplierId);
    if (supplier) {
      supplier.totalPurchases += purchase.grandTotal;
      supplier.totalPaid += purchase.paidAmount;
      supplier.currentPayable += purchase.balanceDue;
      supplier.updatedAt = new Date().toISOString();
    }

    this.state.purchases.unshift(purchase);
    this.logAudit({
      userId: user.id,
      userName: user.name,
      action: 'PURCHASE_INTAKE',
      module: 'PURCHASES',
      recordId: purchase.purchaseInvoiceNo,
      newValues: `Total: ${purchase.grandTotal}, Paid: ${purchase.paidAmount}, Due: ${purchase.balanceDue}`
    });

    this.save();
    return { success: true };
  }

  // --- EXPENSE ---
  public processExpense(expense: Expense, user: { id: string; name: string }): { success: boolean } {
    this.state.expenses.unshift(expense);
    this.logAudit({
      userId: user.id,
      userName: user.name,
      action: 'EXPENSE_RECORDED',
      module: 'EXPENSES',
      recordId: expense.id,
      newValues: `Category: ${expense.categoryName}, Amount: ${expense.amount}`
    });
    this.save();
    return { success: true };
  }

  // --- BATCH SYNC ENGINE ---
  public processSyncBatch(batch: SyncQueueItem[], user: { id: string; name: string }): {
    syncedIds: string[];
    conflicts: SyncConflict[];
  } {
    const syncedIds: string[] = [];
    const conflicts: SyncConflict[] = [];

    for (const item of batch) {
      try {
        if (item.entityType === 'SALE') {
          const res = this.processSale(item.payload, user);
          if (res.success) {
            syncedIds.push(item.id);
          } else {
            const conflict: SyncConflict = {
              id: `conf-${Date.now()}-${item.id}`,
              clientTxId: item.clientTxId,
              entityType: 'SALE',
              serverState: null,
              clientState: item.payload,
              reason: res.error || 'Conflict processing offline sale',
              resolved: false,
              createdAt: new Date().toISOString()
            };
            this.state.syncConflicts.unshift(conflict);
            conflicts.push(conflict);
          }
        } else if (item.entityType === 'PURCHASE') {
          this.processPurchase(item.payload, user);
          syncedIds.push(item.id);
        } else if (item.entityType === 'RETURN') {
          this.processSalesReturn(item.payload, user);
          syncedIds.push(item.id);
        } else if (item.entityType === 'EXPENSE') {
          this.processExpense(item.payload, user);
          syncedIds.push(item.id);
        } else {
          syncedIds.push(item.id);
        }
      } catch (err: any) {
        console.error('Error syncing item:', item.id, err);
      }
    }

    this.save();
    return { syncedIds, conflicts };
  }
}

export const serverDB = new ServerDatabase();
