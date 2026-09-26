import React, { useState, useEffect } from 'react';
import QuickActionsGrid from '../QuickActionsGrid';
import HealthRiskCard from '../HealthRiskCard';
import PreventiveTipsCard from '../PreventiveTipsCard';
import UpcomingAppointmentCard from '../UpcomingAppointmentCard';
import PrescriptionAlertCard from '../PrescriptionAlertCard';
import EmergencyAlertBanner from '../EmergencyAlertBanner';
import { PhoneCall, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import emergencyService from '../../services/emergency.service';

export const PatientDashboard = ({ onNavigate }) => {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [activeAlert, setActiveAlert] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchActiveAlert = async () => {
      if (!token) return;
      try {
        const res = await emergencyService.getActiveAlert(token);
        if (isMounted && res.success && res.alert) {
          setActiveAlert(res.alert);
        }
      } catch (err) {
        console.warn('Could not check active emergency alert:', err.message);
      }
    };
    fetchActiveAlert();
    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <>
      {/* Active AI Emergency Alert or Standard SOS Banner */}
      {activeAlert ? (
        <EmergencyAlertBanner
          alert={activeAlert}
          onResolve={() => setActiveAlert(null)}
        />
      ) : (
        <div style={styles.emergencyBanner}>
          <div style={styles.emergencyIconBox}>
            <ShieldAlert size={22} color="#DC2626" strokeWidth={2.4} />
          </div>
          <div style={styles.emergencyText}>
            <span style={styles.emergencyTitle}>{t('sos.title')}</span>
            <span style={styles.emergencySub}>{t('sos.sub')}</span>
          </div>
          <a href="tel:108" style={styles.callButton} aria-label="Call Emergency">
            <PhoneCall size={16} color="#FFFFFF" strokeWidth={2.5} />
            <span>{t('sos.btn')}</span>
          </a>
        </div>
      )}

      {/* Health Risk Widget Card */}
      <HealthRiskCard onOpenDetails={() => onNavigate && onNavigate('risk-detail')} />

      {/* AI Personalized Preventive Tips Card */}
      <PreventiveTipsCard />

      {/* Quick Actions Grid */}
      <QuickActionsGrid onActionClick={onNavigate} />

      {/* Upcoming Appointment Card */}
      <UpcomingAppointmentCard onNavigate={onNavigate} />

      {/* Prescription Alert Card */}
      <PrescriptionAlertCard />
    </>
  );
};

const styles = {
  emergencyBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#FEF2F2',
    border: '1.5px solid #FECACA',
    borderRadius: '16px',
    padding: '12px 14px',
    boxShadow: '0 2px 8px rgba(220, 38, 38, 0.08)',
  },
  emergencyIconBox: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    backgroundColor: '#FEE2E2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emergencyText: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  emergencyTitle: {
    fontSize: '0.86rem',
    fontWeight: '800',
    color: '#991B1B',
  },
  emergencySub: {
    fontSize: '0.74rem',
    color: '#B91C1C',
    fontWeight: '600',
    marginTop: '1px',
  },
  callButton: {
    backgroundColor: '#DC2626',
    color: '#FFFFFF',
    textDecoration: 'none',
    fontWeight: '800',
    fontSize: '0.82rem',
    padding: '8px 14px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 3px 10px rgba(220, 38, 38, 0.35)',
  }
};

export default PatientDashboard;
