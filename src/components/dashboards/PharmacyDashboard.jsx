import React, { useState, useEffect } from 'react';
import { createSocket } from '../../utils/socketClient';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import medicineService from '../../services/medicine.service';
import medicineOrderService from '../../services/medicineOrder.service';
import {
  Building2,
  Package,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Search,
  Pill,
  Trash2,
  Edit3,
  RefreshCw,
  MapPin,
  Clock,
  Phone,
  ShieldCheck,
  Eye,
  ExternalLink,
  X,
  Crosshair,
  ShoppingBag,
  Truck,
  Inbox,
  Check,
  CheckCheck,
} from 'lucide-react';


export const PharmacyDashboard = ({ onNavigate }) => {
  const { t } = useTranslation();
  const { user, token, updateProfile } = useAuth();

  // Navigation Tabs state
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'inventory'

  // Orders State
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [orderFilter, setOrderFilter] = useState('all');
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSearch, setFilterSearch] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);
  const [syncingGps, setSyncingGps] = useState(false);

  // Add / Edit Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [medName, setMedName] = useState('');
  const [inStock, setInStock] = useState(true);
  const [quantity, setQuantity] = useState(50);
  const [price, setPrice] = useState(15.0);
  const [batchNumber, setBatchNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);


  const handleSyncGps = () => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      setSyncingGps(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            await updateProfile({
              facilityLocation: {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              },
            });
            setSyncingGps(false);
            setStatusMessage({
              type: 'success',
              text: t('pharmacyDashboard.gpsSyncedSuccess'),
            });
          } catch (err) {
            setSyncingGps(false);
            alert('Failed to update shop location');
          }
        },
        (err) => {
          setSyncingGps(false);
          alert(`GPS error: ${err.message}`);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      alert('Geolocation is not supported by your browser');
    }
  };

  // Common quick medicines suggestions
  const catalogSuggestions = [
    'Paracetamol 650mg',
    'Amoxicillin & Potassium Clavulanate 625mg',
    'Oral Rehydration Salts (ORS) Sachet',
    'Metformin Hydrochloride 500mg (SR)',
    'Cetirizine Hydrochloride 10mg',
    'Azithromycin 500mg',
    'Amlodipine Besylate 5mg',
    'Omeprazole 20mg Capsules',
    'Salbutamol / Albuterol 100mcg Inhaler',
    'Povidone Iodine 5% Antiseptic Ointment',
    'Insulin Glargine 100 IU/ml Cartridge',
    'Vitamin D3 60,000 IU Chewable',
  ];

  const fetchMyStock = async () => {
    setLoading(true);
    try {
      const data = await medicineService.getMyPharmacyStock(token);
      if (data.success && Array.isArray(data.stocks)) {
        setStocks(data.stocks);
      }
    } catch (err) {
      console.warn('Failed to load center stock:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const data = await medicineOrderService.getPharmacyOrders(token, {
        pharmacyId: user?.facilityId,
      });
      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.warn('[PharmacyDashboard] Failed to fetch orders:', err.message);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await medicineOrderService.updateOrderStatus(token, orderId, {
        status: newStatus,
      });
      if (res.success && res.order) {
        setOrders((prev) =>
          prev.map((o) => (o._id === orderId || o.id === orderId || o.orderId === orderId ? res.order : o))
        );
        setStatusMessage({
          type: 'success',
          text: `Order ${res.order.orderId || orderId} status updated to ${newStatus.toUpperCase()}`,
        });
      } else {
        alert(res.message || 'Could not update status');
      }
    } catch (e) {
      alert(e.message || 'Failed to update order status');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  useEffect(() => {
    fetchMyStock();
    fetchOrders();

    // Real-Time Socket Connection for Incoming Medicine Orders
    let socket = null;
    try {
      socket = createSocket();

      socket.on('connect', () => {
        socket.emit('join-pharmacy', { pharmacyId: user?.facilityId });
      });

      socket.on('new-medicine-order', ({ order }) => {
        if (order) {
          setOrders((prev) => [order, ...prev.filter((o) => o.orderId !== order.orderId)]);
          setStatusMessage({
            type: 'success',
            text: `🔔 New Prescription Order #${order.orderId} from ${order.patientName || 'Patient'} (${order.patientVillage || 'Village'})!`,
          });
        }
      });

      socket.on('order-status-updated', ({ order }) => {
        if (order) {
          setOrders((prev) =>
            prev.map((o) => (o.orderId === order.orderId ? order : o))
          );
        }
      });
    } catch (e) {
      console.warn('[PharmacyDashboard] Socket init skipped:', e.message);
    }

    // Automatically sync shop location with live GPS if available
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const curLat = user?.facilityLocation?.lat;
          if (!curLat || Math.abs(curLat - 28.805) < 0.05 || Math.abs(curLat - lat) > 0.01) {
            try {
              await updateProfile({
                facilityLocation: { lat, lng },
              });
            } catch (err) {
              console.warn('[PharmacyDashboard] GPS auto-sync skipped:', err.message);
            }
          }
        },
        (err) => console.warn('[PharmacyDashboard] GPS access:', err.message),
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [token, user?.facilityId]);


  // Quick 1-click In/Out of Stock Toggle
  const handleToggleStockStatus = async (item) => {
    const newStatus = !item.inStock;
    const newQty = newStatus ? (item.quantity > 0 ? item.quantity : 30) : 0;

    try {
      await medicineService.updatePharmacyStock(
        {
          pharmacyId: user?.facilityId,
          medicineName: item.medicineName,
          inStock: newStatus,
          quantity: newQty,
          price: item.price,
          batchNumber: item.batchNumber,
        },
        token
      );

      setStatusMessage({
        type: 'success',
        text: `${item.medicineName} -> ${newStatus ? t('findMedicines.inStock') : t('findMedicines.outOfStock')}`,
      });

      fetchMyStock();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to update status' });
    }
  };

  const handleDeleteItem = async (id, medTitle) => {
    if (!window.confirm(`${t('app.delete')} "${medTitle}"?`)) {
      return;
    }

    try {
      await medicineService.deletePharmacyStock(id, token);
      setStatusMessage({ type: 'success', text: `${t('app.delete')}: ${medTitle}` });
      fetchMyStock();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to remove item' });
    }
  };

  const handleOpenAddModal = (initialName = '') => {
    setEditingId(null);
    setMedName(initialName);
    setInStock(true);
    setQuantity(50);
    setPrice(15.0);
    setBatchNumber(`BATCH-${new Date().getFullYear()}`);
    setShowModal(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingId(item._id);
    setMedName(item.medicineName);
    setInStock(item.inStock);
    setQuantity(item.quantity);
    setPrice(item.price || 15.0);
    setBatchNumber(item.batchNumber || '');
    setShowModal(true);
  };

  const handleSaveStock = async (e) => {
    e.preventDefault();
    if (!medName.trim()) {
      alert('Please enter medicine formulation name');
      return;
    }

    setIsSubmitting(true);
    try {
      await medicineService.updatePharmacyStock(
        {
          pharmacyId: user?.facilityId,
          medicineName: medName.trim(),
          inStock,
          quantity: inStock ? parseInt(quantity, 10) || 0 : 0,
          price: parseFloat(price) || 0,
          batchNumber: batchNumber || 'BATCH-STD',
        },
        token
      );

      setShowModal(false);
      setStatusMessage({
        type: 'success',
        text: `${t('app.save')}: ${medName}`,
      });
      fetchMyStock();
    } catch (err) {
      alert(err.message || 'Failed to save medicine');
    } finally {
      setIsSubmitting(false);
    }
  };

  // KPI Calculations
  const inStockCount = stocks.filter((s) => s.inStock && s.quantity > 0).length;
  const outOfStockCount = stocks.filter((s) => !s.inStock || s.quantity === 0).length;

  const filteredStocks = stocks.filter((s) =>
    s.medicineName.toLowerCase().includes(filterSearch.toLowerCase())
  );

  return (
    <div style={styles.container}>
      {/* Healthcare Center Header Banner */}
      <div className="card-base" style={styles.facilityBanner}>
        <div style={styles.facilityIcon}>
          <Building2 size={24} color="#6D28D9" strokeWidth={2.4} />
        </div>
        <div style={styles.facilityInfo}>
          <div style={styles.bannerTopRow}>
            <h2 style={styles.facilityName}>
              {user?.facilityName || `${user?.name || 'Healthcare Center'} Medical Store`}
            </h2>
            <span style={styles.verifiedBadge}>
              <ShieldCheck size={12} color="#059669" />
              {t('facilityLocator.verifiedBadge')}
            </span>
          </div>
          <div style={styles.metaRow}>
            <span style={styles.metaItem}>
              <MapPin size={12} color="#64748B" />
              {user?.facilityAddress || user?.village || 'Village Hub'}
            </span>
            <span style={styles.metaItem}>
              <Clock size={12} color="#059669" />
              {user?.facilityHours || '08:00 AM - 09:30 PM (Daily)'}
            </span>
            <button
              type="button"
              style={styles.syncGpsBtn}
              onClick={handleSyncGps}
              disabled={syncingGps}
              title={t('pharmacyDashboard.syncGpsBtn')}
            >
              <Crosshair size={11} color="#6D28D9" />
              <span>
                {syncingGps
                  ? t('pharmacyDashboard.syncingGps')
                  : user?.facilityLocation?.lat
                  ? `GPS: ${Number(user.facilityLocation.lat).toFixed(3)}°, ${Number(user.facilityLocation.lng).toFixed(3)}° (${t('profile.syncGpsBtn')})`
                  : t('pharmacyDashboard.syncGpsBtn')}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation: Incoming Orders vs Inventory */}
      <div style={styles.tabNavStrip}>
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          style={{
            ...styles.tabNavBtn,
            backgroundColor: activeTab === 'orders' ? '#6D28D9' : '#FFFFFF',
            color: activeTab === 'orders' ? '#FFFFFF' : '#475569',
            borderColor: activeTab === 'orders' ? '#6D28D9' : '#E2E8F0',
            boxShadow: activeTab === 'orders' ? '0 4px 12px rgba(109, 40, 217, 0.25)' : 'none',
          }}
        >
          <Inbox size={16} color={activeTab === 'orders' ? '#FFFFFF' : '#6D28D9'} strokeWidth={2.4} />
          <span>Prescription Orders</span>
          {orders.filter((o) => o.status === 'pending').length > 0 && (
            <span style={{
              ...styles.tabCounterBadge,
              backgroundColor: activeTab === 'orders' ? '#FFFFFF' : '#EF4444',
              color: activeTab === 'orders' ? '#DC2626' : '#FFFFFF',
            }}>
              {orders.filter((o) => o.status === 'pending').length} New
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          style={{
            ...styles.tabNavBtn,
            backgroundColor: activeTab === 'inventory' ? '#6D28D9' : '#FFFFFF',
            color: activeTab === 'inventory' ? '#FFFFFF' : '#475569',
            borderColor: activeTab === 'inventory' ? '#6D28D9' : '#E2E8F0',
            boxShadow: activeTab === 'inventory' ? '0 4px 12px rgba(109, 40, 217, 0.25)' : 'none',
          }}
        >
          <Package size={16} color={activeTab === 'inventory' ? '#FFFFFF' : '#6D28D9'} strokeWidth={2.4} />
          <span>Medicine Inventory</span>
          <span style={{
            ...styles.tabCounterBadge,
            backgroundColor: activeTab === 'inventory' ? '#FFFFFF' : '#EDE9FE',
            color: activeTab === 'inventory' ? '#6D28D9' : '#6D28D9',
          }}>
            {stocks.length}
          </span>
        </button>
      </div>

      {/* ORDERS TAB VIEW */}
      {activeTab === 'orders' && (
        <div style={styles.ordersSection}>
          <div style={styles.sectionHeaderRow}>
            <div>
              <h3 style={styles.sectionTitle}>Prescription Fulfillment Orders</h3>
              <p style={styles.sectionSub}>Live requests routed from doctor teleconsultations & health records</p>
            </div>
            <button
              type="button"
              style={styles.refreshBtn}
              onClick={fetchOrders}
              title="Refresh Orders"
            >
              <RefreshCw size={14} color="#6D28D9" />
            </button>
          </div>

          {/* Filter Pills */}
          <div style={styles.ordersFilterRow}>
            {['all', 'pending', 'accepted', 'ready', 'completed'].map((st) => {
              const isSelected = orderFilter === st;
              const count = st === 'all' ? orders.length : orders.filter((o) => o.status === st).length;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setOrderFilter(st)}
                  style={{
                    ...styles.orderFilterBtn,
                    backgroundColor: isSelected ? '#6D28D9' : '#FFFFFF',
                    color: isSelected ? '#FFFFFF' : '#475569',
                    borderColor: isSelected ? '#6D28D9' : '#CBD5E1',
                    fontWeight: isSelected ? '800' : '600',
                  }}
                >
                  <span style={{ textTransform: 'capitalize' }}>{st}</span>
                  <span style={{
                    ...styles.filterCountBadge,
                    backgroundColor: isSelected ? '#FFFFFF' : '#F1F5F9',
                    color: isSelected ? '#6D28D9' : '#475569',
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Orders List */}
          {loadingOrders ? (
            <div style={styles.loadingBox}>
              <div style={styles.spinner} />
              <p style={styles.loadingText}>Fetching incoming prescription orders...</p>
            </div>
          ) : orders.filter((o) => (orderFilter === 'all' ? true : o.status === orderFilter)).length === 0 ? (
            <div className="card-base" style={styles.emptyCard}>
              <div style={styles.emptyIconCircle}>
                <Inbox size={28} color="#6D28D9" />
              </div>
              <h4 style={styles.emptyTitle}>No {orderFilter === 'all' ? '' : orderFilter} prescription orders</h4>
              <p style={styles.emptySub}>
                Orders dispatched by patients for prescribed medications will appear here in real time.
              </p>
            </div>
          ) : (
            <div style={styles.ordersList}>
              {orders
                .filter((o) => (orderFilter === 'all' ? true : o.status === orderFilter))
                .map((order) => {
                  const isUpdating = updatingOrderId === (order._id || order.id || order.orderId);
                  const isPending = order.status === 'pending';
                  const isAccepted = order.status === 'accepted';
                  const isReady = order.status === 'ready';
                  const isCompleted = order.status === 'completed';

                  return (
                    <div key={order._id || order.id || order.orderId} className="card-base" style={styles.orderCard}>
                      {/* Top Row: Order ID, Time, Status */}
                      <div style={styles.orderCardHeader}>
                        <div style={styles.orderIdGroup}>
                          <span style={styles.orderIdPill}>
                            <ShoppingBag size={12} color="#6D28D9" />
                            <strong>{order.orderId}</strong>
                          </span>
                          <span style={styles.orderTimeText}>
                            {order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                          </span>
                        </div>

                        <span
                          style={{
                            ...styles.orderStatusBadge,
                            backgroundColor: isPending ? '#FEF3C7' : isAccepted ? '#DBEAFE' : isReady ? '#EDE9FE' : isCompleted ? '#DCFCE7' : '#F1F5F9',
                            color: isPending ? '#92400E' : isAccepted ? '#1E40AF' : isReady ? '#5B21B6' : isCompleted ? '#166534' : '#475569',
                            borderColor: isPending ? '#FDE68A' : isAccepted ? '#BFDBFE' : isReady ? '#DDD6FE' : isCompleted ? '#BBF7D0' : '#CBD5E1',
                          }}
                        >
                          {order.status ? order.status.toUpperCase() : 'PENDING'}
                        </span>
                      </div>

                      {/* Patient & Doctor Details */}
                      <div style={styles.patientInfoBox}>
                        <div style={styles.patientMetaRow}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MapPin size={12} color="#059669" />
                            <strong style={{ fontSize: '0.84rem', color: '#1E1B4B' }}>
                              {order.patientName || 'Patient'}
                            </strong>
                            <span style={styles.villageTag}>
                              {order.patientVillage || 'Village Hub'}
                            </span>
                          </div>

                          {order.patientPhone && (
                            <a
                              href={`tel:${order.patientPhone}`}
                              style={styles.callPhoneBtn}
                              title="Call patient"
                            >
                              <Phone size={11} color="#059669" />
                              <span>{order.patientPhone}</span>
                            </a>
                          )}
                        </div>

                        <div style={styles.prescriptionMetaRow}>
                          <span style={styles.prescriptionDoctor}>
                            Prescribed by: <strong>{order.doctorName || 'Doctor'}</strong>
                          </span>
                          {order.prescriptionTitle && (
                            <span style={styles.prescriptionTitleText}>• {order.prescriptionTitle}</span>
                          )}
                        </div>

                        {/* Delivery Method Badge */}
                        <div style={styles.fulfillmentModeRow}>
                          <span style={styles.fulfillmentBadge}>
                            {order.deliveryType === 'delivery' ? (
                              <>
                                <Truck size={12} color="#0284C7" />
                                <span>Village Doorstep Delivery: {order.deliveryAddress || order.patientVillage}</span>
                              </>
                            ) : (
                              <>
                                <Building2 size={12} color="#6D28D9" />
                                <span>Self-Pickup at Medical Shop Counter</span>
                              </>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Prescribed Medicines List */}
                      <div style={styles.orderMedicinesSection}>
                        <span style={styles.orderMedsLabel}>Prescription Medicines:</span>
                        <div style={styles.orderMedsGrid}>
                          {Array.isArray(order.medicines) &&
                            order.medicines.map((item, idx) => (
                              <div key={idx} style={styles.orderMedItem}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <strong style={{ fontSize: '0.8rem', color: '#1E1B4B' }}>{item.name}</strong>
                                  <span style={{ fontSize: '0.7rem', color: '#6D28D9' }}>{item.dosage}</span>
                                  {item.instructions && (
                                    <span style={{ fontSize: '0.66rem', color: '#64748B' }}>{item.instructions}</span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={styles.medQtyBadge}>{item.quantity || 10} units</span>
                                  <span style={styles.medPriceBadge}>₹{item.price || 25}</span>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Order Footer & Action Buttons */}
                      <div style={styles.orderFooter}>
                        <div style={styles.orderTotalWrap}>
                          <span style={styles.orderTotalLabel}>Estimated Total:</span>
                          <strong style={styles.orderTotalValue}>
                            ₹{order.totalEstimatedPrice || 50}
                          </strong>
                        </div>

                        <div style={styles.orderActionsRow}>
                          {isPending && (
                            <>
                              <button
                                type="button"
                                style={styles.cancelOrderBtn}
                                onClick={() => handleUpdateOrderStatus(order._id || order.id || order.orderId, 'cancelled')}
                                disabled={isUpdating}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                style={styles.acceptBtn}
                                onClick={() => handleUpdateOrderStatus(order._id || order.id || order.orderId, 'accepted')}
                                disabled={isUpdating}
                              >
                                <Check size={14} color="#FFFFFF" strokeWidth={2.5} />
                                <span>Accept Order</span>
                              </button>
                            </>
                          )}

                          {isAccepted && (
                            <button
                              type="button"
                              style={styles.readyBtn}
                              onClick={() => handleUpdateOrderStatus(order._id || order.id || order.orderId, 'ready')}
                              disabled={isUpdating}
                            >
                              <Package size={14} color="#FFFFFF" strokeWidth={2.4} />
                              <span>Mark Ready for {order.deliveryType === 'delivery' ? 'Delivery' : 'Pickup'}</span>
                            </button>
                          )}

                          {isReady && (
                            <button
                              type="button"
                              style={styles.completeBtn}
                              onClick={() => handleUpdateOrderStatus(order._id || order.id || order.orderId, 'completed')}
                              disabled={isUpdating}
                            >
                              <CheckCheck size={14} color="#FFFFFF" strokeWidth={2.5} />
                              <span>Complete & Dispensed</span>
                            </button>
                          )}

                          {isCompleted && (
                            <span style={styles.completedTag}>
                              <CheckCircle2 size={13} color="#059669" />
                              <span>Dispensed & Handed Over</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* INVENTORY TAB VIEW */}
      {activeTab === 'inventory' && (
        <>
          {/* 3x1 KPI Analytics Summary */}
          <div style={styles.kpiGrid}>
            <div className="card-base" style={{ ...styles.kpiCard, borderColor: '#DDD6FE' }}>
              <span style={styles.kpiLabel}>{t('pharmacyDashboard.totalMedicines')}</span>
              <span style={styles.kpiVal}>{stocks.length}</span>
              <span style={styles.kpiSub}>{t('pharmacyDashboard.inventoryHeading')}</span>
            </div>

            <div className="card-base" style={{ ...styles.kpiCard, borderColor: '#A7F3D0' }}>
              <span style={{ ...styles.kpiLabel, color: '#065F46' }}>{t('findMedicines.inStock')}</span>
              <span style={{ ...styles.kpiVal, color: '#059669' }}>{inStockCount}</span>
              <span style={styles.kpiSub}>{t('app.active')}</span>
            </div>

            <div className="card-base" style={{ ...styles.kpiCard, borderColor: '#FECACA' }}>
              <span style={{ ...styles.kpiLabel, color: '#991B1B' }}>{t('findMedicines.outOfStock')}</span>
              <span style={{ ...styles.kpiVal, color: '#DC2626' }}>{outOfStockCount}</span>
              <span style={styles.kpiSub}>{t('pharmacyDashboard.lowStockCount')}</span>
            </div>
          </div>

          {/* Quick Action Strip */}
          <div style={styles.actionStrip}>
            <button
              type="button"
              style={styles.addMedBtn}
              onClick={() => handleOpenAddModal()}
            >
              <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
              <span>{t('pharmacyDashboard.addMedBtn')}</span>
            </button>

            <button
              type="button"
              style={styles.viewPublicBtn}
              onClick={() => onNavigate && onNavigate('medicines')}
            >
              <Eye size={15} color="#6D28D9" />
              <span>{t('quickActions.medicines')}</span>
            </button>
          </div>

          {/* Inventory Section Header & Search */}
          <div style={styles.inventorySection}>
            <div style={styles.sectionHeaderRow}>
              <div>
                <h3 style={styles.sectionTitle}>{t('pharmacyDashboard.inventoryHeading')}</h3>
                <p style={styles.sectionSub}>{t('pharmacyDashboard.sub')}</p>
              </div>
              <button
                type="button"
                style={styles.refreshBtn}
                onClick={fetchMyStock}
                title={t('common.retry', { defaultValue: 'Refresh' })}
              >
                <RefreshCw size={14} color="#6D28D9" />
              </button>
            </div>

        {/* Search within inventory */}
        <div style={styles.searchBox}>
          <Search size={15} color="#64748B" style={styles.searchIcon} />
          <input
            type="text"
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            placeholder={t('pharmacyDashboard.searchPlaceholder')}
            style={styles.searchInput}
          />
          {filterSearch && (
            <button
              type="button"
              style={styles.clearSearchBtn}
              onClick={() => setFilterSearch('')}
            >
              <X size={13} color="#64748B" />
            </button>
          )}
        </div>

        {/* Stock Items List */}
        {loading ? (
          <div style={styles.loadingBox}>
            <div style={styles.spinner} />
            <p style={styles.loadingText}>{t('app.loading')}</p>
          </div>
        ) : filteredStocks.length === 0 ? (
          <div className="card-base" style={styles.emptyCard}>
            <div style={styles.emptyIconCircle}>
              <Package size={28} color="#6D28D9" />
            </div>
            <h4 style={styles.emptyTitle}>{t('pharmacyDashboard.emptyInventoryTitle')}</h4>
            <p style={styles.emptySub}>
              {t('pharmacyDashboard.emptyInventorySub')}
            </p>
            <div style={styles.quickAddRow}>
              <span style={styles.quickAddLabel}>{t('findMedicines.popularHeading')}:</span>
              <div style={styles.quickSuggestionsWrap}>
                {catalogSuggestions.slice(0, 4).map((sugg, i) => (
                  <button
                    key={i}
                    type="button"
                    style={styles.suggChip}
                    onClick={() => handleOpenAddModal(sugg)}
                  >
                    <Plus size={12} color="#6D28D9" />
                    <span>{sugg.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={styles.stocksList}>
            {filteredStocks.map((item) => (
              <div key={item._id} className="card-base" style={styles.stockItemCard}>
                <div style={styles.itemTop}>
                  <div style={styles.itemLeft}>
                    <div
                      style={{
                        ...styles.medIconWrap,
                        backgroundColor: item.inStock ? '#ECFDF5' : '#FEF2F2',
                        borderColor: item.inStock ? '#A7F3D0' : '#FECACA',
                      }}
                    >
                      <Pill size={16} color={item.inStock ? '#059669' : '#DC2626'} />
                    </div>
                    <div>
                      <h4 style={styles.medTitle}>{item.medicineName}</h4>
                      <div style={styles.medSubRow}>
                        <span style={styles.priceTag}>₹{item.price ? item.price.toFixed(2) : '15.00'}</span>
                        <span style={styles.qtyTag}>
                          {item.inStock ? `${item.quantity} ${t('findMedicines.qtyAvailable')}` : `0 (${t('findMedicines.outOfStock')})`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Toggle Status Button */}
                  <button
                    type="button"
                    style={{
                      ...styles.statusToggleBtn,
                      backgroundColor: item.inStock ? '#ECFDF5' : '#FEF2F2',
                      borderColor: item.inStock ? '#10B981' : '#EF4444',
                      color: item.inStock ? '#065F46' : '#991B1B',
                    }}
                    onClick={() => handleToggleStockStatus(item)}
                    title="Click to toggle In/Out of Stock"
                  >
                    {item.inStock ? (
                      <>
                        <CheckCircle2 size={13} color="#059669" />
                        <span>{t('findMedicines.inStock')}</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={13} color="#DC2626" />
                        <span>{t('findMedicines.outOfStock')}</span>
                      </>
                    )}
                  </button>
                </div>

                <div style={styles.itemActionsRow}>
                  <span style={styles.batchText}>{t('findMedicines.batchNo')} {item.batchNumber || 'STD'}</span>
                  <div style={styles.actionBtnsGroup}>
                    <button
                      type="button"
                      style={styles.editBtn}
                      onClick={() => handleOpenEditModal(item)}
                      title={t('app.edit')}
                    >
                      <Edit3 size={13} color="#6D28D9" />
                      <span>{t('app.edit')}</span>
                    </button>
                    <button
                      type="button"
                      style={styles.deleteBtn}
                      onClick={() => handleDeleteItem(item._id, item.medicineName)}
                      title={t('app.delete')}
                    >
                      <Trash2 size={13} color="#DC2626" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )}

      {/* Add / Edit Medicine Modal */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modalDialog} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalHeaderLeft}>
                <Package size={20} color="#6D28D9" />
                <h3 style={styles.modalTitle}>
                  {editingId ? t('pharmacyDashboard.modalEditTitle') : t('pharmacyDashboard.modalAddTitle')}
                </h3>
              </div>
              <button
                type="button"
                style={styles.closeModalBtn}
                onClick={() => setShowModal(false)}
              >
                <X size={18} color="#475569" />
              </button>
            </div>

            <form onSubmit={handleSaveStock} style={styles.modalForm}>
              {/* Medicine Name */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>{t('pharmacyDashboard.medNameLabel')} *</label>
                <input
                  type="text"
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                  placeholder={t('findMedicines.searchPlaceholder')}
                  style={styles.formInput}
                  required
                />
              </div>

              {/* Quick Suggestion Pills if Adding New */}
              {!editingId && (
                <div style={styles.suggWrapModal}>
                  <span style={styles.suggPrompt}>{t('findMedicines.popularHeading')}:</span>
                  <div style={styles.suggListModal}>
                    {catalogSuggestions.slice(0, 6).map((sugg, i) => (
                      <button
                        key={i}
                        type="button"
                        style={styles.modalSuggChip}
                        onClick={() => setMedName(sugg)}
                      >
                        {sugg.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* In-Stock Status Toggle */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>{t('pharmacyDashboard.inStockLabel')}</label>
                <div style={styles.toggleRow}>
                  <button
                    type="button"
                    style={{
                      ...styles.toggleBtn,
                      backgroundColor: inStock ? '#ECFDF5' : '#FFFFFF',
                      borderColor: inStock ? '#10B981' : '#E2E8F0',
                      color: inStock ? '#065F46' : '#64748B',
                      fontWeight: inStock ? '800' : '600',
                    }}
                    onClick={() => {
                      setInStock(true);
                      if (quantity === 0) setQuantity(50);
                    }}
                  >
                    <CheckCircle2 size={15} color={inStock ? '#059669' : '#94A3B8'} />
                    <span>{t('findMedicines.inStock')}</span>
                  </button>

                  <button
                    type="button"
                    style={{
                      ...styles.toggleBtn,
                      backgroundColor: !inStock ? '#FEF2F2' : '#FFFFFF',
                      borderColor: !inStock ? '#EF4444' : '#E2E8F0',
                      color: !inStock ? '#991B1B' : '#64748B',
                      fontWeight: !inStock ? '800' : '600',
                    }}
                    onClick={() => {
                      setInStock(false);
                      setQuantity(0);
                    }}
                  >
                    <AlertTriangle size={15} color={!inStock ? '#DC2626' : '#94A3B8'} />
                    <span>{t('findMedicines.outOfStock')}</span>
                  </button>
                </div>
              </div>

              {/* Quantity and Price Grid */}
              <div style={styles.formRow2}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>{t('pharmacyDashboard.qtyLabel')}</label>
                  <input
                    type="number"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    style={styles.formInput}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>{t('pharmacyDashboard.priceLabel')}</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    style={styles.formInput}
                  />
                </div>
              </div>

              {/* Batch Number */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>{t('pharmacyDashboard.batchLabel')}</label>
                <input
                  type="text"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="e.g. BATCH-2026-A1"
                  style={styles.formInput}
                />
              </div>

              {/* Modal Actions */}
              <div style={styles.modalActions}>
                <button
                  type="button"
                  style={styles.cancelBtn}
                  onClick={() => setShowModal(false)}
                >
                  {t('app.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={styles.submitBtn}
                >
                  {isSubmitting ? t('healthRecords.saving') : t('pharmacyDashboard.saveStockBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  facilityBanner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '14px',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #DDD6FE',
  },
  facilityIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    backgroundColor: '#F5F3FF',
    border: '1.5px solid #DDD6FE',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  facilityInfo: {
    flex: 1,
  },
  bannerTopRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '6px',
    marginBottom: '4px',
  },
  facilityName: {
    fontSize: '1rem',
    fontWeight: '900',
    color: '#1E1B4B',
    margin: 0,
  },
  verifiedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.68rem',
    fontWeight: '800',
    color: '#059669',
    backgroundColor: '#ECFDF5',
    border: '1px solid #A7F3D0',
    padding: '2px 8px',
    borderRadius: '9999px',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    marginTop: '6px',
  },
  metaItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.72rem',
    color: '#64748B',
    fontWeight: '600',
  },
  syncGpsBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 8px',
    backgroundColor: '#F5F3FF',
    border: '1px solid #DDD6FE',
    borderRadius: '6px',
    fontSize: '0.68rem',
    fontWeight: '700',
    color: '#6D28D9',
    cursor: 'pointer',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
  },
  kpiCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px 6px',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid',
    borderRadius: '12px',
    textAlign: 'center',
  },
  kpiLabel: {
    fontSize: '0.7rem',
    fontWeight: '700',
    color: '#6D28D9',
    marginBottom: '4px',
  },
  kpiVal: {
    fontSize: '1.25rem',
    fontWeight: '900',
    color: '#1E1B4B',
    lineHeight: '1.1',
  },
  kpiSub: {
    fontSize: '0.64rem',
    color: '#64748B',
    fontWeight: '500',
    marginTop: '3px',
  },
  actionStrip: {
    display: 'flex',
    gap: '10px',
  },
  addMedBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '10px 14px',
    backgroundColor: '#6D28D9',
    border: 'none',
    borderRadius: '10px',
    color: '#FFFFFF',
    fontSize: '0.8rem',
    fontWeight: '800',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(109, 40, 217, 0.25)',
  },
  viewPublicBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 14px',
    backgroundColor: '#F5F3FF',
    border: '1.5px solid #DDD6FE',
    borderRadius: '10px',
    color: '#6D28D9',
    fontSize: '0.78rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
  alertBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1.5px solid',
    fontSize: '0.76rem',
    fontWeight: '700',
  },
  closeAlertBtn: {
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
  },
  inventorySection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  sectionHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: '0.92rem',
    fontWeight: '800',
    color: '#1E1B4B',
    margin: 0,
  },
  sectionSub: {
    fontSize: '0.72rem',
    color: '#64748B',
    margin: '2px 0 0',
  },
  refreshBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    backgroundColor: '#F5F3FF',
    border: '1px solid #DDD6FE',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #E2E8F0',
    borderRadius: '10px',
    padding: '0 10px',
  },
  searchIcon: {
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    padding: '8px 8px',
    fontSize: '0.78rem',
    color: '#1E1B4B',
  },
  clearSearchBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
  },
  loadingBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '30px',
    gap: '10px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #EDE9FE',
    borderTop: '3px solid #6D28D9',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: '0.78rem',
    color: '#6D28D9',
    fontWeight: '700',
  },
  emptyCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '24px 16px',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #E2E8F0',
    borderRadius: '12px',
  },
  emptyIconCircle: {
    width: '54px',
    height: '54px',
    borderRadius: '50%',
    backgroundColor: '#F5F3FF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '10px',
  },
  emptyTitle: {
    fontSize: '0.9rem',
    fontWeight: '800',
    color: '#1E1B4B',
    margin: '0 0 4px',
  },
  emptySub: {
    fontSize: '0.74rem',
    color: '#64748B',
    maxWidth: '300px',
    margin: '0 0 14px',
    lineHeight: '1.4',
  },
  quickAddRow: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  quickAddLabel: {
    fontSize: '0.72rem',
    fontWeight: '700',
    color: '#475569',
  },
  quickSuggestionsWrap: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '6px',
  },
  suggChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    backgroundColor: '#F5F3FF',
    border: '1px solid #DDD6FE',
    borderRadius: '9999px',
    fontSize: '0.72rem',
    fontWeight: '700',
    color: '#6D28D9',
    cursor: 'pointer',
  },
  stocksList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  stockItemCard: {
    padding: '12px',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #E2E8F0',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  itemTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  medIconWrap: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    border: '1.5px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  medTitle: {
    fontSize: '0.84rem',
    fontWeight: '800',
    color: '#1E1B4B',
    margin: 0,
  },
  medSubRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '2px',
  },
  priceTag: {
    fontSize: '0.74rem',
    fontWeight: '800',
    color: '#059669',
  },
  qtyTag: {
    fontSize: '0.7rem',
    color: '#64748B',
    fontWeight: '600',
  },
  statusToggleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '8px',
    border: '1.5px solid',
    fontSize: '0.72rem',
    fontWeight: '800',
    cursor: 'pointer',
  },
  itemActionsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '6px',
    borderTop: '1px solid #F1F5F9',
  },
  batchText: {
    fontSize: '0.68rem',
    color: '#94A3B8',
    fontWeight: '600',
  },
  actionBtnsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  editBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 8px',
    backgroundColor: '#F5F3FF',
    border: '1px solid #DDD6FE',
    borderRadius: '6px',
    fontSize: '0.7rem',
    fontWeight: '700',
    color: '#6D28D9',
    cursor: 'pointer',
  },
  deleteBtn: {
    padding: '3px 6px',
    backgroundColor: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    zIndex: 100,
    backdropFilter: 'blur(3px)',
  },
  modalDialog: {
    width: '100%',
    maxWidth: '440px',
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    borderBottom: '1.5px solid #F1F5F9',
  },
  modalHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  modalTitle: {
    fontSize: '0.96rem',
    fontWeight: '800',
    color: '#1E1B4B',
    margin: 0,
  },
  closeModalBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
  },
  modalForm: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  formLabel: {
    fontSize: '0.74rem',
    fontWeight: '700',
    color: '#334155',
  },
  formInput: {
    padding: '8px 10px',
    border: '1.5px solid #CBD5E1',
    borderRadius: '8px',
    fontSize: '0.8rem',
    color: '#1E1B4B',
    outline: 'none',
  },
  suggWrapModal: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    backgroundColor: '#F8FAFC',
    padding: '8px',
    borderRadius: '8px',
  },
  suggPrompt: {
    fontSize: '0.68rem',
    fontWeight: '700',
    color: '#64748B',
  },
  suggListModal: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
  },
  modalSuggChip: {
    fontSize: '0.68rem',
    padding: '2px 8px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #CBD5E1',
    borderRadius: '9999px',
    color: '#475569',
    cursor: 'pointer',
    fontWeight: '600',
  },
  toggleRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
  },
  toggleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '8px',
    border: '1.5px solid',
    borderRadius: '8px',
    fontSize: '0.74rem',
    cursor: 'pointer',
  },
  formRow2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  modalActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '6px',
  },
  cancelBtn: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#F1F5F9',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.78rem',
    fontWeight: '700',
    color: '#475569',
    cursor: 'pointer',
  },
  submitBtn: {
    flex: 2,
    padding: '10px',
    backgroundColor: '#6D28D9',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.78rem',
    fontWeight: '800',
    color: '#FFFFFF',
    cursor: 'pointer',
  },
  // Tab Navigation styles
  tabNavStrip: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
  },
  tabNavBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px 14px',
    borderRadius: '12px',
    border: '1.5px solid',
    fontSize: '0.82rem',
    fontWeight: '800',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  tabCounterBadge: {
    padding: '2px 8px',
    borderRadius: '9999px',
    fontSize: '0.68rem',
    fontWeight: '800',
  },
  // Orders section styles
  ordersSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  ordersFilterRow: {
    display: 'flex',
    gap: '6px',
    overflowX: 'auto',
    paddingBottom: '2px',
  },
  orderFilterBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '9999px',
    border: '1.5px solid',
    fontSize: '0.74rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  filterCountBadge: {
    padding: '1px 6px',
    borderRadius: '9999px',
    fontSize: '0.64rem',
    fontWeight: '800',
  },
  ordersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  orderCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '14px',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #DDD6FE',
    borderRadius: '16px',
    boxShadow: '0 4px 14px rgba(109, 40, 217, 0.08)',
  },
  orderCardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '6px',
  },
  orderIdGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  orderIdPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    backgroundColor: '#FAF5FF',
    border: '1px solid #DDD6FE',
    borderRadius: '6px',
    padding: '3px 8px',
    fontSize: '0.78rem',
    color: '#6D28D9',
  },
  orderTimeText: {
    fontSize: '0.7rem',
    color: '#64748B',
  },
  orderStatusBadge: {
    fontSize: '0.68rem',
    fontWeight: '800',
    padding: '3px 8px',
    borderRadius: '6px',
    border: '1px solid',
  },
  patientInfoBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: '10px',
    padding: '10px',
    border: '1px solid #E2E8F0',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  patientMetaRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '6px',
  },
  villageTag: {
    fontSize: '0.68rem',
    color: '#6D28D9',
    backgroundColor: '#EDE9FE',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: '600',
  },
  callPhoneBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.72rem',
    fontWeight: '700',
    color: '#059669',
    textDecoration: 'none',
    backgroundColor: '#ECFDF5',
    border: '1px solid #A7F3D0',
    padding: '3px 8px',
    borderRadius: '6px',
  },
  prescriptionMetaRow: {
    fontSize: '0.72rem',
    color: '#475569',
  },
  prescriptionDoctor: {
    color: '#1E1B4B',
  },
  prescriptionTitleText: {
    color: '#6D28D9',
    fontWeight: '600',
    marginLeft: '4px',
  },
  fulfillmentModeRow: {
    marginTop: '2px',
  },
  fulfillmentBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.7rem',
    color: '#0369A1',
    fontWeight: '700',
  },
  orderMedicinesSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  orderMedsLabel: {
    fontSize: '0.72rem',
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  orderMedsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  orderMedItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF5FF',
    border: '1px solid #E9D5FF',
    borderRadius: '8px',
    padding: '8px 10px',
  },
  medQtyBadge: {
    fontSize: '0.7rem',
    fontWeight: '700',
    color: '#475569',
    backgroundColor: '#FFFFFF',
    border: '1px solid #CBD5E1',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  medPriceBadge: {
    fontSize: '0.76rem',
    fontWeight: '800',
    color: '#059669',
  },
  orderFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '8px',
    paddingTop: '8px',
    borderTop: '1px dashed #E2E8F0',
  },
  orderTotalWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  orderTotalLabel: {
    fontSize: '0.76rem',
    color: '#64748B',
  },
  orderTotalValue: {
    fontSize: '1rem',
    color: '#059669',
  },
  orderActionsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  cancelOrderBtn: {
    padding: '7px 12px',
    borderRadius: '8px',
    border: '1px solid #CBD5E1',
    backgroundColor: '#FFFFFF',
    color: '#64748B',
    fontSize: '0.74rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
  acceptBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 14px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#059669',
    color: '#FFFFFF',
    fontSize: '0.76rem',
    fontWeight: '800',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
  },
  readyBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 14px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#7C3AED',
    color: '#FFFFFF',
    fontSize: '0.76rem',
    fontWeight: '800',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(124, 58, 237, 0.25)',
  },
  completeBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 14px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#059669',
    color: '#FFFFFF',
    fontSize: '0.76rem',
    fontWeight: '800',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
  },
  completedTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.74rem',
    fontWeight: '700',
    color: '#059669',
    backgroundColor: '#ECFDF5',
    padding: '4px 8px',
    borderRadius: '6px',
  },
};

export default PharmacyDashboard;

