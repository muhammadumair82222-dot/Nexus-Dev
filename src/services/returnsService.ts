// Sales Return and Exchange Service
import { localDB } from '../db/indexedDb';
import { SalesReturn, SalesReturnItem, ProductVariant, StockMovement, Customer } from '../types';
import { syncEngine } from '../sync/syncEngine';

export class ReturnsService {
  async processReturn(params: {
    originalSaleId: string;
    originalInvoiceNumber: string;
    customerId?: string;
    customerName?: string;
    items: {
      saleItemId: string;
      variantId: string;
      productName: string;
      sizeName: string;
      colorName: string;
      quantity: number;
      refundPrice: number;
      reason: string;
    }[];
    refundType: 'CASH_REFUND' | 'STORE_CREDIT' | 'EXCHANGE';
    notes?: string;
    cashier: { id: string; name: string };
  }): Promise<SalesReturn> {
    const { originalSaleId, originalInvoiceNumber, customerId, customerName, items, refundType, notes, cashier } = params;

    const returnNumber = `RET-${Date.now().toString().slice(-6)}`;
    const totalRefundAmount = items.reduce((sum, item) => sum + item.refundPrice * item.quantity, 0);

    const returnItems: SalesReturnItem[] = items.map((item, idx) => ({
      id: `ritem-${Date.now()}-${idx}`,
      returnId: `ret-${Date.now()}`,
      saleItemId: item.saleItemId,
      variantId: item.variantId,
      productName: item.productName,
      sizeName: item.sizeName,
      colorName: item.colorName,
      quantity: item.quantity,
      refundPrice: item.refundPrice,
      reason: item.reason
    }));

    const salesReturn: SalesReturn = {
      id: `ret-${Date.now()}`,
      returnNumber,
      originalSaleId,
      originalInvoiceNumber,
      customerId: customerId || 'cust-walkin',
      customerName: customerName || 'Walk-in Customer',
      returnDate: new Date().toISOString(),
      totalRefundAmount,
      refundType,
      notes,
      cashierId: cashier.id,
      cashierName: cashier.name,
      items: returnItems,
      createdAt: new Date().toISOString()
    };

    // 1. Save return record
    await localDB.put('sales_returns', salesReturn);

    // 2. Restock variants and log movements
    for (const item of items) {
      const variant = await localDB.getById<ProductVariant>('product_variants', item.variantId);
      if (variant) {
        variant.quantity += item.quantity;
        await localDB.put('product_variants', variant);

        const movement: StockMovement = {
          id: `mov-ret-${Date.now()}-${item.variantId}`,
          variantId: variant.id,
          productName: item.productName,
          variantDescription: `${item.sizeName} / ${item.colorName}`,
          movementType: 'RETURN',
          referenceType: 'RETURN',
          referenceId: returnNumber,
          quantityChange: item.quantity,
          costPerUnit: variant.purchasePrice,
          balanceAfter: variant.quantity,
          reason: `Customer Return #${returnNumber} (${item.reason})`,
          userId: cashier.id,
          userName: cashier.name,
          createdAt: new Date().toISOString()
        };
        await localDB.put('stock_movements', movement);
      }
    }

    // 3. Customer balance update if store credit
    if (customerId && customerId !== 'cust-walkin') {
      const customer = await localDB.getById<Customer>('customers', customerId);
      if (customer) {
        customer.currentBalance = Math.max(0, customer.currentBalance - totalRefundAmount);
        customer.updatedAt = new Date().toISOString();
        await localDB.put('customers', customer);
      }
    }

    // 4. Queue for sync
    await syncEngine.queueTransaction('RETURN', 'CREATE', salesReturn, `tx-ret-${Date.now()}`);

    return salesReturn;
  }

  async getAllReturns(): Promise<SalesReturn[]> {
    return localDB.getAll<SalesReturn>('sales_returns');
  }
}

export const returnsService = new ReturnsService();
