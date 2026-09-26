import db from './db';
import { resolveApiUrl } from '../config/env';

/**
 * Offline Action Types
 */
export const SYNC_ACTIONS = {
  CREATE_SYMPTOM: 'CREATE_SYMPTOM',
  CREATE_HEALTH_RECORD: 'CREATE_HEALTH_RECORD',
  BOOK_APPOINTMENT: 'BOOK_APPOINTMENT',
  SEARCH_MEDICINES: 'SEARCH_MEDICINES',
  UPDATE_MEDICINE_STOCK: 'UPDATE_MEDICINE_STOCK',
};

/**
 * Add an action to the persistent offline SyncQueue
 */
export async function addToSyncQueue({
  type,
  action,
  endpoint,
  method = 'POST',
  payload = {},
  localId = null,
  metadata = {},
  token = null,
}) {
  try {
    let ownerId = 'anonymous';
    if (token) {
      try {
        const payloadBase64 = token.split('.')[1];
        const decoded = JSON.parse(atob(payloadBase64));
        ownerId = decoded.id || decoded._id || decoded.userId || decoded.email || 'anonymous';
      } catch (e) {}
    }

    const queueItem = {
      type: type || action,
      action: action || type,
      endpoint,
      method,
      payload,
      localId,
      metadata,
      ownerId,
      status: 'pending', // 'pending' | 'syncing' | 'failed'
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };

    const id = await db.syncQueue.add(queueItem);
    console.log(`[SyncQueue] Added action ${type} to queue with ID #${id}`);
    
    // Dispatch custom browser event for reactive UI updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('syncqueue-changed', { detail: { action: 'add', id } }));
    }
    
    return id;
  } catch (err) {
    console.error('[SyncQueue] Failed to add action to queue:', err);
    throw err;
  }
}

/**
 * Get count of pending sync items
 */
export async function getPendingSyncCount() {
  try {
    return await db.syncQueue.where('status').equals('pending').count();
  } catch (err) {
    console.warn('[SyncQueue] Failed to get pending count:', err);
    return 0;
  }
}

/**
 * Get all pending actions sorted chronologically (FIFO)
 */
export async function getPendingActions() {
  try {
    return await db.syncQueue
      .where('status')
      .anyOf(['pending', 'failed'])
      .sortBy('createdAt');
  } catch (err) {
    console.warn('[SyncQueue] Failed to get pending actions:', err);
    return [];
  }
}

/**
 * Remove an item from the queue after successful sync
 */
export async function removeSyncItem(id) {
  try {
    await db.syncQueue.delete(id);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('syncqueue-changed', { detail: { action: 'remove', id } }));
    }
  } catch (err) {
    console.warn(`[SyncQueue] Failed to delete sync item #${id}:`, err);
  }
}

/**
 * Replay the entire sync queue against the live server
 * @param {string} token - JWT auth token
 * @param {Function} onProgress - Optional callback ({ current, total, item })
 */
export async function replaySyncQueue(token, onProgress = null) {
  const pendingItems = await getPendingActions();
  if (!pendingItems || pendingItems.length === 0) {
    return { success: true, processed: 0, failed: 0 };
  }

  // Determine current user ID
  let currentUserId = 'anonymous';
  if (token) {
    try {
      const payloadBase64 = token.split('.')[1];
      const decoded = JSON.parse(atob(payloadBase64));
      currentUserId = decoded.id || decoded._id || decoded.userId || decoded.email || 'anonymous';
    } catch (e) {}
  }

  console.log(`[SyncQueue] Starting replay for ${pendingItems.length} queued action(s)...`);
  let processed = 0;
  let failed = 0;

  for (let i = 0; i < pendingItems.length; i++) {
    const item = pendingItems[i];
    
    // Ownership check to prevent cross-user replay
    if (item.ownerId && item.ownerId !== 'anonymous' && item.ownerId !== currentUserId) {
      console.warn(`[SyncQueue] Skipping item #${item.id} - belongs to a different user.`);
      continue;
    }

    if (onProgress) {
      onProgress({ current: i + 1, total: pendingItems.length, item });
    }

    try {
      // Mark as syncing
      await db.syncQueue.update(item.id, { status: 'syncing' });

      const headers = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const targetUrl = resolveApiUrl(item.endpoint);
      const response = await fetch(targetUrl, {
        method: item.method || 'POST',
        headers,
        body: item.payload ? JSON.stringify(item.payload) : undefined,
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.warn(`[SyncQueue] Authorization failed (HTTP ${response.status}) on item #${item.id}. Pausing replay pending re-authentication.`);
          await db.syncQueue.update(item.id, {
            status: 'auth_required',
            lastError: responseData.message || 'Authentication required to sync this item',
            lastAttemptAt: new Date().toISOString(),
          });
          failed++;
          break; // Stop replaying remaining items until user re-authenticates
        }
        throw new Error(responseData.message || `HTTP ${response.status} failed`);
      }

      // Handle successful sync updates on local Dexie tables
      if (item.type === SYNC_ACTIONS.CREATE_SYMPTOM && responseData.symptom) {
        const serverSymptom = responseData.symptom;
        // If we stored with localId, delete temp record and put server record
        if (item.localId) {
          await db.symptoms.delete(item.localId);
        }
        await db.symptoms.put({
          id: serverSymptom._id || serverSymptom.id,
          ...serverSymptom,
          synced: true,
          syncedAt: new Date().toISOString(),
        });
      } else if (item.type === SYNC_ACTIONS.CREATE_HEALTH_RECORD && responseData.record) {
        const serverRecord = responseData.record;
        if (item.localId) {
          await db.healthRecords.delete(item.localId);
        }
        await db.healthRecords.put({
          id: serverRecord._id || serverRecord.id,
          ...serverRecord,
          synced: true,
          syncedAt: new Date().toISOString(),
        });
      } else if (item.type === SYNC_ACTIONS.BOOK_APPOINTMENT && responseData.appointment) {
        const serverApt = responseData.appointment;
        if (item.localId) {
          await db.appointments.delete(item.localId);
        }
        await db.appointments.put({
          id: serverApt._id || serverApt.id,
          ...serverApt,
          synced: true,
          syncedAt: new Date().toISOString(),
        });
      }

      // Remove from queue
      await removeSyncItem(item.id);
      processed++;
      console.log(`[SyncQueue] Successfully replayed item #${item.id} (${item.type})`);
    } catch (err) {
      console.error(`[SyncQueue] Replay error on item #${item.id}:`, err.message);
      failed++;
      await db.syncQueue.update(item.id, {
        status: 'failed',
        retryCount: (item.retryCount || 0) + 1,
        lastError: err.message,
        lastAttemptAt: new Date().toISOString(),
      });
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('syncqueue-completed', {
        detail: { processed, failed, total: pendingItems.length },
      })
    );
  }

  return { success: failed === 0, processed, failed };
}

export default {
  SYNC_ACTIONS,
  addToSyncQueue,
  getPendingSyncCount,
  getPendingActions,
  removeSyncItem,
  replaySyncQueue,
};
