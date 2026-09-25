// Supplier Management & Ledger Service
import { localDB } from '../db/indexedDb';
import { Supplier, Purchase, PaymentMethod } from '../types';

export interface SupplierLedgerEntry {
  id: string;
  date: string;
  type: 'OPENING' | 'PURCHASE' | 'PAYMENT';
  referenceNo: string;
  description: string;
  debit: number; // Reduces payable (Shop pays supplier)
  credit: number; // Increases payable (Shop buys goods from supplier)
  balance: number; // Running payable balance
}

export class SupplierService {
  async getSuppliers(): Promise<Supplier[]> {
    return localDB.getAll<Supplier>('suppliers');
  }

  async saveSupplier(supplier: Supplier): Promise<Supplier> {
    supplier.updatedAt = new Date().toISOString();
    await localDB.put('suppliers', supplier);

    try {
      fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supplier)
      }).catch(() => {});
    } catch {}

    return supplier;
  }

  async paySupplier(
    supplierId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    referenceNo: string,
    notes: string,
    user: { id: string; name: string }
  ): Promise<Supplier> {
    const supplier = await localDB.getById<Supplier>('suppliers', supplierId);
    if (!supplier) throw new Error('Supplier not found');

    supplier.currentPayable = Math.max(0, supplier.currentPayable - amount);
    supplier.totalPaid += amount;
    supplier.updatedAt = new Date().toISOString();

    await localDB.put('suppliers', supplier);

    try {
      fetch('/api/suppliers/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierId, amount, paymentMethod, referenceNo, notes })
      }).catch(() => {});
    } catch {}

    return supplier;
  }

  async getSupplierLedger(supplierId: string): Promise<SupplierLedgerEntry[]> {
    const supplier = await localDB.getById<Supplier>('suppliers', supplierId);
    if (!supplier) return [];

    const purchases = (await localDB.getAll<Purchase>('purchases')).filter((p) => p.supplierId === supplierId);

    const ledger: SupplierLedgerEntry[] = [];
    let running = supplier.openingBalance || 0;

    if (supplier.openingBalance > 0) {
      ledger.push({
        id: 'open-sup-bal',
        date: supplier.createdAt,
        type: 'OPENING',
        referenceNo: 'INIT-PAYABLE',
        description: 'Opening Payable Balance',
        debit: 0,
        credit: supplier.openingBalance,
        balance: running
      });
    }

    purchases.forEach((p) => {
      running += p.grandTotal;
      ledger.push({
        id: `pur-${p.id}`,
        date: p.invoiceDate,
        type: 'PURCHASE',
        referenceNo: p.purchaseInvoiceNo,
        description: `Stock Purchase Invoice (${p.items.length} items)`,
        debit: 0,
        credit: p.grandTotal,
        balance: running
      });

      if (p.paidAmount > 0) {
        running = Math.max(0, running - p.paidAmount);
        ledger.push({
          id: `pay-${p.id}`,
          date: p.invoiceDate,
          type: 'PAYMENT',
          referenceNo: `PAY-${p.purchaseInvoiceNo}`,
          description: 'Payment made on invoice intake',
          debit: p.paidAmount,
          credit: 0,
          balance: running
        });
      }
    });

    return ledger.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
}

export const supplierService = new SupplierService();
