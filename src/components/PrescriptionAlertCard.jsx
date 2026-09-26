import React, { useState, useEffect } from 'react';
import { BellRing, Check, AlertCircle, RefreshCw, CheckCircle2, ShoppingBag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import reminderService from '../services/reminder.service';
import { translateDynamicContent } from '../utils/contentTranslator';
import OrderMedicineModal from './medicine/OrderMedicineModal';

export const PrescriptionAlertCard = () => {
  const { t, i18n } = useTranslation();
  const { token } = useAuth();
  const [reminder, setReminder] = useState(null);
  const [taken, setTaken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchReminder = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await reminderService.getActiveReminders(token);
        if (isMounted) {
          if (data.success && Array.isArray(data.reminders) && data.reminders.length > 0) {
            setReminder(data.reminders[0]);
            setTaken(data.reminders[0].isTaken || false);
          } else {
            setReminder(null);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.warn('[PrescriptionAlertCard] API fetch warning:', err.message);
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchReminder();

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <section>
      <div className="section-title">
        <span>{t('prescription.title')}</span>
        <span className="link">{t('prescription.allMedicines')}</span>
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
      {!loading && !reminder && (
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
      {!loading && reminder && (
        <div className="card-base subtle-amber-glow" style={styles.card}>
          <div style={styles.headerRow}>
            <div style={styles.pillIconBadge}>
              <BellRing size={20} color="#D97706" strokeWidth={2.4} />
            </div>
            <div style={styles.titleInfo}>
              <div style={styles.nameRow}>
                <h3 style={styles.medicineName}>{reminder.medicineName}</h3>
                <span style={styles.timeBadge}>{reminder.scheduledTime}</span>
              </div>
              <p style={styles.instruction}>{translateDynamicContent(reminder.instructions, i18n.language)}</p>
            </div>
          </div>

          {/* Refill Alert Strip */}
          {reminder.refillWarning && (
            <div style={styles.refillStrip}>
              <AlertCircle size={16} color="#D97706" strokeWidth={2.4} />
              <span style={styles.refillText}>{translateDynamicContent(reminder.refillWarning, i18n.language)}</span>
              <button
                type="button"
                style={styles.orderRefillBtn}
                onClick={() => setShowOrderModal(true)}
                title="Order refill from nearby pharmacy"
              >
                <ShoppingBag size={13} color="#D97706" strokeWidth={2.5} />
                <span>{t('prescription.refillBtn') || 'Order Medicine'}</span>
              </button>
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
              onClick={() => setTaken(!taken)}
            >
              <Check size={18} color={taken ? '#059669' : '#6D28D9'} strokeWidth={2.6} />
              <span>{taken ? t('prescription.markedTaken') : t('prescription.markTaken')}</span>
            </button>
          </div>
        </div>
      )}

      {/* 1-Click Refill Order Modal */}
      {showOrderModal && (
        <OrderMedicineModal
          isOpen={showOrderModal}
          prescription={{
            title: `Refill: ${reminder?.medicineName || 'Prescription Medicine'}`,
            doctorName: reminder?.doctorName || 'Consulting Doctor',
            textContent: reminder?.medicineName || 'Prescribed Medicine',
            medicines: [
              {
                name: reminder?.medicineName || 'Prescribed Medicine',
                dosage: reminder?.dosage || '1 tablet daily',
                quantity: 10,
                price: 25,
                instructions: reminder?.instructions || 'As advised',
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
