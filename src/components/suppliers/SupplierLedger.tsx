import React, { useState, useEffect } from 'react';
import { Building2, Plus, Search, DollarSign, ArrowUpRight, X } from 'lucide-react';
import { supplierService, SupplierLedgerEntry } from '../../services/supplierService';
import { authService } from '../../services/authService';
import { Supplier, PaymentMethod, ShopSettings } from '../../types';

interface SupplierLedgerProps {
  settings: ShopSettings;
}

export const SupplierLedger: React.FC<SupplierLedgerProps> = ({ settings }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<SupplierLedgerEntry[]>([]);
  const [search, setSearch] = useState('');

  // Payment Modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [referenceNo, setReferenceNo] = useState('');
  const [payNotes, setPayNotes] = useState('');

  // Add Supplier Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number>(0);

  const loadSuppliers = async () => {
    const list = await supplierService.getSuppliers();
    setSuppliers(list);
    if (!selectedSupplier && list.length > 0) {
      handleSelectSupplier(list[0]);
    } else if (selectedSupplier) {
      const refreshed = list.find((s) => s.id === selectedSupplier.id);
      if (refreshed) handleSelectSupplier(refreshed);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleSelectSupplier = async (sup: Supplier) => {
    setSelectedSupplier(sup);
    const ledger = await supplierService.getSupplierLedger(sup.id);
    setLedgerEntries(ledger);
  };

  const handlePaySupplier = async () => {
    if (!selectedSupplier || payAmount <= 0) return;
    const user = authService.getCurrentUser();
    await supplierService.paySupplier(selectedSupplier.id, payAmount, payMethod, referenceNo, payNotes, {
      id: user.id,
      name: user.fullName
    });
    setShowPayModal(false);
    setPayAmount(0);
    setReferenceNo('');
    setPayNotes('');
    await loadSuppliers();
  };

  const handleCreateSupplier = async () => {
    if (!name || !companyName) return;
    const newSup: Supplier = {
      id: `sup-${Date.now()}`,
      name,
      companyName,
      phone,
      address,
      openingBalance,
      currentPayable: openingBalance,
      totalPurchases: 0,
      totalPaid: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await supplierService.saveSupplier(newSup);
    setShowAddModal(false);
    setName('');
    setCompanyName('');
    setPhone('');
    setAddress('');
    setOpeningBalance(0);
    await loadSuppliers();
    handleSelectSupplier(newSup);
  };

  const filtered = suppliers.filter(
    (s) =>
      s.companyName.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search)
  );

  return (
    <div className="p-4 md:p-6 space-y-4 bg-slate-50 text-slate-900 min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-red-600" />
            <span>Suppliers & Accounts Payable Ledger</span>
          </h2>
          <p className="text-xs text-slate-500">
            Manage textile mills, purchase invoices, payment vouchers, and running payables
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md shadow-red-600/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Supplier Mill</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Supplier List */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search supplier or textile mill..."
              className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          <div className="max-h-[calc(100vh-16rem)] overflow-y-auto space-y-2 pr-1">
            {filtered.map((s) => (
              <div
                key={s.id}
                onClick={() => handleSelectSupplier(s)}
                className={`p-3 rounded-lg border cursor-pointer transition ${
                  selectedSupplier?.id === s.id
                    ? 'bg-red-50 border-red-500 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-xs text-slate-900">{s.companyName}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{s.name} • {s.phone}</div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-xs font-black ${
                        s.currentPayable > 0 ? 'text-red-600' : 'text-slate-500'
                      }`}
                    >
                      {settings.currencySymbol} {s.currentPayable.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {s.currentPayable > 0 ? 'Payable Due' : 'Cleared'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Supplier Statement */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-xs">
          {selectedSupplier ? (
            <div>
              <div className="pb-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedSupplier.companyName}</h3>
                  <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                    <span>Contact: {selectedSupplier.name}</span>
                    <span>• {selectedSupplier.phone}</span>
                    {selectedSupplier.address && <span>• {selectedSupplier.address}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                    <div className="text-[10px] text-slate-500">Total Payable Outstanding:</div>
                    <div className="text-base font-black text-red-600">
                      {settings.currencySymbol} {selectedSupplier.currentPayable.toLocaleString()}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setPayAmount(selectedSupplier.currentPayable || 5000);
                      setShowPayModal(true);
                    }}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Pay Supplier</span>
                  </button>
                </div>
              </div>

              {/* Ledger Entries Table */}
              <div className="mt-3">
                <div className="text-xs font-bold text-slate-800 mb-2">Supplier Account History:</div>
                <div className="overflow-x-auto max-h-[calc(100vh-21rem)] border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs bg-white">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                        <th className="py-2 px-2.5">Date</th>
                        <th className="py-2 px-2.5">Type</th>
                        <th className="py-2 px-2.5">Reference #</th>
                        <th className="py-2 px-2.5">Description</th>
                        <th className="py-2 px-2.5 text-right">Debit (Paid)</th>
                        <th className="py-2 px-2.5 text-right">Credit (Purchased)</th>
                        <th className="py-2 px-2.5 text-right">Running Payable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ledgerEntries.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            No ledger entries found for this supplier yet.
                          </td>
                        </tr>
                      ) : (
                        ledgerEntries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-slate-50">
                            <td className="py-2 px-2.5 text-slate-500">
                              {new Date(entry.date).toLocaleDateString()}
                            </td>
                            <td className="py-2 px-2.5 font-bold">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] ${
                                  entry.type === 'PURCHASE'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}
                              >
                                {entry.type}
                              </span>
                            </td>
                            <td className="py-2 px-2.5 font-mono text-[11px] text-slate-600">
                              {entry.referenceNo}
                            </td>
                            <td className="py-2 px-2.5 text-slate-700">{entry.description}</td>
                            <td className="py-2 px-2.5 text-right text-emerald-600 font-semibold">
                              {entry.debit > 0 ? `${settings.currencySymbol} ${entry.debit.toLocaleString()}` : '-'}
                            </td>
                            <td className="py-2 px-2.5 text-right text-red-600 font-semibold">
                              {entry.credit > 0 ? `${settings.currencySymbol} ${entry.credit.toLocaleString()}` : '-'}
                            </td>
                            <td className="py-2 px-2.5 text-right font-black text-red-600">
                              {settings.currencySymbol} {entry.balance.toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-xs text-slate-400">
              Select a supplier mill to view statement.
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Pay Supplier */}
      {showPayModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-5 space-y-3 shadow-2xl text-slate-900">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h4 className="font-bold text-sm text-slate-900">Record Payment to Supplier</h4>
              <button onClick={() => setShowPayModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Payment to {selectedSupplier.companyName}. Current Payable: {settings.currencySymbol}{' '}
              {selectedSupplier.currentPayable.toLocaleString()}
            </p>

            <div>
              <label className="text-xs text-slate-600 block mb-1">Amount to Pay *</label>
              <input
                type="number"
                value={payAmount || ''}
                onChange={(e) => setPayAmount(Number(e.target.value))}
                placeholder="0"
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-600 block mb-1">Payment Method</label>
              <select
                value={payMethod}
                onChange={(e: any) => setPayMethod(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-red-500"
              >
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-600 block mb-1">Cheque / Transfer Ref #</label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="e.g. IBFT-88492"
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-red-500"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setShowPayModal(false)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handlePaySupplier}
                disabled={payAmount <= 0}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded shadow-md shadow-red-600/20"
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: New Supplier */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-5 space-y-3 shadow-2xl text-slate-900">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h4 className="font-bold text-sm text-slate-900">Create Supplier / Mill Account</h4>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-600 block mb-1">Company / Mill Name *</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Sitara Weaving & Processing"
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-600 block mb-1">Contact Person *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Haji Aslam"
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-600 block mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+92 300 0000000"
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-600 block mb-1">Mill / Office Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Industrial Area, City"
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-600 block mb-1">Opening Payable Balance</label>
              <input
                type="number"
                value={openingBalance || ''}
                onChange={(e) => setOpeningBalance(Number(e.target.value))}
                placeholder="0"
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-red-500"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSupplier}
                disabled={!companyName || !name}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded shadow-md shadow-red-600/20"
              >
                Save Supplier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
