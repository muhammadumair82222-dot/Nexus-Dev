import React, { useState, useEffect } from 'react';
import { RefreshCw, Wifi, WifiOff, AlertTriangle, CheckCircle, Clock, Trash2, ShieldCheck, ArrowRight } from 'lucide-react';
import { syncEngine, SyncStatusState } from '../../sync/syncEngine';
import { localDB } from '../../db/indexedDb';
import { SyncQueueItem, SyncConflict } from '../../types';

export const SyncCenter: React.FC = () => {
  const [syncState, setSyncState] = useState({
    status: 'ONLINE' as SyncStatusState,
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null as string | null,
    conflictsCount: 0,
    simulatedOffline: false
  });

  const [queueItems, setQueueItems] = useState<SyncQueueItem[]>([]);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);

  const loadQueue = async () => {
    const q = await localDB.getAll<SyncQueueItem>('sync_queue');
    const c = await localDB.getAll<SyncConflict>('sync_conflicts');
    setQueueItems(q.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setConflicts(c.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };

  useEffect(() => {
    loadQueue();
    const unsub = syncEngine.subscribe((state) => {
      setSyncState(state);
      loadQueue();
    });
    return () => unsub();
  }, []);

  const handleManualSync = async () => {
    setSyncLogs((prev) => [`[${new Date().toLocaleTimeString()}] Triggering manual synchronization...`, ...prev]);
    const res = await syncEngine.triggerSync();
    if (res.success) {
      setSyncLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] Sync completed successfully. ${res.syncedCount} batches acknowledged by server.`,
        ...prev
      ]);
    } else {
      setSyncLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] Sync warning: ${res.errors.join(', ')}`,
        ...prev
      ]);
    }
    await loadQueue();
  };

  const handleResolveConflict = async (id: string) => {
    const conf = conflicts.find((c) => c.id === id);
    if (conf) {
      conf.resolved = true;
      await localDB.put('sync_conflicts', conf);
      await loadQueue();
      await syncEngine.updateCounts();
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 bg-slate-50 text-slate-900 min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-red-600" />
            <span>Bi-directional Synchronization Engine & Outbox</span>
          </h2>
          <p className="text-xs text-slate-500">
            Client-server transaction queue, idempotency reconciliation, and conflict resolution
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => syncEngine.toggleSimulatedOffline()}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition ${
              syncState.simulatedOffline
                ? 'bg-red-100 border-red-300 text-red-700 font-bold'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-xs'
            }`}
          >
            {syncState.simulatedOffline ? '🔴 Disconnect Test Mode (Active)' : 'Test Offline Mode'}
          </button>

          <button
            onClick={handleManualSync}
            disabled={syncState.isSyncing || (!syncState.isOnline && !syncState.simulatedOffline)}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md shadow-red-600/20 transition"
          >
            <RefreshCw className={`w-4 h-4 ${syncState.isSyncing ? 'animate-spin' : ''}`} />
            <span>Sync Outbox Now</span>
          </button>
        </div>
      </div>

      {/* Sync Status KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Current Connectivity</div>
          <div className="flex items-center gap-2 font-bold text-sm">
            {syncState.status === 'ONLINE' ? (
              <span className="text-emerald-600 flex items-center gap-1.5">
                <Wifi className="w-4 h-4" /> Fully Online
              </span>
            ) : syncState.status === 'SYNCING' ? (
              <span className="text-red-600 flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4 animate-spin" /> Batch Syncing...
              </span>
            ) : (
              <span className="text-red-600 flex items-center gap-1.5">
                <WifiOff className="w-4 h-4" /> Disconnected / Offline
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-400">
            {syncState.simulatedOffline ? 'Simulated network disconnect' : 'Physical network state'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Pending Outbox Queue</div>
          <div className="text-lg font-black text-red-600">{syncState.pendingCount} batches</div>
          <div className="text-[10px] text-slate-400">Awaiting remote database push</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Sync Conflicts</div>
          <div className={`text-lg font-black ${syncState.conflictsCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {syncState.conflictsCount} discrepancies
          </div>
          <div className="text-[10px] text-slate-400">Stock collisions across terminals</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Last Synced Time</div>
          <div className="text-sm font-bold text-slate-900">
            {syncState.lastSyncTime || 'Pending connection'}
          </div>
          <div className="text-[10px] text-slate-400">Authoritative delta push</div>
        </div>
      </div>

      {/* Conflicts Section if any */}
      {conflicts.filter((c) => !c.resolved).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 text-red-700 font-bold text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span>Unresolved Inventory Synchronization Conflicts</span>
          </div>

          <div className="space-y-2">
            {conflicts
              .filter((c) => !c.resolved)
              .map((conf) => (
                <div key={conf.id} className="p-3 bg-white border border-red-200 rounded-lg flex items-center justify-between text-xs shadow-xs">
                  <div>
                    <div className="font-bold text-slate-900">{conf.entityType}: {conf.reason}</div>
                    <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                      Client Tx ID: {conf.clientTxId} • Recorded: {new Date(conf.createdAt).toLocaleTimeString()}
                    </div>
                  </div>

                  <button
                    onClick={() => handleResolveConflict(conf.id)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded transition shadow-xs"
                  >
                    Acknowledge & Clear
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Queue Items Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
        <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
          Local Outbox Transaction Queue ({queueItems.length} records):
        </h3>

        <div className="overflow-x-auto max-h-96 border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs bg-white">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                <th className="p-2.5">Client Tx ID</th>
                <th className="p-2.5">Entity</th>
                <th className="p-2.5">Action</th>
                <th className="p-2.5">Created At</th>
                <th className="p-2.5">Synced At</th>
                <th className="p-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {queueItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No transactions queued. All transactions have been synchronized with the server.
                  </td>
                </tr>
              ) : (
                queueItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-2.5 font-mono text-red-600 font-medium">{item.clientTxId}</td>
                    <td className="p-2.5 font-bold text-slate-900">{item.entityType}</td>
                    <td className="p-2.5 text-slate-700">{item.action}</td>
                    <td className="p-2.5 text-slate-500">
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="p-2.5 text-slate-500">
                      {item.syncedAt ? new Date(item.syncedAt).toLocaleTimeString() : '-'}
                    </td>
                    <td className="p-2.5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === 'SYNCED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
