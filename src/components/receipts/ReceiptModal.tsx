import React, { useState } from 'react';
import { X, Printer, FileText, CheckCircle2, Share2 } from 'lucide-react';
import { Sale, ShopSettings } from '../../types';

interface ReceiptModalProps {
  sale: Sale;
  settings: ShopSettings;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, settings, onClose }) => {
  const [printFormat, setPrintFormat] = useState<'THERMAL' | 'A4'>('THERMAL');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl max-w-xl w-full p-4 shadow-2xl flex flex-col max-h-[95vh] text-slate-900">
        {/* Top Controls */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-red-600" />
            <h3 className="font-bold text-sm text-slate-900">Invoice #{sale.invoiceNumber}</h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Format toggle */}
            <div className="bg-slate-100 p-0.5 rounded-lg border border-slate-200 flex text-xs">
              <button
                onClick={() => setPrintFormat('THERMAL')}
                className={`px-2.5 py-1 rounded font-medium transition ${
                  printFormat === 'THERMAL' ? 'bg-red-600 text-white font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Thermal (80mm)
              </button>
              <button
                onClick={() => setPrintFormat('A4')}
                className={`px-2.5 py-1 rounded font-medium transition ${
                  printFormat === 'A4' ? 'bg-red-600 text-white font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                A4 Invoice
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-md flex items-center gap-1.5 shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>

            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="flex-1 overflow-y-auto py-4 px-2 flex justify-center bg-slate-100 rounded my-2">
          {printFormat === 'THERMAL' ? (
            /* THERMAL 80mm RECEIPT STYLING */
            <div
              id="printable-receipt"
              className="bg-white text-black p-5 rounded font-mono text-xs w-[320px] shadow-md leading-tight select-all border border-gray-200"
            >
              {/* Header */}
              <div className="text-center space-y-1 pb-3 border-b border-dashed border-gray-400">
                <div className="font-black text-sm tracking-wider uppercase">{settings.shopName}</div>
                <div className="text-[10px] text-gray-700">{settings.address}</div>
                <div className="text-[10px] text-gray-700">Phone: {settings.phone}</div>
                <div className="text-[10px] font-bold mt-1 text-gray-900">RETAIL SALE INVOICE</div>
              </div>

              {/* Meta */}
              <div className="py-2 border-b border-dashed border-gray-400 space-y-0.5 text-[11px]">
                <div className="flex justify-between">
                  <span>Inv #:</span>
                  <span className="font-bold">{sale.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{new Date(sale.saleDate).toLocaleDateString()} {new Date(sale.saleDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cashier:</span>
                  <span>{sale.cashierName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="font-medium truncate max-w-[170px]">{sale.customerName}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="py-2 border-b border-dashed border-gray-400">
                <div className="flex justify-between font-bold text-[10px] pb-1 uppercase border-b border-gray-200 mb-1">
                  <span>Item / Size</span>
                  <span>Qty x Rate</span>
                  <span className="text-right">Total</span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  {sale.items.map((item) => (
                    <div key={item.id}>
                      <div className="font-bold truncate">{item.productName}</div>
                      <div className="flex justify-between text-[10px] text-gray-600">
                        <span>[{item.sizeName} - {item.colorName}]</span>
                        <span>{item.quantity} x {item.unitPrice}</span>
                        <span className="font-bold text-black">{item.total.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Summary */}
              <div className="py-2 border-b border-dashed border-gray-400 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{settings.currencySymbol} {sale.subtotal.toLocaleString()}</span>
                </div>
                {sale.discountAmount > 0 && (
                  <div className="flex justify-between text-gray-700">
                    <span>Discount:</span>
                    <span>- {settings.currencySymbol} {sale.discountAmount.toLocaleString()}</span>
                  </div>
                )}
                {sale.taxAmount > 0 && (
                  <div className="flex justify-between text-gray-700">
                    <span>Tax:</span>
                    <span>{settings.currencySymbol} {sale.taxAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm pt-1 border-t border-gray-300">
                  <span>TOTAL:</span>
                  <span>{settings.currencySymbol} {sale.grandTotal.toLocaleString()}</span>
                </div>

                <div className="flex justify-between pt-1 text-[10px]">
                  <span>Paid ({sale.payments.map((p) => p.paymentMethod).join(', ')}):</span>
                  <span className="font-bold">{settings.currencySymbol} {sale.paidAmount.toLocaleString()}</span>
                </div>

                {sale.balanceDue > 0 && (
                  <div className="flex justify-between font-bold text-red-600 text-[10px]">
                    <span>Credit / Balance Due:</span>
                    <span>{settings.currencySymbol} {sale.balanceDue.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Barcode & Footer */}
              <div className="text-center pt-3 space-y-1.5">
                {/* Visual Barcode representation */}
                <div className="font-mono text-xs tracking-widest bg-gray-100 py-1 rounded border border-gray-300">
                  ||| | ||||| || ||| |||| |
                </div>
                <div className="text-[10px] font-mono text-gray-600">{sale.clientTxId.slice(0, 16).toUpperCase()}</div>
                <div className="text-[9px] text-gray-600 leading-normal px-2">
                  {settings.receiptFooterMessage}
                </div>
                <div className="text-[9px] text-gray-500 pt-1">
                  Powered by StitchFlow POS & ERP
                </div>
              </div>
            </div>
          ) : (
            /* FORMAL A4 INVOICE STYLING */
            <div
              id="printable-receipt"
              className="bg-white text-black p-8 rounded font-sans text-xs w-[520px] shadow-lg leading-normal border border-gray-200"
            >
              {/* Top Banner */}
              <div className="flex justify-between items-start pb-4 border-b-2 border-red-600">
                <div>
                  <h1 className="text-xl font-black text-red-700 tracking-tight">{settings.shopName}</h1>
                  <p className="text-gray-600 text-[11px] mt-0.5">{settings.address}</p>
                  <p className="text-gray-600 text-[11px]">Phone: {settings.phone} | Email: {settings.email}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-gray-900">TAX INVOICE</div>
                  <div className="text-xs font-bold text-red-600">{sale.invoiceNumber}</div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    Date: {new Date(sale.saleDate).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Bill To Info */}
              <div className="grid grid-cols-2 gap-4 py-4 border-b border-gray-200">
                <div>
                  <div className="font-bold text-gray-500 text-[10px] uppercase">Billed To:</div>
                  <div className="font-bold text-sm text-gray-900">{sale.customerName}</div>
                  {sale.customerPhone && <div className="text-gray-600 text-xs">Phone: {sale.customerPhone}</div>}
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-500 text-[10px] uppercase">Cashier & Station:</div>
                  <div className="font-semibold text-gray-800">{sale.cashierName}</div>
                  <div className="text-[10px] text-gray-500">POS Terminal #01 (Offline/Online Synced)</div>
                </div>
              </div>

              {/* Table */}
              <table className="w-full mt-3 text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-300">
                    <th className="py-2 px-2">#</th>
                    <th className="py-2 px-2">Description</th>
                    <th className="py-2 px-2">Variant / SKU</th>
                    <th className="py-2 px-2 text-center">Qty</th>
                    <th className="py-2 px-2 text-right">Unit Price</th>
                    <th className="py-2 px-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sale.items.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="py-2 px-2 text-gray-500">{idx + 1}</td>
                      <td className="py-2 px-2 font-semibold text-gray-900">{item.productName}</td>
                      <td className="py-2 px-2 text-gray-600">
                        {item.sizeName} / {item.colorName} ({item.sku})
                      </td>
                      <td className="py-2 px-2 text-center">{item.quantity}</td>
                      <td className="py-2 px-2 text-right">{item.unitPrice.toLocaleString()}</td>
                      <td className="py-2 px-2 text-right font-bold text-gray-900">{item.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="mt-4 pt-3 border-t-2 border-gray-200 flex justify-end">
                <div className="w-60 space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span>{settings.currencySymbol} {sale.subtotal.toLocaleString()}</span>
                  </div>
                  {sale.discountAmount > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Discount:</span>
                      <span>- {settings.currencySymbol} {sale.discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-sm text-gray-900 pt-1 border-t border-gray-300">
                    <span>Grand Total:</span>
                    <span className="text-blue-900">{settings.currencySymbol} {sale.grandTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Amount Paid:</span>
                    <span className="font-bold">{settings.currencySymbol} {sale.paidAmount.toLocaleString()}</span>
                  </div>
                  {sale.balanceDue > 0 && (
                    <div className="flex justify-between font-bold text-red-600">
                      <span>Balance Outstanding:</span>
                      <span>{settings.currencySymbol} {sale.balanceDue.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Note */}
              <div className="mt-8 pt-4 border-t border-gray-200 text-center text-gray-500 text-[10px]">
                {settings.receiptFooterMessage}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
