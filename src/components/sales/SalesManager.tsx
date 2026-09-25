import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  RotateCcw,
  Eye,
  Filter,
  CheckCircle2,
  AlertCircle,
  Calendar,
  X,
  ArrowRight,
  Clock
} from 'lucide-react';
import { localDB } from '../../db/indexedDb';
import { returnsService } from '../../services/returnsService';
import { authService } from '../../services/authService';
import { Sale, SalesReturn, ShopSettings } from '../../types';

interface SalesManagerProps {
  settings: ShopSettings;
  onViewReceipt: (sale: Sale) => void;
}

export const SalesManager: React.FC<SalesManagerProps> = ({ settings, onViewReceipt }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [activeTab, setActiveTab] = useState<'SALES' | 'RETURNS'>('SALES');
  const [search, setSearch] = useState('');

  // Return Modal State
  const [returnSale, setReturnSale] = useState<Sale | null>(null);
  const [returnItemsState, setReturnItemsState] = useState<
    {
      saleItemId: string;
      variantId: string;
      productName: string;
      sizeName: string;
      colorName: string;
      maxQty: number;
      returnQty: number;
      refundPrice: number;
      reason: string;
    }[]
  >([]);
  const [refundType, setRefundType] = useState<'CASH_REFUND' | 'STORE_CREDIT' | 'EXCHANGE'>('CASH_REFUND');
  const [returnNotes, setReturnNotes] = useState('');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  const loadData = async () => {
    const [allSales, allReturns] = await Promise.all([
      localDB.getAll<Sale>('sales'),
      returnsService.getAllReturns()
    ]);
    setSales(allSales.sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime()));
    setReturns(allReturns.sort((a, b) => new Date(b.returnDate).getTime() - new Date(a.returnDate).getTime()));
  };

  useEffect(() => {
    loadData();
  }, []);

  const openReturnModal = (sale: Sale) => {
    setReturnSale(sale);
    setReturnItemsState(
      sale.items.map((item) => ({
        saleItemId: item.id,
        variantId: item.variantId,
        productName: item.productName,
        sizeName: item.sizeName,
        colorName: item.colorName,
        maxQty: item.quantity,
        returnQty: 0,
        refundPrice: item.unitPrice - item.discount,
        reason: 'Wrong size / fitting'
      }))
    );
    setRefundType('CASH_REFUND');
  };

  const handleExecuteReturn = async () => {
    if (!returnSale) return;
    const selected = returnItemsState.filter((i) => i.returnQty > 0);
    if (selected.length === 0) return;

    setIsSubmittingReturn(true);
    try {
      const user = authService.getCurrentUser();
      await returnsService.processReturn({
        originalSaleId: returnSale.id,
        originalInvoiceNumber: returnSale.invoiceNumber,
        customerId: returnSale.customerId,
        customerName: returnSale.customerName,
        items: selected.map((s) => ({
          saleItemId: s.saleItemId,
          variantId: s.variantId,
          productName: s.productName,
          sizeName: s.sizeName,
          colorName: s.colorName,
          quantity: s.returnQty,
          refundPrice: s.refundPrice,
          reason: s.reason
        })),
        refundType,
        notes: returnNotes,
        cashier: { id: user.id, name: user.fullName }
      });

      setReturnSale(null);
      await loadData();
    } catch (err) {
      console.error('Error processing return:', err);
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  const filteredSales = sales.filter(
    (s) =>
      s.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      (s.customerName && s.customerName.toLowerCase().includes(search.toLowerCase())) ||
      (s.customerPhone && s.customerPhone.includes(search))
  );

  return (
    <div className="p-4 md:p-6 space-y-4 bg-slate-50 text-slate-900 min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-red-600" />
            <span>Sales Invoices & Returns Management</span>
          </h2>
          <p className="text-xs text-slate-500">
            Track completed sales, print duplicate receipts, and process returns or exchanges
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-white border border-slate-200 p-1 rounded-lg text-xs self-start sm:self-auto shadow-2xs">
          <button
            onClick={() => setActiveTab('SALES')}
            className={`px-3 py-1 rounded-md font-medium transition ${
              activeTab === 'SALES' ? 'bg-red-600 text-white font-semibold shadow-xs' : 'text-slate-600 hover:text-red-700'
            }`}
          >
            Sales Invoices ({sales.length})
          </button>
          <button
            onClick={() => setActiveTab('RETURNS')}
            className={`px-3 py-1 rounded-md font-medium transition ${
              activeTab === 'RETURNS' ? 'bg-red-600 text-white font-semibold shadow-xs' : 'text-slate-600 hover:text-red-700'
            }`}
          >
            Returns & Exchanges ({returns.length})
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white p-2.5 rounded-lg border border-slate-200 max-w-md shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Invoice Number, Customer Name or Phone..."
            className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
      </div>

      {/* Content Tables */}
      {activeTab === 'SALES' ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Cashier</th>
                  <th className="py-2.5 px-3">Items</th>
                  <th className="py-2.5 px-3 text-right">Grand Total</th>
                  <th className="py-2.5 px-3 text-right">Paid</th>
                  <th className="py-2.5 px-3 text-right">Due</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      No sales invoices found matching your query.
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-red-50/20 transition">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{sale.invoiceNumber}</td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {new Date(sale.saleDate).toLocaleDateString()} {new Date(sale.saleDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{sale.customerName}</div>
                        {sale.customerPhone && <div className="text-[10px] text-slate-400">{sale.customerPhone}</div>}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{sale.cashierName}</td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {sale.items.length} garments ({sale.items.reduce((s, i) => s + i.quantity, 0)} pcs)
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-red-600">
                        {settings.currencySymbol} {sale.grandTotal.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700 font-medium">
                        {settings.currencySymbol} {sale.paidAmount.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {sale.balanceDue > 0 ? (
                          <span className="font-bold text-red-600">
                            {settings.currencySymbol} {sale.balanceDue.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            sale.paymentStatus === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {sale.paymentStatus}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onViewReceipt(sale)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition"
                            title="View / Print Invoice"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openReturnModal(sale)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded transition"
                            title="Process Return / Exchange"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* RETURNS TAB */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="py-2.5 px-3">Return #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Original Invoice</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Returned Items</th>
                  <th className="py-2.5 px-3 text-right">Refund Amount</th>
                  <th className="py-2.5 px-3 text-center">Refund Type</th>
                  <th className="py-2.5 px-3">Cashier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {returns.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No customer returns or exchanges recorded yet.
                    </td>
                  </tr>
                ) : (
                  returns.map((ret) => (
                    <tr key={ret.id} className="hover:bg-red-50/20">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{ret.returnNumber}</td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {new Date(ret.returnDate).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-red-600">{ret.originalInvoiceNumber}</td>
                      <td className="py-2.5 px-3 text-slate-800 font-medium">{ret.customerName}</td>
                      <td className="py-2.5 px-3">
                        <div className="space-y-0.5">
                          {ret.items.map((i) => (
                            <div key={i.id} className="text-[11px] text-slate-600">
                              {i.quantity}x {i.productName} ({i.sizeName} / {i.colorName}) — <span className="text-slate-400">{i.reason}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-red-600">
                        {settings.currencySymbol} {ret.totalRefundAmount.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {ret.refundType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{ret.cashierName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Process Return / Exchange */}
      {returnSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-base text-slate-900">
                  Return / Exchange for #{returnSale.invoiceNumber}
                </h3>
              </div>
              <button onClick={() => setReturnSale(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              <p className="text-xs text-slate-500">
                Select the garment items to return or exchange. Stock counters will update automatically.
              </p>

              {/* Items List */}
              <div className="space-y-2 border border-slate-200 rounded-lg p-2.5 bg-slate-50">
                {returnItemsState.map((item, idx) => (
                  <div key={item.saleItemId} className="p-2 border-b border-slate-200 last:border-0 space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-slate-900">{item.productName}</div>
                        <div className="text-[11px] text-slate-500">
                          {item.sizeName} / {item.colorName} • Purchased: {item.maxQty} pcs
                        </div>
                      </div>
                      <div className="font-bold text-red-600">
                        {settings.currencySymbol} {item.refundPrice.toLocaleString()} each
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-600">Return Qty:</span>
                        <input
                          type="number"
                          min="0"
                          max={item.maxQty}
                          value={item.returnQty}
                          onChange={(e) => {
                            const val = Math.min(item.maxQty, Math.max(0, Number(e.target.value)));
                            setReturnItemsState((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, returnQty: val } : it))
                            );
                          }}
                          className="w-14 bg-white border border-slate-300 text-center py-0.5 rounded text-slate-900 font-bold focus:ring-red-500"
                        />
                      </div>

                      {item.returnQty > 0 && (
                        <select
                          value={item.reason}
                          onChange={(e) => {
                            const val = e.target.value;
                            setReturnItemsState((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, reason: val } : it))
                            );
                          }}
                          className="bg-white border border-slate-300 text-[11px] rounded px-2 py-0.5 text-slate-800 focus:ring-red-500"
                        >
                          <option value="Wrong size / fitting">Wrong size / fitting</option>
                          <option value="Defective fabric / stitching">Defective fabric / stitching</option>
                          <option value="Color mismatch">Color mismatch</option>
                          <option value="Customer changed mind">Customer changed mind</option>
                        </select>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Refund Method */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Settlement Type:
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
                  {[
                    { id: 'CASH_REFUND', label: 'Cash Refund' },
                    { id: 'STORE_CREDIT', label: 'Store Credit' },
                    { id: 'EXCHANGE', label: 'Exchange Voucher' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setRefundType(m.id as any)}
                      className={`py-2 px-2 rounded-md border transition ${
                        refundType === m.id
                          ? 'bg-red-600 border-red-600 text-white shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-red-50'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Total Refund Calculation */}
              <div className="p-3 bg-red-50 rounded-lg border border-red-200 flex justify-between items-center text-xs">
                <span className="text-slate-700 font-medium">Total Refund / Exchange Value:</span>
                <span className="text-base font-black text-red-600">
                  {settings.currencySymbol}{' '}
                  {returnItemsState
                    .reduce((sum, item) => sum + item.returnQty * item.refundPrice, 0)
                    .toLocaleString()}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setReturnSale(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteReturn}
                disabled={
                  isSubmittingReturn ||
                  returnItemsState.filter((i) => i.returnQty > 0).length === 0
                }
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-md shadow-md shadow-red-600/20"
              >
                {isSubmittingReturn ? 'Restocking & Processing...' : 'Confirm Return / Exchange'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
