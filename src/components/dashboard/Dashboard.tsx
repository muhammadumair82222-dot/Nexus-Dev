import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Truck,
  Users,
  Building2,
  Package,
  AlertTriangle,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Clock,
  CheckCircle,
  ExternalLink,
  Plus
} from 'lucide-react';
import { accountingService, FinancialSummary, DateFilterType } from '../../services/accountingService';
import { localDB } from '../../db/indexedDb';
import { Sale, ProductVariant, ShopSettings } from '../../types';

interface DashboardProps {
  settings: ShopSettings;
  onNavigateToPOS: () => void;
  onNavigateToInventory: () => void;
  onNavigateToSales: () => void;
  onSelectSale: (sale: Sale) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  settings,
  onNavigateToPOS,
  onNavigateToInventory,
  onNavigateToSales,
  onSelectSale
}) => {
  const [filter, setFilter] = useState<DateFilterType>('TODAY');
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [criticalStockVariants, setCriticalStockVariants] = useState<ProductVariant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = async (selectedFilter: DateFilterType) => {
    setIsLoading(true);
    try {
      const [finSummary, allSales, allVariants] = await Promise.all([
        accountingService.getFinancialSummary(selectedFilter),
        localDB.getAll<Sale>('sales'),
        localDB.getAll<ProductVariant>('product_variants')
      ]);

      setSummary(finSummary);
      setRecentSales(allSales.slice(0, 7));

      // Low or out of stock items
      const lowOrOut = allVariants
        .filter((v) => v.quantity <= (v.minStock || 5))
        .sort((a, b) => a.quantity - b.quantity)
        .slice(0, 6);
      setCriticalStockVariants(lowOrOut);
    } catch (e) {
      console.error('Error loading dashboard:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData(filter);
  }, [filter]);

  return (
    <div className="p-4 md:p-6 space-y-5 bg-slate-50 text-slate-900 min-h-full">
      {/* Top Banner & Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>Executive Garments Dashboard</span>
          </h2>
          <p className="text-xs text-slate-500">
            Real-time financial reconciliation, stock movements and POS operations
          </p>
        </div>

        {/* Date Filter Pills */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1 rounded-lg text-xs shadow-2xs">
          {(['TODAY', 'YESTERDAY', 'THIS_WEEK', 'THIS_MONTH', 'ALL_TIME'] as DateFilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md font-medium transition ${
                filter === f
                  ? 'bg-red-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-red-700 hover:bg-red-50'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {/* Sales */}
        <div className="bg-white border border-slate-200 hover:border-red-200 rounded-xl p-3.5 space-y-1 shadow-xs transition">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Gross Sales</span>
            <ShoppingCart className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-lg font-black text-slate-900">
            {settings.currencySymbol} {summary?.totalSales.toLocaleString() || '0'}
          </div>
          <div className="text-[11px] text-slate-400">
            {summary?.totalSalesCount || 0} invoices generated
          </div>
        </div>

        {/* Net Profit (COGS Calculated) */}
        <div className="bg-white border border-slate-200 hover:border-red-200 rounded-xl p-3.5 space-y-1 shadow-xs transition">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Net Profit</span>
            <TrendingUp className="w-4 h-4 text-red-600" />
          </div>
          <div className={`text-lg font-black ${summary && summary.netProfit >= 0 ? 'text-red-600' : 'text-slate-700'}`}>
            {settings.currencySymbol} {summary?.netProfit.toLocaleString() || '0'}
          </div>
          <div className="text-[11px] text-slate-400">
            Margin: {summary?.netProfitMargin.toFixed(1)}% (True COGS)
          </div>
        </div>

        {/* Cost of Goods Sold */}
        <div className="bg-white border border-slate-200 hover:border-red-200 rounded-xl p-3.5 space-y-1 shadow-xs transition">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">COGS (Stock Cost)</span>
            <Package className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-lg font-black text-slate-900">
            {settings.currencySymbol} {summary?.costOfGoodsSold.toLocaleString() || '0'}
          </div>
          <div className="text-[11px] text-slate-400">Inventory cost layer</div>
        </div>

        {/* Expenses */}
        <div className="bg-white border border-slate-200 hover:border-red-200 rounded-xl p-3.5 space-y-1 shadow-xs transition">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Expenses</span>
            <ArrowDownRight className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg font-black text-slate-900">
            {settings.currencySymbol} {summary?.totalExpenses.toLocaleString() || '0'}
          </div>
          <div className="text-[11px] text-slate-400">Operating overhead</div>
        </div>

        {/* Customer Receivables */}
        <div className="bg-white border border-slate-200 hover:border-red-200 rounded-xl p-3.5 space-y-1 shadow-xs transition">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Customer Receivables</span>
            <Users className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-lg font-black text-red-600">
            {settings.currencySymbol} {summary?.totalCustomerReceivables.toLocaleString() || '0'}
          </div>
          <div className="text-[11px] text-slate-400">Customer Khata / Due</div>
        </div>

        {/* Supplier Payables */}
        <div className="bg-white border border-slate-200 hover:border-red-200 rounded-xl p-3.5 space-y-1 shadow-xs transition">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Supplier Payables</span>
            <Building2 className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-lg font-black text-slate-900">
            {settings.currencySymbol} {summary?.totalSupplierPayables.toLocaleString() || '0'}
          </div>
          <div className="text-[11px] text-slate-400">Owed to textile mills</div>
        </div>
      </div>

      {/* Secondary Metrics: Cash In Hand & Inventory Valuation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs text-slate-500 font-medium">Estimated Cash In Drawer / Hand</span>
            <div className="text-2xl font-black text-red-600 mt-0.5">
              {settings.currencySymbol} {summary?.estimatedCashInHand.toLocaleString() || '0'}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Cash receipts minus cash expenses</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-red-600" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs text-slate-500 font-medium">Inventory Valuation (Cost)</span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              {settings.currencySymbol} {summary?.inventoryValuationCost.toLocaleString() || '0'}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Retail value: {settings.currencySymbol} {summary?.inventoryValuationRetail.toLocaleString()}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
            <Package className="w-6 h-6 text-red-600" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs text-slate-500 font-medium">Stock Status Alerts</span>
            <div className="flex items-center gap-3 mt-1">
              <div>
                <span className="text-xl font-bold text-amber-600">{summary?.lowStockCount || 0}</span>
                <span className="text-[11px] text-slate-500 ml-1">Low Stock</span>
              </div>
              <div>
                <span className="text-xl font-bold text-red-600">{summary?.outOfStockCount || 0}</span>
                <span className="text-[11px] text-slate-500 ml-1">Out of Stock</span>
              </div>
            </div>
            <button
              onClick={onNavigateToInventory}
              className="text-[11px] text-red-600 hover:underline mt-2 flex items-center gap-1 font-semibold"
            >
              <span>Manage Inventory Matrix</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
        </div>
      </div>

      {/* Tables Section: Recent Invoices & Critical Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Invoices */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-red-600" />
                <span>Recent POS Transactions</span>
              </h3>
              <button
                onClick={onNavigateToSales}
                className="text-xs text-red-600 hover:text-red-700 font-semibold"
              >
                View All
              </button>
            </div>

            <div className="mt-3 divide-y divide-slate-100">
              {recentSales.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No sales recorded yet. Start billing on the POS Terminal!
                </div>
              ) : (
                recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    onClick={() => onSelectSale(sale)}
                    className="py-2.5 flex items-center justify-between hover:bg-red-50/30 px-2 rounded-md cursor-pointer transition"
                  >
                    <div>
                      <div className="font-semibold text-xs text-slate-900 flex items-center gap-2">
                        <span>{sale.invoiceNumber}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(sale.saleDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {sale.customerName} • {sale.items.length} garments
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-black text-xs text-red-600">
                        {settings.currencySymbol} {sale.grandTotal.toLocaleString()}
                      </div>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          sale.paymentStatus === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {sale.paymentStatus}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={onNavigateToPOS}
            className="w-full mt-3 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 transition shadow-xs"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Launch POS Terminal</span>
          </button>
        </div>

        {/* Low Stock Items Warning Table */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Low & Critical Stock Matrix</span>
              </h3>
              <button
                onClick={onNavigateToInventory}
                className="text-xs text-red-600 hover:text-red-700 font-semibold"
              >
                Restock
              </button>
            </div>

            <div className="mt-3 divide-y divide-slate-100">
              {criticalStockVariants.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  All garment variants are well stocked.
                </div>
              ) : (
                criticalStockVariants.map((v) => (
                  <div key={v.id} className="py-2.5 flex items-center justify-between px-2">
                    <div>
                      <div className="font-semibold text-xs text-slate-900">{v.productName}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span className="font-bold text-slate-700">{v.sizeName} / {v.colorName}</span>
                        <span>•</span>
                        <span className="font-mono text-[10px] text-slate-400">{v.sku}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-xs font-bold ${
                          v.quantity <= 0 ? 'text-red-600 font-black' : 'text-amber-600'
                        }`}
                      >
                        {v.quantity <= 0 ? '0 (Out of stock)' : `${v.quantity} units left`}
                      </div>
                      <span className="text-[10px] text-slate-400">Min: {v.minStock}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
            <span>Offline-Ready Barcode Scanning enabled</span>
            <span className="text-emerald-700 font-semibold">Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
};
