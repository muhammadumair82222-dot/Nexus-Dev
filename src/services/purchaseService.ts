// Supplier Purchases & Stock Intake Service
import { localDB } from '../db/indexedDb';
import { Purchase, PurchaseItem, ProductVariant, StockMovement, Supplier, PaymentMethod } from '../types';
import { syncEngine } from '../sync/syncEngine';

export class PurchaseService {
  async getAllPurchases(): Promise<Purchase[]> {
    return localDB.getAll<Purchase>('purchases');
  }

  async createPurchase(params: {
    supplier: Supplier;
    invoiceNo: string;
    items: {
      variantId: string;
      productName: string;
      sizeName: string;
      colorName: string;
      sku: string;
      quantity: number;
      unitPurchasePrice: number;
      discount: number;
      taxAmount: number;
    }[];
    paidAmount: number;
    paymentMethod: PaymentMethod;
    notes?: string;
    user: { id: string; name: string };
  }): Promise<Purchase> {
    const { supplier, invoiceNo, items, paidAmount, paymentMethod, user } = params;

    const subtotal = items.reduce((sum, item) => sum + item.unitPurchasePrice * item.quantity, 0);
    const totalDiscount = items.reduce((sum, item) => sum + (item.discount || 0), 0);
    const totalTax = items.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
    const grandTotal = subtotal - totalDiscount + totalTax;
    const balanceDue = Math.max(0, grandTotal - paidAmount);

    let paymentStatus: 'PAID' | 'PARTIAL' | 'DUE' = 'PAID';
    if (paidAmount === 0) paymentStatus = 'DUE';
    else if (paidAmount < grandTotal) paymentStatus = 'PARTIAL';

    const purchaseId = `pur-${Date.now()}`;
    const purchaseItems: PurchaseItem[] = items.map((item, idx) => ({
      id: `pitem-${Date.now()}-${idx}`,
      purchaseId,
      variantId: item.variantId,
      productName: item.productName,
      sizeName: item.sizeName,
      colorName: item.colorName,
      sku: item.sku,
      quantity: item.quantity,
      unitPurchasePrice: item.unitPurchasePrice,
      discount: item.discount,
      taxAmount: item.taxAmount,
      total: item.unitPurchasePrice * item.quantity - item.discount + item.taxAmount
    }));

    const purchase: Purchase = {
      id: purchaseId,
      purchaseInvoiceNo: invoiceNo || `PINV-${Date.now().toString().slice(-6)}`,
      supplierId: supplier.id,
      supplierName: supplier.companyName || supplier.name,
      invoiceDate: new Date().toISOString(),
      subtotal,
      taxAmount: totalTax,
      discountAmount: totalDiscount,
      grandTotal,
      paidAmount,
      balanceDue,
      paymentStatus,
      items: purchaseItems,
      payments: paidAmount > 0 ? [
        {
          id: `ppay-${Date.now()}`,
          amount: paidAmount,
          paymentMethod,
          referenceNo: `INIT-${invoiceNo}`,
          createdAt: new Date().toISOString()
        }
      ] : [],
      createdAt: new Date().toISOString()
    };

    // 1. Save purchase locally
    await localDB.put('purchases', purchase);

    // 2. Increase stock & update purchase price
    for (const item of items) {
      const variant = await localDB.getById<ProductVariant>('product_variants', item.variantId);
      if (variant) {
        variant.quantity += item.quantity;
        variant.purchasePrice = item.unitPurchasePrice;
        await localDB.put('product_variants', variant);

        const movement: StockMovement = {
          id: `mov-pur-${Date.now()}-${item.variantId}`,
          variantId: variant.id,
          productName: item.productName,
          variantDescription: `${item.sizeName} / ${item.colorName}`,
          movementType: 'PURCHASE',
          referenceType: 'PURCHASE',
          referenceId: purchase.purchaseInvoiceNo,
          quantityChange: item.quantity,
          costPerUnit: item.unitPurchasePrice,
          balanceAfter: variant.quantity,
          reason: `Supplier Purchase #${purchase.purchaseInvoiceNo}`,
          userId: user.id,
          userName: user.name,
          createdAt: new Date().toISOString()
        };
        await localDB.put('stock_movements', movement);
      }
    }

    // 3. Update supplier payable & totals
    supplier.totalPurchases += grandTotal;
    supplier.totalPaid += paidAmount;
    supplier.currentPayable += balanceDue;
    supplier.updatedAt = new Date().toISOString();
    await localDB.put('suppliers', supplier);

    // 4. Queue for sync
    await syncEngine.queueTransaction('PURCHASE', 'CREATE', purchase, `tx-pur-${Date.now()}`);

    return purchase;
  }
}

export const purchaseService = new PurchaseService();
