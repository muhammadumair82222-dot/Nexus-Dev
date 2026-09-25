// POS & Sales Transaction Service
import { localDB } from '../db/indexedDb';
import {
  CartItem,
  ProductVariant,
  Sale,
  SaleItem,
  SalePayment,
  PaymentMethod,
  HeldSale,
  StockMovement,
  Customer
} from '../types';
import { syncEngine } from '../sync/syncEngine';

export class POSService {
  // Generate invoice number
  generateInvoiceNumber(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `INV-${year}${month}-${random}`;
  }

  // Calculate cart line items and totals
  calculateTotals(
    items: CartItem[],
    orderDiscount: number = 0,
    taxRatePercent: number = 0
  ) {
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const itemDiscounts = items.reduce((sum, item) => sum + (item.discount || 0) * item.quantity, 0);
    const totalDiscount = itemDiscounts + orderDiscount;
    const taxableAmount = Math.max(0, subtotal - totalDiscount);
    const taxAmount = (taxableAmount * taxRatePercent) / 100;
    const grandTotal = Math.round(taxableAmount + taxAmount);

    return {
      subtotal,
      itemDiscounts,
      orderDiscount,
      totalDiscount,
      taxAmount,
      grandTotal
    };
  }

  // Convert ProductVariant to CartItem
  variantToCartItem(variant: ProductVariant, productName: string): CartItem {
    return {
      variantId: variant.id,
      productId: variant.productId,
      productName: variant.productName || productName,
      sizeName: variant.sizeName || 'Standard',
      colorName: variant.colorName || 'Default',
      colorHex: variant.colorHex,
      sku: variant.sku,
      barcode: variant.barcode,
      unitPrice: variant.salePrice,
      purchasePrice: variant.purchasePrice,
      quantity: 1,
      discount: variant.discount || 0,
      taxPercent: variant.taxPercent || 0,
      stockAvailable: variant.quantity,
      total: variant.salePrice - (variant.discount || 0)
    };
  }

  // Hold a sale
  async holdSale(referenceName: string, items: CartItem[], discountAmount: number = 0): Promise<HeldSale> {
    const held: HeldSale = {
      id: `held-${Date.now()}`,
      referenceName: referenceName || `Sale-${new Date().toLocaleTimeString()}`,
      items,
      discountAmount,
      heldAt: new Date().toISOString()
    };
    await localDB.put('held_sales', held);
    return held;
  }

  // Get all held sales
  async getHeldSales(): Promise<HeldSale[]> {
    return localDB.getAll<HeldSale>('held_sales');
  }

  // Delete held sale when resumed
  async removeHeldSale(id: string): Promise<void> {
    await localDB.delete('held_sales', id);
  }

  // Complete POS Checkout
  async completeCheckout(params: {
    items: CartItem[];
    customer?: Customer;
    payments: { method: PaymentMethod; amount: number; referenceNo?: string }[];
    orderDiscount: number;
    taxRatePercent: number;
    cashier: { id: string; name: string };
    notes?: string;
  }): Promise<Sale> {
    const { items, customer, payments, orderDiscount, taxRatePercent, cashier, notes } = params;

    if (items.length === 0) {
      throw new Error('Cart is empty.');
    }

    const { subtotal, totalDiscount, taxAmount, grandTotal } = this.calculateTotals(
      items,
      orderDiscount,
      taxRatePercent
    );

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const balanceDue = Math.max(0, grandTotal - totalPaid);

    let paymentStatus: 'PAID' | 'PARTIAL' | 'DUE' = 'PAID';
    if (totalPaid === 0) {
      paymentStatus = 'DUE';
    } else if (totalPaid < grandTotal) {
      paymentStatus = 'PARTIAL';
    }

    const invoiceNumber = this.generateInvoiceNumber();
    const clientTxId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`;
    const saleId = `sale-${Date.now()}`;

    // Sale Items
    const saleItems: SaleItem[] = items.map((item) => ({
      id: `sitem-${Date.now()}-${item.variantId}`,
      saleId,
      variantId: item.variantId,
      productName: item.productName,
      sizeName: item.sizeName,
      colorName: item.colorName,
      sku: item.sku,
      quantity: item.quantity,
      unitCost: item.purchasePrice,
      unitPrice: item.unitPrice,
      discount: item.discount,
      taxAmount: (item.unitPrice * (item.taxPercent || 0)) / 100,
      subtotal: item.unitPrice * item.quantity,
      total: (item.unitPrice - item.discount) * item.quantity
    }));

    // Sale Payments
    const salePayments: SalePayment[] = payments.map((p, idx) => ({
      id: `spay-${Date.now()}-${idx}`,
      saleId,
      paymentMethod: p.method,
      amount: p.amount,
      referenceNo: p.referenceNo,
      createdAt: new Date().toISOString()
    }));

    const sale: Sale = {
      id: saleId,
      invoiceNumber,
      customerId: customer?.id || 'cust-walkin',
      customerName: customer?.name || 'Walk-in Retail Customer',
      customerPhone: customer?.phone || '',
      cashierId: cashier.id,
      cashierName: cashier.name,
      saleDate: new Date().toISOString(),
      subtotal,
      discountAmount: totalDiscount,
      taxAmount,
      grandTotal,
      paidAmount: totalPaid,
      balanceDue,
      paymentStatus,
      saleStatus: 'COMPLETED',
      notes,
      syncStatus: 'PENDING',
      clientTxId,
      items: saleItems,
      payments: salePayments,
      createdAt: new Date().toISOString()
    };

    // 1. Save sale to local IndexedDB
    await localDB.put('sales', sale);

    // 2. Decrement local stock for each variant & write stock movement
    for (const item of items) {
      const variant = await localDB.getById<ProductVariant>('product_variants', item.variantId);
      if (variant) {
        variant.quantity = Math.max(0, variant.quantity - item.quantity);
        await localDB.put('product_variants', variant);

        const movement: StockMovement = {
          id: `mov-${Date.now()}-${item.variantId}`,
          variantId: variant.id,
          productName: item.productName,
          variantDescription: `${item.sizeName} / ${item.colorName}`,
          movementType: 'SALE',
          referenceType: 'SALE',
          referenceId: invoiceNumber,
          quantityChange: -item.quantity,
          costPerUnit: item.purchasePrice,
          balanceAfter: variant.quantity,
          reason: `POS Sale #${invoiceNumber}`,
          userId: cashier.id,
          userName: cashier.name,
          createdAt: new Date().toISOString()
        };
        await localDB.put('stock_movements', movement);
      }
    }

    // 3. Update customer balance locally if credit / due balance
    if (customer && customer.id !== 'cust-walkin') {
      customer.totalPurchases += grandTotal;
      customer.totalPaid += totalPaid;
      customer.currentBalance += balanceDue;
      customer.updatedAt = new Date().toISOString();
      await localDB.put('customers', customer);
    }

    // 4. Queue transaction into Sync Queue
    await syncEngine.queueTransaction('SALE', 'CREATE', sale, clientTxId);

    return sale;
  }
}

export const posService = new POSService();
