import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Search, Filter, Tag, Calendar, X } from 'lucide-react';
import { expenseService } from '../../services/expenseService';
import { authService } from '../../services/authService';
import { Expense, ExpenseCategory, PaymentMethod, ShopSettings } from '../../types';

interface ExpenseManagerProps {
  settings: ShopSettings;
}

export const ExpenseManager: React.FC<ExpenseManagerProps> = ({ settings }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [selectedCatFilter, setSelectedCatFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Add Expense Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [referenceNo, setReferenceNo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    const [exp, cats] = await Promise.all([
      expenseService.getExpenses(),
      expenseService.getCategories()
    ]);
    setExpenses(exp.sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime()));
    setCategories(cats);
    if (cats.length > 0 && !selectedCategory) setSelectedCategory(cats[0].id);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRecordExpense = async () => {
    if (!selectedCategory || amount <= 0 || !description) return;
    setIsSubmitting(true);
    try {
      const user = authService.getCurrentUser();
      await expenseService.addExpense({
        categoryId: selectedCategory,
        description,
        amount,
        expenseDate: new Date().toISOString(),
        paymentMethod,
        referenceNo,
        user: { id: user.id, name: user.fullName }
      });
      setShowModal(false);
      setAmount(0);
      setDescription('');
      setReferenceNo('');
      await loadData();
    } catch (e) {
      console.error('Error adding expense:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalExpenseAmount = expenses.reduce((s, e) => s + e.amount, 0);

  const filtered = expenses.filter((e) => {
    const matchesCat = selectedCatFilter === 'ALL' || e.categoryId === selectedCatFilter;
    const matchesSearch =
      !search ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.categoryName.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="p-4 md:p-6 space-y-4 bg-slate-50 text-slate-900 min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-red-600" />
            <span>Retail Expense Management</span>
          </h2>
          <p className="text-xs text-slate-500">
            Track operational costs (Rent, Generator Fuel, Packaging Bags, Staff Tea, Utilities)
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md shadow-red-600/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Record Shop Expense</span>
        </button>
      </div>

      {/* Filter and Metrics Bar */}
      <div className="flex flex-wrap gap-2 items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search expense description..."
            className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedCatFilter}
            onChange={(e) => setSelectedCatFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:ring-red-500"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="text-xs text-slate-600 font-semibold bg-slate-50 px-3 py-1.5 rounded border border-slate-200">
            Total: <span className="text-red-600 font-black">{settings.currencySymbol} {totalExpenseAmount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Expense Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Payment Method</th>
                <th className="py-2.5 px-3">Reference #</th>
                <th className="py-2.5 px-3">Entered By</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No expense records found.
                  </td>
                </tr>
              ) : (
                filtered.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 text-slate-500">
                      {new Date(exp.expenseDate).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-red-50 text-red-700 border border-red-200 font-medium">
                        {exp.categoryName}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-800">{exp.description}</td>
                    <td className="py-2.5 px-3 text-slate-600">{exp.paymentMethod}</td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500">{exp.referenceNo || '-'}</td>
                    <td className="py-2.5 px-3 text-slate-600">{exp.userName}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-red-600">
                      {settings.currencySymbol} {exp.amount.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Record Expense */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-5 space-y-3 shadow-2xl text-slate-900">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h4 className="font-bold text-sm text-slate-900">Record Shop Expense</h4>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-600 block mb-1">Expense Category *</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-red-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-600 block mb-1">Amount *</label>
              <input
                type="number"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="0"
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-600 block mb-1">Description / Bill Details *</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Monthly Electricity bill paid via Meezan Bank"
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-600 block mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e: any) => setPaymentMethod(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-red-500"
              >
                <option value="CASH">Cash in Drawer</option>
                <option value="BANK_TRANSFER">Bank Account</option>
                <option value="CARD">Card</option>
                <option value="EASYPAISA">Easypaisa</option>
                <option value="JAZZCASH">JazzCash</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-600 block mb-1">Voucher / Receipt Reference</label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="e.g. VOUCH-4491"
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-red-500"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordExpense}
                disabled={isSubmitting || amount <= 0 || !description}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded shadow-md shadow-red-600/20"
              >
                Record Expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
