import React, { useState, useEffect } from 'react';
import {
  Video,
  Users,
  Clock,
  FileCheck2,
  Stethoscope,
  Activity,
  CheckCircle2,
  PhoneCall,
  FileEdit,
  Sparkles,
  Check
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import appointmentService from '../../services/appointment.service';

export const DoctorDashboard = ({ onNavigate }) => {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const [isAvailable, setIsAvailable] = useState(true);
  const [queueList, setQueueList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [queueFilter, setQueueFilter] = useState('active'); // 'active' | 'all' | 'completed' | 'cancelled'

  const fetchQueue = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await appointmentService.getDoctorQueue(token);
      if (res.success && Array.isArray(res.queue)) {
        setQueueList(res.queue);
      }
    } catch (err) {
      console.warn('Could not fetch doctor queue:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [token]);

  const handleUpdateStatus = async (aptId, newStatus) => {
    try {
      await appointmentService.updateAppointmentStatus(token, aptId, { status: newStatus });
      fetchQueue();
    } catch (err) {
      console.warn(`Failed to update appointment status to ${newStatus}:`, err.message);
    }
  };

  const handleComplete = (aptId) => handleUpdateStatus(aptId, 'completed');
  const handleCancel = (aptId) => handleUpdateStatus(aptId, 'cancelled');

  const filteredQueue = queueList.filter((a) => {
    if (queueFilter === 'active') return ['confirmed', 'pending'].includes(a.status);
    if (queueFilter === 'completed') return a.status === 'completed';
    if (queueFilter === 'cancelled') return a.status === 'cancelled';
    return true; // 'all'
  });

  const activeQueueCount = queueList.filter((a) => ['confirmed', 'pending'].includes(a.status)).length;
  const completedCount = queueList.filter((a) => a.status === 'completed').length;

  const stats = [
    { label: t('doctorDashboard.consultsToday'), value: String(14 + completedCount), icon: CheckCircle2, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
    { label: t('doctorDashboard.inQueue'), value: String(activeQueueCount), icon: Users, color: '#6D28D9', bg: '#F5F3FF', border: '#DDD6FE' },
    { label: t('doctorDashboard.pendingRx'), value: '2', icon: FileCheck2, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  ];

  return (
    <div style={styles.container}>
      {/* Duty Status Banner */}
      <div className="card-base" style={styles.statusCard}>
        <div style={styles.statusLeft}>
          <div
            style={{
              ...styles.statusIndicator,
              backgroundColor: isAvailable ? '#059669' : '#D97706',
            }}
          />
          <div>
            <h3 style={styles.dutyTitle}>
              {isAvailable ? t('doctorDashboard.dutyActiveTitle') : t('doctorDashboard.dutyPausedTitle')}
            </h3>
            <p style={styles.dutySub}>
              {isAvailable
                ? t('doctorDashboard.dutyActiveSub')
                : t('doctorDashboard.dutyPausedSub')}
            </p>
          </div>
        </div>
        <button
          style={{
            ...styles.toggleDutyBtn,
            backgroundColor: isAvailable ? '#ECFDF5' : '#FFFBEB',
            borderColor: isAvailable ? '#6EE7B7' : '#FDE68A',
            color: isAvailable ? '#059669' : '#D97706',
          }}
          onClick={() => setIsAvailable(!isAvailable)}
        >
          {isAvailable ? t('doctorDashboard.toggleDutyActive') : t('doctorDashboard.toggleDutyPause')}
        </button>
      </div>

      {/* Doctor Quick Metric Cards */}
      <div style={styles.statsGrid}>
        {stats.map((s, idx) => {
          const IconComp = s.icon;
          return (
            <div
              key={idx}
              className="card-base"
              style={{
                ...styles.statCard,
                backgroundColor: '#FFFFFF',
                borderColor: s.border,
              }}
            >
              <div style={{ ...styles.statIconBox, backgroundColor: s.bg }}>
                <IconComp size={18} color={s.color} strokeWidth={2.4} />
              </div>
              <span style={styles.statVal}>{s.value}</span>
              <span style={styles.statLbl}>{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* Appointment Queue Header & Filters */}
      <div>
        <div className="section-title">
          <span>{t('doctorDashboard.queueTitle')} ({filteredQueue.length})</span>
          <span className="link" style={{ cursor: 'pointer' }} onClick={fetchQueue}>{t('common.retry', { defaultValue: 'Refresh' })}</span>
        </div>

        {/* Status Filter Pills */}
        <div style={styles.filterTray}>
          {[
            { id: 'active', label: `${t('doctorDashboard.filterActive')} (${activeQueueCount})` },
            { id: 'all', label: `${t('doctorDashboard.filterAll')} (${queueList.length})` },
            { id: 'completed', label: `${t('doctorDashboard.filterCompleted')} (${completedCount})` },
            { id: 'cancelled', label: t('doctorDashboard.filterCancelled') },
          ].map((f) => {
            const isSelected = queueFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setQueueFilter(f.id)}
                style={{
                  ...styles.filterPill,
                  backgroundColor: isSelected ? '#6D28D9' : '#FFFFFF',
                  borderColor: isSelected ? '#6D28D9' : '#DDD6FE',
                  color: isSelected ? '#FFFFFF' : '#4C1D95',
                }}
              >
                <span>{f.label}</span>
              </button>
            );
          })}
        </div>

        <div style={styles.queueList}>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#6D28D9', fontWeight: '700' }}>
              {t('app.loading')}
            </div>
          ) : filteredQueue.length === 0 ? (
            <div className="card-base" style={{ padding: '24px', textAlign: 'center', backgroundColor: '#FFFFFF' }}>
              <Users size={32} color="#6D28D9" style={{ margin: '0 auto 8px' }} />
              <h4 style={{ margin: '0 0 4px', color: '#1E1B4B' }}>{t('doctorDashboard.noQueueTitle')}</h4>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B' }}>
                {t('doctorDashboard.noQueueSub')}
              </p>
            </div>
          ) : (
            filteredQueue.map((item) => (
              <div
                key={item._id || item.id}
                className="card-base"
                style={{
                  ...styles.queueCard,
                  borderColor: item.status === 'confirmed' ? '#DDD6FE' : '#E2E8F0',
                  backgroundColor: item.status === 'confirmed' ? '#FAF5FF' : '#FFFFFF',
                }}
              >
                <div style={styles.queueTop}>
                  <div style={styles.patientMeta}>
                    <span style={styles.tokenTag}>{item.tokenNumber || item.token || 'TK-01'}</span>
                    <span style={styles.patientName}>{item.patientName}</span>
                    <span style={styles.demographics}>({item.patientAge || 35} {t('app.years')}, {item.patientGender === 'Female' ? t('profile.female') : t('profile.male')})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        ...styles.modeBadge,
                        backgroundColor: item.mode === 'chat' ? '#EFF6FF' : '#F5F3FF',
                        color: item.mode === 'chat' ? '#1D4ED8' : '#6D28D9',
                      }}
                    >
                      {item.mode === 'chat' ? `💬 ${t('consultDoctor.chatMode')}` : `📹 ${t('consultDoctor.videoMode')}`}
                    </span>
                    <div style={styles.waitBadge}>
                      <Clock size={13} color="#6D28D9" />
                      <span>{item.slot?.slotLabel || item.slot?.time || '10:30 AM'}</span>
                    </div>
                  </div>
                </div>

                <div style={styles.complaintBox}>
                  <Activity size={15} color="#6D28D9" strokeWidth={2.4} />
                  <span style={styles.complaintText}>
                    {item.symptomsSummary || item.complaint || t('doctorDashboard.complaintsLabel')}
                  </span>
                </div>

                <div style={styles.queueActions}>
                  <span style={styles.villageTag}>{item.patientVillage || 'Village Hub'}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['confirmed', 'pending'].includes(item.status) && (
                      <>
                        <button
                          type="button"
                          onClick={() => onNavigate && onNavigate('teleconsult-room', item)}
                          style={{
                            ...styles.startCallBtn,
                            backgroundColor: '#6D28D9',
                            color: '#FFFFFF',
                            border: 'none',
                          }}
                        >
                          <Video size={16} color="#FFFFFF" strokeWidth={2.4} />
                          <span>{t('doctorDashboard.startCallBtn')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleComplete(item._id || item.id)}
                          style={{
                            ...styles.startCallBtn,
                            backgroundColor: '#ECFDF5',
                            color: '#065F46',
                            border: '1px solid #A7F3D0',
                            padding: '6px 10px',
                          }}
                          title={t('doctorDashboard.markCompleted')}
                        >
                          <Check size={16} color="#059669" />
                        </button>
                      </>
                    )}

                    {item.status === 'completed' && (
                      <span style={{ fontSize: '0.74rem', color: '#059669', fontWeight: '800' }}>
                        ✓ {t('app.completed')}
                      </span>
                    )}

                    {item.status === 'cancelled' && (
                      <span style={{ fontSize: '0.74rem', color: '#DC2626', fontWeight: '800' }}>
                        ✕ {t('app.cancelled')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Doctor Tools */}
      <div>
        <div className="section-title">
          <span>{t('quickActions.title')}</span>
        </div>
        <div style={styles.toolsRow}>
          <button
            style={styles.toolBtn}
            onClick={() => onNavigate && onNavigate('consult-history')}
          >
            <FileEdit size={18} color="#6D28D9" strokeWidth={2.4} />
            <span>{t('consultationHistory.tabPrescription')}</span>
          </button>
          <button
            style={styles.toolBtn}
            onClick={() => onNavigate && onNavigate('consult-history')}
          >
            <Stethoscope size={18} color="#0284C7" strokeWidth={2.4} />
            <span>{t('consultationHistory.title')}</span>
          </button>
          <button
            style={styles.toolBtn}
            onClick={() => onNavigate && onNavigate('facility-locator')}
          >
            <PhoneCall size={18} color="#7C3AED" strokeWidth={2.4} />
            <span>{t('facilityLocator.callFacility')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  statusCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #DDD6FE',
  },
  statusLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  statusIndicator: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  dutyTitle: {
    fontSize: '0.9rem',
    fontWeight: '800',
    color: '#1E1B4B',
    lineHeight: '1.2',
  },
  dutySub: {
    fontSize: '0.74rem',
    color: '#475569',
    marginTop: '2px',
    fontWeight: '500',
  },
  toggleDutyBtn: {
    padding: '6px 12px',
    borderRadius: '10px',
    border: '1.5px solid',
    fontSize: '0.76rem',
    fontWeight: '800',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
  },
  statCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px 6px',
    border: '1.5px solid',
    borderRadius: '14px',
  },
  statIconBox: {
    width: '32px',
    height: '32px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '6px',
  },
  statVal: {
    fontSize: '1.15rem',
    fontWeight: '800',
    color: '#1E1B4B',
  },
  statLbl: {
    fontSize: '0.68rem',
    fontWeight: '700',
    color: '#64748B',
    marginTop: '2px',
    textAlign: 'center',
  },
  filterTray: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    paddingBottom: '6px',
    marginTop: '8px',
  },
  filterPill: {
    padding: '6px 12px',
    borderRadius: '9999px',
    border: '1.5px solid',
    fontSize: '0.74rem',
    fontWeight: '700',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease',
  },
  queueList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '10px',
  },
  queueCard: {
    padding: '14px',
    border: '1.5px solid',
    borderRadius: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  queueTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  patientMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  tokenTag: {
    fontSize: '0.72rem',
    fontWeight: '800',
    backgroundColor: '#6D28D9',
    color: '#FFFFFF',
    padding: '2px 6px',
    borderRadius: '6px',
  },
  patientName: {
    fontSize: '0.86rem',
    fontWeight: '800',
    color: '#1E1B4B',
  },
  demographics: {
    fontSize: '0.74rem',
    color: '#64748B',
    fontWeight: '600',
  },
  modeBadge: {
    fontSize: '0.7rem',
    fontWeight: '800',
    padding: '3px 8px',
    borderRadius: '9999px',
  },
  waitBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.72rem',
    color: '#6D28D9',
    fontWeight: '700',
    backgroundColor: '#F5F3FF',
    padding: '3px 8px',
    borderRadius: '9999px',
    border: '1px solid #DDD6FE',
  },
  complaintBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '8px 10px',
    backgroundColor: '#F8FAFC',
    borderRadius: '8px',
  },
  complaintText: {
    fontSize: '0.76rem',
    color: '#334155',
    fontWeight: '600',
    lineHeight: '1.3',
  },
  queueActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  villageTag: {
    fontSize: '0.72rem',
    color: '#64748B',
    fontWeight: '600',
  },
  startCallBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '0.76rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
  toolsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
    marginTop: '6px',
  },
  toolBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    padding: '12px 6px',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #E2E8F0',
    borderRadius: '12px',
    fontSize: '0.74rem',
    fontWeight: '700',
    color: '#1E1B4B',
    cursor: 'pointer',
  },
};

export default DoctorDashboard;
