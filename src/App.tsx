import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar, NavModule } from './components/layout/Sidebar';
import { Dashboard } from './components/dashboard/Dashboard';
import { POSTerminal } from './components/pos/POSTerminal';
import { SalesManager } from './components/sales/SalesManager';
import { InventoryManager } from './components/inventory/InventoryManager';
import { BarcodeLabels } from './components/inventory/BarcodeLabels';
import { PurchaseManager } from './components/purchases/PurchaseManager';
import { CustomerLedger } from './components/customers/CustomerLedger';
import { SupplierLedger } from './components/suppliers/SupplierLedger';
import { ExpenseManager } from './components/expenses/ExpenseManager';
import { EmployeeManager } from './components/employees/EmployeeManager';
import { ReportsManager } from './components/reports/ReportsManager';
import { SyncCenter } from './components/sync/SyncCenter';
import { BackupManager } from './components/backup/BackupManager';
import { SettingsManager } from './components/settings/SettingsManager';
import { ReceiptModal } from './components/receipts/ReceiptModal';
import { PWAInstallButton } from './components/common/PWAInstallButton';
import { syncEngine } from './sync/syncEngine';
import { localDB } from './db/indexedDb';
import { inventoryService } from './services/inventoryService';
import { Sale, ProductVariant, ShopSettings } from './types';
import { DEFAULT_SETTINGS } from './db/initialSeed';

export default function App() {
  const [currentModule, setCurrentModule] = useState<NavModule>('dashboard');
  const [settings, setSettings] = useState<ShopSettings>(DEFAULT_SETTINGS);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [activeReceiptSale, setActiveReceiptSale] = useState<Sale | null>(null);
  const [barcodeVariantTarget, setBarcodeVariantTarget] = useState<ProductVariant | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize Application and Service Worker
  useEffect(() => {
    const initialize = async () => {
      // 1. Initialize local DB seed
      await inventoryService.ensureInitialized();

      // 2. Load stored settings if any
      const storedSettings = await localDB.getById<{ key: string } & ShopSettings>('settings', 'main');
      if (storedSettings) {
        setSettings(storedSettings);
      }

      // 3. Register service worker for offline PWA
      if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.warn('SW registration failed:', err);
        });
      }

      // 4. Initial pull if online
      if (navigator.onLine) {
        await syncEngine.pullServerState();
      }

      setIsInitializing(false);
    };

    initialize();

    const unsub = syncEngine.subscribe((state) => {
      setPendingSyncCount(state.pendingCount);
    });

    // Keyboard Shortcuts (e.g. F2 to jump directly to POS Terminal)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setCurrentModule('pos');
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsub();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSaleCompleted = (sale: Sale) => {
    setActiveReceiptSale(sale);
  };

  const handleOpenBarcodePrinterForVariant = (variant: ProductVariant) => {
    setBarcodeVariantTarget(variant);
    setCurrentModule('barcodes');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 font-sans text-slate-900 antialiased select-none">
      {/* Top Header & Connectivity Bar */}
      <Header
        settings={settings}
        onNavigateToSync={() => setCurrentModule('sync')}
        onNavigateToSettings={() => setCurrentModule('settings')}
      />

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentModule={currentModule}
          onSelectModule={(mod) => {
            setCurrentModule(mod);
            if (mod !== 'barcodes') setBarcodeVariantTarget(null);
          }}
          pendingSyncCount={pendingSyncCount}
        />

        {/* Dynamic Content View Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50 relative">
          {/* In-app install banner corner if installable */}
          <div className="absolute top-3 right-4 z-30 pointer-events-auto">
            <PWAInstallButton />
          </div>

          {currentModule === 'dashboard' && (
            <Dashboard
              settings={settings}
              onNavigateToPOS={() => setCurrentModule('pos')}
              onNavigateToInventory={() => setCurrentModule('inventory')}
              onNavigateToSales={() => setCurrentModule('sales')}
              onSelectSale={(s) => setActiveReceiptSale(s)}
            />
          )}

          {currentModule === 'pos' && (
            <POSTerminal
              settings={settings}
              onSaleCompleted={handleSaleCompleted}
            />
          )}

          {currentModule === 'sales' && (
            <SalesManager
              settings={settings}
              onViewReceipt={(s) => setActiveReceiptSale(s)}
            />
          )}

          {currentModule === 'returns' && (
            <SalesManager
              settings={settings}
              onViewReceipt={(s) => setActiveReceiptSale(s)}
            />
          )}

          {currentModule === 'products' && (
            <InventoryManager
              settings={settings}
              onOpenBarcodePrinter={handleOpenBarcodePrinterForVariant}
            />
          )}

          {currentModule === 'inventory' && (
            <InventoryManager
              settings={settings}
              onOpenBarcodePrinter={handleOpenBarcodePrinterForVariant}
            />
          )}

          {currentModule === 'purchases' && (
            <PurchaseManager settings={settings} />
          )}

          {currentModule === 'customers' && (
            <CustomerLedger settings={settings} />
          )}

          {currentModule === 'suppliers' && (
            <SupplierLedger settings={settings} />
          )}

          {currentModule === 'expenses' && (
            <ExpenseManager settings={settings} />
          )}

          {currentModule === 'employees' && (
            <EmployeeManager settings={settings} />
          )}

          {currentModule === 'reports' && (
            <ReportsManager settings={settings} />
          )}

          {currentModule === 'barcodes' && (
            <BarcodeLabels
              settings={settings}
              selectedVariantInitial={barcodeVariantTarget}
            />
          )}

          {currentModule === 'sync' && <SyncCenter />}

          {currentModule === 'backup' && <BackupManager settings={settings} />}

          {currentModule === 'settings' && (
            <SettingsManager
              settings={settings}
              onUpdateSettings={(newSet) => setSettings(newSet)}
            />
          )}
        </main>
      </div>

      {/* Modal: Receipt View / Print */}
      {activeReceiptSale && (
        <ReceiptModal
          sale={activeReceiptSale}
          settings={settings}
          onClose={() => setActiveReceiptSale(null)}
        />
      )}
    </div>
  );
}
