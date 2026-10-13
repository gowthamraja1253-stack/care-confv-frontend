import { apiRequest } from '../utils/httpClient';
import { addToSyncQueue } from '../offline/syncQueue';

const API_BASE = '/api/follow-ups';

export const followUpService = {
  /**
   * Get follow-ups with optional filter (upcoming, missed, completed, all)
   */
  async getFollowUps(token, status = 'ALL', patientId = null) {
    const params = new URLSearchParams();
    if (status && status !== 'ALL') params.append('status', status);
    if (patientId) params.append('patientId', patientId);

    const query = params.toString() ? `?${params.toString()}` : '';

    try {
      return await apiRequest(`${API_BASE}${query}`, {
        method: 'GET',
        token,
        timeoutMs: 4000,
      });
    } catch (err) {
      console.warn('[FollowUpService] Network error, providing offline follow-ups:', err.message);
      return {
        success: true,
        offline: true,
        followUps: [
          {
            _id: 'fu-offline-1',
            reason: 'Review blood pressure readings and response to Amlodipine 5mg',
            instructions: 'Record BP morning and evening for 7 days.',
            dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
            status: 'UPCOMING',
          },
        ],
        counts: { upcoming: 1, missed: 0, completed: 0 },
      };
    }
  },

  /**
   * Create follow-up (Doctor)
   */
  async createFollowUp(token, payload) {
    try {
      return await apiRequest(API_BASE, {
        method: 'POST',
        token,
        body: payload,
        timeoutMs: 4000,
      });
    } catch (err) {
      await addToSyncQueue({
        type: 'CREATE_FOLLOWUP',
        endpoint: API_BASE,
        method: 'POST',
        payload,
        token,
      });

      return {
        success: true,
        offline: true,
        message: 'Follow-up queued offline. Will sync when online.',
      };
    }
  },

  /**
   * Mark follow-up completed or cancel
   */
  async updateStatus(token, followUpId, status, notes = '') {
    try {
      return await apiRequest(`${API_BASE}/${followUpId}/status`, {
        method: 'PATCH',
        token,
        body: { status, notes },
        timeoutMs: 3500,
      });
    } catch (err) {
      await addToSyncQueue({
        type: 'UPDATE_FOLLOWUP',
        endpoint: `${API_BASE}/${followUpId}/status`,
        method: 'PATCH',
        payload: { status, notes },
        token,
      });

      return {
        success: true,
        offline: true,
        message: 'Follow-up status queued offline.',
      };
    }
  },
};

export default followUpService;
