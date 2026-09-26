/**
 * Symptom Checker & Assessment API Service with IndexedDB Offline Storage & SyncQueue
 */

import db from '../offline/db';
import { addToSyncQueue, SYNC_ACTIONS } from '../offline/syncQueue';
import { apiRequest } from '../utils/httpClient';

const API_BASE = '/api/symptoms';

/**
 * Generate quick offline fallback triage guidance
 */
function generateOfflineTriage(symptoms = [], severity = 'moderate') {
  const symText = symptoms.join(' ').toLowerCase();
  let triageLevel = 'routine-consult';
  let triageAdvice = 'Please visit your nearest Primary Health Centre (PHC) when possible for clinical evaluation.';
  let urgency = 'medium';

  if (
    symText.includes('chest pain') ||
    symText.includes('breath') ||
    symText.includes('unconscious') ||
    symText.includes('severe bleeding') ||
    severity === 'severe'
  ) {
    triageLevel = 'emergency';
    triageAdvice = 'Urgent symptoms detected. Please call 108 Emergency Ambulance or visit the nearest emergency hospital immediately.';
    urgency = 'high';
  } else if (symText.includes('fever') || symText.includes('cough') || symText.includes('vomiting')) {
    triageLevel = 'priority-consult';
    triageAdvice = 'Keep hydrated with boiled water/ORS, take adequate rest, and connect with a doctor today.';
    urgency = 'medium';
  } else {
    triageLevel = 'self-care';
    triageAdvice = 'Monitor your vitals and rest. If symptoms worsen over 48 hours, seek medical care.';
    urgency = 'low';
  }

  return {
    triageLevel,
    triageAdvice,
    urgency,
    possibleConditions: ['Acute Symptom Episode (Evaluated via On-Device AI Triage)'],
  };
}

export const symptomService = {
  /**
   * Submit new symptom assessment
   * Automatically saves to Dexie and queues for replay if offline/low network
   */
  async createSymptom(token, symptomData) {
    try {
      const data = await apiRequest(API_BASE, {
        method: 'POST',
        token,
        body: symptomData,
        timeoutMs: 3500,
        retries: 1,
      });

      if (data.symptom) {
        await db.symptoms.put({
          ...data.symptom,
          id: data.symptom._id || data.symptom.id,
          synced: true,
        });
      }

      return data;
    } catch (err) {
      console.warn('[SymptomService] Network drop / timeout during symptom submission, saving offline in Dexie:', err.message);

      const tempId = `offline-sym-${Date.now()}`;
      const offlineTriage = generateOfflineTriage(symptomData.symptoms, symptomData.severity);

      const localSymptom = {
        id: tempId,
        _id: tempId,
        ...symptomData,
        ...offlineTriage,
        createdAt: new Date().toISOString(),
        synced: false,
        pendingSync: true,
        isOfflineCreated: true,
      };

      await db.symptoms.put(localSymptom);

      await addToSyncQueue({
        type: SYNC_ACTIONS.CREATE_SYMPTOM,
        endpoint: API_BASE,
        method: 'POST',
        payload: symptomData,
        localId: tempId,
      });

      return {
        success: true,
        symptom: localSymptom,
        offline: true,
        message: 'Assessment saved locally on device. Will automatically sync when connection returns.',
      };
    }
  },

  /**
   * Get past symptom assessments for current user (Stale-While-Revalidate)
   */
  async getPatientSymptoms(token) {
    // 1. Instant local-first return from Dexie
    let cachedSymptoms = [];
    try {
      cachedSymptoms = await db.symptoms.toArray();
      cachedSymptoms.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (e) {}

    try {
      const data = await apiRequest(API_BASE, {
        method: 'GET',
        token,
        timeoutMs: 3500,
        retries: 0,
      });

      if (Array.isArray(data.symptoms) && data.symptoms.length > 0) {
        const symptomsToCache = data.symptoms.map((s) => ({
          ...s,
          id: s._id || s.id,
          synced: true,
        }));
        await db.symptoms.bulkPut(symptomsToCache);
      }

      return data;
    } catch (err) {
      console.warn('[SymptomService] Network error / timeout, loading symptoms from Dexie:', err.message);
      return {
        success: true,
        symptoms: cachedSymptoms,
        offline: true,
      };
    }
  },

  /**
   * Get specific symptom assessment by ID
   */
  async getSymptomById(token, id) {
    try {
      return await apiRequest(`${API_BASE}/${id}`, {
        method: 'GET',
        token,
        timeoutMs: 3500,
      });
    } catch (err) {
      console.warn('[SymptomService] Network error fetching symptom by ID, searching Dexie:', err.message);
      const local = await db.symptoms.get(id);
      if (local) {
        return { success: true, symptom: local, offline: true };
      }
      throw err;
    }
  },

  /**
   * Get emergency triage status
   */
  async getEmergencyTriage(token) {
    try {
      return await apiRequest(`${API_BASE}/emergency-triage`, {
        method: 'GET',
        token,
        timeoutMs: 3000,
      });
    } catch (err) {
      return {
        success: true,
        triageList: [],
        offline: true,
      };
    }
  },

  /**
   * Update symptom assessment status
   */
  async updateSymptomStatus(token, id, status, resolutionNotes = '') {
    try {
      return await apiRequest(`${API_BASE}/${id}/status`, {
        method: 'PATCH',
        token,
        body: { status, resolutionNotes },
        timeoutMs: 3500,
      });
    } catch (err) {
      const local = await db.symptoms.get(id);
      if (local) {
        local.status = status;
        local.resolutionNotes = resolutionNotes;
        await db.symptoms.put(local);
        return { success: true, symptom: local, offline: true };
      }
      throw err;
    }
  },

  /**
   * Chat with AI Triage Doctor
   */
  async chatWithDoctorAi(token, payload) {
    return await apiRequest(`${API_BASE}/chat`, {
      method: 'POST',
      token,
      body: payload,
      timeoutMs: 20000,
    });
  },
};

export default symptomService;
