import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  RotateCcw,
  Layers,
  Package,
  Truck,
  Users,
  Building2,
  DollarSign,
  UserCheck,
  BarChart3,
  Barcode,
  RefreshCw,
  Database,
  Settings,
  ChevronRight
} from 'lucide-react';
import { authService } from '../../services/authService';

export type NavModule =
  | 'dashboard'
  | 'pos'
  | 'sales'
  | 'returns'
  | 'products'
  | 'inventory'
  | 'purchases'
  | 'customers'
  | 'suppliers'
  | 'expenses'
  | 'employees'
  | 'reports'
  | 'barcodes'
  | 'sync'
  | 'backup'
  | 'settings';

interface SidebarProps {
  currentModule: NavModule;
  onSelectModule: (module: NavModule) => void;
  pendingSyncCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentModule,
  onSelectModule,
  pendingSyncCount = 0
}) => {
  const menuItems: { id: NavModule; label: string; icon: React.ReactNode; badge?: string | number; shortcut?: string; moduleKey: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, moduleKey: 'dashboard' },
    { id: 'pos', label: 'POS Terminal', icon: <ShoppingCart className="w-4 h-4 text-emerald-400" />, shortcut: 'F2', moduleKey: 'pos' },
    { id: 'sales', label: 'Sales & Invoices', icon: <Receipt className="w-4 h-4" />, moduleKey: 'sales' },
    { id: 'returns', label: 'Returns & Exchange', icon: <RotateCcw className="w-4 h-4" />, moduleKey: 'sales' },
    { id: 'products', label: 'Products & Matrix', icon: <Layers className="w-4 h-4" />, moduleKey: 'products' },
    { id: 'inventory', label: 'Stock & Movements', icon: <Package className="w-4 h-4" />, moduleKey: 'inventory' },
    { id: 'purchases', label: 'Purchase Invoices', icon: <Truck className="w-4 h-4" />, moduleKey: 'purchases' },
    { id: 'customers', label: 'Customers & Ledger', icon: <Users className="w-4 h-4" />, moduleKey: 'customers' },
    { id: 'suppliers', label: 'Suppliers & Ledger', icon: <Building2 className="w-4 h-4" />, moduleKey: 'suppliers' },
    { id: 'expenses', label: 'Expenses', icon: <DollarSign className="w-4 h-4" />, moduleKey: 'expenses' },
    { id: 'employees', label: 'Employees & Roles', icon: <UserCheck className="w-4 h-4" />, moduleKey: 'employees' },
    { id: 'reports', label: 'Reports & Accounting', icon: <BarChart3 className="w-4 h-4 text-amber-400" />, moduleKey: 'reports' },
    { id: 'barcodes', label: 'Barcode Generator', icon: <Barcode className="w-4 h-4" />, moduleKey: 'products' },
    {
      id: 'sync',
      label: 'Sync & Offline Queue',
      icon: <RefreshCw className="w-4 h-4" />,
      badge: pendingSyncCount > 0 ? pendingSyncCount : undefined,
      moduleKey: 'sync'
    },
    { id: 'backup', label: 'Backup & Restore', icon: <Database className="w-4 h-4" />, moduleKey: 'backup' },
    { id: 'settings', label: 'Shop Settings', icon: <Settings className="w-4 h-4" />, moduleKey: 'settings' }
  ];

  return (
    <aside className="w-56 lg:w-60 bg-white border-r border-slate-200 flex flex-col justify-between select-none h-full shrink-0 shadow-xs">
      <div className="py-2 overflow-y-auto max-h-[calc(100vh-4rem)]">
        <div className="px-3 pb-2 text-[11px] font-bold tracking-wider uppercase text-slate-400">
          Core Operations
        </div>
        <nav className="space-y-0.5 px-2">
          {menuItems.map((item) => {
            const hasAccess = authService.hasPermission(item.moduleKey, 'view');
            if (!hasAccess) return null;

            const isActive = currentModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectModule(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition group ${
                  isActive
                    ? 'bg-red-600 text-white font-semibold shadow-xs'
                    : 'text-slate-700 hover:bg-red-50 hover:text-red-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-red-600'}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {item.shortcut && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isActive ? 'bg-red-700 text-red-100' : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      {item.shortcut}
                    </span>
                  )}
                  {item.badge !== undefined && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-600 text-white shadow-2xs">
                      {item.badge}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom System Status */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-600">
        <div className="flex items-center justify-between">
          <span>Local Engine:</span>
          <span className="text-emerald-700 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            IndexedDB Ready
          </span>
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5">
          Dual Offline/Online Persistence
        </div>
      </div>
    </aside>
  );
};
