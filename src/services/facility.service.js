/**
 * Healthcare Facilities & Locator API Service with Offline Fallback & Dexie Caching
 */

import db from '../offline/db';
import { apiRequest } from '../utils/httpClient';

const API_BASE = '/api/facilities';

const DEFAULT_FACILITIES_FALLBACK = [
  {
    id: 'fac-1',
    _id: 'fac-1',
    name: 'Rampur Primary Health Centre (PHC)',
    type: 'primary-health-centre',
    category: 'Government Health Centre',
    distance: '0.8 km',
    distanceKm: 0.8,
    address: 'Main Road, Rampur Village Block 2',
    phone: '+91 98765 43210',
    contact: '+91 98765 43210',
    emergency24x7: true,
    availableDoctors: 3,
    bedCapacity: 12,
    rating: 4.8,
    lat: 28.6139,
    lng: 77.209,
  },
  {
    id: 'fac-2',
    _id: 'fac-2',
    name: 'District Community Health Centre (CHC)',
    type: 'government-hospital',
    category: 'Sub-District Hospital',
    distance: '4.5 km',
    distanceKm: 4.5,
    address: 'Hospital Road, Taluk Headquarters',
    phone: '+91 98765 11223',
    contact: '+91 98765 11223',
    emergency24x7: true,
    availableDoctors: 8,
    bedCapacity: 50,
    rating: 4.9,
    lat: 28.625,
    lng: 77.218,
  },
  {
    id: 'fac-3',
    _id: 'fac-3',
    name: 'Jan Aushadhi Medical & Pharmacy Sub-Centre',
    type: 'pharmacy',
    category: 'Affordable Pharmacy',
    distance: '1.1 km',
    distanceKm: 1.1,
    address: 'Near Panchayat Bhavan, Rampur',
    phone: '+91 98765 99887',
    contact: '+91 98765 99887',
    emergency24x7: false,
    availableDoctors: 0,
    bedCapacity: 0,
    rating: 4.7,
    lat: 28.611,
    lng: 77.205,
  },
];

export const facilityService = {
  /**
   * Get nearby healthcare facilities with GPS proximity sorting and filters (Stale-While-Revalidate)
   */
  async getNearbyFacilities(lat = null, lng = null, type = 'all', search = '') {
    const params = new URLSearchParams();
    if (lat !== null && lng !== null) {
      params.append('lat', lat.toString());
      params.append('lng', lng.toString());
    }
    if (type && type !== 'all') {
      params.append('type', type);
    }
    if (search && search.trim()) {
      params.append('search', search.trim());
    }

    const queryString = params.toString() ? `?${params.toString()}` : '';

    let localFacilities = [];
    try {
      localFacilities = await db.facilities.toArray();
      if (type && type !== 'all') {
        localFacilities = localFacilities.filter((f) => f.type === type);
      }
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        localFacilities = localFacilities.filter((f) => (f.name || '').toLowerCase().includes(q) || (f.address || '').toLowerCase().includes(q));
      }
    } catch (e) {}

    try {
      const data = await apiRequest(`${API_BASE}${queryString}`, {
        method: 'GET',
        timeoutMs: 3500,
        retries: 0,
      });

      if (Array.isArray(data.facilities) && data.facilities.length > 0) {
        const toCache = data.facilities.map((f) => ({
          ...f,
          id: f._id || f.id,
        }));
        await db.facilities.bulkPut(toCache);
      }

      return data;
    } catch (err) {
      console.warn('[FacilityService] Network error/timeout in getNearbyFacilities, returning Dexie fallback:', err.message);
      let list = localFacilities.length > 0 ? localFacilities : DEFAULT_FACILITIES_FALLBACK;
      if (type && type !== 'all') {
        list = list.filter((f) => f.type === type);
      }
      return {
        success: true,
        facilities: list,
        offline: true,
      };
    }
  },

  /**
   * Get single facility details
   */
  async getFacilityById(id) {
    try {
      return await apiRequest(`${API_BASE}/${id}`, {
        method: 'GET',
        timeoutMs: 3000,
      });
    } catch (err) {
      const local = await db.facilities.get(id);
      if (local) {
        return { success: true, facility: local, offline: true };
      }
      const defaultMatch = DEFAULT_FACILITIES_FALLBACK.find((f) => f.id === id || f._id === id);
      if (defaultMatch) {
        return { success: true, facility: defaultMatch, offline: true };
      }
      throw err;
    }
  },
};

export default facilityService;
