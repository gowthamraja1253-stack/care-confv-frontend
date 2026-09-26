import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import facilityService from '../../services/facility.service';
import medicineOrderService from '../../services/medicineOrder.service';
import {
  X,
  Pill,
  Building2,
  MapPin,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Truck,
  ShoppingBag,
  Clock,
  AlertCircle,
  Plus,
  Minus,
  Trash2,
  Send,
} from 'lucide-react';

export const OrderMedicineModal = ({
  isOpen,
  onClose,
  prescription = null,
  onOrderSuccess = null,
}) => {
  const { t, i18n } = useTranslation();
  const { user, token } = useAuth();

  // Pharmacies state
  const [pharmacies, setPharmacies] = useState([]);
  const [loadingPharmacies, setLoadingPharmacies] = useState(true);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState('');

  // Order Items state
  const [medicines, setMedicines] = useState([]);
  const [deliveryType, setDeliveryType] = useState('pickup'); // 'pickup' | 'delivery'
  const [contactPhone, setContactPhone] = useState(user?.phone || '9857519854');
  const [deliveryAddress, setDeliveryAddress] = useState(user?.village || 'Near Ramapuram Arasamaram');
  const [orderNotes, setOrderNotes] = useState('');

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [completedOrder, setCompletedOrder] = useState(null);

  // Initialize medicine items from prescription prop
  useEffect(() => {
    if (!isOpen) {
      setCompletedOrder(null);
      setErrorMsg('');
      return;
    }

    if (user?.phone) setContactPhone(user.phone);
    if (user?.village) setDeliveryAddress(user.village);

    // Extract medicines from prescription
    let parsedItems = [];
    if (prescription?.medicines && Array.isArray(prescription.medicines) && prescription.medicines.length > 0) {
      parsedItems = prescription.medicines.map((m, idx) => ({
        id: idx + 1,
        name: typeof m === 'string' ? m : m.name || 'Prescribed Medicine',
        dosage: m.dosage || '1 tablet twice daily',
        quantity: m.quantity || 10,
        price: m.price || 25,
        instructions: m.instructions || 'After food',
      }));
    } else {
      // Parse from textContent or notes
      const rawText = prescription?.textContent || prescription?.notes || prescription?.title || '';
      const lines = rawText.split('\n').filter((l) => l.trim().length > 0);

      if (lines.length > 0) {
        parsedItems = lines.slice(0, 4).map((line, idx) => {
          // Clean common bullet chars
          const cleanName = line.replace(/^[-*•\d.)\s]+/, '').trim();
          return {
            id: idx + 1,
            name: cleanName.length > 0 ? cleanName : `Medicine Item ${idx + 1}`,
            dosage: 'As prescribed by doctor',
            quantity: 10,
            price: 20 + idx * 5,
            instructions: 'Follow doctor dosage schedule',
          };
        });
      }

      if (parsedItems.length === 0) {
        parsedItems = [
          {
            id: 1,
            name: 'Paracetamol 650mg Tablets',
            dosage: '1 tablet thrice daily',
            quantity: 10,
            price: 25,
            instructions: 'After meals for fever/pain',
          },
          {
            id: 2,
            name: 'Oral Rehydration Salts (ORS) Sachet',
            dosage: '1 sachet in 1 liter water',
            quantity: 3,
            price: 18,
            instructions: 'Sip throughout day',
          },
        ];
      }
    }

    setMedicines(parsedItems);
  }, [isOpen, prescription, user]);

  // Fetch nearby medical shops / pharmacies
  useEffect(() => {
    if (!isOpen) return;

    const fetchPharmacies = async () => {
      setLoadingPharmacies(true);
      try {
        const res = await facilityService.getNearbyFacilities(null, null, 'pharmacy');
        if (res.success && Array.isArray(res.facilities)) {
          setPharmacies(res.facilities);
          if (res.facilities.length > 0) {
            setSelectedPharmacyId(res.facilities[0]._id || res.facilities[0].id);
          }
        }
      } catch (err) {
        console.warn('Could not fetch pharmacies, using default:', err.message);
      } finally {
        setLoadingPharmacies(false);
      }
    };

    fetchPharmacies();
  }, [isOpen]);

  if (!isOpen) return null;

  // Medicine item controls
  const handleQuantityChange = (id, delta) => {
    setMedicines((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQty = Math.max(1, (item.quantity || 1) + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (id) => {
    setMedicines((prev) => prev.filter((m) => m.id !== id));
  };

  const handleAddNewItem = () => {
    const nextId = medicines.length + 1;
    setMedicines((prev) => [
      ...prev,
      {
        id: nextId,
        name: 'Additional Prescribed Medicine',
        dosage: '1 tablet daily',
        quantity: 10,
        price: 25,
        instructions: 'After food',
      },
    ]);
  };

  // Price calculations
  const totalEstimatedCost = medicines.reduce((sum, item) => {
    const unitPrice = item.price || 25;
    const qty = item.quantity || 1;
    return sum + unitPrice * Math.ceil(qty / 10);
  }, 0);

  const selectedPharmacy = pharmacies.find(
    (p) => String(p._id || p.id) === String(selectedPharmacyId)
  ) || pharmacies[0] || {
    name: 'Gowtham Medical Center',
    address: 'Near Ramapuram Arasamaram',
    distance: '0.8 km',
    phone: '9857519854',
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (medicines.length === 0) {
      setErrorMsg('Please keep at least one prescribed medicine in the order list.');
      return;
    }

    if (!selectedPharmacyId) {
      setErrorMsg('Please choose a nearby medical shop to fulfill your order.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const orderPayload = {
        pharmacyId: selectedPharmacyId,
        prescriptionId: prescription?._id || prescription?.id || null,
        prescriptionTitle: prescription?.title || 'Doctor Prescription',
        doctorName: prescription?.doctorName || 'Consulting Physician',
        medicines: medicines.map((m) => ({
          name: m.name,
          dosage: m.dosage,
          quantity: m.quantity,
          instructions: m.instructions,
          price: m.price,
        })),
        deliveryType,
        deliveryAddress: deliveryType === 'delivery' ? deliveryAddress : '',
        contactPhone,
        notes: orderNotes,
      };

      const result = await medicineOrderService.createOrder(token, orderPayload);

      if (result.success && result.order) {
        setCompletedOrder(result.order);
        if (onOrderSuccess) {
          onOrderSuccess(result.order);
        }
      } else {
        setErrorMsg(result.message || 'Could not submit medicine order.');
      }
    } catch (err) {
      console.error('Order submission error:', err);
      setErrorMsg(err.message || 'Network error sending order to medical shop.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.modalOverlay}>
      <div className="card-base" style={styles.modalContent}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.iconCircle}>
              <Pill size={22} color="#FFFFFF" strokeWidth={2.4} />
            </div>
            <div>
              <h2 style={styles.title}>
                {completedOrder ? 'Prescription Order Dispatched!' : 'Order Prescribed Medicines'}
              </h2>
              <span style={styles.subtitle}>
                {prescription?.doctorName ? `Prescribed by ${prescription.doctorName}` : 'Direct Pharmacy Fulfillment'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={styles.closeBtn}
            aria-label="Close Modal"
          >
            <X size={18} color="#64748B" />
          </button>
        </div>

        {/* BODY */}
        <div style={styles.body}>
          {completedOrder ? (
            /* SUCCESS CONFIRMATION RECEIPT */
            <div style={styles.successReceipt}>
              <div style={styles.successIconCircle}>
                <CheckCircle2 size={44} color="#059669" strokeWidth={2.6} />
              </div>
              <h3 style={styles.receiptTitle}>Order Sent to Medical Shop!</h3>
              <p style={styles.receiptSubtitle}>
                Your prescription request has been routed to{' '}
                <strong>{completedOrder.pharmacyName || selectedPharmacy?.name || 'Gowtham Medical Center'}</strong>.
              </p>

              <div style={styles.receiptBadgeRow}>
                <span style={styles.orderIdBadge}>
                  Order ID: <strong>{completedOrder.orderId}</strong>
                </span>
                <span style={styles.statusBadgePending}>
                  🟡 Status: {completedOrder.status ? completedOrder.status.toUpperCase() : 'PENDING'}
                </span>
              </div>

              <div style={styles.summaryCard}>
                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>Fulfillment Mode:</span>
                  <strong style={styles.summaryVal}>
                    {completedOrder.deliveryType === 'delivery' ? '🚚 Village Doorstep Delivery' : '🏪 Shop Self-Pickup'}
                  </strong>
                </div>
                {completedOrder.deliveryType === 'delivery' && (
                  <div style={styles.summaryRow}>
                    <span style={styles.summaryLabel}>Delivery Address:</span>
                    <span style={styles.summaryVal}>{completedOrder.deliveryAddress || deliveryAddress}</span>
                  </div>
                )}
                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>Patient Phone:</span>
                  <span style={styles.summaryVal}>{completedOrder.patientPhone || contactPhone}</span>
                </div>
                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>Estimated Total:</span>
                  <strong style={{ ...styles.summaryVal, color: '#059669', fontSize: '1.05rem' }}>
                    ₹{completedOrder.totalEstimatedPrice || totalEstimatedCost}
                  </strong>
                </div>
              </div>

              <div style={styles.nextStepsBox}>
                <Clock size={16} color="#0D9488" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p style={styles.nextStepsText}>
                  The pharmacist has received your order on their portal. You will receive an update once the medicines are packed and ready.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                style={styles.doneBtn}
              >
                <span>Done & Return to Records</span>
              </button>
            </div>
          ) : (
            /* ORDER FORM */
            <form onSubmit={handleSubmitOrder} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {errorMsg && (
                <div style={styles.errorBox}>
                  <AlertCircle size={16} color="#DC2626" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 1. MEDICINES LIST SECTION */}
              <div style={styles.sectionCard}>
                <div style={styles.sectionHeadingRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Pill size={16} color="#6D28D9" />
                    <h3 style={styles.sectionHeading}>Prescribed Medicines ({medicines.length})</h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddNewItem}
                    style={styles.addItemBtn}
                  >
                    <Plus size={13} color="#6D28D9" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div style={styles.medicinesList}>
                  {medicines.map((med) => (
                    <div key={med.id} style={styles.medicineItemCard}>
                      <div style={styles.medLeft}>
                        <strong style={styles.medName}>{med.name}</strong>
                        <span style={styles.medDosage}>{med.dosage}</span>
                        <span style={styles.medInstructions}>{med.instructions}</span>
                      </div>

                      <div style={styles.medRight}>
                        <div style={styles.qtyControl}>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(med.id, -5)}
                            style={styles.qtyBtn}
                            disabled={med.quantity <= 1}
                            aria-label="Decrease quantity"
                          >
                            <Minus size={12} color="#475569" />
                          </button>
                          <span style={styles.qtyText}>{med.quantity} units</span>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(med.id, 5)}
                            style={styles.qtyBtn}
                            aria-label="Increase quantity"
                          >
                            <Plus size={12} color="#475569" />
                          </button>
                        </div>
                        <div style={styles.priceRow}>
                          <span style={styles.medPrice}>₹{med.price || 25}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(med.id)}
                            style={styles.removeBtn}
                            title="Remove item"
                            aria-label="Remove item"
                          >
                            <Trash2 size={13} color="#EF4444" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. CHOOSE NEARBY MEDICAL SHOP */}
              <div style={styles.sectionCard}>
                <div style={styles.sectionHeadingRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building2 size={16} color="#6D28D9" />
                    <h3 style={styles.sectionHeading}>Select Nearby Medical Shop</h3>
                  </div>
                  <span style={styles.distanceBadge}>Within 5 km</span>
                </div>

                {loadingPharmacies ? (
                  <div style={styles.loadingBox}>Loading nearby medical shops...</div>
                ) : (
                  <div style={styles.pharmaciesGrid}>
                    {pharmacies.map((pharm) => {
                      const pId = pharm._id || pharm.id;
                      const isSelected = String(selectedPharmacyId) === String(pId);

                      return (
                        <div
                          key={pId}
                          onClick={() => setSelectedPharmacyId(pId)}
                          style={{
                            ...styles.pharmacyCard,
                            borderColor: isSelected ? '#6D28D9' : '#E2E8F0',
                            backgroundColor: isSelected ? '#FAF5FF' : '#FFFFFF',
                          }}
                        >
                          <div style={styles.pharmacyHeaderRow}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Building2 size={16} color={isSelected ? '#6D28D9' : '#64748B'} />
                              <strong style={{ fontSize: '0.88rem', color: isSelected ? '#4C1D95' : '#1E1B4B' }}>
                                {pharm.name}
                              </strong>
                            </div>
                            <span style={styles.verifiedPill}>
                              <ShieldCheck size={11} color="#059669" /> Verified
                            </span>
                          </div>

                          <div style={styles.pharmMetaRow}>
                            <span style={styles.pharmMeta}>
                              <MapPin size={11} color="#64748B" />
                              {pharm.address || pharm.village || 'Main Road'}
                            </span>
                            <span style={styles.pharmDistance}>
                              {pharm.distance || `${pharm.distanceKm || '1.2'} km`}
                            </span>
                          </div>

                          <div style={styles.pharmFooter}>
                            <span style={styles.pharmPhone}>
                              <Phone size={10} color="#64748B" /> {pharm.phone || pharm.contact || '+91 98575 19854'}
                            </span>
                            <span style={styles.inStockBadge}>✓ In Stock</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. FULFILLMENT MODE: PICKUP VS DELIVERY */}
              <div style={styles.sectionCard}>
                <div style={styles.sectionHeadingRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Truck size={16} color="#6D28D9" />
                    <h3 style={styles.sectionHeading}>Delivery / Pickup Method</h3>
                  </div>
                </div>

                <div style={styles.deliveryModeRow}>
                  <div
                    onClick={() => setDeliveryType('pickup')}
                    style={{
                      ...styles.deliveryModeCard,
                      borderColor: deliveryType === 'pickup' ? '#6D28D9' : '#E2E8F0',
                      backgroundColor: deliveryType === 'pickup' ? '#FAF5FF' : '#FFFFFF',
                    }}
                  >
                    <ShoppingBag size={20} color={deliveryType === 'pickup' ? '#6D28D9' : '#64748B'} />
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.84rem', color: '#1E1B4B' }}>
                        Self Pickup at Medical Shop
                      </strong>
                      <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Ready in 30 mins • Free</span>
                    </div>
                  </div>

                  <div
                    onClick={() => setDeliveryType('delivery')}
                    style={{
                      ...styles.deliveryModeCard,
                      borderColor: deliveryType === 'delivery' ? '#6D28D9' : '#E2E8F0',
                      backgroundColor: deliveryType === 'delivery' ? '#FAF5FF' : '#FFFFFF',
                    }}
                  >
                    <Truck size={20} color={deliveryType === 'delivery' ? '#6D28D9' : '#64748B'} />
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.84rem', color: '#1E1B4B' }}>
                        Village Doorstep Delivery
                      </strong>
                      <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Via ASHA / Jan Aushadhi Hub</span>
                    </div>
                  </div>
                </div>

                {/* Patient contact inputs */}
                <div style={styles.inputsGrid}>
                  <div>
                    <label style={styles.inputLabel}>Contact Phone Number *</label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="e.g. 9857519854"
                      required
                      style={styles.textInput}
                    />
                  </div>

                  {deliveryType === 'delivery' && (
                    <div>
                      <label style={styles.inputLabel}>Village / House Address *</label>
                      <input
                        type="text"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="Village, Landmark, Street"
                        required
                        style={styles.textInput}
                      />
                    </div>
                  )}

                  <div>
                    <label style={styles.inputLabel}>Special Pharmacist Notes (Optional)</label>
                    <input
                      type="text"
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="e.g. Generic alternative allowed, please call before dispatch"
                      style={styles.textInput}
                    />
                  </div>
                </div>
              </div>

              {/* 4. TOTAL ESTIMATE & SUBMIT */}
              <div style={styles.pricingSummaryBox}>
                <div style={styles.priceDetailRow}>
                  <span>Estimated Generic Medicine Cost:</span>
                  <strong>₹{totalEstimatedCost}</strong>
                </div>
                <div style={styles.priceDetailRow}>
                  <span>Fulfillment & Jan Aushadhi Dispensing:</span>
                  <span style={{ color: '#059669', fontWeight: '700' }}>FREE (Government Subsidy)</span>
                </div>
                <div style={styles.priceDivider} />
                <div style={styles.priceTotalRow}>
                  <span>Total Amount Payable at Delivery/Pickup:</span>
                  <span style={styles.totalPriceVal}>₹{totalEstimatedCost}</span>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div style={styles.footerActions}>
                <button
                  type="button"
                  onClick={onClose}
                  style={styles.cancelBtn}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={styles.submitOrderBtn}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <div style={styles.spinner} />
                      <span>Sending Order to Pharmacy...</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} color="#FFFFFF" />
                      <span>Dispatch Order to Medical Shop</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(5px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    zIndex: 9999,
  },
  modalContent: {
    width: '100%',
    maxWidth: '520px',
    maxHeight: '90vh',
    overflowY: 'auto',
    backgroundColor: '#FFFFFF',
    borderRadius: '20px',
    boxShadow: '0 20px 40px rgba(109, 40, 217, 0.2)',
    border: '1.5px solid #DDD6FE',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #E2E8F0',
    backgroundColor: '#FAF5FF',
    borderRadius: '20px 20px 0 0',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconCircle: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    backgroundColor: '#6D28D9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 10px rgba(109, 40, 217, 0.25)',
  },
  title: {
    fontSize: '1.05rem',
    fontWeight: '800',
    color: '#1E1B4B',
    margin: 0,
  },
  subtitle: {
    fontSize: '0.74rem',
    color: '#6D28D9',
    fontWeight: '600',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    padding: '6px',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: '18px 20px',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    borderRadius: '10px',
    backgroundColor: '#FEF2F2',
    border: '1px solid #FECACA',
    color: '#DC2626',
    fontSize: '0.8rem',
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: '14px',
    padding: '14px',
    border: '1px solid #E2E8F0',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  sectionHeadingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeading: {
    fontSize: '0.86rem',
    fontWeight: '800',
    color: '#1E1B4B',
    margin: 0,
  },
  addItemBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    background: '#EDE9FE',
    border: '1px solid #DDD6FE',
    borderRadius: '6px',
    padding: '3px 8px',
    color: '#6D28D9',
    fontSize: '0.72rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
  medicinesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  medicineItemCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: '10px',
    padding: '10px 12px',
    border: '1px solid #E2E8F0',
  },
  medLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
    paddingRight: '8px',
  },
  medName: {
    fontSize: '0.82rem',
    color: '#1E1B4B',
  },
  medDosage: {
    fontSize: '0.72rem',
    color: '#6D28D9',
    fontWeight: '600',
  },
  medInstructions: {
    fontSize: '0.68rem',
    color: '#64748B',
  },
  medRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '6px',
  },
  qtyControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#F1F5F9',
    borderRadius: '6px',
    padding: '2px',
  },
  qtyBtn: {
    width: '22px',
    height: '22px',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  qtyText: {
    fontSize: '0.72rem',
    fontWeight: '700',
    color: '#1E1B4B',
    padding: '0 4px',
  },
  priceRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  medPrice: {
    fontSize: '0.8rem',
    fontWeight: '800',
    color: '#059669',
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px',
  },
  distanceBadge: {
    fontSize: '0.68rem',
    fontWeight: '700',
    color: '#059669',
    backgroundColor: '#ECFDF5',
    padding: '2px 6px',
    borderRadius: '6px',
  },
  loadingBox: {
    textAlign: 'center',
    padding: '12px',
    color: '#64748B',
    fontSize: '0.78rem',
  },
  pharmaciesGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  pharmacyCard: {
    borderRadius: '10px',
    border: '1.5px solid #E2E8F0',
    padding: '10px 12px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  pharmacyHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  verifiedPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '0.64rem',
    fontWeight: '700',
    color: '#059669',
    backgroundColor: '#ECFDF5',
    padding: '2px 6px',
    borderRadius: '6px',
  },
  pharmMetaRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '4px',
  },
  pharmMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.72rem',
    color: '#64748B',
  },
  pharmDistance: {
    fontSize: '0.72rem',
    fontWeight: '700',
    color: '#6D28D9',
  },
  pharmFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '6px',
    paddingTop: '6px',
    borderTop: '1px dashed #E2E8F0',
  },
  pharmPhone: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.7rem',
    color: '#475569',
  },
  inStockBadge: {
    fontSize: '0.66rem',
    fontWeight: '700',
    color: '#059669',
  },
  deliveryModeRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  deliveryModeCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px',
    borderRadius: '10px',
    border: '1.5px solid #E2E8F0',
    cursor: 'pointer',
  },
  inputsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '6px',
  },
  inputLabel: {
    display: 'block',
    fontSize: '0.72rem',
    fontWeight: '700',
    color: '#475569',
    marginBottom: '3px',
  },
  textInput: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1.5px solid #CBD5E1',
    fontSize: '0.8rem',
    color: '#1E1B4B',
    outline: 'none',
    boxSizing: 'border-box',
  },
  pricingSummaryBox: {
    backgroundColor: '#FAF5FF',
    border: '1.5px solid #DDD6FE',
    borderRadius: '12px',
    padding: '12px 14px',
  },
  priceDetailRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '0.76rem',
    color: '#475569',
    marginBottom: '4px',
  },
  priceDivider: {
    height: '1px',
    backgroundColor: '#DDD6FE',
    margin: '6px 0',
  },
  priceTotalRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '0.84rem',
    fontWeight: '800',
    color: '#1E1B4B',
  },
  totalPriceVal: {
    color: '#059669',
    fontSize: '1.15rem',
  },
  footerActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '4px',
  },
  cancelBtn: {
    padding: '10px 16px',
    borderRadius: '10px',
    border: '1.5px solid #CBD5E1',
    backgroundColor: '#FFFFFF',
    color: '#475569',
    fontSize: '0.82rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
  submitOrderBtn: {
    padding: '10px 20px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#6D28D9',
    color: '#FFFFFF',
    fontSize: '0.84rem',
    fontWeight: '800',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(109, 40, 217, 0.3)',
  },
  spinner: {
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.4)',
    borderTopColor: '#FFFFFF',
    animation: 'spin 0.8s linear infinite',
  },
  // Success Receipt styles
  successReceipt: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '10px 0',
  },
  successIconCircle: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    backgroundColor: '#ECFDF5',
    border: '2px solid #A7F3D0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '12px',
  },
  receiptTitle: {
    fontSize: '1.2rem',
    fontWeight: '800',
    color: '#065F46',
    margin: '0 0 6px',
  },
  receiptSubtitle: {
    fontSize: '0.82rem',
    color: '#475569',
    maxWidth: '380px',
    margin: '0 0 16px',
  },
  receiptBadgeRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  orderIdBadge: {
    backgroundColor: '#F5F3FF',
    border: '1px solid #DDD6FE',
    borderRadius: '8px',
    padding: '4px 10px',
    fontSize: '0.78rem',
    color: '#6D28D9',
  },
  statusBadgePending: {
    backgroundColor: '#FEF3C7',
    border: '1px solid #FDE68A',
    borderRadius: '8px',
    padding: '4px 10px',
    fontSize: '0.78rem',
    color: '#92400E',
    fontWeight: '700',
  },
  summaryCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    boxSizing: 'border-box',
    marginBottom: '14px',
  },
  summaryRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '0.78rem',
  },
  summaryLabel: {
    color: '#64748B',
  },
  summaryVal: {
    color: '#1E1B4B',
  },
  nextStepsBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    backgroundColor: '#F0FDFA',
    border: '1px solid #99F6E4',
    borderRadius: '10px',
    padding: '10px 14px',
    textAlign: 'left',
    marginBottom: '18px',
  },
  nextStepsText: {
    fontSize: '0.75rem',
    color: '#115E59',
    margin: 0,
    lineHeight: 1.4,
  },
  doneBtn: {
    width: '100%',
    padding: '12px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#059669',
    color: '#FFFFFF',
    fontSize: '0.9rem',
    fontWeight: '800',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)',
  },
};

export default OrderMedicineModal;
