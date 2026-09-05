import { useState, useEffect, useCallback } from 'react';
import { WifiOff, Wifi, RefreshCw, Upload } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { flushQueue, pendingCount } from '../lib/offlineQueue';

export default function OfflineIndicator() {
  const isOnline   = useOnlineStatus();
  const [pending, setPending]   = useState(0);
  const [syncing, setSyncing]   = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  const refreshCount = useCallback(async () => {
    setPending(await pendingCount());
  }, []);

  // Poll queue size every 15 s so the count stays current.
  useEffect(() => {
    refreshCount();
    const id = setInterval(refreshCount, 15_000);
    return () => clearInterval(id);
  }, [refreshCount]);

  // Auto-flush as soon as connectivity is restored.
  useEffect(() => {
    if (isOnline && pending > 0) flush();
  }, [isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

  async function flush() {
    if (syncing) return;
    setSyncing(true);
    try {
      await flushQueue();
      await refreshCount();
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 3000);
    } finally {
      setSyncing(false);
    }
  }

  // Nothing to show when fully online with an empty queue.
  if (isOnline && pending === 0 && !justSynced) return null;

  const isRestored = isOnline && (pending > 0 || justSynced);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-0 left-0 right-0 z-[9999] px-4 py-2 flex items-center justify-between
        text-sm font-medium text-white transition-colors duration-300
        ${isOnline ? (justSynced ? 'bg-green-600' : 'bg-amber-500') : 'bg-red-600'}`}
    >
      <div className="flex items-center gap-2">
        {isOnline
          ? justSynced
            ? <Wifi className="w-4 h-4 flex-shrink-0" />
            : <Upload className="w-4 h-4 flex-shrink-0" />
          : <WifiOff className="w-4 h-4 flex-shrink-0" />
        }
        {!isOnline && (
          <span>
            No network — working offline.
            {pending > 0 && ` ${pending} change${pending !== 1 ? 's' : ''} will sync automatically.`}
          </span>
        )}
        {isRestored && !justSynced && (
          <span>
            Back online — {pending > 0
              ? `syncing ${pending} queued change${pending !== 1 ? 's' : ''}…`
              : 'syncing…'}
          </span>
        )}
        {justSynced && <span>All changes synced successfully.</span>}
      </div>

      {isOnline && pending > 0 && !syncing && (
        <button
          onClick={flush}
          className="flex items-center gap-1.5 ml-4 bg-white/20 hover:bg-white/30
                     rounded px-2.5 py-0.5 transition-colors text-xs"
        >
          <RefreshCw className="w-3 h-3" />
          Sync now
        </button>
      )}
      {syncing && (
        <RefreshCw className="w-4 h-4 animate-spin ml-4" />
      )}
    </div>
  );
}
