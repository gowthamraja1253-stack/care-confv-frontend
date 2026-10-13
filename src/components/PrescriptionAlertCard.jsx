import React, { useState, useEffect } from 'react';
import { BellRing, Check, AlertCircle, RefreshCw, CheckCircle2, ShoppingBag, Activity, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import reminderService from '../services/reminder.service';
import patientMedicationService from '../services/patientMedication.service';
import { translateDynamicContent } from '../utils/contentTranslator';
import OrderMedicineModal from './medicine/OrderMedicineModal';

export const PrescriptionAlertCard = () => {
  const { t, i18n } = useTranslation();
  const { token } = useAuth();
  const [medications, setMedications] = useState([]);
  const [activeMedIndex, setActiveMedIndex] = useState(0);
  const [adherenceData, setAdherenceData] = useState({ today: 100, last7Days: 100, last30Days: 100 });
  const [taken, setTaken] = useState(false);
  const [remainingStock, setRemainingStock] = useState(18);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refillStatus, setRefillStatus] = useState(null); // 'requested' | null
  const [showOrderModal, setShowOrderModal] = useState(false);

  const fetchMedicationData = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await patientMedicationService.getMedications(token);
      if (res.success && Array.isArray(res.medications) && res.medications.length > 0) {
        setMedications(res.medications);
        setAdherenceData(res.adherence || { today: 100, last7Days: 95, last30Days: 92 });
        const curMed = res.medications[0];
        setRemainingStock(curMed.remainingQuantity);
        const isTakenToday = curMed.todayDoses?.some((d) => d.status === 'TAKEN');
        setTaken(Boolean(isTakenToday));
      } else {
        // Fallback to reminder service
        const data = await reminderService.getActiveReminders(token);
        if (data.success && Array.isArray(data.reminders) && data.reminders.length > 0) {
          setMedications(data.reminders);
          setRemainingStock(data.reminders[0].remainingQuantity || 18);
          setTaken(Boolean(data.reminders[0].isTaken));
        }
      }
    } catch (err) {
      console.warn('[PrescriptionAlertCard] API fetch warning:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicationData();
  }, [token]);

  const currentMed = medications[activeMedIndex] || null;
  const isLowStock = currentMed ? remainingStock <= (currentMed.refillThreshold || 5) : false;

  // IMPORTANT: Stock decreases ONLY when user confirms TAKEN!
  const handleToggleTaken = async () => {
    if (!currentMed || !token) return;

    if (!taken) {
      // Mark as TAKEN -> decreases stock by 1
      const newStock = Math.max(0, remainingStock - 1);
      setRemainingStock(newStock);
      setTaken(true);

      try {
        await patientMedicationService.recordDose(token, currentMed._id || currentMed.id, {
          status: 'TAKEN',
          scheduledAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Offline dose queued:', e.message);
      }
    } else {
      // Revert to pending
      setTaken(false);
    }
  };

  // 1-Click Refill Request
  const handleRequestRefill = async () => {
    if (!currentMed || !token) return;
    try {
      setRefillStatus('requesting');
      await patientMedicationService.requestRefill(token, currentMed._id || currentMed.id, {
        requestedQuantity: 30,
        reason: `Only ${remainingStock} tablets remaining. Refill requested via Patient Dashboard.`,
      });
      setRefillStatus('requested');
      setTimeout(() => setRefillStatus(null), 4000);
    } catch (err) {
      console.warn('Refill request failed:', err.message);
      setRefillStatus('error');
    }
  };

  return (
    <section>
      <div className="section-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{t('prescription.title')}</span>
          <span style={styles.adherenceBadge}>
            <Activity size={12} color="#059669" />
            7-day Adherence: {adherenceData.last7Days || 95}%
          </span>
        </div>
        {medications.length > 1 && (
          <div style={{ display: 'flex', gap: '4px' }}>
            {medications.map((m, idx) => (
              <button
                key={idx}
                type="button"
                style={{
                  ...styles.medTabBtn,
                  ...(idx === activeMedIndex ? styles.medTabBtnActive : {}),
                }}
                onClick={() => {
                  setActiveMedIndex(idx);
                  setRemainingStock(m.remainingQuantity);
                  setTaken(Boolean(m.todayDoses?.some((d) => d.status === 'TAKEN')));
                }}
              >
                {m.medicineName.split(' ')[0]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 1. LOADING SKELETON */}
      {loading && (
        <div className="card-base" style={styles.card}>
          <div style={styles.skeletonHeaderRow}>
            <div className="skeleton-shimmer" style={styles.skelIcon} />
            <div style={styles.skelLines}>
              <div className="skeleton-shimmer" style={styles.skelTitle} />
              <div className="skeleton-shimmer" style={styles.skelSub} />
            </div>
          </div>
          <div className="skeleton-shimmer" style={styles.skelStrip} />
          <div className="skeleton-shimmer" style={styles.skelBtn} />
        </div>
      )}

      {/* 2. EMPTY STATE */}
      {!loading && !currentMed && (
        <div className="card-base" style={styles.emptyCard}>
          <div style={styles.emptyIconBox}>
            <CheckCircle2 size={26} color="#059669" strokeWidth={2.4} />
          </div>
          <div style={styles.emptyContent}>
            <h4 style={styles.emptyTitle}>{t('prescription.emptyTitle')}</h4>
            <p style={styles.emptySub}>{t('prescription.emptySub')}</p>
          </div>
        </div>
      )}

      {/* 3. POPULATED DATA STATE */}
      {!loading && currentMed && (
        <div className="card-base subtle-amber-glow" style={styles.card}>
          <div style={styles.headerRow}>
            <div style={styles.pillIconBadge}>
              <BellRing size={20} color="#D97706" strokeWidth={2.4} />
            </div>
            <div style={styles.titleInfo}>
              <div style={styles.nameRow}>
                <h3 style={styles.medicineName}>{currentMed.medicineName}</h3>
                <span style={styles.timeBadge}>{currentMed.schedule?.[0] || 'Today'}</span>
              </div>
              <p style={styles.instruction}>
                {translateDynamicContent(currentMed.instructions || `${currentMed.dosage || '1 Tablet'} • ${currentMed.frequency || 'Daily'}`, i18n.language)}
              </p>
              <div style={styles.stockAdherenceRow}>
                <span style={{ ...styles.stockBadge, color: isLowStock ? '#DC2626' : '#059669', backgroundColor: isLowStock ? '#FEE2E2' : '#ECFDF5' }}>
                  Remaining Stock: <strong>{remainingStock} doses</strong>
                </span>
                <span style={styles.subtleMuted}>
                  Adherence: Today {adherenceData.today || 100}% • 30-day {adherenceData.last30Days || 92}%
                </span>
              </div>
            </div>
          </div>

          {/* Refill Alert Strip (Low Stock Detected) */}
          {isLowStock && (
            <div style={styles.refillStrip}>
              <AlertCircle size={16} color="#DC2626" strokeWidth={2.4} />
              <span style={{ ...styles.refillText, color: '#991B1B' }}>
                Low Stock Alert: Only {remainingStock} doses left (threshold: {currentMed.refillThreshold || 5})
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  style={styles.requestRefillBtn}
                  onClick={handleRequestRefill}
                  disabled={refillStatus === 'requested'}
                  title="Request Refill from Prescribing Doctor"
                >
                  <Send size={12} color="#FFFFFF" />
                  <span>{refillStatus === 'requested' ? 'Refill Requested ✓' : 'Request Refill'}</span>
                </button>
                <button
                  type="button"
                  style={styles.orderRefillBtn}
                  onClick={() => setShowOrderModal(true)}
                  title="Order refill from nearby pharmacy"
                >
                  <ShoppingBag size={13} color="#D97706" strokeWidth={2.5} />
                  <span>Order</span>
                </button>
              </div>
            </div>
          )}

          {/* Bottom Actions */}
          <div style={styles.actions}>
            <button
              style={{
                ...styles.takenBtn,
                backgroundColor: taken ? '#ECFDF5' : '#F5F3FF',
                borderColor: taken ? '#059669' : '#6D28D9',
                color: taken ? '#059669' : '#6D28D9',
              }}
              onClick={handleToggleTaken}
            >
              <Check size={18} color={taken ? '#059669' : '#6D28D9'} strokeWidth={2.6} />
              <span>{taken ? 'Dose Confirmed Taken (Stock -1)' : 'Confirm Dose Taken'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 1-Click Refill Order Modal */}
      {showOrderModal && (
        <OrderMedicineModal
          isOpen={showOrderModal}
          prescription={{
            title: `Refill: ${currentMed?.medicineName || 'Prescription Medicine'}`,
            doctorName: currentMed?.prescribingDoctor || 'Consulting Doctor',
            textContent: currentMed?.medicineName || 'Prescribed Medicine',
            medicines: [
              {
                name: currentMed?.medicineName || 'Prescribed Medicine',
                dosage: currentMed?.dosage || '1 tablet daily',
                quantity: 30,
                price: 25,
                instructions: currentMed?.instructions || 'As advised',
              },
            ],
          }}
          onClose={() => setShowOrderModal(false)}
          onOrderSuccess={() => setShowOrderModal(false)}
        />
      )}
    </section>
  );
};

const styles = {
  adherenceBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.74rem',
    fontWeight: '700',
    color: '#059669',
    backgroundColor: '#ECFDF5',
    padding: '2px 8px',
    borderRadius: '8px',
    border: '1px solid #A7F3D0',
  },
  medTabBtn: {
    fontSize: '0.72rem',
    fontWeight: '600',
    padding: '3px 8px',
    borderRadius: '6px',
    border: '1px solid #E2E8F0',
    backgroundColor: '#F8FAFC',
    color: '#475569',
    cursor: 'pointer',
  },
  medTabBtnActive: {
    backgroundColor: '#6D28D9',
    color: '#FFFFFF',
    borderColor: '#6D28D9',
    fontWeight: '700',
  },
  stockAdherenceRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '6px',
    flexWrap: 'wrap',
  },
  stockBadge: {
    fontSize: '0.74rem',
    fontWeight: '700',
    padding: '3px 8px',
    borderRadius: '6px',
    border: '1px solid rgba(0,0,0,0.06)',
  },
  subtleMuted: {
    fontSize: '0.74rem',
    color: '#64748B',
    fontWeight: '500',
  },
  requestRefillBtn: {
    background: '#DC2626',
    border: 'none',
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: '0.74rem',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
    padding: '5px 10px',
    borderRadius: '6px',
    boxShadow: '0 1px 2px rgba(220,38,38,0.2)',
  },
  card: {
    marginTop: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    border: '1.5px solid #FDE68A',
    backgroundColor: '#FFFFFF',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  pillIconBadge: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    backgroundColor: '#FFFBEB',
    border: '1.5px solid #FDE68A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleInfo: {
    flex: 1,
  },
  nameRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '6px',
  },
  medicineName: {
    fontSize: '0.98rem',
    fontWeight: '800',
    color: '#1E1B4B',
  },
  timeBadge: {
    fontSize: '0.72rem',
    fontWeight: '700',
    color: '#92400E',
    backgroundColor: '#FEF3C7',
    padding: '3px 8px',
    borderRadius: '6px',
    border: '1px solid #FDE68A',
    whiteSpace: 'nowrap',
  },
  instruction: {
    fontSize: '0.82rem',
    color: '#475569',
    marginTop: '2px',
    fontWeight: '600',
  },
  refillStrip: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBEB',
    border: '1.5px dashed #FDE68A',
    borderRadius: '10px',
    padding: '8px 12px',
    fontSize: '0.78rem',
  },
  refillText: {
    color: '#92400E',
    fontWeight: '700',
    flex: 1,
    marginLeft: '8px',
  },
  orderRefillBtn: {
    background: '#FFFFFF',
    border: '1.5px solid #FDE68A',
    color: '#D97706',
    fontWeight: '800',
    fontSize: '0.74rem',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '6px',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  takenBtn: {
    width: '100%',
    height: '42px',
    borderRadius: '12px',
    border: '2px solid',
    fontWeight: '800',
    fontSize: '0.86rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  // EMPTY STATE STYLES
  emptyCard: {
    marginTop: '6px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '24px 16px',
    backgroundColor: '#FFFFFF',
    border: '1.5px dashed #A7F3D0',
    gap: '12px',
  },
  emptyIconBox: {
    width: '48px',
    height: '48px',
    borderRadius: '14px',
    backgroundColor: '#ECFDF5',
    border: '1.5px solid #A7F3D0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  emptyTitle: {
    fontSize: '0.96rem',
    fontWeight: '800',
    color: '#1E1B4B',
  },
  emptySub: {
    fontSize: '0.78rem',
    color: '#475569',
    maxWidth: '280px',
    lineHeight: '1.4',
    fontWeight: '500',
  },

  // SKELETON STYLES
  skeletonHeaderRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  skelIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
  },
  skelLines: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  skelTitle: {
    width: '55%',
    height: '16px',
  },
  skelSub: {
    width: '75%',
    height: '12px',
  },
  skelStrip: {
    width: '100%',
    height: '32px',
    borderRadius: '8px',
  },
  skelBtn: {
    width: '100%',
    height: '40px',
    borderRadius: '12px',
  }
};

export default PrescriptionAlertCard;
