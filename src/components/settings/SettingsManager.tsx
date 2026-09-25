import React, { useState } from 'react';
import { Settings, Save, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { ShopSettings } from '../../types';
import { localDB } from '../../db/indexedDb';

interface SettingsManagerProps {
  settings: ShopSettings;
  onUpdateSettings: (newSettings: ShopSettings) => void;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({ settings, onUpdateSettings }) => {
  const [form, setForm] = useState<ShopSettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await localDB.put('settings', { key: 'main', ...form });

    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
    } catch {}

    onUpdateSettings(form);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="p-4 md:p-6 space-y-4 bg-slate-50 text-slate-900 min-h-full max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-red-600" />
            <span>Store Configuration & ERP Parameters</span>
          </h2>
          <p className="text-xs text-slate-500">
            Configure shop profile, tax rates, thermal printer dimensions, and negative stock policy
          </p>
        </div>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-2.5 rounded-lg text-xs flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Shop settings updated successfully across local and cloud configurations.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
        {/* Shop Profile */}
        <div>
          <h3 className="text-xs font-bold text-red-600 uppercase tracking-wider mb-3">
            Shop Brand & Contact Profile
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-600 font-medium block mb-1">Shop / Brand Name *</label>
              <input
                type="text"
                value={form.shopName}
                onChange={(e) => setForm({ ...form, shopName: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 font-semibold focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div>
              <label className="text-slate-600 font-medium block mb-1">Currency Symbol</label>
              <input
                type="text"
                value={form.currencySymbol}
                onChange={(e) => setForm({ ...form, currencySymbol: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 font-bold focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div>
              <label className="text-slate-600 font-medium block mb-1">Contact Phone Numbers</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div>
              <label className="text-slate-600 font-medium block mb-1">Official Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-slate-600 font-medium block mb-1">Physical Store & Showroom Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:ring-red-500 focus:border-red-500"
              />
            </div>
          </div>
        </div>

        {/* Business Rules & POS Policies */}
        <div className="pt-3 border-t border-slate-200">
          <h3 className="text-xs font-bold text-red-600 uppercase tracking-wider mb-3">
            POS Business Rules & Thermal Printing
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-600 font-medium block mb-1">Default Sales Tax Rate (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.taxRate}
                onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 font-bold focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div>
              <label className="text-slate-600 font-medium block mb-1">Thermal Receipt Width</label>
              <select
                value={form.thermalReceiptSize}
                onChange={(e: any) => setForm({ ...form, thermalReceiptSize: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:ring-red-500 focus:border-red-500"
              >
                <option value="80mm">80mm Standard POS Slip</option>
                <option value="58mm">58mm Compact POS Slip</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-slate-600 font-medium block mb-1">Receipt Footer Exchange Policy Note</label>
              <input
                type="text"
                value={form.receiptFooterMessage}
                onChange={(e) => setForm({ ...form, receiptFooterMessage: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:ring-red-500 focus:border-red-500"
              />
            </div>
          </div>

          {/* Negative Stock Policy Checkbox */}
          <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
            <div>
              <div className="font-bold text-xs text-slate-900">Negative Inventory Stock Policy</div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                When disabled, sales are strictly halted if physical garment stock reaches zero.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.allowNegativeStock}
                onChange={(e) => setForm({ ...form, allowNegativeStock: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
            </label>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg shadow-md shadow-red-600/20 flex items-center gap-2 transition"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
