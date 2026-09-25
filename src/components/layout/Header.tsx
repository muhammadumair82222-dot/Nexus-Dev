import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  UserCheck,
  AlertCircle,
  Clock,
  Shield,
  Smartphone,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { syncEngine, SyncStatusState } from '../../sync/syncEngine';
import { authService } from '../../services/authService';
import { User, UserRole, ShopSettings } from '../../types';
import { SEED_USERS } from '../../db/initialSeed';

interface HeaderProps {
  settings?: ShopSettings;
  onNavigateToSync?: () => void;
  onNavigateToSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ settings, onNavigateToSync, onNavigateToSettings }) => {
  const [syncState, setSyncState] = useState({
    status: 'ONLINE' as SyncStatusState,
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null as string | null,
    conflictsCount: 0,
    simulatedOffline: false
  });

  const [currentUser, setCurrentUser] = useState<User>(authService.getCurrentUser());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((state) => {
      setSyncState(state);
    });

    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, []);

  const handleManualSync = async () => {
    await syncEngine.triggerSync();
  };

  const handleToggleOfflineMode = () => {
    syncEngine.toggleSimulatedOffline();
  };

  const handleRoleSwitch = (user: User) => {
    authService.switchUser(user);
    setCurrentUser(user);
    setShowUserMenu(false);
    window.dispatchEvent(new CustomEvent('auth-changed'));
  };

  return (
    <header className="bg-red-600 text-white border-b border-red-700 px-4 py-2.5 flex items-center justify-between sticky top-0 z-40 shadow-sm">
      {/* Brand Identity */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center font-black tracking-wider text-red-600 shadow-sm">
          SF
        </div>
        <div>
          <h1 className="font-bold text-sm md:text-base leading-tight flex items-center gap-2">
            <span>{settings?.shopName || 'StitchFlow Garments & Couture'}</span>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-red-700/90 text-white border border-red-400/40 shadow-2xs">
              Commercial POS
            </span>
          </h1>
          <p className="text-xs text-red-100 hidden sm:block">
            Garments Inventory & Retail Accounting ERP
          </p>
        </div>
      </div>

      {/* Center: Sync & Connectivity Bar */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Real-time Status Badge */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
            syncState.status === 'ONLINE'
              ? 'bg-white text-emerald-800 border-white/80 shadow-xs'
              : syncState.status === 'SYNCING'
              ? 'bg-white text-amber-800 border-white/80 shadow-xs'
              : 'bg-red-950 text-white border-red-400 shadow-xs'
          }`}
        >
          {syncState.status === 'ONLINE' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden md:inline font-bold">Online Mode</span>
            </>
          ) : syncState.status === 'SYNCING' ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
              <span className="font-bold">Syncing...</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <WifiOff className="w-3.5 h-3.5 text-red-200" />
              <span className="font-bold">Offline Mode</span>
            </>
          )}
        </div>

        {/* Pending Sync Counter */}
        {syncState.pendingCount > 0 && (
          <button
            onClick={onNavigateToSync}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-white text-red-700 border border-red-200 hover:bg-red-50 font-bold transition shadow-xs"
            title="Transactions queued locally waiting for internet connection"
          >
            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
            <span className="font-bold">{syncState.pendingCount}</span>
            <span className="hidden sm:inline">Queued</span>
          </button>
        )}

        {/* Sync Now Button */}
        <button
          onClick={handleManualSync}
          disabled={syncState.isSyncing || (!syncState.isOnline && !syncState.simulatedOffline)}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white border border-red-500/70 rounded-md transition shadow-xs"
          title="Manually trigger bi-directional sync"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncState.isSyncing ? 'animate-spin text-white' : ''}`} />
          <span className="hidden lg:inline">Sync Now</span>
        </button>

        {/* Offline Simulator Switch */}
        <button
          onClick={handleToggleOfflineMode}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border transition font-medium ${
            syncState.simulatedOffline
              ? 'bg-white border-white text-red-700 font-bold shadow-xs'
              : 'bg-red-700/80 border-red-500 text-white hover:bg-red-800'
          }`}
          title="Toggle Simulated Offline Mode to test offline sales without disabling Wi-Fi"
        >
          <span className="text-[11px]">
            {syncState.simulatedOffline ? '🔴 Disconnect Test' : 'Test Offline'}
          </span>
        </button>
      </div>

      {/* Right Side: Clock & Role Switcher */}
      <div className="flex items-center gap-3">
        <div className="hidden xl:flex items-center gap-1 text-xs text-red-100 bg-red-700/60 px-2 py-1 rounded border border-red-500/60">
          <Clock className="w-3 h-3 text-red-200" />
          <span>{currentTime}</span>
        </div>

        {/* User Role Selector */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-red-700/90 border border-red-500/80 hover:bg-red-800 transition text-left shadow-xs"
          >
            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-bold text-red-600">
              {currentUser.username[0].toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-semibold leading-none text-white">{currentUser.fullName}</div>
              <div className="text-[10px] text-red-200 font-mono tracking-wider">{currentUser.role}</div>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-2xl py-2 z-50 text-xs text-slate-800">
              <div className="px-3 py-1.5 border-b border-slate-100 text-slate-500 font-semibold">
                Switch Operational Role:
              </div>
              {SEED_USERS.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleRoleSwitch(u)}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-red-50 transition ${
                    currentUser.id === u.id ? 'bg-red-50 text-red-700 font-bold' : 'text-slate-700'
                  }`}
                >
                  <div>
                    <div>{u.fullName}</div>
                    <div className="text-[10px] text-slate-400">{u.role}</div>
                  </div>
                  {currentUser.id === u.id && <CheckCircle2 className="w-4 h-4 text-red-600" />}
                </button>
              ))}
              <div className="border-t border-slate-100 mt-1 pt-1 px-3 py-1 text-[11px] text-slate-400">
                Logged in as active terminal operator
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
