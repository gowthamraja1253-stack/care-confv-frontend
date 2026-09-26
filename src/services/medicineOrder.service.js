/**
 * Medicine Order API Service with IndexedDB Offline Support & Dexie Caching
 * Enables patients to order prescribed medicines directly from nearby medical shops / Jan Aushadhi Kendras.
 */

import db from '../offline/db';
import { apiRequest } from '../utils/httpClient';

const API_BASE = '/api/medicine-orders';

export const medicineOrderService = {
  /**
   * Create a new medicine order from prescription to a nearby pharmacy
   */
  async createOrder(token, orderData) {
    try {
      const data = await apiRequest(API_BASE, {
        method: 'POST',
        token,
        body: orderData,
        timeoutMs: 4000,
      });

      if (data.success && data.order) {
        const order = data.order;
        await db.medicineOrders.put({
          id: order._id || order.id || order.orderId,
          orderId: order.orderId,
          patientId: order.patientId?._id || order.patientId || 'patient-me',
          pharmacyId: order.pharmacyId?._id || order.pharmacyId,
          pharmacyName: order.pharmacyName,
          medicines: order.medicines,
          deliveryType: order.deliveryType,
          deliveryAddress: order.deliveryAddress,
          status: order.status,
          totalEstimatedPrice: order.totalEstimatedPrice,
          createdAt: order.createdAt || new Date().toISOString(),
          synced: true,
        });
      }

      return data;
    } catch (err) {
      console.warn('[MedicineOrderService] Offline / error creating order, storing locally:', err.message);
      const localId = `local-ord-${Date.now()}`;
      const localOrderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;

      const offlineOrder = {
        id: localId,
        _id: localId,
        orderId: localOrderId,
        ...orderData,
        status: 'pending',
        createdAt: new Date().toISOString(),
        synced: false,
      };

      try {
        await db.medicineOrders.put(offlineOrder);
      } catch (e) {}

      return {
        success: true,
        offline: true,
        message: 'Order saved locally. Will be transmitted to pharmacy once network reconnects.',
        order: offlineOrder,
      };
    }
  },

  /**
   * Get logged-in patient's orders
   */
  async getPatientOrders(token) {
    let localOrders = [];
    try {
      localOrders = await db.medicineOrders.toArray();
      localOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (e) {}

    try {
      const data = await apiRequest(`${API_BASE}/patient`, {
        method: 'GET',
        token,
        timeoutMs: 3500,
      });

      if (data.success && Array.isArray(data.orders)) {
        for (const ord of data.orders) {
          await db.medicineOrders.put({
            id: ord._id || ord.id || ord.orderId,
            orderId: ord.orderId,
            patientId: ord.patientId?._id || ord.patientId,
            pharmacyId: ord.pharmacyId?._id || ord.pharmacyId,
            pharmacyName: ord.pharmacyName || ord.pharmacyId?.name,
            medicines: ord.medicines,
            deliveryType: ord.deliveryType,
            deliveryAddress: ord.deliveryAddress,
            status: ord.status,
            totalEstimatedPrice: ord.totalEstimatedPrice,
            createdAt: ord.createdAt,
            synced: true,
          });
        }
      }

      return data;
    } catch (err) {
      console.warn('[MedicineOrderService] Network drop in getPatientOrders, serving cached:', err.message);
      return {
        success: true,
        orders: localOrders,
        offline: true,
      };
    }
  },

  /**
   * Get pharmacy's incoming / active orders
   */
  async getPharmacyOrders(token, { status = 'all', pharmacyId = '' } = {}) {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);
    if (pharmacyId) params.append('pharmacyId', pharmacyId);

    const queryString = params.toString() ? `?${params.toString()}` : '';

    try {
      return await apiRequest(`${API_BASE}/pharmacy${queryString}`, {
        method: 'GET',
        token,
        timeoutMs: 3500,
      });
    } catch (err) {
      console.warn('[MedicineOrderService] Error fetching pharmacy orders:', err.message);
      return {
        success: true,
        orders: [],
        offline: true,
      };
    }
  },

  /**
   * Update order status (accepted, ready, completed, cancelled)
   */
  async updateOrderStatus(token, orderId, { status, notes = '' }) {
    try {
      const data = await apiRequest(`${API_BASE}/${orderId}/status`, {
        method: 'PATCH',
        token,
        body: { status, notes },
        timeoutMs: 3500,
      });

      if (data.success && data.order) {
        try {
          const ord = data.order;
          await db.medicineOrders.put({
            id: ord._id || ord.id || ord.orderId,
            orderId: ord.orderId,
            status: ord.status,
            updatedAt: new Date().toISOString(),
          });
        } catch (e) {}
      }

      return data;
    } catch (err) {
      console.warn('[MedicineOrderService] Error updating order status:', err.message);
      return {
        success: false,
        message: err.message || 'Failed to update order status',
      };
    }
  },
};

export default medicineOrderService;
