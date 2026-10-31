export interface PendingScan {
  client_scan_id: string
  qr_token: string
  event_id: string
  scanned_at: string
  device_info: Record<string, unknown>
  synced: boolean
  status?: 'pending' | 'synced' | 'duplicate' | 'error'
  status_message?: string
}

const DB_NAME = 'hackos_offline_db'
const DB_VERSION = 1
const STORE_NAME = 'pending_scans'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment.'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'client_scan_id' })
        store.createIndex('event_id', 'event_id', { unique: false })
        store.createIndex('synced', 'synced', { unique: false })
        store.createIndex('qr_token', 'qr_token', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Save a scan to offline IndexedDB store immediately upon scanning
 */
export async function saveOfflineScan(scan: PendingScan): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.put(scan)

    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

/**
 * Retrieve all pending un-synced scans
 */
export async function getPendingScans(eventId?: string): Promise<PendingScan[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.getAll()

    req.onsuccess = () => {
      let all = (req.result || []) as PendingScan[]
      let pending = all.filter((s) => !s.synced)
      if (eventId) {
        pending = pending.filter((s) => s.event_id === eventId)
      }
      resolve(pending)
    }
    req.onerror = () => reject(req.error)
  })
}

/**
 * Retrieve all scans (both synced and pending) for history display
 */
export async function getAllOfflineScans(eventId?: string): Promise<PendingScan[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.getAll()

    req.onsuccess = () => {
      let all = (req.result || []) as PendingScan[]
      if (eventId) {
        all = all.filter((s) => s.event_id === eventId)
      }
      // Sort newest first
      all.sort((a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime())
      resolve(all)
    }
    req.onerror = () => reject(req.error)
  })
}

/**
 * Count un-synced scans for the sync badge
 */
export async function countPendingScans(eventId?: string): Promise<number> {
  const pending = await getPendingScans(eventId)
  return pending.length
}

/**
 * Mark specified scans as synced
 */
export async function markScansSynced(scanIds: string[]): Promise<void> {
  if (scanIds.length === 0) return
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    let completed = 0
    for (const id of scanIds) {
      const getReq = store.get(id)
      getReq.onsuccess = () => {
        const item = getReq.result as PendingScan | undefined
        if (item) {
          item.synced = true
          item.status = 'synced'
          store.put(item)
        }
        completed++
        if (completed === scanIds.length) {
          resolve()
        }
      }
      getReq.onerror = () => reject(getReq.error)
    }
  })
}

/**
 * Update scan status (e.g. duplicate or error from server)
 */
export async function updateScanStatus(
  scanId: string,
  status: 'synced' | 'duplicate' | 'error',
  message?: string
): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const getReq = store.get(scanId)

    getReq.onsuccess = () => {
      const item = getReq.result as PendingScan | undefined
      if (item) {
        item.status = status
        item.status_message = message
        item.synced = status === 'synced' || status === 'duplicate'
        store.put(item)
      }
      resolve()
    }
    getReq.onerror = () => reject(getReq.error)
  })
}

