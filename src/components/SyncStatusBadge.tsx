import React, { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff, RefreshCw, CloudUpload, Database, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { 
  syncOfflineDataWithSupabase, 
  getPendingOfflineCount, 
  getSupabaseUnreachable
} from '@/services/supabaseService';
import { Button } from '@/components/ui/button';

export function SyncStatusBadge() {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [supabaseUnreachable, setSupabaseUnreachableState] = useState<boolean>(getSupabaseUnreachable());
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateStatus = () => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    setPendingCount(getPendingOfflineCount());
    setSupabaseUnreachableState(getSupabaseUnreachable());
  };

  useEffect(() => {
    updateStatus();

    const handleOnline = () => {
      setIsOnline(true);
      updateStatus();
      if (getPendingOfflineCount() > 0) {
        triggerSync(true);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      updateStatus();
    };

    const handleSyncEvent = () => {
      updateStatus();
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('supabase-data-sync', handleSyncEvent);
    window.addEventListener('storage', handleSyncEvent);
    document.addEventListener('mousedown', handleClickOutside);

    const interval = setInterval(updateStatus, 3000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('supabase-data-sync', handleSyncEvent);
      window.removeEventListener('storage', handleSyncEvent);
      document.removeEventListener('mousedown', handleClickOutside);
      clearInterval(interval);
    };
  }, []);

  const triggerSync = async (silent = false) => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await syncOfflineDataWithSupabase();
      updateStatus();
      if (res && res.success) {
        if (!silent || res.syncCount > 0) {
          toast.success(
            res.syncCount > 0 
              ? `Successfully synchronized ${res.syncCount} item(s) to Supabase!`
              : 'All offline data is already up-to-date with Supabase.'
          );
        }
      } else {
        if (!silent) {
          toast.error(res?.errors?.[0] || 'Sync failed. Please check network connection.');
        }
      }
    } catch (err: any) {
      if (!silent) {
        toast.error('Error during synchronization: ' + (err?.message || 'Unknown error'));
      }
    } finally {
      setIsSyncing(false);
      updateStatus();
    }
  };

  const isActuallyOnline = isOnline && !supabaseUnreachable;

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-2xs border cursor-pointer ${
          !isActuallyOnline
            ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
            : pendingCount > 0
            ? 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100 animate-pulse'
            : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
        }`}
        title="Click to view database connection & sync status"
      >
        {isSyncing ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
        ) : !isActuallyOnline ? (
          <WifiOff className="w-3.5 h-3.5 text-amber-600" />
        ) : pendingCount > 0 ? (
          <CloudUpload className="w-3.5 h-3.5 text-blue-600" />
        ) : (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        )}

        <span className="hidden sm:inline">
          {!isActuallyOnline
            ? 'Offline'
            : pendingCount > 0
            ? `Online (${pendingCount} pending)`
            : 'Online'}
        </span>

        <span className="sm:hidden">
          {!isActuallyOnline
            ? 'Offline'
            : pendingCount > 0
            ? `${pendingCount} pending`
            : 'Online'}
        </span>

        {pendingCount > 0 && (
          <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-blue-600 text-white font-black">
            {pendingCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 p-4 bg-white shadow-2xl rounded-xl border border-slate-200 z-50 space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" />
              <h4 className="font-bold text-sm text-slate-800">Supabase Sync Status</h4>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                isActuallyOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
              }`}>
                {isActuallyOnline ? 'Connected' : 'Offline / Cached'}
              </span>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-600 font-medium">Network Connection:</span>
              <span className="font-bold flex items-center gap-1">
                {isOnline ? (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <Wifi className="w-3 h-3" /> Online
                  </span>
                ) : (
                  <span className="text-amber-600 flex items-center gap-1">
                    <WifiOff className="w-3 h-3" /> Disconnected
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-600 font-medium">Pending Sync Items:</span>
              <span className={`font-black px-2 py-0.5 rounded-md ${
                pendingCount > 0 ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {pendingCount} item{pendingCount === 1 ? '' : 's'}
              </span>
            </div>

            {supabaseUnreachable && (
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-1.5 text-[11px]">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>Supabase connection slow or unreachable. Changes are safely saved locally and will sync once reconnected.</p>
              </div>
            )}
          </div>

          <div className="pt-1">
            <Button
              onClick={() => triggerSync(false)}
              disabled={isSyncing || !isOnline}
              className="w-full h-8 text-xs font-bold gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing with Supabase...' : 'Sync Pending Items Now'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
