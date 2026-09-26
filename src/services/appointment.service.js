/**
 * Appointment & Teleconsultation API Service with IndexedDB Offline Support & Low-Bandwidth Resilience
 */

import db from '../offline/db';
import { addToSyncQueue, SYNC_ACTIONS } from '../offline/syncQueue';
import { apiRequest } from '../utils/httpClient';

const API_BASE = '/api/appointments';

const DEFAULT_DOCTORS_FALLBACK = [
  {
    id: 'doc-1',
    _id: 'doc-1',
    name: 'Dr. Ananya Sharma',
    specialization: 'General Physician',
    qualification: 'MBBS, MD (General Medicine)',
    hospital: 'District Community Health Centre',
    experienceYears: 12,
    languages: ['Hindi', 'English'],
    rating: 4.9,
    consultationsCount: 1420,
    availableToday: true,
    isOnline: true,
    availabilitySlots: [
      { id: 'slot-101', day: 'Today', time: '10:30 AM - 11:00 AM', isBooked: false },
      { id: 'slot-102', day: 'Today', time: '11:30 AM - 12:00 PM', isBooked: false },
      { id: 'slot-103', day: 'Today', time: '04:30 PM - 05:00 PM', isBooked: false },
    ],
  },
  {
    id: 'doc-2',
    _id: 'doc-2',
    name: 'Dr. Rajesh Patel',
    specialization: 'Pediatrics',
    qualification: 'MBBS, DCH (Pediatrics)',
    hospital: 'Maternal & Child Health Unit',
    experienceYears: 9,
    languages: ['Hindi', 'English'],
    rating: 4.8,
    consultationsCount: 980,
    availableToday: true,
    isOnline: true,
    availabilitySlots: [
      { id: 'slot-201', day: 'Today', time: '11:00 AM - 11:30 AM', isBooked: false },
      { id: 'slot-202', day: 'Today', time: '03:30 PM - 04:00 PM', isBooked: false },
    ],
  },
  {
    id: 'doc-3',
    _id: 'doc-3',
    name: 'Dr. Sunita Rao',
    specialization: 'Cardiology',
    qualification: 'MBBS, MD, DM',
    hospital: 'District Multi-Speciality Hospital',
    experienceYears: 16,
    languages: ['Telugu', 'Hindi', 'English'],
    rating: 4.95,
    consultationsCount: 2150,
    availableToday: true,
    isOnline: true,
    availabilitySlots: [
      { id: 'slot-301', day: 'Today', time: '02:00 PM - 02:30 PM', isBooked: false },
      { id: 'slot-302', day: 'Today', time: '05:30 PM - 06:00 PM', isBooked: false },
    ],
  },
];

export const appointmentService = {
  /**
   * Get doctors with specializations and available slots (Stale-While-Revalidate)
   */
  async getDoctors(token, specialization = '') {
    const query = specialization ? `?specialization=${encodeURIComponent(specialization)}` : '';
    
    // Check local cache first
    let cachedDoctors = [];
    try {
      cachedDoctors = await db.doctors.toArray();
    } catch (e) {}

    try {
      const data = await apiRequest(`${API_BASE}/doctors${query}`, {
        method: 'GET',
        token,
        timeoutMs: 3500,
        retries: 0,
      });

      if (Array.isArray(data.doctors) && data.doctors.length > 0) {
        const toCache = data.doctors.map((d) => ({
          ...d,
          id: d._id || d.id,
        }));
        await db.doctors.bulkPut(toCache);
      }

      return data;
    } catch (err) {
      console.warn('[AppointmentService] Network slow/offline in getDoctors, using cache:', err.message);
      let docs = cachedDoctors.length > 0 ? cachedDoctors : DEFAULT_DOCTORS_FALLBACK;
      if (specialization && specialization !== 'all' && specialization !== 'All') {
        docs = docs.filter((d) => (d.specialization || '').toLowerCase().includes(specialization.toLowerCase()));
      }
      return {
        success: true,
        doctors: docs,
        offline: true,
      };
    }
  },

  /**
   * Book a new appointment
   * Supports offline / low-bandwidth queuing
   */
  async bookAppointment(token, bookingData) {
    try {
      const data = await apiRequest(`${API_BASE}`, {
        method: 'POST',
        token,
        body: bookingData,
        timeoutMs: 3500,
        retries: 1,
      });

      if (data.appointment) {
        await db.appointments.put({
          ...data.appointment,
          id: data.appointment._id || data.appointment.id,
          synced: true,
        });
      }

      return data;
    } catch (err) {
      console.warn('[AppointmentService] Offline/low-network booking, queuing in SyncQueue:', err.message);

      const tempId = `offline-apt-${Date.now()}`;
      const localApt = {
        id: tempId,
        _id: tempId,
        ...bookingData,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
        synced: false,
        isOfflineCreated: true,
      };

      await db.appointments.put(localApt);

      await addToSyncQueue({
        type: SYNC_ACTIONS.BOOK_APPOINTMENT,
        endpoint: API_BASE,
        method: 'POST',
        payload: bookingData,
        localId: tempId,
      });

      return {
        success: true,
        appointment: localApt,
        offline: true,
        message: 'Appointment booked offline. Will sync with hospital server when connection improves.',
      };
    }
  },

  /**
   * Get upcoming appointments
   */
  async getUpcomingAppointments(token) {
    let localApts = [];
    try {
      localApts = await db.appointments.toArray();
      localApts.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
    } catch (e) {}

    try {
      const data = await apiRequest(`${API_BASE}/upcoming`, {
        method: 'GET',
        token,
        timeoutMs: 3500,
        retries: 0,
      });

      if (Array.isArray(data.appointments) && data.appointments.length > 0) {
        const toCache = data.appointments.map((a) => ({
          ...a,
          id: a._id || a.id,
          synced: true,
        }));
        await db.appointments.bulkPut(toCache);
      }

      return data;
    } catch (err) {
      console.warn('[AppointmentService] Network error in getUpcomingAppointments, using Dexie:', err.message);
      return {
        success: true,
        appointments: localApts,
        offline: true,
      };
    }
  },

  /**
   * Get patient appointment history
   */
  async getPatientAppointments(token) {
    let localApts = [];
    try {
      localApts = await db.appointments.toArray();
      localApts.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
    } catch (e) {}

    try {
      const data = await apiRequest(`${API_BASE}/patient`, {
        method: 'GET',
        token,
        timeoutMs: 3500,
      });

      if (Array.isArray(data.appointments) && data.appointments.length > 0) {
        const toCache = data.appointments.map((a) => ({
          ...a,
          id: a._id || a.id,
          synced: true,
        }));
        await db.appointments.bulkPut(toCache);
      }

      return data;
    } catch (err) {
      return {
        success: true,
        appointments: localApts,
        offline: true,
      };
    }
  },

  /**
   * Get doctor consultation queue
   */
  async getDoctorQueue(token, status = '') {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    try {
      return await apiRequest(`${API_BASE}/doctor-queue${query}`, {
        method: 'GET',
        token,
        timeoutMs: 3500,
      });
    } catch (err) {
      const localApts = await db.appointments.toArray();
      return {
        success: true,
        queue: status ? localApts.filter((a) => a.status === status) : localApts,
        offline: true,
      };
    }
  },

  /**
   * Update appointment status
   */
  async updateAppointmentStatus(token, id, statusData) {
    try {
      const data = await apiRequest(`${API_BASE}/${id}/status`, {
        method: 'PATCH',
        token,
        body: typeof statusData === 'string' ? { status: statusData } : statusData,
        timeoutMs: 3500,
      });

      if (data.appointment) {
        await db.appointments.put({
          ...data.appointment,
          id: data.appointment._id || data.appointment.id,
          synced: true,
        });
      }

      return data;
    } catch (err) {
      const local = await db.appointments.get(id);
      if (local) {
        const updated = {
          ...local,
          ...(typeof statusData === 'string' ? { status: statusData } : statusData),
        };
        await db.appointments.put(updated);
        return { success: true, appointment: updated, offline: true };
      }
      throw err;
    }
  },

  /**
   * Get appointment by ID
   */
  async getAppointmentById(token, id) {
    try {
      return await apiRequest(`${API_BASE}/${id}`, {
        method: 'GET',
        token,
        timeoutMs: 3000,
      });
    } catch (err) {
      const local = await db.appointments.get(id);
      if (local) {
        return { success: true, appointment: local, offline: true };
      }
      throw err;
    }
  },
};

export default appointmentService;
