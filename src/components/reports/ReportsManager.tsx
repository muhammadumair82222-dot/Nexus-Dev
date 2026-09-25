import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  Search,
  DollarSign,
  TrendingUp,
  Package,
  Layers,
  Users,
  CreditCard,
  FileSpreadsheet
} from 'lucide-react';
import { accountingService, FinancialSummary, DateFilterType } from '../../services/accountingService';
import { localDB } from '../../db/indexedDb';
import { Sale, Purchase, Expense, ProductVariant, Customer, Supplier, ShopSettings } from '../../types';

interface ReportsManagerProps {
  settings: ShopSettings;
}

export const ReportsManager: React.FC<ReportsManagerProps> = ({ settings }) => {
  const [activeReport, setActiveReport] = useState<'PROFIT_LOSS' | 'SALES' | 'INVENTORY' | 'CLOSING'>('PROFIT_LOSS');
  const [filter, setFilter] = useState<DateFilterType>('THIS_MONTH');
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);

  useEffect(() => {
    accountingService.getFinancialSummary(filter).then(setSummary);
    localDB.getAll<Sale>('sales').then(setSales);
    localDB.getAll<ProductVariant>('product_variants').then(setVariants);
  }, [filter]);

  // Export to CSV
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    if (activeReport === 'SALES') {
      csvContent += "Invoice #,Date,Customer,Total,Paid,Due,Status\n";
      sales.forEach((s) => {
        csvContent += `"${s.invoiceNumber}","${s.saleDate}","${s.customerName}",${s.grandTotal},${s.paidAmount},${s.balanceDue},"${s.paymentStatus}"\n`;
      });
    } else {
      csvContent += "SKU,Product,Size,Color,Cost,Sale,Stock,Valuation\n";
      variants.forEach((v) => {
        csvContent += `"${v.sku}","${v.productName}","${v.sizeName}","${v.colorName}",${v.purchasePrice},${v.salePrice},${v.quantity},${v.purchasePrice * v.quantity}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `stitchflow-report-${activeReport}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-6 space-y-4 bg-slate-50 text-slate-900 min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-red-600" />
            <span>Retail Accounting & Executive Reports</span>
          </h2>
          <p className="text-xs text-slate-500">
            True transaction-level COGS, P&L statements, daily closing register and stock valuation
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-md border border-slate-300 flex items-center gap-1.5 shadow-xs transition"
          >
            <Download className="w-4 h-4 text-red-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-md flex items-center gap-1.5 shadow-sm shadow-red-600/20 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Tabs & Date Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex flex-wrap gap-1">
          {[
            { id: 'PROFIT_LOSS', label: 'Profit & Loss Statement' },
            { id: 'SALES', label: 'Sales & Invoices' },
            { id: 'INVENTORY', label: 'Stock Valuation Matrix' },
            { id: 'CLOSING', label: 'Daily Closing Register' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveReport(tab.id as any)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeReport === tab.id
                  ? 'bg-red-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-red-700 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-500 font-medium">Period:</span>
          {(['TODAY', 'THIS_WEEK', 'THIS_MONTH', 'ALL_TIME'] as DateFilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded text-xs transition ${
                filter === f
                  ? 'bg-red-50 text-red-700 font-bold border border-red-200'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Report Body */}
      {activeReport === 'PROFIT_LOSS' && summary && (
        <div className="space-y-4">
          {/* Statement Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base text-slate-900">Comprehensive Profit & Loss Statement</h3>
                <p className="text-xs text-slate-500">
                  Calculated using True Cost of Goods Sold (Historic Variant Purchase Cost at Sale Time)
                </p>
              </div>
              <span className="text-xs font-mono text-red-600 font-bold uppercase">{filter}</span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100 font-semibold text-slate-700">
                <span>Gross Retail Sales Revenue ({summary.totalSalesCount} Invoices)</span>
                <span className="font-bold text-slate-900">
                  {settings.currencySymbol} {summary.totalSales.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-100 text-slate-500">
                <span className="pl-4">Less: True Cost of Goods Sold (COGS)</span>
                <span className="text-red-600 font-semibold">
                  - {settings.currencySymbol} {summary.costOfGoodsSold.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between py-2.5 border-b-2 border-slate-200 font-bold text-sm bg-slate-50 px-3 rounded">
                <span className="text-slate-900">Gross Trading Profit</span>
                <span className="text-red-700 font-black">
                  {settings.currencySymbol} {summary.grossProfit.toLocaleString()} ({summary.grossProfitMargin.toFixed(1)}%)
                </span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-100 text-slate-500">
                <span className="pl-4">Less: Operating & Shop Overhead Expenses</span>
                <span className="text-red-600 font-semibold">
                  - {settings.currencySymbol} {summary.totalExpenses.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between py-3 border-t-2 border-slate-200 font-black text-base bg-red-50/70 border border-red-100 px-3 rounded-lg">
                <span className="text-slate-900">NET OPERATING PROFIT</span>
                <span className={summary.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                  {settings.currencySymbol} {summary.netProfit.toLocaleString()} ({summary.netProfitMargin.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method Breakdown Cards */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-xs">
            <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
              Tender Channel Collections:
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Object.entries(summary.paymentMethodBreakdown).map(([method, amt]) => (
                <div key={method} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <div className="text-[11px] font-semibold text-slate-600">{method}</div>
                  <div className="text-sm font-bold text-slate-900">
                    {settings.currencySymbol} {amt.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SALES REPORT */}
      {activeReport === 'SALES' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="p-2.5">Invoice #</th>
                <th className="p-2.5">Date</th>
                <th className="p-2.5">Customer</th>
                <th className="p-2.5">Cashier</th>
                <th className="p-2.5 text-right">Items</th>
                <th className="p-2.5 text-right">Grand Total</th>
                <th className="p-2.5 text-right">Paid</th>
                <th className="p-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sales.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="p-2.5 font-bold text-slate-900">{s.invoiceNumber}</td>
                  <td className="p-2.5 text-slate-500">{new Date(s.saleDate).toLocaleDateString()}</td>
                  <td className="p-2.5 text-slate-800">{s.customerName}</td>
                  <td className="p-2.5 text-slate-600">{s.cashierName}</td>
                  <td className="p-2.5 text-right text-slate-700">{s.items.reduce((sum, i) => sum + i.quantity, 0)}</td>
                  <td className="p-2.5 text-right font-bold text-red-600">
                    {settings.currencySymbol} {s.grandTotal.toLocaleString()}
                  </td>
                  <td className="p-2.5 text-right font-medium text-slate-800">{settings.currencySymbol} {s.paidAmount.toLocaleString()}</td>
                  <td className="p-2.5 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-700">
                      {s.paymentStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* INVENTORY VALUATION MATRIX */}
      {activeReport === 'INVENTORY' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="p-2.5">SKU</th>
                <th className="p-2.5">Product Title</th>
                <th className="p-2.5">Size / Color</th>
                <th className="p-2.5 text-right">Cost Rate</th>
                <th className="p-2.5 text-right">Sale Rate</th>
                <th className="p-2.5 text-center">In Stock</th>
                <th className="p-2.5 text-right">Total Cost Value</th>
                <th className="p-2.5 text-right">Total Retail Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {variants.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="p-2.5 font-mono text-slate-500">{v.sku}</td>
                  <td className="p-2.5 font-bold text-slate-900">{v.productName}</td>
                  <td className="p-2.5 text-slate-600">{v.sizeName} / {v.colorName}</td>
                  <td className="p-2.5 text-right text-slate-600">{settings.currencySymbol} {v.purchasePrice.toLocaleString()}</td>
                  <td className="p-2.5 text-right text-slate-800 font-medium">{settings.currencySymbol} {v.salePrice.toLocaleString()}</td>
                  <td className="p-2.5 text-center font-bold text-slate-900">{v.quantity}</td>
                  <td className="p-2.5 text-right font-medium text-slate-800">
                    {settings.currencySymbol} {(v.purchasePrice * v.quantity).toLocaleString()}
                  </td>
                  <td className="p-2.5 text-right font-bold text-red-600">
                    {settings.currencySymbol} {(v.salePrice * v.quantity).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* DAILY CLOSING REGISTER */}
      {activeReport === 'CLOSING' && summary && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 max-w-xl mx-auto shadow-xs text-slate-900">
          <div className="border-b border-slate-100 pb-3 text-center">
            <h3 className="font-bold text-base text-red-600 uppercase tracking-wider">{settings.shopName}</h3>
            <div className="text-xs text-slate-500">POS Daily Closing Reconciliation & Cash Audit</div>
            <div className="text-xs text-slate-700 font-semibold mt-1">Date: {new Date().toLocaleDateString()}</div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Opening Cash Float:</span>
              <span className="font-bold text-slate-900">{settings.currencySymbol} 15,000</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Total Cash Collections from Sales:</span>
              <span className="font-bold text-emerald-600">
                + {settings.currencySymbol} {(summary.paymentMethodBreakdown['CASH'] || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Total Cash Paid for Expenses:</span>
              <span className="font-bold text-red-600">
                - {settings.currencySymbol} {summary.totalExpenses.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between py-2 border-t-2 border-slate-200 font-black text-sm bg-slate-50 px-3 rounded">
              <span>Expected Cash in Drawer:</span>
              <span className="text-emerald-700 font-black">
                {settings.currencySymbol} {summary.estimatedCashInHand.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-4 text-center text-xs text-slate-500">
            <div>
              <div className="h-10 border-b border-slate-300"></div>
              <span className="mt-1 block">Cashier Signature</span>
            </div>
            <div>
              <div className="h-10 border-b border-slate-300"></div>
              <span className="mt-1 block">Manager Verified</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
