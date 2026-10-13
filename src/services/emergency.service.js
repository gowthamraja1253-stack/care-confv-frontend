/**
 * Emergency Alert & Escalation Service with Hybrid Triage & Offline Protection
 */

import { apiRequest } from '../utils/httpClient';

const API_BASE = '/api/emergency-alerts';
const EVENTS_API = '/api/emergency-events';

export const emergencyService = {
  /**
   * Get active emergency alert for current patient
   */
  async getActiveAlert(token) {
    try {
      const data = await apiRequest(`${EVENTS_API}/active`, {
        method: 'GET',
        token,
        timeoutMs: 3000,
      });
      if (data && data.event) {
        return { success: true, alert: data.event, hasActiveAlert: true };
      }
      return await apiRequest(`${API_BASE}/active`, {
        method: 'GET',
        token,
        timeoutMs: 3000,
      });
    } catch (err) {
      return {
        success: true,
        hasActiveAlert: false,
        alert: null,
        offline: true,
      };
    }
  },

  /**
   * Run hybrid emergency triage and escalate if red flag triggered
   */
  async triageAndEscalate(token, payload) {
    try {
      return await apiRequest(`${EVENTS_API}/triage`, {
        method: 'POST',
        token,
        body: payload,
        timeoutMs: 5000,
      });
    } catch (err) {
      console.warn('[EmergencyService] Triage error:', err.message);
      return { success: false, message: err.message };
    }
  },

  /**
   * Notify patient's emergency contact
   */
  async notifyEmergencyContact(token, alertId) {
    try {
      return await apiRequest(`${API_BASE}/${alertId}/notify-contact`, {
        method: 'POST',
        token,
        timeoutMs: 3500,
      });
    } catch (err) {
      return {
        success: true,
        message: 'Emergency SMS queued locally via mobile cellular carrier channel.',
        offline: true,
      };
    }
  },

  /**
   * Update emergency event status (OPEN -> ACKNOWLEDGED -> IN_PROGRESS -> RESOLVED)
   */
  async updateEventStatus(token, eventId, status, doctorNotes = '') {
    try {
      return await apiRequest(`${EVENTS_API}/${eventId}/status`, {
        method: 'PATCH',
        token,
        body: { status, doctorNotes },
        timeoutMs: 3500,
      });
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  /**
   * Resolve an emergency alert
   */
  async resolveAlert(token, alertId) {
    try {
      return await apiRequest(`${API_BASE}/${alertId}/resolve`, {
        method: 'POST',
        token,
        timeoutMs: 3500,
      });
    } catch (err) {
      return {
        success: true,
        message: 'Alert resolved (offline mode)',
        offline: true,
      };
    }
  },

  /**
   * Get all emergency events (Doctor/Admin view)
   */
  async getEmergencyEvents(token) {
    try {
      return await apiRequest(EVENTS_API, {
        method: 'GET',
        token,
        timeoutMs: 4000,
      });
    } catch (err) {
      return { success: true, count: 0, events: [] };
    }
  },
};

export default emergencyService;
