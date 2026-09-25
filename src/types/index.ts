// Comprehensive Types for StitchFlow Garments POS & ERP

export type UserRole = 'ADMIN' | 'MANAGER' | 'CASHIER' | 'INVENTORY_STAFF';

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface Permission {
  id: string;
  role: UserRole;
  module: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface Category {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

export interface Brand {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

export interface GarmentSize {
  id: string;
  name: string; // e.g. "S", "M", "L", "XL", "32", "34", "36"
  code: string;
  sortOrder: number;
}

export interface GarmentColor {
  id: string;
  name: string; // e.g. "Black", "Royal Blue", "Crimson", "White"
  hexCode: string;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  categoryName?: string;
  brandId: string;
  brandName?: string;
  subcategory?: string;
  fabric?: string; // Cotton, Denim, Linen, Silk, Wool, Poly-blend
  gender: 'MEN' | 'WOMEN' | 'KIDS' | 'UNISEX';
  season: 'ALL_SEASON' | 'SUMMER' | 'WINTER' | 'SPRING_AUTUMN';
  rackLocation?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  productId: string;
  productName?: string;
  sizeId: string;
  sizeName?: string;
  colorId: string;
  colorName?: string;
  colorHex?: string;
  sku: string;
  barcode: string;
  purchasePrice: number;
  salePrice: number;
  wholesalePrice: number;
  discount: number;
  taxPercent: number;
  quantity: number;
  minStock: number;
  isActive: boolean;
  rackLocation?: string;
}

export type MovementType =
  | 'PURCHASE'
  | 'SALE'
  | 'RETURN'
  | 'EXCHANGE_IN'
  | 'EXCHANGE_OUT'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'INITIAL_COUNT';

export interface StockMovement {
  id: string;
  variantId: string;
  productName: string;
  variantDescription: string;
  movementType: MovementType;
  referenceType: 'SALE' | 'PURCHASE' | 'RETURN' | 'AUDIT';
  referenceId: string;
  quantityChange: number; // positive or negative
  costPerUnit: number;
  balanceAfter: number;
  reason: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  whatsapp?: string;
  address?: string;
  openingBalance: number;
  currentBalance: number; // positive = customer owes shop (receivable)
  totalPurchases: number;
  totalPaid: number;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  companyName: string;
  phone: string;
  whatsapp?: string;
  address?: string;
  openingBalance: number;
  currentPayable: number; // positive = shop owes supplier
  totalPurchases: number;
  totalPaid: number;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  name: string;
  phone: string;
  cnic?: string;
  salary: number;
  joiningDate: string;
  role: UserRole;
  status: 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED';
  createdAt: string;
}

export type PaymentMethod =
  | 'CASH'
  | 'CARD'
  | 'BANK_TRANSFER'
  | 'EASYPAISA'
  | 'JAZZCASH'
  | 'CREDIT';

export interface CartItem {
  variantId: string;
  productId: string;
  productName: string;
  sizeName: string;
  colorName: string;
  colorHex?: string;
  sku: string;
  barcode: string;
  unitPrice: number;
  purchasePrice: number;
  quantity: number;
  discount: number; // percentage or fixed
  taxPercent: number;
  stockAvailable: number;
  total: number;
}

export interface SalePayment {
  id: string;
  saleId: string;
  paymentMethod: PaymentMethod;
  amount: number;
  referenceNo?: string;
  createdAt: string;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  cashierId: string;
  cashierName: string;
  saleDate: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
  paymentStatus: 'PAID' | 'PARTIAL' | 'DUE';
  saleStatus: 'COMPLETED' | 'HELD' | 'CANCELLED' | 'RETURNED';
  notes?: string;
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
  clientTxId: string;
  items: SaleItem[];
  payments: SalePayment[];
  createdAt: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  variantId: string;
  productName: string;
  sizeName: string;
  colorName: string;
  sku: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  discount: number;
  taxAmount: number;
  subtotal: number;
  total: number;
}

export interface HeldSale {
  id: string;
  referenceName: string;
  customerName?: string;
  items: CartItem[];
  discountAmount: number;
  heldAt: string;
}

export interface SalesReturnItem {
  id: string;
  returnId: string;
  saleItemId: string;
  variantId: string;
  productName: string;
  sizeName: string;
  colorName: string;
  quantity: number;
  refundPrice: number;
  reason: string;
}

export interface SalesReturn {
  id: string;
  returnNumber: string;
  originalSaleId: string;
  originalInvoiceNumber: string;
  customerId?: string;
  customerName?: string;
  returnDate: string;
  totalRefundAmount: number;
  refundType: 'CASH_REFUND' | 'STORE_CREDIT' | 'EXCHANGE';
  notes?: string;
  cashierId: string;
  cashierName: string;
  items: SalesReturnItem[];
  createdAt: string;
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  variantId: string;
  productName: string;
  sizeName: string;
  colorName: string;
  sku: string;
  quantity: number;
  unitPurchasePrice: number;
  discount: number;
  taxAmount: number;
  total: number;
}

export interface Purchase {
  id: string;
  purchaseInvoiceNo: string;
  supplierId: string;
  supplierName: string;
  invoiceDate: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
  paymentStatus: 'PAID' | 'PARTIAL' | 'DUE';
  items: PurchaseItem[];
  payments: {
    id: string;
    amount: number;
    paymentMethod: PaymentMethod;
    referenceNo?: string;
    createdAt: string;
  }[];
  createdAt: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
}

export interface Expense {
  id: string;
  categoryId: string;
  categoryName: string;
  description: string;
  amount: number;
  expenseDate: string;
  paymentMethod: PaymentMethod;
  referenceNo?: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  recordId?: string;
  oldValues?: string;
  newValues?: string;
  createdAt: string;
}

export interface SyncQueueItem {
  id: string;
  clientTxId: string;
  entityType: 'SALE' | 'PURCHASE' | 'RETURN' | 'STOCK_MOVEMENT' | 'CUSTOMER_PAYMENT' | 'EXPENSE';
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: any;
  status: 'PENDING' | 'SYNCED' | 'FAILED' | 'CONFLICT';
  errorMessage?: string;
  attempts: number;
  createdAt: string;
  syncedAt?: string;
}

export interface SyncConflict {
  id: string;
  clientTxId: string;
  entityType: string;
  serverState: any;
  clientState: any;
  reason: string;
  resolved: boolean;
  createdAt: string;
}

export interface CashSession {
  id: string;
  userId: string;
  userName: string;
  openingTime: string;
  closingTime?: string;
  openingCash: number;
  closingCash?: number;
  totalSalesCash: number;
  cashDifference?: number;
  status: 'OPEN' | 'CLOSED';
}

export interface ShopSettings {
  shopName: string;
  address: string;
  phone: string;
  email: string;
  currencySymbol: string;
  taxRate: number;
  allowNegativeStock: boolean;
  thermalReceiptSize: '58mm' | '80mm';
  receiptFooterMessage: string;
  enableAutoSync: boolean;
  autoSyncIntervalSec: number;
}
