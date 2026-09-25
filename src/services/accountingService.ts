// Accounting, Financials, True COGS & Analytics Engine
import { localDB } from '../db/indexedDb';
import { Sale, Purchase, Expense, ProductVariant, Customer, Supplier, SalesReturn } from '../types';

export type DateFilterType = 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL_TIME' | 'CUSTOM';

export interface FinancialSummary {
  totalSales: number;
  totalSalesCount: number;
  totalPurchases: number;
  costOfGoodsSold: number;
  grossProfit: number;
  grossProfitMargin: number;
  totalExpenses: number;
  netProfit: number;
  netProfitMargin: number;
  totalCustomerReceivables: number;
  totalSupplierPayables: number;
  estimatedCashInHand: number;
  inventoryValuationCost: number;
  inventoryValuationRetail: number;
  lowStockCount: number;
  outOfStockCount: number;
  paymentMethodBreakdown: Record<string, number>;
  categorySalesBreakdown: Record<string, number>;
}

export class AccountingService {
  getDateRange(filter: DateFilterType, customStart?: string, customEnd?: string): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    if (filter === 'TODAY') {
      start.setHours(0, 0, 0, 0);
    } else if (filter === 'YESTERDAY') {
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1);
    } else if (filter === 'THIS_WEEK') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
    } else if (filter === 'THIS_MONTH') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    } else if (filter === 'CUSTOM' && customStart && customEnd) {
      return {
        start: new Date(customStart),
        end: new Date(customEnd)
      };
    } else {
      // ALL_TIME
      start.setFullYear(2020, 0, 1);
      start.setHours(0, 0, 0, 0);
    }

    return { start, end };
  }

  async getFinancialSummary(
    filter: DateFilterType = 'TODAY',
    customStart?: string,
    customEnd?: string
  ): Promise<FinancialSummary> {
    const { start, end } = this.getDateRange(filter, customStart, customEnd);
    const startTime = start.getTime();
    const endTime = end.getTime();

    const [allSales, allPurchases, allExpenses, allVariants, allCustomers, allSuppliers, allReturns] =
      await Promise.all([
        localDB.getAll<Sale>('sales'),
        localDB.getAll<Purchase>('purchases'),
        localDB.getAll<Expense>('expenses'),
        localDB.getAll<ProductVariant>('product_variants'),
        localDB.getAll<Customer>('customers'),
        localDB.getAll<Supplier>('suppliers'),
        localDB.getAll<SalesReturn>('sales_returns')
      ]);

    // Filter by date
    const filteredSales = allSales.filter((s) => {
      const t = new Date(s.saleDate).getTime();
      return t >= startTime && t <= endTime && s.saleStatus !== 'CANCELLED';
    });

    const filteredPurchases = allPurchases.filter((p) => {
      const t = new Date(p.invoiceDate).getTime();
      return t >= startTime && t <= endTime;
    });

    const filteredExpenses = allExpenses.filter((e) => {
      const t = new Date(e.expenseDate).getTime();
      return t >= startTime && t <= endTime;
    });

    const filteredReturns = allReturns.filter((r) => {
      const t = new Date(r.returnDate).getTime();
      return t >= startTime && t <= endTime;
    });

    // 1. Sales Totals
    const totalSales = filteredSales.reduce((sum, s) => sum + s.grandTotal, 0);
    const totalSalesCount = filteredSales.length;

    // 2. Returns Total
    const totalRefunds = filteredReturns.reduce((sum, r) => sum + r.totalRefundAmount, 0);
    const netRevenue = Math.max(0, totalSales - totalRefunds);

    // 3. True Cost of Goods Sold (COGS)
    let costOfGoodsSold = 0;
    const categorySalesBreakdown: Record<string, number> = {};

    for (const sale of filteredSales) {
      for (const item of sale.items) {
        costOfGoodsSold += item.unitCost * item.quantity;
      }
    }

    // 4. Purchases Total
    const totalPurchases = filteredPurchases.reduce((sum, p) => sum + p.grandTotal, 0);

    // 5. Total Expenses
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

    // 6. Gross & Net Profit
    const grossProfit = netRevenue - costOfGoodsSold;
    const grossProfitMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;
    const netProfit = grossProfit - totalExpenses;
    const netProfitMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

    // 7. Receivables and Payables
    const totalCustomerReceivables = allCustomers.reduce((sum, c) => sum + (c.currentBalance || 0), 0);
    const totalSupplierPayables = allSuppliers.reduce((sum, s) => sum + (s.currentPayable || 0), 0);

    // 8. Payment Method Breakdown
    const paymentMethodBreakdown: Record<string, number> = {
      CASH: 0,
      CARD: 0,
      BANK_TRANSFER: 0,
      EASYPAISA: 0,
      JAZZCASH: 0,
      CREDIT: 0
    };

    filteredSales.forEach((sale) => {
      sale.payments.forEach((payment) => {
        paymentMethodBreakdown[payment.paymentMethod] =
          (paymentMethodBreakdown[payment.paymentMethod] || 0) + payment.amount;
      });
      if (sale.balanceDue > 0) {
        paymentMethodBreakdown['CREDIT'] = (paymentMethodBreakdown['CREDIT'] || 0) + sale.balanceDue;
      }
    });

    // 9. Inventory Valuation
    let inventoryValuationCost = 0;
    let inventoryValuationRetail = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    allVariants.forEach((v) => {
      inventoryValuationCost += v.purchasePrice * v.quantity;
      inventoryValuationRetail += v.salePrice * v.quantity;
      if (v.quantity <= 0) {
        outOfStockCount++;
      } else if (v.quantity <= (v.minStock || 5)) {
        lowStockCount++;
      }
    });

    // Estimated Cash in Hand
    const cashCollected = paymentMethodBreakdown['CASH'] || 0;
    const cashExpenses = filteredExpenses
      .filter((e) => e.paymentMethod === 'CASH')
      .reduce((sum, e) => sum + e.amount, 0);
    const estimatedCashInHand = Math.max(0, cashCollected - cashExpenses + 15000); // 15,000 opening float

    return {
      totalSales,
      totalSalesCount,
      totalPurchases,
      costOfGoodsSold,
      grossProfit,
      grossProfitMargin,
      totalExpenses,
      netProfit,
      netProfitMargin,
      totalCustomerReceivables,
      totalSupplierPayables,
      estimatedCashInHand,
      inventoryValuationCost,
      inventoryValuationRetail,
      lowStockCount,
      outOfStockCount,
      paymentMethodBreakdown,
      categorySalesBreakdown
    };
  }
}

export const accountingService = new AccountingService();
