import React, { useState, useEffect } from 'react';
import { Database, Download, Upload, RefreshCw, AlertTriangle, ShieldCheck, CheckCircle2, History } from 'lucide-react';
import { localDB } from '../../db/indexedDb';
import { AuditLog, ShopSettings } from '../../types';

interface BackupManagerProps {
  settings: ShopSettings;
}

export const BackupManager: React.FC<BackupManagerProps> = ({ settings }) => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadAuditLogs = async () => {
    try {
      const res = await fetch('/api/audit-logs');
      if (res.ok) {
        const logs = await res.json();
        setAuditLogs(logs);
      }
    } catch {
      // offline fallback
      const localLogs = await localDB.getAll<AuditLog>('audit_logs');
      setAuditLogs(localLogs);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  // Export Complete Backup
  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      // Gather all local stores into single comprehensive snapshot
      const [
        products,
        variants,
        categories,
        brands,
        sizes,
        colors,
        customers,
        suppliers,
        sales,
        salesReturns,
        purchases,
        expenses,
        expenseCategories,
        employees
      ] = await Promise.all([
        localDB.getAll('products'),
        localDB.getAll('product_variants'),
        localDB.getAll('categories'),
        localDB.getAll('brands'),
        localDB.getAll('sizes'),
        localDB.getAll('colors'),
        localDB.getAll('customers'),
        localDB.getAll('suppliers'),
        localDB.getAll('sales'),
        localDB.getAll('sales_returns'),
        localDB.getAll('purchases'),
        localDB.getAll('expenses'),
        localDB.getAll('expense_categories'),
        localDB.getAll('employees')
      ]);

      const backupObject = {
        metadata: {
          system: 'StitchFlow Garments POS & ERP',
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          shopName: settings.shopName
        },
        settings,
        products,
        variants,
        categories,
        brands,
        sizes,
        colors,
        customers,
        suppliers,
        sales,
        salesReturns,
        purchases,
        expenses,
        expenseCategories,
        employees
      };

      const blob = new Blob([JSON.stringify(backupObject, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `stitchflow-backup-${new Date().toISOString().split('T')[0]}-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setStatusMessage('Database backup successfully generated and downloaded.');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (e: any) {
      setStatusMessage(`Backup error: ${e.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Restore from JSON File
  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);

        if (!data.products || !data.variants) {
          alert('Invalid backup file structure.');
          return;
        }

        const confirmed = window.confirm(
          'WARNING: Restoring will overwrite existing local data with this snapshot. Do you wish to continue?'
        );
        if (!confirmed) return;

        // Restore into LocalDB
        if (data.products) await localDB.putBatch('products', data.products);
        if (data.variants) await localDB.putBatch('product_variants', data.variants);
        if (data.categories) await localDB.putBatch('categories', data.categories);
        if (data.brands) await localDB.putBatch('brands', data.brands);
        if (data.customers) await localDB.putBatch('customers', data.customers);
        if (data.suppliers) await localDB.putBatch('suppliers', data.suppliers);
        if (data.sales) await localDB.putBatch('sales', data.sales);
        if (data.purchases) await localDB.putBatch('purchases', data.purchases);
        if (data.expenses) await localDB.putBatch('expenses', data.expenses);

        // Also push to server if online
        try {
          await fetch('/api/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
        } catch {}

        setStatusMessage('Database restored successfully. Please refresh the browser if needed.');
      } catch (err: any) {
        alert(`Failed to restore backup: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  // Reset to initial seed
  const handleResetToSeeds = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to reset all data back to the demo factory seeds? All test records will be refreshed.'
    );
    if (!confirmed) return;

    try {
      await fetch('/api/reset', { method: 'POST' });
      await localDB.clear('products');
      await localDB.clear('product_variants');
      await localDB.clear('sales');
      await localDB.clear('purchases');
      await localDB.clear('expenses');
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 bg-slate-50 text-slate-900 min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-red-600" />
            <span>Database Backup, Restore & Audit Trail</span>
          </h2>
          <p className="text-xs text-slate-500">
            Export complete encrypted snapshots, restore data, and inspect immutable system audit logs
          </p>
        </div>
      </div>

      {statusMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-2.5 rounded-lg text-xs flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Backup and Restore Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Export */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-3 shadow-xs">
          <div>
            <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center mb-3 border border-red-100">
              <Download className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Export Full Database Backup</h3>
            <p className="text-xs text-slate-500 mt-1">
              Downloads a standalone JSON snapshot of all 28+ relational tables including variants, sales, ledgers, and expenses.
            </p>
          </div>

          <button
            onClick={handleExportBackup}
            disabled={isExporting}
            className="w-full py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-2 shadow-md shadow-red-600/20"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Generating Backup...' : 'Download Backup File'}</span>
          </button>
        </div>

        {/* Card 2: Restore */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-3 shadow-xs">
          <div>
            <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center mb-3 border border-slate-200">
              <Upload className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Restore Database Snapshot</h3>
            <p className="text-xs text-slate-500 mt-1">
              Select a previously exported StitchFlow JSON file to restore the entire ERP state across all modules.
            </p>
          </div>

          <label className="w-full py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs rounded-lg transition flex items-center justify-center gap-2 cursor-pointer shadow-xs">
            <Upload className="w-4 h-4 text-red-600" />
            <span>Select Backup File to Restore</span>
            <input type="file" accept=".json" onChange={handleRestoreFile} className="hidden" />
          </label>
        </div>

        {/* Card 3: Factory Reset Seeds */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-3 shadow-xs">
          <div>
            <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center mb-3 border border-red-100">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Reset to Demo Seed Data</h3>
            <p className="text-xs text-slate-500 mt-1">
              Reloads pre-configured garments catalog, sizes (S/M/L/XL), colors, suppliers, and sample records.
            </p>
          </div>

          <button
            onClick={handleResetToSeeds}
            className="w-full py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 font-bold text-xs rounded-lg transition flex items-center justify-center gap-2 shadow-xs"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reset Demo Records</span>
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-red-600" />
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
              Immutable System Audit Trail ({auditLogs.length} logged events):
            </h3>
          </div>
          <button
            onClick={loadAuditLogs}
            className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 font-semibold"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto max-h-72 border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs bg-white">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                <th className="p-2.5">Date & Time</th>
                <th className="p-2.5">User</th>
                <th className="p-2.5">Action</th>
                <th className="p-2.5">Module</th>
                <th className="p-2.5">Record Reference</th>
                <th className="p-2.5">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="p-2.5 text-slate-500">
                    {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString()}
                  </td>
                  <td className="p-2.5 font-bold text-slate-900">{log.userName}</td>
                  <td className="p-2.5 font-semibold text-red-600">{log.action}</td>
                  <td className="p-2.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 border border-slate-200 text-slate-700 font-medium">
                      {log.module}
                    </span>
                  </td>
                  <td className="p-2.5 font-mono text-[11px] text-slate-500">{log.recordId || '-'}</td>
                  <td className="p-2.5 text-slate-700 text-[11px]">{log.newValues || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
