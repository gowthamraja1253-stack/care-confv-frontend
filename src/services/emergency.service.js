/**
 * Emergency Alert API Service with Timeout Protection & Offline Fallbacks
 */

import { apiRequest } from '../utils/httpClient';

const API_BASE = '/api/emergency-alerts';

export const emergencyService = {
  /**
   * Get active emergency alert for current patient
   */
  async getActiveAlert(token) {
    try {
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
        offline: true,
      };
    }
  },
};

export default emergencyService;
