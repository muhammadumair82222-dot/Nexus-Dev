import React, { useState, useEffect } from 'react';
import { Truck, Plus, Search, CheckCircle, Building2, Package, X, Calendar } from 'lucide-react';
import { purchaseService } from '../../services/purchaseService';
import { inventoryService } from '../../services/inventoryService';
import { supplierService } from '../../services/supplierService';
import { authService } from '../../services/authService';
import { Purchase, Supplier, ProductVariant, PaymentMethod, ShopSettings } from '../../types';

interface PurchaseManagerProps {
  settings: ShopSettings;
}

export const PurchaseManager: React.FC<PurchaseManagerProps> = ({ settings }) => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [search, setSearch] = useState('');

  // New Purchase Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [itemsToPurchase, setItemsToPurchase] = useState<
    {
      variantId: string;
      productName: string;
      sizeName: string;
      colorName: string;
      sku: string;
      quantity: number;
      unitPurchasePrice: number;
    }[]
  >([]);
  const [selectedVariantToAdd, setSelectedVariantToAdd] = useState('');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    const [p, s, v] = await Promise.all([
      purchaseService.getAllPurchases(),
      supplierService.getSuppliers(),
      inventoryService.getVariants()
    ]);
    setPurchases(p.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()));
    setSuppliers(s);
    setVariants(v);
    if (s.length > 0 && !selectedSupplierId) setSelectedSupplierId(s[0].id);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddVariantLine = () => {
    if (!selectedVariantToAdd) return;
    const v = variants.find((variant) => variant.id === selectedVariantToAdd);
    if (!v) return;

    if (itemsToPurchase.some((i) => i.variantId === v.id)) return;

    setItemsToPurchase((prev) => [
      ...prev,
      {
        variantId: v.id,
        productName: v.productName || 'Garment Item',
        sizeName: v.sizeName || '',
        colorName: v.colorName || '',
        sku: v.sku,
        quantity: 10,
        unitPurchasePrice: v.purchasePrice
      }
    ]);
    setSelectedVariantToAdd('');
  };

  const removeItemLine = (variantId: string) => {
    setItemsToPurchase((prev) => prev.filter((i) => i.variantId !== variantId));
  };

  const handleCreatePurchase = async () => {
    if (!selectedSupplierId || itemsToPurchase.length === 0) return;
    const sup = suppliers.find((s) => s.id === selectedSupplierId);
    if (!sup) return;

    setIsSubmitting(true);
    try {
      const user = authService.getCurrentUser();
      await purchaseService.createPurchase({
        supplier: sup,
        invoiceNo: invoiceNo || `PINV-${Date.now().toString().slice(-6)}`,
        items: itemsToPurchase.map((item) => ({
          ...item,
          discount: 0,
          taxAmount: 0
        })),
        paidAmount,
        paymentMethod,
        user: { id: user.id, name: user.fullName }
      });

      setShowModal(false);
      setItemsToPurchase([]);
      setPaidAmount(0);
      setInvoiceNo('');
      await loadData();
    } catch (e) {
      console.error('Error creating purchase:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const grandTotal = itemsToPurchase.reduce((sum, item) => sum + item.quantity * item.unitPurchasePrice, 0);

  const filtered = purchases.filter(
    (p) =>
      p.purchaseInvoiceNo.toLowerCase().includes(search.toLowerCase()) ||
      p.supplierName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-4 bg-slate-50 text-slate-900 min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-red-600" />
            <span>Supplier Purchases & Stock Intake</span>
          </h2>
          <p className="text-xs text-slate-500">
            Intake garment stock from textile mills, update supplier payables and inventory valuation
          </p>
        </div>

        <button
          onClick={() => {
            setShowModal(true);
            if (variants.length > 0) {
              setItemsToPurchase([
                {
                  variantId: variants[0].id,
                  productName: variants[0].productName || '',
                  sizeName: variants[0].sizeName || '',
                  colorName: variants[0].colorName || '',
                  sku: variants[0].sku,
                  quantity: 12,
                  unitPurchasePrice: variants[0].purchasePrice
                }
              ]);
            }
          }}
          className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md shadow-red-600/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Purchase Intake</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-2.5 rounded-lg border border-slate-200 max-w-md shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Invoice No or Supplier Company..."
            className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
          />
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-2.5 px-3">Purchase Inv #</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Supplier Name</th>
                <th className="py-2.5 px-3">Items Received</th>
                <th className="py-2.5 px-3 text-right">Invoice Total</th>
                <th className="py-2.5 px-3 text-right">Amount Paid</th>
                <th className="py-2.5 px-3 text-right">Payable Due</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No supplier purchases recorded yet. Click "New Purchase Intake" to record received inventory.
                  </td>
                </tr>
              ) : (
                filtered.map((pur) => (
                  <tr key={pur.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{pur.purchaseInvoiceNo}</td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {new Date(pur.invoiceDate).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{pur.supplierName}</td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {pur.items.length} variants ({pur.items.reduce((s, i) => s + i.quantity, 0)} units)
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      {settings.currencySymbol} {pur.grandTotal.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 font-semibold">
                      {settings.currencySymbol} {pur.paidAmount.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {pur.balanceDue > 0 ? (
                        <span className="font-bold text-red-600">
                          {settings.currencySymbol} {pur.balanceDue.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-400">Cleared</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          pur.paymentStatus === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {pur.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: New Purchase Intake */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-base text-slate-900">New Supplier Purchase Intake</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-600 block mb-1">Select Supplier *</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-red-500"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.companyName || s.name} (Payable: {settings.currencySymbol} {s.currentPayable.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-600 block mb-1">Supplier Invoice Number</label>
                  <input
                    type="text"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    placeholder="e.g. MILL-INV-99201"
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Add Variant Selector */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <label className="text-xs font-semibold text-slate-800">Add Garment Variant:</label>
                <div className="flex gap-2">
                  <select
                    value={selectedVariantToAdd}
                    onChange={(e) => setSelectedVariantToAdd(e.target.value)}
                    className="flex-1 bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-red-500"
                  >
                    <option value="">-- Choose Variant to Add --</option>
                    {variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.productName} ({v.sizeName} / {v.colorName}) - SKU: {v.sku}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddVariantLine}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded shadow-xs"
                  >
                    Add Line
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-800">Items Received:</div>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs bg-white">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                        <th className="p-2">Garment Item</th>
                        <th className="p-2 w-20 text-center">Qty</th>
                        <th className="p-2 w-28 text-right">Cost Price</th>
                        <th className="p-2 text-right">Line Total</th>
                        <th className="p-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {itemsToPurchase.map((item, idx) => (
                        <tr key={item.variantId}>
                          <td className="p-2">
                            <div className="font-bold text-slate-900">{item.productName}</div>
                            <div className="text-[10px] text-slate-500">
                              {item.sizeName} / {item.colorName} ({item.sku})
                            </div>
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const val = Math.max(1, Number(e.target.value));
                                setItemsToPurchase((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, quantity: val } : it))
                                );
                              }}
                              className="w-16 bg-white border border-slate-300 rounded text-center py-0.5 text-slate-900 font-bold"
                            />
                          </td>
                          <td className="p-2 text-right">
                            <input
                              type="number"
                              value={item.unitPurchasePrice}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setItemsToPurchase((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, unitPurchasePrice: val } : it))
                                );
                              }}
                              className="w-24 bg-white border border-slate-300 rounded text-right py-0.5 px-1.5 text-slate-900"
                            />
                          </td>
                          <td className="p-2 text-right font-bold text-red-600">
                            {settings.currencySymbol} {(item.quantity * item.unitPurchasePrice).toLocaleString()}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              onClick={() => removeItemLine(item.variantId)}
                              className="text-slate-400 hover:text-red-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-xs text-slate-600 block mb-1">Amount Paid on Receipt:</label>
                  <input
                    type="number"
                    value={paidAmount || ''}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                    placeholder="0"
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-600 block mb-1">Payment Tender:</label>
                  <select
                    value={paymentMethod}
                    onChange={(e: any) => setPaymentMethod(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-red-500"
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CARD">Card</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                <span className="text-slate-600 font-medium">Total Invoice Payable:</span>
                <span className="text-base font-black text-red-600">
                  {settings.currencySymbol} {grandTotal.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePurchase}
                disabled={isSubmitting || itemsToPurchase.length === 0}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-md shadow-md shadow-red-600/20"
              >
                {isSubmitting ? 'Recording Intake...' : 'Confirm Stock Intake & Update Ledger'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
