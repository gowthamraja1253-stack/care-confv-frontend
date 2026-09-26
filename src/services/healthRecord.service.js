/**
 * Health Records API Service with IndexedDB Offline Caching & Sync
 */

import db from '../offline/db';
import { addToSyncQueue, SYNC_ACTIONS } from '../offline/syncQueue';
import { apiRequest, fetchWithTimeout } from '../utils/httpClient';
import { encryptData, decryptData } from '../utils/encryption';

const API_BASE = '/api/health-records';

export const healthRecordService = {
  /**
   * Get patient health records with optional tab filter and search (Stale-While-Revalidate)
   */
  async getPatientRecords(token, type = 'all', search = '', patientId = '') {
    const params = new URLSearchParams();
    if (type && type !== 'all') params.append('type', type);
    if (search && search.trim()) params.append('search', search.trim());
    if (patientId) params.append('patientId', patientId);

    const queryString = params.toString() ? `?${params.toString()}` : '';

    // 1. Get user-scoped cached records from IndexedDB
    let localRecords = [];
    try {
      let currentUserId = null;
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          currentUserId = payload.id || payload._id || payload.userId;
        } catch (e) {}
      }

      // User-scoped query: filter by specific patientId (doctor view) or current user id
      let rawRecords = [];
      const effectivePatientId = patientId || currentUserId;
      if (effectivePatientId) {
        rawRecords = await db.healthRecords.where('patientId').equals(effectivePatientId).toArray();
      } else {
        rawRecords = await db.healthRecords.toArray();
      }

      // Decrypt records using user-specific key
      for (const raw of rawRecords) {
        if (raw.encryptedBlob) {
          const decrypted = await decryptData(raw.encryptedBlob, token);
          if (decrypted) localRecords.push(decrypted);
        } else if (raw.patientId === effectivePatientId) {
          localRecords.push(raw);
        }
      }

      if (type && type !== 'all') {
        localRecords = localRecords.filter((r) => r.type === type);
      }
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        localRecords = localRecords.filter((r) =>
          (r.title && r.title.toLowerCase().includes(q)) ||
          (r.doctorName && r.doctorName.toLowerCase().includes(q)) ||
          (r.textContent && r.textContent.toLowerCase().includes(q)) ||
          (r.notes && r.notes.toLowerCase().includes(q))
        );
      }
      localRecords.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
    } catch (e) {}

    // 2. Fetch fresh records with timeout
    try {
      const data = await apiRequest(`${API_BASE}/patient${queryString}`, {
        method: 'GET',
        token,
        timeoutMs: 3500,
        retries: 0,
      });

      if (Array.isArray(data.records) && data.records.length > 0) {
        const recordsToCache = await Promise.all(data.records.map(async (r) => {
          const rec = {
            ...r,
            id: r._id || r.id,
            synced: true,
          };
          const encryptedBlob = await encryptData(rec, token);
          
          let patientId = 'anonymous';
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            patientId = payload.id || payload._id || payload.userId;
          } catch(e) {}
          
          return {
             id: rec.id,
             patientId,
             encryptedBlob,
             synced: true
          };
        }));
        await db.healthRecords.bulkPut(recordsToCache);
      }

      return data;
    } catch (err) {
      console.warn('[HealthRecordService] Network request slow/offline, returning from IndexedDB:', err.message);

      const allLocal = localRecords;
      const counts = {
        all: allLocal.length,
        'medical-history': allLocal.filter((r) => r.type === 'medical-history').length,
        prescription: allLocal.filter((r) => r.type === 'prescription').length,
        'test-result': allLocal.filter((r) => r.type === 'test-result').length,
        'consultation-note': allLocal.filter((r) => r.type === 'consultation-note').length,
      };

      return {
        success: true,
        records: localRecords,
        counts,
        offline: true,
      };
    }
  },

  /**
   * Create a new health record
   */
  async createRecord(token, recordPayload, file = null) {
    let body;
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (file) {
      const formData = new FormData();
      Object.keys(recordPayload).forEach((key) => {
        if (recordPayload[key] !== undefined && recordPayload[key] !== null) {
          if (Array.isArray(recordPayload[key])) {
            formData.append(key, JSON.stringify(recordPayload[key]));
          } else {
            formData.append(key, recordPayload[key]);
          }
        }
      });
      formData.append('file', file);
      body = formData;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(recordPayload);
    }

    try {
      const res = await fetchWithTimeout(API_BASE, {
        method: 'POST',
        headers,
        body,
      }, 15000);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create health record');
      }

      if (data.record) {
        const rec = {
          ...data.record,
          id: data.record._id || data.record.id,
          synced: true,
        };
        const encryptedBlob = await encryptData(rec, token);
        let patientId = 'anonymous';
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          patientId = payload.id || payload._id || payload.userId;
        } catch(e) {}
        
        await db.healthRecords.put({
          id: rec.id,
          patientId,
          encryptedBlob,
          synced: true
        });
      }

      return data;
    } catch (err) {
      console.warn('[HealthRecordService] Network drop, saving record locally in Dexie:', err.message);

      const tempId = `offline-hr-${Date.now()}`;
      const localRecord = {
        id: tempId,
        _id: tempId,
        ...recordPayload,
        fileUrl: file ? URL.createObjectURL(file) : '',
        fileName: file ? file.name : '',
        date: recordPayload.date || new Date().toISOString(),
        createdAt: new Date().toISOString(),
        synced: false,
        pendingSync: true,
        isOfflineCreated: true,
      };

      const encryptedBlob = await encryptData(localRecord, token);
      let patientId = 'anonymous';
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        patientId = payload.id || payload._id || payload.userId;
      } catch(e) {}

      await db.healthRecords.put({
          id: tempId,
          patientId,
          encryptedBlob,
          synced: false
      });

      if (!file) {
        await addToSyncQueue({
          type: SYNC_ACTIONS.CREATE_HEALTH_RECORD,
          endpoint: API_BASE,
          method: 'POST',
          payload: recordPayload,
          localId: tempId,
          token,
        });
      }

      return {
        success: true,
        record: localRecord,
        offline: true,
        message: 'Record saved securely on device. Will sync to your clinical profile when connection returns.',
      };
    }
  },

  /**
   * Get single record by ID
   */
  async getRecordById(token, id) {
    try {
      return await apiRequest(`${API_BASE}/${id}`, {
        method: 'GET',
        token,
        timeoutMs: 3000,
      });
    } catch (err) {
      const local = await db.healthRecords.get(id);
      if (local) {
        if (local.encryptedBlob) {
           const decrypted = await decryptData(local.encryptedBlob, token);
           if (decrypted) return { success: true, record: decrypted, offline: true };
        } else {
           return { success: true, record: local, offline: true };
        }
      }
      throw err;
    }
  },

  /**
   * Delete a record
   */
  async deleteRecord(token, id) {
    try {
      const data = await apiRequest(`${API_BASE}/${id}`, {
        method: 'DELETE',
        token,
        timeoutMs: 3500,
      });
      await db.healthRecords.delete(id);
      return data;
    } catch (err) {
      await db.healthRecords.delete(id);
      return { success: true, offline: true };
    }
  },

  /**
   * Explain a health record using AI
   */
  async explainReport(token, id, language = 'en', forceRefresh = false) {
    return await apiRequest(`${API_BASE}/${id}/explain`, {
      method: 'POST',
      token,
      body: { language, forceRefresh },
      timeoutMs: 15000,
    });
  },

  /**
   * Get list of registered patients (for doctors)
   */
  async getPatients(token) {
    return await apiRequest(`${API_BASE}/patients`, {
      method: 'GET',
      token,
      timeoutMs: 5000,
    });
  },
};

export default healthRecordService;
