// IndexedDB-based mutation queue for offline-first operation.
//
// When local microservices are unreachable (network outage, power cycle),
// writes are buffered here and replayed automatically when connectivity returns.
// The queue is ordered by savedAt so mutations replay in the original order.

const DB_NAME    = 'diagdesk-offline';
const DB_VERSION = 1;
const STORE      = 'mutations';

export interface QueuedMutation {
  id:       string;                      // crypto.randomUUID()
  url:      string;
  method:   string;
  headers:  Record<string, string>;
  body:     string;
  label:    string;                      // user-visible: "Register patient: Ravi Kumar"
  savedAt:  number;                      // Date.now()
}

// Custom error so callers can distinguish "queued offline" from real failures.
export class OfflineError extends Error {
  label: string;
  constructor(label: string) {
    super(`Saved offline — will sync when connected: ${label}`);
    this.label = label;
    this.name = 'OfflineError';
  }
}

// ── DB helpers ─────────────────────────────────────────────────────────────────

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = e => {
      _db = (e.target as IDBOpenDBRequest).result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function enqueueMutation(
  mutation: Omit<QueuedMutation, 'id' | 'savedAt'>,
): Promise<void> {
  const db = await openDB();
  const item: QueuedMutation = { ...mutation, id: crypto.randomUUID(), savedAt: Date.now() };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add(item);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

export async function getPendingMutations(): Promise<QueuedMutation[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as QueuedMutation[]);
    req.onerror   = () => reject(req.error);
  });
}

async function removeMutation(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

// Replay all queued mutations in order. Returns counts for the UI indicator.
export async function flushQueue(): Promise<{ succeeded: number; failed: number }> {
  const pending = await getPendingMutations();
  pending.sort((a, b) => a.savedAt - b.savedAt);

  let succeeded = 0;
  let failed    = 0;

  for (const mut of pending) {
    try {
      const res = await fetch(mut.url, {
        method:  mut.method,
        headers: mut.headers,
        body:    mut.body,
      });
      if (res.ok || (res.status >= 400 && res.status < 500)) {
        // 2xx = success; 4xx = permanent client error (don't retry endlessly).
        await removeMutation(mut.id);
        succeeded++;
      } else {
        // 5xx = server still unhappy; leave in queue for next flush.
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { succeeded, failed };
}

export async function pendingCount(): Promise<number> {
  return (await getPendingMutations()).length;
}
