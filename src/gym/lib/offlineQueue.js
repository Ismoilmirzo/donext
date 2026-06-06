const QUEUE_KEY = 'donext:gym:set-log-outbox:v1';
const DB_NAME = 'donext-gym-outbox';
const DB_VERSION = 1;
const STORE_NAME = 'setLogOutbox';

let dbPromise = null;
let migrationPromise = null;
let memoryQueue = readLegacyQueue();

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function canUseIndexedDb() {
  return typeof window !== 'undefined' && Boolean(window.indexedDB);
}

function readLegacyQueue() {
  if (!canUseStorage()) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(QUEUE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function readGymSetQueue() {
  void migrateLegacyQueue();
  return memoryQueue;
}

function writeGymSetQueue(items) {
  memoryQueue = items;
  if (canUseStorage()) {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  }
}

function sortQueue(items) {
  return [...items].sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
}

export function openGymQueueDb() {
  if (!canUseIndexedDb()) return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      resolve(null);
    };
    request.onblocked = () => {
      dbPromise = null;
      resolve(null);
    };
  });

  return dbPromise;
}

function readIndexedQueue(db) {
  if (!db) return Promise.resolve([]);
  return new Promise((resolve) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(sortQueue(request.result || []));
    request.onerror = () => resolve([]);
  });
}

function replaceIndexedQueue(db, items) {
  if (!db) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.clear();
    items.forEach((item) => store.put(item));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function migrateLegacyQueue() {
  if (migrationPromise) return migrationPromise;

  migrationPromise = (async () => {
    const db = await openGymQueueDb();
    if (!db) return memoryQueue;

    const indexedQueue = await readIndexedQueue(db);
    const mergedById = new Map();
    [...indexedQueue, ...memoryQueue].forEach((item) => {
      if (item?.id) mergedById.set(item.id, item);
    });

    const merged = sortQueue([...mergedById.values()]);
    writeGymSetQueue(merged);
    await replaceIndexedQueue(db, merged);
    return merged;
  })().catch(() => memoryQueue);

  return migrationPromise;
}

async function persistGymSetQueue(items) {
  writeGymSetQueue(items);
  const db = await openGymQueueDb();
  if (db) {
    await replaceIndexedQueue(db, items);
  }
}

export function enqueueGymSetLog(payload) {
  const item = {
    id: `gym-set-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    payload,
    createdAt: new Date().toISOString(),
  };
  writeGymSetQueue([...readGymSetQueue(), item]);
  void persistGymSetQueue(memoryQueue);
  return item;
}

export async function flushGymSetLogQueue(writeSetLog) {
  const queue = await migrateLegacyQueue();
  if (!queue.length) return { flushed: 0, remaining: 0 };

  const remaining = [];
  const attemptedIds = new Set(queue.map((item) => item.id));
  let flushed = 0;
  for (const item of queue) {
    try {
      await writeSetLog(item.payload);
      flushed += 1;
    } catch {
      remaining.push(item);
    }
  }

  const enqueuedDuringFlush = readGymSetQueue().filter((item) => !attemptedIds.has(item.id));
  const nextQueue = [...remaining, ...enqueuedDuringFlush];
  await persistGymSetQueue(nextQueue);
  return { flushed, remaining: nextQueue.length };
}
