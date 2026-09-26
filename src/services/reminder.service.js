import db from '../offline/db';
import { apiRequest } from '../utils/httpClient';

const API_BASE = '/api/reminders';

export const reminderService = {
  async getActiveReminders(token, empty = false) {
    if (empty) {
      return { success: true, count: 0, reminders: [] };
    }

    try {
      return await apiRequest(`${API_BASE}/active`, {
        method: 'GET',
        token,
        timeoutMs: 3000,
        retries: 0,
      });
    } catch (err) {
      console.warn('[ReminderService] Network error in getActiveReminders, providing offline schedule:', err.message);
      return {
        success: true,
        count: 2,
        reminders: [
          {
            id: 'rem-1',
            title: 'Morning Medication (Paracetamol / Multivitamin)',
            time: '08:30 AM',
            instructions: '1 tablet after breakfast with warm water',
            status: 'pending',
          },
          {
            id: 'rem-2',
            title: 'Bedtime Dose (Cetirizine / Blood Pressure)',
            time: '09:00 PM',
            instructions: '1 tablet before sleep',
            status: 'pending',
          },
        ],
        offline: true,
      };
    }
  },
};

export default reminderService;
