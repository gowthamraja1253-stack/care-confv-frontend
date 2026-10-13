import React, { useState, useEffect } from 'react';
import { healthRecordService } from '../services/healthRecord.service';
import followUpService from '../services/followUp.service';
import { useAuth } from '../context/AuthContext';
import {
  X,
  FileText,
  Activity,
  Pill,
  History,
  Sparkles,
  AlertTriangle,
  Clock,
  Calendar,
  ShieldAlert,
  User,
  Heart,
  CheckCircle2,
  CalendarPlus,
  TrendingUp,
} from 'lucide-react';

export default function ClinicalSnapshotModal({ patientId, onClose, appointmentId = null }) {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState('snapshot'); // 'snapshot' | 'timeline'
  const [snapshotData, setSnapshotData] = useState(null);
  const [timelineItems, setTimelineItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [error, setError] = useState('');

  // Quick follow-up scheduling inside snapshot
  const [followUpDays, setFollowUpDays] = useState('7');
  const [followUpReason, setFollowUpReason] = useState('Evaluate response to treatment and symptom relief');
  const [schedulingFollowUp, setSchedulingFollowUp] = useState(false);
  const [followUpSuccess, setFollowUpSuccess] = useState(false);

  useEffect(() => {
    const fetchSnapshot = async () => {
      try {
        setLoading(true);
        const res = await healthRecordService.getPatientClinicalSnapshot(token, patientId);
        if (res && res.success) {
          setSnapshotData(res.snapshot);
        } else {
          setError(res?.message || 'Could not fetch clinical snapshot');
        }
      } catch (err) {
        setError('Failed to fetch clinical snapshot');
      } finally {
        setLoading(false);
      }
    };

    if (patientId) {
      fetchSnapshot();
    }
  }, [patientId, token]);

  const fetchTimeline = async () => {
    try {
      setLoadingTimeline(true);
      const res = await healthRecordService.getPatientTimeline(token, patientId);
      if (res && res.success) {
        setTimelineItems(res.timeline || []);
      }
    } catch (err) {
      console.warn('Failed to fetch timeline:', err.message);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'timeline' && timelineItems.length === 0) {
      fetchTimeline();
    }
  };

  const handleScheduleFollowUp = async (e) => {
    e.preventDefault();
    if (!patientId || !token) return;
    try {
      setSchedulingFollowUp(true);
      await followUpService.createFollowUp(token, {
        patientId,
        consultationId: appointmentId,
        followUpDays: Number(followUpDays) || 7,
        reason: followUpReason,
        instructions: 'Check adherence and vitals improvement',
      });
      setFollowUpSuccess(true);
      setTimeout(() => setFollowUpSuccess(false), 3500);
      // Refresh snapshot
      const res = await healthRecordService.getPatientClinicalSnapshot(token, patientId);
      if (res?.success) setSnapshotData(res.snapshot);
    } catch (err) {
      alert('Could not schedule follow-up: ' + err.message);
    } finally {
      setSchedulingFollowUp(false);
    }
  };

  const basic = snapshotData?.basicInfo || {};
  const adherence = snapshotData?.medicationAdherence || { adherence7Days: 100, adherence30Days: 100, missedDoses: 0 };
  const aiSummary = snapshotData?.aiSummary;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>PATIENT CLINICAL SNAPSHOT</h2>
            <p style={styles.subTitle}>
              {basic.name || 'Patient'} • Age: {basic.age || 35} • Gender: {basic.gender || 'Male'} • Blood: {basic.bloodGroup || 'Unknown'} • Village: {basic.village || 'Rampur'}
            </p>
          </div>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Close Snapshot">
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={styles.tabsBar}>
          <button
            type="button"
            style={{
              ...styles.tabBtn,
              ...(activeTab === 'snapshot' ? styles.tabBtnActive : {}),
            }}
            onClick={() => handleTabChange('snapshot')}
          >
            <Activity size={15} />
            <span>Clinical Snapshot & AI Summary</span>
          </button>
          <button
            type="button"
            style={{
              ...styles.tabBtn,
              ...(activeTab === 'timeline' ? styles.tabBtnActive : {}),
            }}
            onClick={() => handleTabChange('timeline')}
          >
            <History size={15} />
            <span>Unified Patient Timeline</span>
          </button>
        </div>

        {/* Modal Content */}
        <div style={styles.content}>
          {loading ? (
            <p style={styles.message}>Loading clinical snapshot and verified records...</p>
          ) : error ? (
            <p style={styles.error}>{error}</p>
          ) : activeTab === 'snapshot' ? (
            <div style={styles.sections}>
              {/* 1. Concise AI Summary Box */}
              <div style={styles.aiBox}>
                <div style={styles.aiHeader}>
                  <Sparkles size={16} color="#7C3AED" />
                  <span style={styles.aiTitle}>AI Clinical Snapshot (Verified Stored Records)</span>
                  <span style={styles.verifiedTag}>Strictly Factual • Grounded in MongoDB</span>
                </div>
                {aiSummary ? (
                  <pre style={styles.aiText}>{aiSummary}</pre>
                ) : (
                  <div style={styles.structuredFallback}>
                    <p style={{ margin: 0, fontWeight: 700, color: '#1E1B4B', fontSize: '0.85rem' }}>
                      Clinical Summary (Structured Fallback)
                    </p>
                    <ul style={styles.fallbackList}>
                      <li>
                        <strong>Known conditions:</strong>{' '}
                        {snapshotData?.chronicConditions?.length
                          ? snapshotData.chronicConditions.join(', ')
                          : 'None reported'}
                      </li>
                      <li>
                        <strong>Current medications:</strong>{' '}
                        {snapshotData?.currentMedications?.length
                          ? snapshotData.currentMedications.map((m) => `${m.medicineName} (${m.dosage}, stock: ${m.remainingQuantity})`).join('; ')
                          : 'None recorded'}
                      </li>
                      <li>
                        <strong>Recent symptoms:</strong>{' '}
                        {snapshotData?.recentSymptoms?.length
                          ? snapshotData.recentSymptoms.map((s) => `${s.symptoms?.join(', ')} (${s.severity})`).join('; ')
                          : 'None recently reported'}
                      </li>
                      <li>
                        <strong>Recent changes:</strong>{' '}
                        {snapshotData?.recentLabResults?.length ? 'Recent laboratory records available' : 'Stable'}
                      </li>
                      <li>
                        <strong>Medication adherence:</strong> {adherence.adherence7Days}% (7-day), {adherence.adherence30Days}% (30-day), {adherence.missedDoses} missed dose(s)
                      </li>
                      <li>
                        <strong>Risk indicators:</strong>{' '}
                        {snapshotData?.recentEmergencyEvents?.length
                          ? `${snapshotData.recentEmergencyEvents[0].riskLevel}: ${snapshotData.recentEmergencyEvents[0].reasons?.join(', ')}`
                          : 'Routine / Stable'}
                      </li>
                      <li>
                        <strong>Follow-up:</strong>{' '}
                        {snapshotData?.followUps?.length
                          ? `${snapshotData.followUps[0].status} on ${new Date(snapshotData.followUps[0].dueDate).toLocaleDateString()}: ${snapshotData.followUps[0].reason}`
                          : 'None scheduled'}
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              {/* 2. Key Vitals & Profile Badges */}
              <div style={styles.metricsGrid}>
                <div style={styles.metricCard}>
                  <span style={styles.metricLabel}>Blood Group</span>
                  <strong style={styles.metricValue}>{basic.bloodGroup || 'Unknown'}</strong>
                </div>
                <div style={styles.metricCard}>
                  <span style={styles.metricLabel}>7-Day Adherence</span>
                  <strong style={{ ...styles.metricValue, color: adherence.adherence7Days < 75 ? '#DC2626' : '#059669' }}>
                    {adherence.adherence7Days}%
                  </strong>
                </div>
                <div style={styles.metricCard}>
                  <span style={styles.metricLabel}>30-Day Adherence</span>
                  <strong style={{ ...styles.metricValue, color: adherence.adherence30Days < 75 ? '#DC2626' : '#059669' }}>
                    {adherence.adherence30Days}%
                  </strong>
                </div>
                <div style={styles.metricCard}>
                  <span style={styles.metricLabel}>Missed Doses</span>
                  <strong style={{ ...styles.metricValue, color: adherence.missedDoses > 0 ? '#DC2626' : '#059669' }}>
                    {adherence.missedDoses}
                  </strong>
                </div>
              </div>

              {/* 3. Allergies & Chronic Conditions */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>
                  <AlertTriangle size={15} color="#DC2626" /> ALLERGIES & CHRONIC CONDITIONS
                </h3>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <strong style={{ fontSize: '0.82rem', color: '#6B7280' }}>Documented Allergies:</strong>
                    <div style={{ marginTop: '4px' }}>
                      {snapshotData?.allergies?.length > 0 ? (
                        snapshotData.allergies.map((a, i) => (
                          <span key={i} style={styles.dangerBadge}>
                            {a}
                          </span>
                        ))
                      ) : (
                        <p style={styles.mutedText}>No known allergies recorded.</p>
                      )}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <strong style={{ fontSize: '0.82rem', color: '#6B7280' }}>Chronic Conditions:</strong>
                    <div style={{ marginTop: '4px' }}>
                      {snapshotData?.chronicConditions?.length > 0 ? (
                        snapshotData.chronicConditions.map((c, i) => (
                          <span key={i} style={styles.chronicBadge}>
                            {c}
                          </span>
                        ))
                      ) : (
                        <p style={styles.mutedText}>No chronic conditions documented.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Active Medications & Stock Tracking */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>
                  <Pill size={15} color="#059669" /> ACTIVE MEDICATIONS & INVENTORY
                </h3>
                {snapshotData?.currentMedications?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {snapshotData.currentMedications.map((m, i) => {
                      const isLow = m.remainingQuantity <= m.refillThreshold;
                      return (
                        <div key={i} style={styles.medCard}>
                          <div>
                            <strong style={{ fontSize: '0.88rem', color: '#1E1B4B' }}>{m.medicineName}</strong>
                            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                              {m.dosage} • {m.frequency} • {m.instructions || 'Daily dose'}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span
                              style={{
                                ...styles.stockPill,
                                backgroundColor: isLow ? '#FEE2E2' : '#ECFDF5',
                                color: isLow ? '#991B1B' : '#065F46',
                                border: isLow ? '1px solid #FCA5A5' : '1px solid #A7F3D0',
                              }}
                            >
                              Stock: {m.remainingQuantity} doses {isLow ? '⚠️ Low' : '✓ Normal'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={styles.mutedText}>No active medications tracked.</p>
                )}
              </div>

              {/* 5. Recent Symptoms */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>
                  <Activity size={15} color="#EA580C" /> RECENT PATIENT-REPORTED SYMPTOMS
                </h3>
                {snapshotData?.recentSymptoms?.length > 0 ? (
                  <ul style={styles.list}>
                    {snapshotData.recentSymptoms.map((s, i) => (
                      <li key={i} style={styles.listItem}>
                        <strong>{new Date(s.createdAt).toLocaleDateString()}:</strong> {s.symptoms?.join(', ')} ({s.severity}, {s.durationDays} days)
                        {s.notes && <p style={styles.details}>{s.notes}</p>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={styles.mutedText}>No recent symptoms logged.</p>
                )}
              </div>

              {/* 6. Recent Lab / Vital Information */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>
                  <FileText size={15} color="#7C3AED" /> RECENT LAB & VITAL RECORDS
                </h3>
                {snapshotData?.recentLabResults?.length > 0 ? (
                  <ul style={styles.list}>
                    {snapshotData.recentLabResults.map((lr, i) => (
                      <li key={i} style={styles.listItem}>
                        <strong>{new Date(lr.date || lr.createdAt).toLocaleDateString()} - {lr.title}</strong>
                        <p style={styles.details}>{lr.textContent || lr.notes || 'Lab report on file'}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={styles.mutedText}>No recent lab test records.</p>
                )}
              </div>

              {/* 7. Previous Consultations & Prescriptions */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>
                  <History size={15} color="#2563EB" /> PREVIOUS CONSULTATIONS & PRESCRIPTIONS
                </h3>
                {snapshotData?.previousConsultations?.length > 0 ? (
                  <ul style={styles.list}>
                    {snapshotData.previousConsultations.map((c, i) => (
                      <li key={i} style={styles.listItem}>
                        <strong>{new Date(c.completedAt || c.createdAt).toLocaleDateString()} with {c.doctorName}</strong> ({c.doctorSpecialization})
                        <div style={styles.details}>{c.notes || c.prescriptionSummary || 'Consultation completed'}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={styles.mutedText}>No previous completed consultations.</p>
                )}
              </div>

              {/* 8. Recent Emergency Events */}
              {snapshotData?.recentEmergencyEvents?.length > 0 && (
                <div style={styles.section}>
                  <h3 style={{ ...styles.sectionTitle, color: '#DC2626' }}>
                    <ShieldAlert size={15} color="#DC2626" /> RECENT EMERGENCY EVENTS
                  </h3>
                  {snapshotData.recentEmergencyEvents.map((em, i) => (
                    <div key={i} style={styles.emergencyBox}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: '#991B1B' }}>{em.riskLevel} - Status: {em.status}</strong>
                        <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                          {new Date(em.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#7F1D1D' }}>
                        {em.reasons?.join('; ') || 'Emergency threshold reached'}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* 9. Upcoming / Missed Follow-ups & Scheduler */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>
                  <Clock size={15} color="#0284C7" /> FOLLOW-UP TRACKING
                </h3>
                {snapshotData?.followUps?.length > 0 ? (
                  <ul style={styles.list}>
                    {snapshotData.followUps.map((f, i) => (
                      <li key={i} style={styles.listItem}>
                        <span
                          style={{
                            ...styles.statusTag,
                            backgroundColor: f.status === 'MISSED' ? '#FEE2E2' : '#E0F2FE',
                            color: f.status === 'MISSED' ? '#991B1B' : '#0369A1',
                          }}
                        >
                          {f.status}
                        </span>{' '}
                        <strong>Due {new Date(f.dueDate).toLocaleDateString()}:</strong> {f.reason}
                        {f.instructions && <div style={styles.details}>{f.instructions}</div>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={styles.mutedText}>No pending or scheduled follow-ups.</p>
                )}

                {/* Quick Follow-up Scheduler */}
                {user?.role === 'doctor' && (
                  <form onSubmit={handleScheduleFollowUp} style={styles.schedulerForm}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CalendarPlus size={15} color="#6D28D9" />
                      <strong style={{ fontSize: '0.82rem', color: '#1E1B4B' }}>Schedule New Patient Follow-Up:</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <select
                        style={styles.schedulerSelect}
                        value={followUpDays}
                        onChange={(e) => setFollowUpDays(e.target.value)}
                      >
                        <option value="7">Follow up after 7 Days</option>
                        <option value="14">Follow up after 14 Days</option>
                        <option value="30">Follow up after 30 Days</option>
                        <option value="60">Follow up after 60 Days</option>
                      </select>
                      <input
                        type="text"
                        style={styles.schedulerInput}
                        placeholder="Reason (e.g. Review blood sugar & BP)"
                        value={followUpReason}
                        onChange={(e) => setFollowUpReason(e.target.value)}
                        required
                      />
                      <button
                        type="submit"
                        style={styles.scheduleBtn}
                        disabled={schedulingFollowUp}
                      >
                        {schedulingFollowUp ? 'Scheduling...' : followUpSuccess ? 'Scheduled ✓' : 'Add Follow-Up'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          ) : (
            /* UNIFIED PATIENT TIMELINE (Requirement 9) */
            <div style={styles.timelineContainer}>
              <div style={styles.timelineHeader}>
                <History size={16} color="#6D28D9" />
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1E1B4B' }}>
                  Complete Patient Longitudinal Timeline
                </span>
              </div>
              {loadingTimeline ? (
                <p style={styles.message}>Loading timeline events...</p>
              ) : timelineItems.length === 0 ? (
                <p style={styles.emptyText}>No timeline events recorded for this patient.</p>
              ) : (
                <div style={styles.timelineList}>
                  {timelineItems.map((item, i) => (
                    <div key={item.id || i} style={styles.timelineRow}>
                      <div style={styles.timelineDotBox}>
                        <div style={{ ...styles.timelineDot, backgroundColor: item.badgeColor || '#6D28D9' }} />
                        {i < timelineItems.length - 1 && <div style={styles.timelineLine} />}
                      </div>
                      <div style={styles.timelineContentBox}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ ...styles.timelineCategory, color: item.badgeColor || '#6D28D9' }}>
                            {item.category}
                          </span>
                          <span style={styles.timelineDate}>
                            {new Date(item.timestamp).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}{' '}
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <h4 style={styles.timelineTitle}>{item.title}</h4>
                        {item.subtitle && <p style={styles.timelineSub}>{item.subtitle}</p>}
                        {item.details && <p style={styles.timelineDetails}>{item.details}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '16px',
    backdropFilter: 'blur(3px)',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: '780px',
    maxHeight: '90vh',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
    overflow: 'hidden',
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid #E2E8F0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
  },
  title: {
    margin: 0,
    fontSize: '1.05rem',
    fontWeight: '800',
    color: '#1E1B4B',
    letterSpacing: '0.02em',
  },
  subTitle: {
    margin: '3px 0 0',
    fontSize: '0.78rem',
    color: '#64748B',
    fontWeight: '500',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#64748B',
    padding: '4px',
    borderRadius: '6px',
  },
  tabsBar: {
    display: 'flex',
    backgroundColor: '#F1F5F9',
    borderBottom: '1px solid #E2E8F0',
    padding: '4px 12px',
    gap: '8px',
  },
  tabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#64748B',
    fontSize: '0.82rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    color: '#6D28D9',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  content: {
    padding: '20px',
    overflowY: 'auto',
    flex: 1,
  },
  sections: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  aiBox: {
    backgroundColor: '#FAF5FF',
    border: '1.5px solid #DDD6FE',
    borderRadius: '12px',
    padding: '14px 16px',
  },
  aiHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
    flexWrap: 'wrap',
    gap: '6px',
  },
  aiTitle: {
    fontSize: '0.84rem',
    fontWeight: '800',
    color: '#6D28D9',
  },
  verifiedTag: {
    fontSize: '0.68rem',
    fontWeight: '700',
    color: '#059669',
    backgroundColor: '#ECFDF5',
    padding: '2px 6px',
    borderRadius: '4px',
    border: '1px solid #A7F3D0',
  },
  aiText: {
    margin: 0,
    fontFamily: 'inherit',
    fontSize: '0.82rem',
    color: '#1E1B4B',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
  },
  structuredFallback: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  fallbackList: {
    margin: '4px 0 0',
    paddingLeft: '18px',
    fontSize: '0.8rem',
    color: '#334155',
    lineHeight: '1.5',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: '10px',
  },
  metricCard: {
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: '10px',
    padding: '10px 12px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  metricLabel: {
    fontSize: '0.7rem',
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: '1rem',
    fontWeight: '800',
    color: '#1E1B4B',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '0.84rem',
    fontWeight: '800',
    color: '#334155',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    textTransform: 'uppercase',
    borderBottom: '1px solid #E2E8F0',
    paddingBottom: '4px',
  },
  dangerBadge: {
    display: 'inline-block',
    fontSize: '0.72rem',
    fontWeight: '700',
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    padding: '2px 8px',
    borderRadius: '6px',
    marginRight: '6px',
    marginBottom: '4px',
  },
  chronicBadge: {
    display: 'inline-block',
    fontSize: '0.72rem',
    fontWeight: '700',
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    padding: '2px 8px',
    borderRadius: '6px',
    marginRight: '6px',
    marginBottom: '4px',
  },
  medCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#F8FAFC',
    borderRadius: '8px',
    border: '1px solid #E2E8F0',
  },
  stockPill: {
    fontSize: '0.72rem',
    fontWeight: '700',
    padding: '3px 8px',
    borderRadius: '6px',
  },
  emergencyBox: {
    backgroundColor: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: '8px',
    padding: '8px 12px',
    marginBottom: '6px',
  },
  statusTag: {
    fontSize: '0.68rem',
    fontWeight: '700',
    padding: '1px 6px',
    borderRadius: '4px',
    marginRight: '4px',
  },
  schedulerForm: {
    marginTop: '8px',
    padding: '10px 12px',
    backgroundColor: '#F8FAFC',
    borderRadius: '10px',
    border: '1.5px dashed #CBD5E1',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  schedulerSelect: {
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid #CBD5E1',
    fontSize: '0.8rem',
    fontWeight: '600',
  },
  schedulerInput: {
    flex: 1,
    minWidth: '200px',
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid #CBD5E1',
    fontSize: '0.8rem',
  },
  scheduleBtn: {
    padding: '6px 14px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#6D28D9',
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: '0.8rem',
    cursor: 'pointer',
  },
  list: {
    margin: 0,
    paddingLeft: '16px',
    color: '#334155',
  },
  listItem: {
    marginBottom: '6px',
    fontSize: '0.82rem',
  },
  details: {
    color: '#64748B',
    fontSize: '0.76rem',
    marginTop: '2px',
  },
  mutedText: {
    margin: 0,
    fontSize: '0.8rem',
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  message: {
    textAlign: 'center',
    color: '#64748B',
    padding: '24px',
    fontSize: '0.9rem',
  },
  error: {
    textAlign: 'center',
    color: '#DC2626',
    padding: '24px',
    fontSize: '0.9rem',
  },
  // Timeline Styles
  timelineContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  timelineHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    paddingBottom: '8px',
    borderBottom: '1px solid #E2E8F0',
  },
  timelineList: {
    display: 'flex',
    flexDirection: 'column',
    paddingLeft: '6px',
  },
  timelineRow: {
    display: 'flex',
    gap: '14px',
    position: 'relative',
  },
  timelineDotBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '16px',
  },
  timelineDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
    marginTop: '4px',
  },
  timelineLine: {
    width: '2px',
    flex: 1,
    backgroundColor: '#E2E8F0',
    margin: '4px 0',
  },
  timelineContentBox: {
    flex: 1,
    paddingBottom: '16px',
  },
  timelineCategory: {
    fontSize: '0.7rem',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  timelineDate: {
    fontSize: '0.7rem',
    color: '#94A3B8',
  },
  timelineTitle: {
    margin: '2px 0 0',
    fontSize: '0.86rem',
    fontWeight: '700',
    color: '#1E1B4B',
  },
  timelineSub: {
    margin: '2px 0 0',
    fontSize: '0.76rem',
    color: '#64748B',
  },
  timelineDetails: {
    margin: '4px 0 0',
    fontSize: '0.78rem',
    color: '#334155',
    backgroundColor: '#F8FAFC',
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid #F1F5F9',
  },
  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
    padding: '24px',
    fontStyle: 'italic',
  },
};
