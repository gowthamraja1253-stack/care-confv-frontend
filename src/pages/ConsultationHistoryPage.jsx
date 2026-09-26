import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import appointmentService from '../services/appointment.service';
import { translateDynamicContent } from '../utils/contentTranslator';
import {
  FileText,
  Calendar,
  Clock,
  Video,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  User,
  Stethoscope,
  Pill,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Search,
  Filter,
  Download,
  Languages,
  Sparkles,
  ShieldCheck,
  Printer,
  Activity,
  PhoneCall
} from 'lucide-react';

export const ConsultationHistoryPage = ({ onBack, onStartCall }) => {
  const { t } = useTranslation();
  const { user, token } = useAuth();
  const isDoctor = user?.role === 'doctor';

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedAptId, setExpandedAptId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'completed' | 'cancelled' | 'confirmed'
  const [searchQuery, setSearchQuery] = useState('');
  const [activeItemTabs, setActiveItemTabs] = useState({}); // { [aptId]: 'prescription' | 'chat' | 'summary' }

  const fetchHistory = async () => {
    if (!token) return;
    setLoading(true);
    try {
      let data;
      if (isDoctor) {
        data = await appointmentService.getDoctorQueue(token);
        if (data.success && Array.isArray(data.queue)) {
          setAppointments(data.queue);
          if (data.queue.length > 0 && !expandedAptId) {
            setExpandedAptId(data.queue[0]._id || data.queue[0].id);
          }
        }
      } else {
        data = await appointmentService.getPatientAppointments(token);
        if (data.success && Array.isArray(data.appointments)) {
          setAppointments(data.appointments);
          if (data.appointments.length > 0 && !expandedAptId) {
            setExpandedAptId(data.appointments[0]._id || data.appointments[0].id);
          }
        }
      }
    } catch (err) {
      console.warn('Could not fetch consultation history:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [token]);

  const toggleExpand = (id) => {
    setExpandedAptId((prev) => (prev === id ? null : id));
  };

  const setItemTab = (id, tab) => {
    setActiveItemTabs((prev) => ({ ...prev, [id]: tab }));
  };

  const filteredAppointments = appointments.filter((apt) => {
    const matchesFilter = filterStatus === 'all' || apt.status === filterStatus;
    const docOrPatientName = isDoctor ? (apt.patientName || '') : (apt.doctorName || '');
    const spec = apt.doctorSpecialization || '';
    const complaints = apt.symptomsSummary || '';
    const rx = apt.prescriptionSummary || apt.notes || '';

    const matchesSearch =
      docOrPatientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      spec.toLowerCase().includes(searchQuery.toLowerCase()) ||
      complaints.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rx.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div style={styles.container}>
      {/* 1. Header */}
      <div style={styles.headerRow}>
        {onBack && (
          <button type="button" onClick={onBack} style={styles.backBtn} aria-label={t('app.back')}>
            <ArrowLeft size={18} color="#6D28D9" strokeWidth={2.5} />
          </button>
        )}
        <div style={{ flex: 1 }}>
          <h1 style={styles.pageTitle}>
            {t('consultationHistory.title')}
          </h1>
          <p style={styles.pageSub}>
            {t('consultationHistory.subtitle')}
          </p>
        </div>
      </div>

      {/* 2. Filter Tabs & Search Bar */}
      <div style={styles.filterSection}>
        <div style={styles.filterPills}>
          {[
            { id: 'all', label: t('consultationHistory.filterAll') },
            { id: 'completed', label: t('consultationHistory.filterCompleted') },
            { id: 'confirmed', label: t('consultationHistory.filterConfirmed') },
            { id: 'cancelled', label: t('consultationHistory.filterCancelled') },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setFilterStatus(st.id)}
              style={{
                ...styles.filterPill,
                backgroundColor: filterStatus === st.id ? '#6D28D9' : '#FFFFFF',
                borderColor: filterStatus === st.id ? '#6D28D9' : '#DDD6FE',
                color: filterStatus === st.id ? '#FFFFFF' : '#4C1D95',
              }}
            >
              <span>{st.label}</span>
            </button>
          ))}
        </div>

        <div style={styles.searchBox}>
          <Search size={16} color="#6D28D9" />
          <input
            type="text"
            placeholder={t('consultationHistory.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>
      </div>

      {/* 3. Collapsible Consultation Feed */}
      <div style={styles.feedContainer}>
        {loading ? (
          <div style={styles.loadingBox}>
            <div style={styles.spinner} />
            <span style={styles.loadingText}>{t('app.loading')}</span>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="card-base" style={styles.emptyCard}>
            <FileText size={36} color="#6D28D9" />
            <h4 style={{ margin: '6px 0 2px', color: '#1E1B4B', fontSize: '1rem' }}>
              {t('consultationHistory.noHistoryTitle')}
            </h4>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B' }}>
              {t('consultationHistory.noHistorySub')}
            </p>
          </div>
        ) : (
          filteredAppointments.map((apt) => {
            const aptId = apt._id || apt.id;
            const isExpanded = expandedAptId === aptId;
            const currentTab = activeItemTabs[aptId] || 'prescription';
            const chatCount = apt.chatHistory?.length || 0;
            const hasRx = !!(apt.prescriptionSummary || apt.notes);

            return (
              <div
                key={aptId}
                className="card-base"
                style={{
                  ...styles.accordionCard,
                  borderColor: isExpanded ? '#6D28D9' : '#E2E8F0',
                  boxShadow: isExpanded
                    ? '0 6px 20px rgba(109, 40, 217, 0.12)'
                    : '0 2px 8px rgba(0, 0, 0, 0.04)',
                }}
              >
                {/* Accordion Summary Row */}
                <div
                  style={styles.cardHeaderSummary}
                  onClick={() => toggleExpand(aptId)}
                  role="button"
                  tabIndex={0}
                >
                  <div style={styles.summaryLeft}>
                    <div
                      style={{
                        ...styles.avatarCircle,
                        backgroundColor: isDoctor ? '#F5F3FF' : '#EFF6FF',
                      }}
                    >
                      {isDoctor ? (
                        <User size={22} color="#6D28D9" strokeWidth={2.4} />
                      ) : (
                        <Stethoscope size={22} color="#0284C7" strokeWidth={2.4} />
                      )}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={styles.tokenTag}>{apt.tokenNumber || 'TK-01'}</span>
                        <strong style={styles.personName}>
                          {isDoctor ? apt.patientName : apt.doctorName}
                        </strong>
                      </div>
                      <p style={styles.personSub}>
                        {isDoctor
                          ? `${t('roles.patient')} • ${apt.patientAge || 35} ${t('app.years')} • ${apt.patientVillage || 'Village Hub'}`
                          : `${apt.doctorSpecialization || 'General Physician'} • ${apt.hospital || 'PHC'}`}
                      </p>
                    </div>
                  </div>

                  <div style={styles.summaryRight}>
                    <div style={styles.badgeAndDate}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          backgroundColor:
                            apt.status === 'completed'
                              ? '#DCFCE7'
                              : apt.status === 'cancelled'
                              ? '#FEE2E2'
                              : '#FEF3C7',
                          color:
                            apt.status === 'completed'
                              ? '#166534'
                              : apt.status === 'cancelled'
                              ? '#991B1B'
                              : '#92400E',
                        }}
                      >
                        {apt.status === 'completed' ? `✓ ${t('app.completed')}` : apt.status === 'cancelled' ? `✕ ${t('app.cancelled')}` : `● ${t('app.confirmed')}`}
                      </span>
                      <span style={styles.slotTimeText}>
                        {apt.slot?.day || apt.slot?.date || t('profile.dayToday')} • {apt.slot?.time || '10:30 AM'}
                      </span>
                    </div>

                    <div style={styles.expandChevron}>
                      {isExpanded ? (
                        <ChevronUp size={20} color="#6D28D9" />
                      ) : (
                        <ChevronDown size={20} color="#64748B" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Indicators Bar */}
                <div style={styles.quickIndicatorsBar}>
                  <div style={styles.metaChip}>
                    <Calendar size={13} color="#6D28D9" />
                    <span>{apt.slot?.day || apt.slot?.date || t('profile.dayToday')}</span>
                  </div>
                  <div style={styles.metaChip}>
                    <Clock size={13} color="#6D28D9" />
                    <span>{apt.slot?.time || '10:30 AM'}</span>
                  </div>
                  {hasRx && (
                    <div style={{ ...styles.metaChip, backgroundColor: '#ECFDF5', color: '#065F46' }}>
                      <Pill size={13} color="#059669" />
                      <span>{t('consultationHistory.tabPrescription')}</span>
                    </div>
                  )}
                  {chatCount > 0 && (
                    <div style={{ ...styles.metaChip, backgroundColor: '#EFF6FF', color: '#1E40AF' }}>
                      <MessageSquare size={13} color="#2563EB" />
                      <span>{chatCount} {t('teleconsult.chatTitle')}</span>
                    </div>
                  )}
                </div>

                {/* EXPANDED INLINE CONTENT */}
                {isExpanded && (
                  <div style={styles.inlineExpandedBody}>
                    {/* Meet Summary Header Banner */}
                    <div style={styles.meetSummaryBanner}>
                      <div style={styles.summaryGrid}>
                        <div>
                          <span style={styles.summaryLabel}>{t('consultationHistory.symptomsLabel')}</span>
                          <p style={styles.summaryValue}>
                            {translateDynamicContent(apt.symptomsSummary, i18n.language) || t('doctorDashboard.complaintsLabel')}
                          </p>
                        </div>
                        <div>
                          <span style={styles.summaryLabel}>{t('consultDoctor.chooseMode')}:</span>
                          <p style={styles.summaryValue}>
                            {apt.mode === 'video' ? `📹 ${t('consultDoctor.videoMode')}` : `💬 ${t('consultDoctor.chatMode')}`}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Inline Tab Switcher */}
                    <div style={styles.inlineTabTray}>
                      <button
                        type="button"
                        onClick={() => setItemTab(aptId, 'prescription')}
                        style={{
                          ...styles.inlineTabBtn,
                          borderBottomColor: currentTab === 'prescription' ? '#6D28D9' : 'transparent',
                          color: currentTab === 'prescription' ? '#6D28D9' : '#64748B',
                          fontWeight: currentTab === 'prescription' ? '800' : '600',
                        }}
                      >
                        <Pill size={16} />
                        <span>{t('consultationHistory.prescriptionTitle')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setItemTab(aptId, 'chat')}
                        style={{
                          ...styles.inlineTabBtn,
                          borderBottomColor: currentTab === 'chat' ? '#6D28D9' : 'transparent',
                          color: currentTab === 'chat' ? '#6D28D9' : '#64748B',
                          fontWeight: currentTab === 'chat' ? '800' : '600',
                        }}
                      >
                        <MessageSquare size={16} />
                        <span>{t('consultationHistory.chatLogTitle')} ({chatCount})</span>
                      </button>
                    </div>

                    {/* 1. Inline e-Prescription View */}
                    {currentTab === 'prescription' && (
                      <div style={styles.inlineRxSection}>
                        <div style={styles.rxVerifiedCard}>
                          <div style={styles.rxTopHeader}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <ShieldCheck size={20} color="#059669" />
                              <div>
                                <strong style={{ fontSize: '0.84rem', color: '#065F46' }}>
                                  {t('consultationHistory.prescriptionTitle')}
                                </strong>
                                <p style={{ margin: 0, fontSize: '0.72rem', color: '#047857' }}>
                                  {t('appointment.token')}: {apt.tokenNumber || 'TK-01'}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.print();
                              }}
                              style={styles.printBtn}
                            >
                              <Printer size={15} color="#6D28D9" />
                              <span>{t('consultationHistory.printSummaryBtn')}</span>
                            </button>
                          </div>

                          <div style={styles.rxDoctorBox}>
                            <span style={{ fontWeight: '800', color: '#1E1B4B', fontSize: '0.9rem' }}>
                              {apt.doctorName}
                            </span>
                            <span style={{ fontSize: '0.76rem', color: '#6D28D9', fontWeight: '600' }}>
                              {translateDynamicContent(apt.doctorQualification, i18n.language) || 'MBBS, MD'} • Reg No: MCI-2024-88421
                            </span>
                            <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                              {translateDynamicContent(apt.hospital, i18n.language) || 'Govt. Primary Health Centre'}
                            </span>
                          </div>

                          <hr style={{ border: 'none', borderTop: '1px dashed #DDD6FE', margin: '10px 0' }} />

                          <div style={styles.rxMedicationList}>
                            <strong style={{ fontSize: '0.8rem', color: '#4C1D95', textTransform: 'uppercase' }}>
                              ℞ {t('prescription.allMedicines')}:
                            </strong>
                            <div style={styles.rxContentBox}>
                              <p style={styles.rxTextLines}>
                                {translateDynamicContent(
                                  apt.prescriptionSummary ||
                                    apt.notes ||
                                    'Tab Paracetamol 500mg (1-0-1) for 3 days after meals.\nSteam inhalation twice daily.\nAdequate hydration and light diet.',
                                  i18n.language
                                )}
                              </p>
                            </div>
                          </div>

                          <div style={styles.rxFooter}>
                            <div style={styles.digitalSignatureTag}>
                              <Sparkles size={14} color="#059669" />
                              <span>{t('facilityLocator.verifiedBadge')}</span>
                            </div>
                            {onStartCall && apt.status === 'confirmed' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onStartCall(apt);
                                }}
                                style={styles.joinCallBtn}
                              >
                                <Video size={15} color="#FFFFFF" />
                                <span>{t('appointment.joinBtn')}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 2. Inline Chat History Transcript View */}
                    {currentTab === 'chat' && (
                      <div style={styles.inlineChatSection}>
                        {chatCount > 0 ? (
                          <div style={styles.transcriptList}>
                            {apt.chatHistory.map((msg, index) => {
                              const isDoc = msg.senderRole === 'doctor';
                              return (
                                <div
                                  key={msg.id || index}
                                  style={{
                                    ...styles.transcriptItem,
                                    backgroundColor: isDoc ? '#F5F3FF' : '#F8FAFC',
                                    borderLeft: isDoc ? '3.5px solid #6D28D9' : '3.5px solid #0284C7',
                                  }}
                                >
                                  <div style={styles.transcriptHeader}>
                                    <strong style={{ color: isDoc ? '#6D28D9' : '#0284C7', fontSize: '0.8rem' }}>
                                      {msg.sender} ({msg.senderRole === 'doctor' ? t('roles.doctor') : t('roles.patient')})
                                    </strong>
                                    <span style={styles.transcriptTime}>{msg.timestamp || 'Recorded'}</span>
                                  </div>

                                  <p style={styles.transcriptText}>{msg.text}</p>

                                  {msg.translatedText && (
                                    <div style={styles.transcriptTranslationBox}>
                                      <Languages size={13} color="#059669" />
                                      <span style={styles.transcriptTranslationText}>
                                        {msg.translatedText}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={styles.emptyChatBox}>
                            <MessageSquare size={26} color="#94A3B8" />
                            <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B' }}>
                              {t('consultationHistory.noHistorySub')}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    paddingBottom: '28px',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  backBtn: {
    width: '38px',
    height: '38px',
    borderRadius: '12px',
    backgroundColor: '#EDE9FE',
    border: '1.5px solid #DDD6FE',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  pageTitle: {
    fontSize: '1.2rem',
    fontWeight: '800',
    color: '#1E1B4B',
    margin: 0,
  },
  pageSub: {
    fontSize: '0.78rem',
    color: '#64748B',
    margin: '2px 0 0',
  },
  filterSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  filterPills: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    paddingBottom: '2px',
  },
  filterPill: {
    padding: '6px 14px',
    borderRadius: '20px',
    border: '1.5px solid',
    fontSize: '0.78rem',
    fontWeight: '700',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '12px',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #E2E8F0',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '0.82rem',
    color: '#1E293B',
  },
  feedContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  accordionCard: {
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #E2E8F0',
    borderRadius: '16px',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
  },
  cardHeaderSummary: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  summaryLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatarCircle: {
    width: '42px',
    height: '42px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenTag: {
    padding: '2px 7px',
    borderRadius: '6px',
    backgroundColor: '#EDE9FE',
    color: '#6D28D9',
    fontSize: '0.68rem',
    fontWeight: '800',
  },
  personName: {
    fontSize: '0.92rem',
    color: '#1E1B4B',
  },
  personSub: {
    fontSize: '0.74rem',
    color: '#64748B',
    margin: '2px 0 0',
  },
  summaryRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  badgeAndDate: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '3px',
  },
  statusBadge: {
    fontSize: '0.72rem',
    fontWeight: '800',
    padding: '3px 8px',
    borderRadius: '6px',
  },
  slotTimeText: {
    fontSize: '0.72rem',
    color: '#64748B',
    fontWeight: '600',
  },
  expandChevron: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickIndicatorsBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: '#F8FAFC',
    borderTop: '1px solid #F1F5F9',
    flexWrap: 'wrap',
  },
  metaChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.72rem',
    color: '#475569',
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    padding: '3px 8px',
    borderRadius: '6px',
    fontWeight: '600',
  },
  inlineExpandedBody: {
    padding: '16px',
    borderTop: '1.5px solid #F1F5F9',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    backgroundColor: '#FFFFFF',
  },
  meetSummaryBanner: {
    backgroundColor: '#F5F3FF',
    border: '1.5px solid #DDD6FE',
    borderRadius: '12px',
    padding: '12px',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  summaryLabel: {
    fontSize: '0.7rem',
    color: '#6D28D9',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: '0.78rem',
    color: '#1E1B4B',
    fontWeight: '600',
    margin: '2px 0 0',
  },
  inlineTabTray: {
    display: 'flex',
    gap: '12px',
    borderBottom: '1.5px solid #E2E8F0',
    paddingBottom: '2px',
  },
  inlineTabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    padding: '6px 4px',
    cursor: 'pointer',
    fontSize: '0.78rem',
    transition: 'all 0.15s ease',
  },
  inlineRxSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  rxVerifiedCard: {
    backgroundColor: '#FAFAFE',
    border: '1.5px solid #E9D5FF',
    borderRadius: '12px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  rxTopHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  printBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '6px',
    border: '1px solid #DDD6FE',
    backgroundColor: '#FFFFFF',
    color: '#6D28D9',
    fontSize: '0.72rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
  rxDoctorBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  rxMedicationList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  rxContentBox: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    padding: '10px 12px',
  },
  rxTextLines: {
    margin: 0,
    fontSize: '0.78rem',
    color: '#1E293B',
    lineHeight: '1.5',
    whiteSpace: 'pre-line',
  },
  rxFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '6px',
  },
  digitalSignatureTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.72rem',
    color: '#059669',
    fontWeight: '700',
  },
  joinCallBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: '#6D28D9',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.76rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
  inlineChatSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  transcriptList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '320px',
    overflowY: 'auto',
    padding: '4px 2px',
  },
  transcriptItem: {
    padding: '10px 12px',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  transcriptHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transcriptTime: {
    fontSize: '0.68rem',
    color: '#94A3B8',
  },
  transcriptText: {
    margin: 0,
    fontSize: '0.78rem',
    color: '#1E293B',
    lineHeight: '1.4',
  },
  transcriptTranslationBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '6px',
    backgroundColor: '#ECFDF5',
    padding: '6px 8px',
    borderRadius: '6px',
    border: '1px solid #A7F3D0',
    marginTop: '4px',
  },
  transcriptTranslationText: {
    fontSize: '0.74rem',
    color: '#065F46',
    fontWeight: '600',
    lineHeight: '1.3',
  },
  emptyChatBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '24px 16px',
    backgroundColor: '#F8FAFC',
    borderRadius: '10px',
    gap: '8px',
  },
  loadingBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px',
    gap: '12px',
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
    fontSize: '0.8rem',
    color: '#6D28D9',
    fontWeight: '700',
  },
  emptyCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '36px 16px',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #E2E8F0',
    borderRadius: '16px',
  },
};

export default ConsultationHistoryPage;
