import React, { useState, useEffect } from 'react';
import { UserCheck, Plus, Search, Shield, Check, X, Phone, DollarSign, Calendar } from 'lucide-react';
import { localDB } from '../../db/indexedDb';
import { Employee, UserRole, ShopSettings } from '../../types';
import { SEED_EMPLOYEES } from '../../db/initialSeed';
import { ROLE_PERMISSIONS } from '../../services/authService';

interface EmployeeManagerProps {
  settings: ShopSettings;
}

export const EmployeeManager: React.FC<EmployeeManagerProps> = ({ settings }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Employee Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cnic, setCnic] = useState('');
  const [salary, setSalary] = useState<number>(35000);
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [role, setRole] = useState<UserRole>('CASHIER');

  const loadEmployees = async () => {
    let list = await localDB.getAll<Employee>('employees');
    if (list.length === 0) {
      await localDB.putBatch('employees', SEED_EMPLOYEES);
      list = SEED_EMPLOYEES;
    }
    setEmployees(list);
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleCreateEmployee = async () => {
    if (!name || !phone) return;
    const newEmp: Employee = {
      id: `emp-${Date.now()}`,
      name,
      phone,
      cnic,
      salary,
      joiningDate,
      role,
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };
    await localDB.put('employees', newEmp);
    setShowAddModal(false);
    setName('');
    setPhone('');
    setCnic('');
    await loadEmployees();
  };

  const filtered = employees.filter(
    (e) => e.name.toLowerCase().includes(search.toLowerCase()) || e.phone.includes(search)
  );

  return (
    <div className="p-4 md:p-6 space-y-4 bg-slate-50 text-slate-900 min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-red-600" />
            <span>Staff Roster & Role Permissions</span>
          </h2>
          <p className="text-xs text-slate-500">
            Manage cashier terminals, store managers, stock clerks and granular access rules
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md shadow-red-600/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Staff Member</span>
        </button>
      </div>

      {/* Staff Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-2.5 px-3">Employee Name</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Phone</th>
                <th className="py-2.5 px-3">CNIC / ID</th>
                <th className="py-2.5 px-3">Joining Date</th>
                <th className="py-2.5 px-3 text-right">Monthly Salary</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-bold text-slate-900">{emp.name}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        emp.role === 'ADMIN'
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : emp.role === 'MANAGER'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : emp.role === 'CASHIER'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {emp.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{emp.phone}</td>
                  <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{emp.cnic || '-'}</td>
                  <td className="py-2.5 px-3 text-slate-500">{emp.joiningDate}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                    {settings.currencySymbol} {emp.salary.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {emp.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Access Matrix Guide */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
        <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4 text-red-600" />
          <span>Role Security Matrix & Permissions Breakdown</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-red-50/60 rounded-lg border border-red-100 space-y-1">
            <div className="font-bold text-red-700">ADMIN</div>
            <p className="text-[11px] text-slate-600">
              Unrestricted access to all ERP modules, configuration, profit calculations, employee salaries and database restore.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <div className="font-bold text-blue-700">MANAGER</div>
            <p className="text-[11px] text-slate-600">
              Full POS, inventory intake, customer ledgers, supplier payments, returns approval and executive reporting.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <div className="font-bold text-emerald-700">CASHIER</div>
            <p className="text-[11px] text-slate-600">
              Fast counter sales, barcode scanning, cart management, customer credit lookup, invoice printing, and returns entry.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <div className="font-bold text-amber-700">INVENTORY STAFF</div>
            <p className="text-[11px] text-slate-600">
              Product variant matrix creation, barcode printing, stock intake from suppliers, and warehouse stock audits.
            </p>
          </div>
        </div>
      </div>

      {/* MODAL: New Staff */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-5 space-y-3 shadow-2xl text-slate-900">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h4 className="font-bold text-sm text-slate-900">Add Staff Member</h4>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-600 block mb-1">Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Hamza Farooq"
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-600 block mb-1">Phone Number *</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+92 300 0000000"
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-600 block mb-1">CNIC / Identity Number</label>
              <input
                type="text"
                value={cnic}
                onChange={(e) => setCnic(e.target.value)}
                placeholder="35201-XXXXXXX-X"
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-600 block mb-1">Assigned Operational Role</label>
              <select
                value={role}
                onChange={(e: any) => setRole(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-red-500"
              >
                <option value="CASHIER">Cashier (POS Terminal)</option>
                <option value="MANAGER">Store Manager</option>
                <option value="INVENTORY_STAFF">Inventory & Stock Staff</option>
                <option value="ADMIN">Administrator (Full Access)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-600 block mb-1">Monthly Basic Salary</label>
              <input
                type="number"
                value={salary}
                onChange={(e) => setSalary(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:ring-red-500"
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
                onClick={handleCreateEmployee}
                disabled={!name || !phone}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded shadow-md shadow-red-600/20"
              >
                Save Employee
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
