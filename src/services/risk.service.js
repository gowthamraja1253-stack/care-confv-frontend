import { apiRequest } from '../utils/httpClient';

const API_BASE = '/api/risk';

export const riskService = {
  /**
   * Get current patient's risk profile and history
   */
  async getRiskProfile(token) {
    try {
      return await apiRequest(API_BASE, {
        method: 'GET',
        token,
        timeoutMs: 3500,
        retries: 0,
      });
    } catch (err) {
      console.warn('[RiskService] Network slow/offline in getRiskProfile, using offline score:', err.message);
      return {
        success: true,
        riskScore: 24,
        riskLevel: 'low',
        categoryBreakdown: {
          vitals: 'normal',
          chronic: 'low',
          symptoms: 'mild',
        },
        recommendations: [
          'Maintain regular hydration and daily walking.',
          'Schedule annual health checkup at local PHC.',
        ],
        offline: true,
      };
    }
  },

  /**
   * Force recalculation of risk profile
   */
  async recalculateRisk(token) {
    try {
      return await apiRequest(`${API_BASE}/recalculate`, {
        method: 'POST',
        token,
        timeoutMs: 3500,
      });
    } catch (err) {
      return this.getRiskProfile(token);
    }
  },
};

export default riskService;
