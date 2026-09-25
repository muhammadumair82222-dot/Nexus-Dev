// Customer Management & Ledger Service
import { localDB } from '../db/indexedDb';
import { Customer, Sale, SalesReturn, PaymentMethod } from '../types';
import { syncEngine } from '../sync/syncEngine';

export interface CustomerLedgerEntry {
  id: string;
  date: string;
  type: 'OPENING' | 'SALE' | 'PAYMENT' | 'RETURN';
  referenceNo: string;
  description: string;
  debit: number; // Increases customer debt
  credit: number; // Reduces customer debt (paid or returned)
  balance: number; // Running balance
}

export class CustomerService {
  async getCustomers(): Promise<Customer[]> {
    return localDB.getAll<Customer>('customers');
  }

  async saveCustomer(customer: Customer): Promise<Customer> {
    customer.updatedAt = new Date().toISOString();
    await localDB.put('customers', customer);

    try {
      fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customer)
      }).catch(() => {});
    } catch {}

    return customer;
  }

  async receivePayment(
    customerId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    referenceNo: string,
    notes: string,
    user: { id: string; name: string }
  ): Promise<Customer> {
    const customer = await localDB.getById<Customer>('customers', customerId);
    if (!customer) throw new Error('Customer not found');

    customer.currentBalance = Math.max(0, customer.currentBalance - amount);
    customer.totalPaid += amount;
    customer.updatedAt = new Date().toISOString();

    await localDB.put('customers', customer);

    // Sync to server
    try {
      fetch('/api/customers/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, amount, paymentMethod, referenceNo, notes })
      }).catch(() => {});
    } catch {}

    return customer;
  }

  async getCustomerLedger(customerId: string): Promise<CustomerLedgerEntry[]> {
    const customer = await localDB.getById<Customer>('customers', customerId);
    if (!customer) return [];

    const sales = (await localDB.getAll<Sale>('sales')).filter((s) => s.customerId === customerId);
    const returns = (await localDB.getAll<SalesReturn>('sales_returns')).filter((r) => r.customerId === customerId);

    const ledger: CustomerLedgerEntry[] = [];
    let running = customer.openingBalance || 0;

    if (customer.openingBalance > 0) {
      ledger.push({
        id: 'open-bal',
        date: customer.createdAt,
        type: 'OPENING',
        referenceNo: 'INIT-BAL',
        description: 'Opening Balance',
        debit: customer.openingBalance,
        credit: 0,
        balance: running
      });
    }

    sales.forEach((s) => {
      // Debit grand total
      running += s.grandTotal;
      ledger.push({
        id: `sale-${s.id}`,
        date: s.saleDate,
        type: 'SALE',
        referenceNo: s.invoiceNumber,
        description: `POS Sale (${s.items.length} items)`,
        debit: s.grandTotal,
        credit: 0,
        balance: running
      });

      // Credit paid amount
      if (s.paidAmount > 0) {
        running -= s.paidAmount;
        ledger.push({
          id: `pay-${s.id}`,
          date: s.saleDate,
          type: 'PAYMENT',
          referenceNo: `PAY-${s.invoiceNumber}`,
          description: `Payment received at checkout`,
          debit: 0,
          credit: s.paidAmount,
          balance: running
        });
      }
    });

    returns.forEach((r) => {
      running = Math.max(0, running - r.totalRefundAmount);
      ledger.push({
        id: `ret-${r.id}`,
        date: r.returnDate,
        type: 'RETURN',
        referenceNo: r.returnNumber,
        description: `Goods Return / Refund (${r.refundType})`,
        debit: 0,
        credit: r.totalRefundAmount,
        balance: running
      });
    });

    return ledger.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
}

export const customerService = new CustomerService();
