import db from '../offline/db';
import { apiRequest } from '../utils/httpClient';

const API_BASE = '/api/preventive-tips';

const DEFAULT_PREVENTIVE_TIPS_FALLBACK = {
  success: true,
  healthRiskLevel: 'low',
  tips: [
    {
      id: 'tip-1',
      title: 'Adequate Hydration in Rural Heat',
      description: 'Drink at least 2.5 - 3 liters of boiled/filtered water daily to prevent dehydration and kidney strain.',
      category: 'Lifestyle & Hydration',
      icon: 'droplets',
    },
    {
      id: 'tip-2',
      title: 'Hygiene & Clean Food Practices',
      description: 'Wash hands thoroughly with soap before meals and after working in the field to protect against seasonal gastrointestinal infections.',
      category: 'Infection Prevention',
      icon: 'shield',
    },
    {
      id: 'tip-3',
      title: 'Blood Pressure & Salt Intake Control',
      description: 'Limit pickles and added table salt. Engage in daily 30-minute brisk walking to maintain cardiovascular health.',
      category: 'Chronic Care',
      icon: 'heart',
    },
  ],
  offline: true,
};

export const preventiveTipService = {
  /**
   * Fetch today's preventive health tips for the patient (Stale-While-Revalidate)
   */
  async getPreventiveTips(token, lang = 'en', forceRefresh = false) {
    const url = `${API_BASE}?lang=${encodeURIComponent(lang)}${forceRefresh ? '&refresh=true' : ''}`;
    
    let localTips = [];
    try {
      localTips = await db.preventiveTips.toArray();
    } catch (e) {}

    try {
      const data = await apiRequest(url, {
        method: 'GET',
        token,
        timeoutMs: 3500,
        retries: 0,
      });

      if (Array.isArray(data.tips) && data.tips.length > 0) {
        const toCache = data.tips.map((t) => ({ ...t, id: t._id || t.id }));
        await db.preventiveTips.bulkPut(toCache);
      }

      return data;
    } catch (err) {
      console.warn('[PreventiveTipService] Network slow/offline in getPreventiveTips, using cache:', err.message);
      if (localTips.length > 0) {
        return {
          success: true,
          healthRiskLevel: 'low',
          tips: localTips,
          offline: true,
        };
      }
      return DEFAULT_PREVENTIVE_TIPS_FALLBACK;
    }
  },

  /**
   * Force refresh / recalculate tips
   */
  async refreshTips(token, lang = 'en') {
    try {
      return await apiRequest(`${API_BASE}/refresh?lang=${encodeURIComponent(lang)}`, {
        method: 'POST',
        token,
        timeoutMs: 3500,
      });
    } catch (err) {
      return this.getPreventiveTips(token, lang, false);
    }
  },
};

export default preventiveTipService;
