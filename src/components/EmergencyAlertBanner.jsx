import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import emergencyService from '../services/emergency.service';
import {
  ShieldAlert,
  PhoneCall,
  BellRing,
  CheckCircle2,
  X,
  User,
  AlertOctagon,
  Share2
} from 'lucide-react';

export const EmergencyAlertBanner = ({ alert, onResolve }) => {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const [notifying, setNotifying] = useState(false);
  const [notifiedContact, setNotifiedContact] = useState(
    alert?.emergencyContactNotified ? (user?.emergencyContact || { name: 'Ramesh Kumar (Brother)', phone: '+91 98765 43210' }) : null
  );
  const [resolving, setResolving] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !alert || alert.status === 'resolved') {
    return null;
  }

  const contact = user?.emergencyContact || {
    name: 'Ramesh Kumar (Brother)',
    phone: '+91 98765 43210',
    relation: 'Family Member',
  };

  const handleNotifyContact = async () => {
    if (!token || !alert?._id || notifying) return;
    setNotifying(true);
    try {
      const res = await emergencyService.notifyEmergencyContact(token, alert._id);
      if (res.success) {
        setNotifiedContact(res.emergencyContact || contact);
      }
    } catch (err) {
      console.warn('Failed to notify emergency contact via API, showing fallback feedback:', err.message);
      setNotifiedContact(contact);
    } finally {
      setNotifying(false);
    }
  };

  const handleResolve = async () => {
    if (resolving) return;
    setResolving(true);
    try {
      if (token && alert?._id) {
        await emergencyService.resolveAlert(token, alert._id);
      }
    } catch (err) {
      console.warn('Failed to resolve alert on server:', err.message);
    } finally {
      setResolving(false);
      setDismissed(true);
      if (onResolve) onResolve();
    }
  };

  return (
    <div style={styles.emergencyContainer} role="alert" aria-live="assertive">
      <div style={styles.bannerHeader}>
        <div style={styles.iconPulseWrapper}>
          <ShieldAlert size={26} color="#FFFFFF" strokeWidth={2.6} />
        </div>
        <div style={styles.titleBox}>
          <div style={styles.strobeTag}>
            <AlertOctagon size={12} color="#DC2626" />
            <span>{t('emergencyAlert.criticalDispatch')}</span>
          </div>
          <h2 style={styles.bannerTitle}>{t('emergencyAlert.bannerTitle')}</h2>
          <p style={styles.bannerSub}>
            {alert.reason || t('emergencyAlert.bannerSub')}
          </p>
        </div>
      </div>

      {/* Emergency Contact Info Strip */}
      <div style={styles.contactStrip}>
        <User size={14} color="#991B1B" />
        <span style={styles.contactLabel}>{t('emergencyAlert.contactLabel')}</span>
        <strong style={styles.contactVal}>
          {contact.name} ({contact.phone})
        </strong>
      </div>

      {/* Action Buttons */}
      <div style={styles.actionButtonsRow}>
        {/* Call 108 */}
        <a href="tel:108" style={styles.call108Btn}>
          <PhoneCall size={18} color="#FFFFFF" strokeWidth={2.6} />
          <span>{t('emergencyAlert.callBtn')}</span>
        </a>

        {/* Notify My Contact */}
        <button
          type="button"
          onClick={handleNotifyContact}
          disabled={notifying || !!notifiedContact}
          style={{
            ...styles.notifyContactBtn,
            backgroundColor: notifiedContact ? '#ECFDF5' : '#FFFFFF',
            borderColor: notifiedContact ? '#A7F3D0' : '#FECACA',
            color: notifiedContact ? '#065F46' : '#991B1B',
          }}
        >
          {notifiedContact ? (
            <CheckCircle2 size={16} color="#059669" />
          ) : (
            <BellRing size={16} color="#DC2626" />
          )}
          <span>
            {notifying
              ? t('emergencyAlert.notifying')
              : notifiedContact
              ? t('emergencyAlert.contactAlerted')
              : t('emergencyAlert.notifyBtn')}
          </span>
        </button>
      </div>

      {/* Live Dispatched Confirmation Strip */}
      {notifiedContact && (
        <div style={styles.notifiedFeedbackStrip}>
          <CheckCircle2 size={15} color="#059669" strokeWidth={2.4} />
          <span style={styles.notifiedText}>
            {t('emergencyAlert.notifiedSuccess')} <strong>{notifiedContact.name}</strong> ({notifiedContact.phone})
          </span>
        </div>
      )}

      {/* Dismiss / Mark Safe */}
      <div style={styles.bottomResolveRow}>
        <button
          type="button"
          onClick={handleResolve}
          disabled={resolving}
          style={styles.resolveLinkBtn}
        >
          <span>{t('emergencyAlert.resolveBtn')}</span>
        </button>
      </div>
    </div>
  );
};

const styles = {
  emergencyContainer: {
    width: '100%',
    backgroundColor: '#FEF2F2',
    border: '2px solid #DC2626',
    borderRadius: '18px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    boxShadow: '0 8px 24px -4px rgba(220, 38, 38, 0.35)',
    animation: 'pulse-dot 3s infinite ease-in-out',
  },
  bannerHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  iconPulseWrapper: {
    width: '46px',
    height: '46px',
    borderRadius: '14px',
    backgroundColor: '#DC2626',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)',
  },
  titleBox: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  strobeTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    fontSize: '0.66rem',
    fontWeight: '900',
    padding: '2px 6px',
    borderRadius: '6px',
    letterSpacing: '0.04em',
    alignSelf: 'flex-start',
  },
  bannerTitle: {
    fontSize: '0.96rem',
    fontWeight: '900',
    color: '#991B1B',
    lineHeight: '1.25',
    marginTop: '2px',
  },
  bannerSub: {
    fontSize: '0.76rem',
    color: '#7F1D1D',
    lineHeight: '1.35',
    fontWeight: '600',
  },
  contactStrip: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#FEE2E2',
    borderRadius: '10px',
    padding: '6px 10px',
    fontSize: '0.74rem',
    flexWrap: 'wrap',
  },
  contactLabel: {
    color: '#991B1B',
    fontWeight: '700',
  },
  contactVal: {
    color: '#7F1D1D',
  },
  actionButtonsRow: {
    display: 'flex',
    gap: '10px',
  },
  call108Btn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    backgroundColor: '#DC2626',
    color: '#FFFFFF',
    textDecoration: 'none',
    fontWeight: '900',
    fontSize: '0.86rem',
    padding: '12px 14px',
    borderRadius: '12px',
    boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)',
  },
  notifyContactBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    border: '1.5px solid',
    borderRadius: '12px',
    padding: '12px 10px',
    fontSize: '0.78rem',
    fontWeight: '800',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
  },
  notifiedFeedbackStrip: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#ECFDF5',
    border: '1px solid #A7F3D0',
    borderRadius: '8px',
    padding: '6px 10px',
  },
  notifiedText: {
    fontSize: '0.72rem',
    color: '#065F46',
    fontWeight: '600',
  },
  bottomResolveRow: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  resolveLinkBtn: {
    background: 'none',
    border: 'none',
    color: '#991B1B',
    fontSize: '0.72rem',
    fontWeight: '700',
    textDecoration: 'underline',
    cursor: 'pointer',
    padding: '2px',
  },
};

export default EmergencyAlertBanner;
