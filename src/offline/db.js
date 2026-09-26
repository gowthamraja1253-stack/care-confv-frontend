import Dexie from 'dexie';

/**
 * Rural Health Link - Client Offline Database
 * Uses IndexedDB via Dexie for resilient offline access and queuing in rural areas.
 */
export const db = new Dexie('RuralHealthOfflineDB');

// Define database schema & versioning
db.version(1).stores({
  healthRecords: 'id, patientId, type, date, title, doctorName, updatedAt, synced',
  appointments: 'id, patientId, doctorId, status, date, time, doctorName, updatedAt, synced',
  symptoms: 'id, patientId, createdAt, severity, triageLevel, synced',
  medicines: 'id, name, category, searchQuery, updatedAt',
  syncQueue: '++id, type, action, endpoint, method, status, createdAt, retryCount',
  appMeta: 'key, value, updatedAt',
});

// Version 2: Added doctors, facilities, preventiveTips, and reminders tables
db.version(2).stores({
  doctors: 'id, name, specialization, rating, experienceYears',
  facilities: 'id, name, type, distance, contact',
  preventiveTips: 'id, title, category, targetGroup',
  reminders: 'id, title, time, status',
});

// Version 3: Added medicineOrders table for offline order tracking
db.version(3).stores({
  medicineOrders: 'id, orderId, patientId, pharmacyId, status, createdAt',
});

/**
 * Helper to get or set metadata
 */
export const getAppMeta = async (key) => {
  try {
    const record = await db.appMeta.get(key);
    return record ? record.value : null;
  } catch (err) {
    console.warn('[OfflineDB] getAppMeta failed:', err);
    return null;
  }
};

export const setAppMeta = async (key, value) => {
  try {
    await db.appMeta.put({
      key,
      value,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[OfflineDB] setAppMeta failed:', err);
  }
};

export default db;
