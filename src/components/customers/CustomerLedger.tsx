import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, DollarSign, Receipt, Phone, MessageSquare, ArrowDownRight, X, Clock } from 'lucide-react';
import { customerService, CustomerLedgerEntry } from '../../services/customerService';
import { authService } from '../../services/authService';
import { Customer, PaymentMethod, ShopSettings } from '../../types';

interface CustomerLedgerProps {
  settings: ShopSettings;
}

export const CustomerLedger: React.FC<CustomerLedgerProps> = ({ settings }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<CustomerLedgerEntry[]>([]);
  const [search, setSearch] = useState('');

  // Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [referenceNo, setReferenceNo] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Add Customer Modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustWhatsapp, setNewCustWhatsapp] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustOpeningBal, setNewCustOpeningBal] = useState<number>(0);

  const loadCustomers = async () => {
    const list = await customerService.getCustomers();
    setCustomers(list);
    if (!selectedCustomer && list.length > 0) {
      handleSelectCustomer(list[0]);
    } else if (selectedCustomer) {
      const refreshed = list.find((c) => c.id === selectedCustomer.id);
      if (refreshed) handleSelectCustomer(refreshed);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleSelectCustomer = async (cust: Customer) => {
    setSelectedCustomer(cust);
    const ledger = await customerService.getCustomerLedger(cust.id);
    setLedgerEntries(ledger);
  };

  const handleReceivePayment = async () => {
    if (!selectedCustomer || paymentAmount <= 0) return;
    const user = authService.getCurrentUser();
    await customerService.receivePayment(
      selectedCustomer.id,
      paymentAmount,
      paymentMethod,
      referenceNo,
      paymentNotes,
      { id: user.id, name: user.fullName }
    );
    setShowPaymentModal(false);
    setPaymentAmount(0);
    setReferenceNo('');
    setPaymentNotes('');
    await loadCustomers();
  };

  const handleCreateCustomer = async () => {
    if (!newCustName || !newCustPhone) return;
    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      name: newCustName,
      phone: newCustPhone,
      whatsapp: newCustWhatsapp || newCustPhone,
      address: newCustAddress,
      openingBalance: newCustOpeningBal,
      currentBalance: newCustOpeningBal,
      totalPurchases: 0,
      totalPaid: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await customerService.saveCustomer(newCust);
    setShowAddCustomerModal(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustWhatsapp('');
    setNewCustAddress('');
    setNewCustOpeningBal(0);
    await loadCustomers();
    handleSelectCustomer(newCust);
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  return (
    <div className="p-4 md:p-6 space-y-4 bg-slate-50 text-slate-900 min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-red-600" />
            <span>Customers & Accounts Receivable Ledger</span>
          </h2>
          <p className="text-xs text-slate-500">
            Track customer balances, credit sales, payment receipts, and chronological ledgers
          </p>
        </div>

        <button
          onClick={() => setShowAddCustomerModal(true)}
          className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md shadow-red-600/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Customer Account</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Customer List */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer name or phone..."
              className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          <div className="max-h-[calc(100vh-16rem)] overflow-y-auto space-y-2 pr-1">
            {filtered.map((c) => (
              <div
                key={c.id}
                onClick={() => handleSelectCustomer(c)}
                className={`p-3 rounded-lg border cursor-pointer transition ${
                  selectedCustomer?.id === c.id
                    ? 'bg-red-50 border-red-500 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-xs text-slate-900">{c.name}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>{c.phone}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-xs font-black ${
                        c.currentBalance > 0 ? 'text-red-600' : 'text-slate-500'
                      }`}
                    >
                      {settings.currencySymbol} {c.currentBalance.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {c.currentBalance > 0 ? 'Due Receivable' : 'Zero Balance'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Selected Customer Statement / Ledger */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-xs">
          {selectedCustomer ? (
            <div>
              {/* Customer Profile Banner */}
              <div className="pb-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedCustomer.name}</h3>
                  <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                    <span>Phone: {selectedCustomer.phone}</span>
                    {selectedCustomer.address && <span>• {selectedCustomer.address}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                    <div className="text-[10px] text-slate-500">Current Khata / Balance:</div>
                    <div className="text-base font-black text-red-600">
                      {settings.currencySymbol} {selectedCustomer.currentBalance.toLocaleString()}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setPaymentAmount(selectedCustomer.currentBalance || 1000);
                      setShowPaymentModal(true);
                    }}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition"
                  >
                    <ArrowDownRight className="w-4 h-4" />
                    <span>Receive Payment</span>
                  </button>
                </div>
              </div>

              {/* Ledger Entries Table */}
              <div className="mt-3">
                <div className="text-xs font-bold text-slate-800 mb-2">Account Transaction History:</div>
                <div className="overflow-x-auto max-h-[calc(100vh-21rem)] border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs bg-white">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                        <th className="py-2 px-2.5">Date</th>
                        <th className="py-2 px-2.5">Type</th>
                        <th className="py-2 px-2.5">Reference #</th>
                        <th className="py-2 px-2.5">Description</th>
                        <th className="py-2 px-2.5 text-right">Debit (Added)</th>
                        <th className="py-2 px-2.5 text-right">Credit (Paid)</th>
                        <th className="py-2 px-2.5 text-right">Running Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ledgerEntries.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            No ledger transactions recorded for this customer yet.
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
                                  entry.type === 'SALE'
                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                    : entry.type === 'PAYMENT'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-purple-50 text-purple-700 border border-purple-200'
                                }`}
                              >
                                {entry.type}
                              </span>
                            </td>
                            <td className="py-2 px-2.5 font-mono text-[11px] text-slate-600">
                              {entry.referenceNo}
                            </td>
                            <td className="py-2 px-2.5 text-slate-700">{entry.description}</td>
                            <td className="py-2 px-2.5 text-right text-red-600 font-semibold">
                              {entry.debit > 0 ? `${settings.currencySymbol} ${entry.debit.toLocaleString()}` : '-'}
                            </td>
                            <td className="py-2 px-2.5 text-right text-emerald-600 font-semibold">
                              {entry.credit > 0 ? `${settings.currencySymbol} ${entry.credit.toLocaleString()}` : '-'}
                            </td>
                            <td className="py-2 px-2.5 text-right font-black text-slate-900">
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
              Select a customer from the left list to inspect their running statement.
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Receive Payment */}
      {showPaymentModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-5 space-y-3 shadow-2xl text-slate-900">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h4 className="font-bold text-sm text-slate-900">Receive Customer Payment</h4>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Collecting payment from {selectedCustomer.name}. Current Due: {settings.currencySymbol}{' '}
              {selectedCustomer.currentBalance.toLocaleString()}
            </p>

            <div>
              <label className="text-xs text-slate-600 block mb-1">Payment Amount *</label>
              <input
                type="number"
                value={paymentAmount || ''}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                placeholder="0"
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-600 block mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e: any) => setPaymentMethod(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-red-500"
              >
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CARD">Card</option>
                <option value="EASYPAISA">Easypaisa</option>
                <option value="JAZZCASH">JazzCash</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-600 block mb-1">Reference / Transaction ID</label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="e.g. Deposit Slip #1234"
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-red-500"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleReceivePayment}
                disabled={paymentAmount <= 0}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded shadow-xs"
              >
                Record Receipt & Settle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: New Customer */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-5 space-y-3 shadow-2xl text-slate-900">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h4 className="font-bold text-sm text-slate-900">Create Customer Account</h4>
              <button onClick={() => setShowAddCustomerModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-600 block mb-1">Customer Full Name *</label>
              <input
                type="text"
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
                placeholder="e.g. Tariq Mehmood"
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-600 block mb-1">Phone Number *</label>
              <input
                type="text"
                value={newCustPhone}
                onChange={(e) => setNewCustPhone(e.target.value)}
                placeholder="+92 300 1234567"
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-600 block mb-1">Address</label>
              <input
                type="text"
                value={newCustAddress}
                onChange={(e) => setNewCustAddress(e.target.value)}
                placeholder="Area, City"
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-600 block mb-1">Opening Due Balance</label>
              <input
                type="number"
                value={newCustOpeningBal || ''}
                onChange={(e) => setNewCustOpeningBal(Number(e.target.value))}
                placeholder="0"
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-red-500"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setShowAddCustomerModal(false)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCustomer}
                disabled={!newCustName || !newCustPhone}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded shadow-md shadow-red-600/20"
              >
                Save Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
