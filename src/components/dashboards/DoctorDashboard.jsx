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
  Check,
  Pill,
  Calendar,
  AlertTriangle,
  TrendingUp,
  FileText,
  RotateCcw,
  CheckCheck,
  XCircle,
  Plus,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import appointmentService from '../../services/appointment.service';
import patientMedicationService from '../../services/patientMedication.service';
import followUpService from '../../services/followUp.service';
import ClinicalSnapshotModal from '../ClinicalSnapshotModal';

export const DoctorDashboard = ({ onNavigate }) => {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const [isAvailable, setIsAvailable] = useState(true);
  const [queueList, setQueueList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [queueFilter, setQueueFilter] = useState('active'); // 'active' | 'all' | 'completed' | 'cancelled'

  // Section switcher
  const [activeSection, setActiveSection] = useState('queue'); // 'queue' | 'medications' | 'followups'
  const [selectedSnapshotPatient, setSelectedSnapshotPatient] = useState(null);

  // Medication monitoring state
  const [medicationsList, setMedicationsList] = useState([]);
  const [refillRequests, setRefillRequests] = useState([]);
  const [adherenceData, setAdherenceData] = useState({ today: 100, last7Days: 85, last30Days: 88, missedDosesCount: 1 });
  const [medsLoading, setMedsLoading] = useState(false);
  const [refillActionLoading, setRefillActionLoading] = useState(null);

  // Follow-up state
  const [followUpsList, setFollowUpsList] = useState([]);
  const [followUpsLoading, setFollowUpsLoading] = useState(false);
  const [followUpFilter, setFollowUpFilter] = useState('ALL'); // 'ALL' | 'UPCOMING' | 'MISSED' | 'COMPLETED'
  const [followUpCounts, setFollowUpCounts] = useState({ upcoming: 0, missed: 0, completed: 0 });
  const [completingFollowUpId, setCompletingFollowUpId] = useState(null);

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

  const fetchMedications = async () => {
    if (!token) return;
    try {
      setMedsLoading(true);
      const res = await patientMedicationService.getMedications(token);
      if (res && res.medications) {
        setMedicationsList(res.medications);
        if (res.adherence) setAdherenceData(res.adherence);
        if (res.refillRequests) setRefillRequests(res.refillRequests);
      }
    } catch (err) {
      console.warn('Could not fetch medications for monitoring:', err.message);
    } finally {
      setMedsLoading(false);
    }
  };

  const fetchFollowUps = async () => {
    if (!token) return;
    try {
      setFollowUpsLoading(true);
      const res = await followUpService.getFollowUps(token, followUpFilter);
      if (res && res.followUps) {
        setFollowUpsList(res.followUps);
        if (res.counts) setFollowUpCounts(res.counts);
      }
    } catch (err) {
      console.warn('Could not fetch follow-ups:', err.message);
    } finally {
      setFollowUpsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [token]);

  useEffect(() => {
    if (activeSection === 'medications') {
      fetchMedications();
    } else if (activeSection === 'followups') {
      fetchFollowUps();
    }
  }, [activeSection, followUpFilter, token]);

  const handleUpdateStatus = async (aptId, newStatus) => {
    try {
      await appointmentService.updateAppointmentStatus(token, aptId, { status: newStatus });
      fetchQueue();
    } catch (err) {
      console.warn(`Failed to update appointment status to ${newStatus}:`, err.message);
    }
  };

  const handleComplete = (aptId) => handleUpdateStatus(aptId, 'completed');

  const handleReviewRefill = async (refillId, status) => {
    try {
      setRefillActionLoading(refillId);
      await patientMedicationService.reviewRefill(token, refillId, {
        status,
        doctorNotes: `Reviewed and ${status.toLowerCase()} by ${user?.name || 'Dr. Ananya Sharma'}`,
      });
      await fetchMedications();
    } catch (err) {
      console.warn('Failed to review refill:', err.message);
    } finally {
      setRefillActionLoading(null);
    }
  };

  const handleCompleteFollowUp = async (followUpId) => {
    try {
      setCompletingFollowUpId(followUpId);
      await followUpService.completeFollowUp(token, followUpId, {
        notes: `Follow-up completed and verified by ${user?.name || 'Dr. Ananya Sharma'}`,
      });
      await fetchFollowUps();
    } catch (err) {
      console.warn('Failed to complete follow-up:', err.message);
    } finally {
      setCompletingFollowUpId(null);
    }
  };

  const filteredQueue = queueList.filter((a) => {
    if (queueFilter === 'active') return ['confirmed', 'pending'].includes(a.status);
    if (queueFilter === 'completed') return a.status === 'completed';
    if (queueFilter === 'cancelled') return a.status === 'cancelled';
    return true; // 'all'
  });

  const activeQueueCount = queueList.filter((a) => ['confirmed', 'pending'].includes(a.status)).length;
  const completedCount = queueList.filter((a) => a.status === 'completed').length;
  const lowStockCount = medicationsList.filter((m) => m.isLowStock || (m.remainingQuantity <= (m.refillThreshold || 5))).length;

  const stats = [
    { label: t('doctorDashboard.consultsToday'), value: String(14 + completedCount), icon: CheckCircle2, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
    { label: t('doctorDashboard.inQueue'), value: String(activeQueueCount), icon: Users, color: '#6D28D9', bg: '#F5F3FF', border: '#DDD6FE' },
    { label: 'Low-Stock Meds', value: String(lowStockCount), icon: AlertTriangle, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
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

      {/* Primary Section Switcher Tabs */}
      <div style={styles.sectionTabsContainer}>
        <button
          type="button"
          onClick={() => setActiveSection('queue')}
          style={{
            ...styles.sectionTabBtn,
            backgroundColor: activeSection === 'queue' ? '#6D28D9' : '#FFFFFF',
            color: activeSection === 'queue' ? '#FFFFFF' : '#4C1D95',
            borderColor: activeSection === 'queue' ? '#6D28D9' : '#DDD6FE',
          }}
        >
          <Users size={16} />
          <span>Patient Queue ({activeQueueCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('medications')}
          style={{
            ...styles.sectionTabBtn,
            backgroundColor: activeSection === 'medications' ? '#059669' : '#FFFFFF',
            color: activeSection === 'medications' ? '#FFFFFF' : '#065F46',
            borderColor: activeSection === 'medications' ? '#059669' : '#A7F3D0',
          }}
        >
          <Pill size={16} />
          <span>Medication & Refills ({refillRequests.length ? `${refillRequests.length} pending` : medicationsList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('followups')}
          style={{
            ...styles.sectionTabBtn,
            backgroundColor: activeSection === 'followups' ? '#0284C7' : '#FFFFFF',
            color: activeSection === 'followups' ? '#FFFFFF' : '#0369A1',
            borderColor: activeSection === 'followups' ? '#0284C7' : '#BAE6FD',
          }}
        >
          <Calendar size={16} />
          <span>Follow-Up Care ({followUpsList.length})</span>
        </button>
      </div>

      {/* SECTION 1: CONSULTATION QUEUE */}
      {activeSection === 'queue' && (
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
                      {/* Clinical Snapshot Button */}
                      <button
                        type="button"
                        onClick={() => setSelectedSnapshotPatient(item.patientId?._id || item.patientId)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          backgroundColor: '#EFF6FF',
                          color: '#1D4ED8',
                          border: '1px solid #BFDBFE',
                          borderRadius: '8px',
                          padding: '6px 10px',
                          fontSize: '0.74rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                        title="Patient Clinical Snapshot & Timeline"
                      >
                        <FileText size={14} color="#1D4ED8" />
                        <span>Snapshot</span>
                      </button>

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
      )}

      {/* SECTION 2: DOCTOR MEDICATION MONITORING & REFILLS */}
      {activeSection === 'medications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="section-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Pill size={18} color="#059669" />
              <span>Patient Medication Adherence & Stock Monitoring</span>
            </div>
            <span className="link" style={{ cursor: 'pointer' }} onClick={fetchMedications}>Refresh</span>
          </div>

          {/* Adherence Overview Cards */}
          <div style={styles.statsGrid}>
            <div className="card-base" style={{ ...styles.statCard, borderColor: '#A7F3D0', backgroundColor: '#FFFFFF' }}>
              <span style={{ ...styles.statVal, color: '#059669' }}>{adherenceData.last7Days || 85}%</span>
              <span style={styles.statLbl}>7-Day Adherence</span>
            </div>
            <div className="card-base" style={{ ...styles.statCard, borderColor: '#DDD6FE', backgroundColor: '#FFFFFF' }}>
              <span style={{ ...styles.statVal, color: '#6D28D9' }}>{adherenceData.last30Days || 88}%</span>
              <span style={styles.statLbl}>30-Day Adherence</span>
            </div>
            <div className="card-base" style={{ ...styles.statCard, borderColor: '#FECACA', backgroundColor: '#FFFFFF' }}>
              <span style={{ ...styles.statVal, color: '#DC2626' }}>{adherenceData.missedDosesCount || 0}</span>
              <span style={styles.statLbl}>Missed Doses</span>
            </div>
          </div>

          {/* Refill Requests Pending Review */}
          {refillRequests.length > 0 && (
            <div className="card-base" style={{ padding: '14px', backgroundColor: '#FFFBEB', border: '1.5px solid #FDE68A' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <AlertTriangle size={16} color="#D97706" />
                <h4 style={{ margin: 0, fontSize: '0.86rem', color: '#92400E' }}>Pending Patient Refill Requests ({refillRequests.length})</h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {refillRequests.map((r) => (
                  <div
                    key={r._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #FDE68A',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#1E293B' }}>
                        {r.medicationName || 'Medication Refill'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                        Requested: {r.requestedQuantity || 30} units • Status: <strong style={{ color: '#D97706' }}>{r.status}</strong>
                        {r.patientNotes && ` • "${r.patientNotes}"`}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      {r.status === 'REQUESTED' && (
                        <>
                          <button
                            type="button"
                            disabled={refillActionLoading === r._id}
                            onClick={() => handleReviewRefill(r._id, 'APPROVED')}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              backgroundColor: '#ECFDF5',
                              border: '1px solid #A7F3D0',
                              color: '#065F46',
                              fontSize: '0.74rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                            }}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={refillActionLoading === r._id}
                            onClick={() => handleReviewRefill(r._id, 'REJECTED')}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              backgroundColor: '#FEF2F2',
                              border: '1px solid #FECACA',
                              color: '#991B1B',
                              fontSize: '0.74rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                            }}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {r.status === 'APPROVED' && (
                        <button
                          type="button"
                          disabled={refillActionLoading === r._id}
                          onClick={() => handleReviewRefill(r._id, 'FULFILLED')}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '6px',
                            backgroundColor: '#059669',
                            border: 'none',
                            color: '#FFFFFF',
                            fontSize: '0.74rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                          }}
                        >
                          Mark Fulfilled
                        </button>
                      )}
                      {r.status === 'FULFILLED' && (
                        <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: '800' }}>✓ Fulfilled</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Patient Medications List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {medsLoading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#059669', fontWeight: '700' }}>
                Loading medications inventory...
              </div>
            ) : medicationsList.length === 0 ? (
              <div className="card-base" style={{ padding: '24px', textAlign: 'center', backgroundColor: '#FFFFFF' }}>
                <Pill size={32} color="#059669" style={{ margin: '0 auto 8px' }} />
                <h4 style={{ margin: '0 0 4px', color: '#1E1B4B' }}>No Active Prescriptions Recorded</h4>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B' }}>
                  Write digital prescriptions during teleconsultations to automatically track stock and adherence.
                </p>
              </div>
            ) : (
              medicationsList.map((m) => {
                const isLow = m.isLowStock || m.remainingQuantity <= (m.refillThreshold || 5);
                return (
                  <div
                    key={m._id}
                    className="card-base"
                    style={{
                      padding: '14px',
                      backgroundColor: '#FFFFFF',
                      border: '1.5px solid',
                      borderColor: isLow ? '#FCA5A5' : '#E2E8F0',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#1E1B4B' }}>{m.medicineName}</h4>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.68rem',
                              fontWeight: '800',
                              backgroundColor: isLow ? '#FEF2F2' : '#ECFDF5',
                              color: isLow ? '#DC2626' : '#059669',
                              border: isLow ? '1px solid #FECACA' : '1px solid #A7F3D0',
                            }}
                          >
                            {isLow ? `Low Stock: ${m.remainingQuantity} left` : `Normal: ${m.remainingQuantity} left`}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '3px' }}>
                          Dosage: <strong>{m.dosage}</strong> • {m.frequency}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.86rem', fontWeight: '800', color: m.adherence7Days < 80 ? '#DC2626' : '#059669' }}>
                          {m.adherence7Days || 85}%
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#64748B' }}>7d Adherence</div>
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: '10px',
                        paddingTop: '8px',
                        borderTop: '1px solid #F1F5F9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.74rem',
                        color: '#64748B',
                      }}
                    >
                      <div>
                        Stock: <strong>{m.remainingQuantity}</strong> / {m.prescribedQuantity || 30} units (Threshold: {m.refillThreshold || 5})
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span>30d Adherence: <strong>{m.adherence30Days || 88}%</strong></span>
                        {m.patientId && (
                          <button
                            type="button"
                            onClick={() => setSelectedSnapshotPatient(m.patientId?._id || m.patientId)}
                            style={{
                              border: 'none',
                              backgroundColor: 'transparent',
                              color: '#0284C7',
                              fontWeight: '700',
                              cursor: 'pointer',
                            }}
                          >
                            View Clinical Profile
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SECTION 3: DOCTOR FOLLOW-UP TRACKER */}
      {activeSection === 'followups' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="section-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} color="#0284C7" />
              <span>Doctor Follow-Up Care Tracker</span>
            </div>
            <span className="link" style={{ cursor: 'pointer' }} onClick={fetchFollowUps}>Refresh</span>
          </div>

          {/* Follow-up Filter Pills */}
          <div style={styles.filterTray}>
            {[
              { id: 'ALL', label: `All Follow-ups (${followUpsList.length})` },
              { id: 'UPCOMING', label: `Upcoming (${followUpCounts.upcoming || 0})` },
              { id: 'MISSED', label: `Missed / Due (${followUpCounts.missed || 0})` },
              { id: 'COMPLETED', label: `Completed (${followUpCounts.completed || 0})` },
            ].map((f) => {
              const isSelected = followUpFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFollowUpFilter(f.id)}
                  style={{
                    ...styles.filterPill,
                    backgroundColor: isSelected ? '#0284C7' : '#FFFFFF',
                    borderColor: isSelected ? '#0284C7' : '#BAE6FD',
                    color: isSelected ? '#FFFFFF' : '#0369A1',
                  }}
                >
                  <span>{f.label}</span>
                </button>
              );
            })}
          </div>

          {/* Follow-ups List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {followUpsLoading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#0284C7', fontWeight: '700' }}>
                Loading scheduled follow-ups...
              </div>
            ) : followUpsList.length === 0 ? (
              <div className="card-base" style={{ padding: '24px', textAlign: 'center', backgroundColor: '#FFFFFF' }}>
                <Calendar size={32} color="#0284C7" style={{ margin: '0 auto 8px' }} />
                <h4 style={{ margin: '0 0 4px', color: '#1E1B4B' }}>No Follow-Ups Under Selected Filter</h4>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B' }}>
                  Doctors can assign follow-up schedules directly during teleconsultations (7 days, 30 days, or custom).
                </p>
              </div>
            ) : (
              followUpsList.map((f) => {
                const isMissed = f.status === 'MISSED' || (f.status === 'UPCOMING' && new Date(f.dueDate) < new Date());
                const isDone = f.status === 'COMPLETED';

                return (
                  <div
                    key={f._id}
                    className="card-base"
                    style={{
                      padding: '14px',
                      backgroundColor: '#FFFFFF',
                      border: '1.5px solid',
                      borderColor: isDone ? '#A7F3D0' : isMissed ? '#FECACA' : '#BAE6FD',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.68rem',
                              fontWeight: '800',
                              backgroundColor: isDone ? '#ECFDF5' : isMissed ? '#FEF2F2' : '#F0F9FF',
                              color: isDone ? '#059669' : isMissed ? '#DC2626' : '#0284C7',
                              border: isDone ? '1px solid #A7F3D0' : isMissed ? '1px solid #FECACA' : '1px solid #BAE6FD',
                            }}
                          >
                            {isDone ? 'COMPLETED' : isMissed ? 'MISSED / OVERDUE' : 'UPCOMING'}
                          </span>
                          <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#1E293B' }}>
                            Due: {new Date(f.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.84rem', fontWeight: '700', color: '#334155', marginTop: '6px' }}>
                          {f.reason}
                        </div>
                        {f.instructions && (
                          <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '2px' }}>
                            Instructions: {f.instructions}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        {f.patientId && (
                          <button
                            type="button"
                            onClick={() => setSelectedSnapshotPatient(f.patientId?._id || f.patientId)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              backgroundColor: '#F8FAFC',
                              color: '#0284C7',
                              border: '1px solid #CBD5E1',
                              borderRadius: '6px',
                              padding: '5px 8px',
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                            }}
                            title="View Patient Clinical Snapshot"
                          >
                            <FileText size={13} color="#0284C7" />
                            <span>Snapshot</span>
                          </button>
                        )}

                        {!isDone && (
                          <button
                            type="button"
                            disabled={completingFollowUpId === f._id}
                            onClick={() => handleCompleteFollowUp(f._id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              backgroundColor: '#ECFDF5',
                              color: '#065F46',
                              border: '1px solid #A7F3D0',
                              borderRadius: '6px',
                              padding: '5px 10px',
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                            }}
                          >
                            <Check size={14} color="#059669" />
                            <span>Mark Completed</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

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

      {/* Doctor Clinical Snapshot & Timeline Modal */}
      {selectedSnapshotPatient && (
        <ClinicalSnapshotModal
          patientId={selectedSnapshotPatient}
          onClose={() => setSelectedSnapshotPatient(null)}
        />
      )}
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
  sectionTabsContainer: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    paddingBottom: '4px',
  },
  sectionTabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: '12px',
    border: '1.5px solid',
    fontSize: '0.78rem',
    fontWeight: '800',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease',
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
    borderRadius: '6px',
  },
  waitBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.72rem',
    color: '#6D28D9',
    fontWeight: '700',
  },
  complaintBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#F8FAFC',
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1px solid #E2E8F0',
  },
  complaintText: {
    fontSize: '0.76rem',
    color: '#334155',
    fontWeight: '600',
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
    padding: '8px 14px',
    borderRadius: '10px',
    fontSize: '0.78rem',
    fontWeight: '800',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  toolsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
  },
  toolBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    padding: '12px 8px',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #DDD6FE',
    borderRadius: '14px',
    color: '#1E1B4B',
    fontSize: '0.74rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
};

export default DoctorDashboard;
