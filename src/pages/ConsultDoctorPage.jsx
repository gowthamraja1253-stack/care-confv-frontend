import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import appointmentService from '../services/appointment.service';
import {
  Stethoscope,
  ArrowLeft,
  Calendar,
  Clock,
  Video,
  MessageSquare,
  CheckCircle2,
  ShieldCheck,
  Star,
  User,
  Search,
  Sparkles,
  MapPin,
  Globe,
  AlertCircle,
  FileText,
  ChevronRight,
  PhoneCall,
  Check
} from 'lucide-react';

export const ConsultDoctorPage = ({ onBack, onStartCall }) => {
  const { t } = useTranslation();
  const { token, user } = useAuth();

  const SPECIALIZATIONS = [
    { id: 'all', label: t('consultDoctor.filterAll'), icon: Stethoscope },
    { id: 'General Physician', label: 'General Physician', icon: Stethoscope },
    { id: 'Pediatrics', label: 'Pediatrics', icon: User },
    { id: 'Cardiology', label: 'Cardiology', icon: Sparkles },
    { id: 'Gynecology', label: 'Gynecology', icon: User },
    { id: 'Orthopedics', label: 'Orthopedics', icon: Stethoscope },
    { id: 'Dermatology', label: 'Dermatology', icon: Sparkles },
  ];

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpecialization, setSelectedSpecialization] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Booking form state
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [consultMode, setConsultMode] = useState('video'); // 'video' | 'chat'
  const [symptomsNotes, setSymptomsNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null); // booked appointment object
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch doctors
  const fetchDoctors = async (spec = '') => {
    setLoading(true);
    setErrorMessage('');
    try {
      const data = await appointmentService.getDoctors(token, spec === 'all' ? '' : spec);
      if (data.success && Array.isArray(data.doctors)) {
        setDoctors(data.doctors);
        if (data.doctors.length > 0 && !selectedDoctor) {
          setSelectedDoctor(data.doctors[0]);
          if (data.doctors[0].availabilitySlots?.length > 0) {
            setSelectedSlot(data.doctors[0].availabilitySlots[0]);
          }
        }
      }
    } catch (err) {
      console.warn('Could not fetch doctors:', err.message);
      setErrorMessage(err.message || 'Failed to load doctors list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors(selectedSpecialization);
  }, [selectedSpecialization]);

  const handleSelectDoctor = (doc) => {
    setSelectedDoctor(doc);
    if (doc.availabilitySlots && doc.availabilitySlots.length > 0) {
      setSelectedSlot(doc.availabilitySlots[0]);
    } else {
      setSelectedSlot(null);
    }
  };

  const handleConfirmBooking = async () => {
    if (!selectedDoctor || !selectedSlot) {
      setErrorMessage('Please select a doctor and an available appointment slot.');
      return;
    }

    setBookingLoading(true);
    setErrorMessage('');

    try {
      const bookingPayload = {
        doctorId: selectedDoctor._id,
        doctorName: selectedDoctor.name,
        doctorSpecialization: selectedDoctor.specialization,
        doctorQualification: selectedDoctor.qualification,
        hospital: selectedDoctor.hospital,
        slot: {
          id: selectedSlot.id,
          day: selectedSlot.day,
          time: selectedSlot.time,
          slotLabel: `${selectedSlot.day}, ${selectedSlot.time}`,
        },
        mode: consultMode,
        symptomsSummary: symptomsNotes,
      };

      const res = await appointmentService.bookAppointment(token, bookingPayload);
      if (res.success && res.appointment) {
        setBookingSuccess(res.appointment);
      } else {
        throw new Error(res.message || 'Booking failed');
      }
    } catch (err) {
      console.error('Booking error:', err);
      setErrorMessage(err.message || 'Failed to confirm booking');
    } finally {
      setBookingLoading(false);
    }
  };

  const filteredDoctors = doctors.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.hospital && doc.hospital.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  return (
    <div style={styles.container}>
      {/* Top Header Bar */}
      <div style={styles.headerRow}>
        <button type="button" onClick={onBack} style={styles.backBtn} aria-label={t('app.back')}>
          <ArrowLeft size={18} color="#6D28D9" strokeWidth={2.5} />
        </button>
        <div>
          <h1 style={styles.pageTitle}>{t('consultDoctor.title')}</h1>
          <p style={styles.pageSub}>{t('consultDoctor.sub')}</p>
        </div>
      </div>

      {/* Error Notice */}
      {errorMessage && (
        <div style={styles.errorBanner}>
          <AlertCircle size={18} color="#DC2626" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* BOOKING SUCCESS MODAL / VIEW */}
      {bookingSuccess ? (
        <div className="card-base" style={styles.successCard}>
          <div style={styles.successIconCircle}>
            <CheckCircle2 size={38} color="#FFFFFF" strokeWidth={2.8} />
          </div>

          <h2 style={styles.successHeading}>{t('consultDoctor.bookingSuccess')}</h2>
          <p style={styles.successSub}>
            {bookingSuccess.doctorName}
          </p>

          <div style={styles.tokenHighlightBox}>
            <span style={styles.tokenPrompt}>{t('consultDoctor.tokenAssigned')}</span>
            <span style={styles.tokenNumber}>{bookingSuccess.tokenNumber}</span>
            <span style={styles.tokenSlot}>{bookingSuccess.slot?.slotLabel}</span>
          </div>

          <div style={styles.bookingMetaTable}>
            <div style={styles.metaRow}>
              <span style={styles.metaKey}>{t('consultDoctor.doctorLabel')}</span>
              <strong style={styles.metaVal}>{bookingSuccess.doctorName} ({bookingSuccess.doctorSpecialization})</strong>
            </div>
            <div style={styles.metaRow}>
              <span style={styles.metaKey}>{t('consultDoctor.modeLabel')}</span>
              <span style={styles.metaVal}>
                {bookingSuccess.mode === 'video' ? `📹 ${t('consultDoctor.videoMode')}` : `💬 ${t('consultDoctor.chatMode')}`}
              </span>
            </div>
            <div style={styles.metaRow}>
              <span style={styles.metaKey}>{t('consultDoctor.facilityLabel')}</span>
              <span style={styles.metaVal}>{bookingSuccess.hospital}</span>
            </div>
          </div>

          <div style={styles.successActionsCol}>
            <button
              type="button"
              onClick={() => onStartCall && onStartCall(bookingSuccess)}
              style={styles.joinCallBtn}
            >
              <Video size={18} color="#FFFFFF" strokeWidth={2.4} />
              <span>{t('consultDoctor.joinCallNow')}</span>
            </button>

            <button
              type="button"
              onClick={onBack}
              style={styles.returnHomeBtn}
            >
              <span>{t('consultDoctor.backHome')}</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Specialization Filter Pills */}
          <div style={styles.specializationPillsTray}>
            {SPECIALIZATIONS.map((spec) => {
              const isSelected = selectedSpecialization === spec.id;
              return (
                <button
                  key={spec.id}
                  type="button"
                  onClick={() => setSelectedSpecialization(spec.id)}
                  style={{
                    ...styles.specPill,
                    backgroundColor: isSelected ? '#6D28D9' : '#FFFFFF',
                    borderColor: isSelected ? '#6D28D9' : '#DDD6FE',
                    color: isSelected ? '#FFFFFF' : '#4C1D95',
                  }}
                >
                  <span>{spec.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div style={styles.searchBox}>
            <Search size={16} color="#6D28D9" style={{ marginLeft: '10px' }} />
            <input
              type="text"
              placeholder={t('consultDoctor.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          {/* Doctor List */}
          <div style={styles.doctorsList}>
            {loading ? (
              <div style={styles.loadingBox}>
                <div style={styles.spinner} />
                <p style={styles.loadingText}>{t('consultDoctor.findingDoctors')}</p>
              </div>
            ) : filteredDoctors.length === 0 ? (
              <div className="card-base" style={styles.emptyCard}>
                <Stethoscope size={32} color="#6D28D9" />
                <h3 style={styles.emptyTitle}>{t('consultDoctor.noDoctorsFound')}</h3>
                <p style={styles.emptySub}>{t('consultDoctor.noDoctorsSub')}</p>
              </div>
            ) : (
              filteredDoctors.map((doc) => {
                const isSelected = selectedDoctor?._id === doc._id;
                return (
                  <div
                    key={doc._id}
                    className="card-base"
                    style={{
                      ...styles.doctorCard,
                      borderColor: isSelected ? '#6D28D9' : '#E2E8F0',
                      boxShadow: isSelected
                        ? '0 4px 16px rgba(109, 40, 217, 0.12)'
                        : '0 2px 6px rgba(0,0,0,0.03)',
                    }}
                    onClick={() => handleSelectDoctor(doc)}
                  >
                    {/* Doctor Header Info */}
                    <div style={styles.docHeader}>
                      <div
                        style={{
                          ...styles.docAvatar,
                          backgroundColor: isSelected ? '#EDE9FE' : '#F1F5F9',
                        }}
                      >
                        <User size={24} color={isSelected ? '#6D28D9' : '#475569'} />
                      </div>

                      <div style={styles.docInfo}>
                        <div style={styles.nameRow}>
                          <h3 style={styles.docName}>{doc.name}</h3>
                          <div style={styles.verifiedTag}>
                            <ShieldCheck size={13} color="#059669" />
                            <span>{t('facilityLocator.verifiedBadge')}</span>
                          </div>
                        </div>

                        <p style={styles.docSpecialization}>{doc.specialization}</p>
                        <p style={styles.docHospital}>{doc.hospital} • {doc.qualification}</p>

                        <div style={styles.docStatsRow}>
                          <div style={styles.ratingBadge}>
                            <Star size={13} color="#F59E0B" fill="#F59E0B" />
                            <span>{doc.rating}</span>
                          </div>
                          <span style={styles.statDot}>•</span>
                          <span style={styles.statText}>{doc.experienceYears} {t('consultDoctor.experience')}</span>
                          <span style={styles.statDot}>•</span>
                          <span style={styles.statText}>{doc.languages?.join(', ')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Slot Picker (when this doctor is selected) */}
                    {isSelected && (
                      <div style={styles.slotsSection}>
                        <div style={styles.slotsSectionHead}>
                          <Clock size={15} color="#6D28D9" />
                          <span style={styles.slotsTitle}>{t('consultDoctor.selectSlot')}</span>
                        </div>

                        {doc.availabilitySlots?.length > 0 ? (
                          <div style={styles.slotsGrid}>
                            {doc.availabilitySlots.map((slot) => {
                              const isSlotActive = selectedSlot?.id === slot.id;
                              return (
                                <button
                                  key={slot.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSlot(slot);
                                  }}
                                  style={{
                                    ...styles.slotPill,
                                    backgroundColor: isSlotActive ? '#6D28D9' : '#F8FAFC',
                                    borderColor: isSlotActive ? '#6D28D9' : '#CBD5E1',
                                    color: isSlotActive ? '#FFFFFF' : '#1E293B',
                                  }}
                                >
                                  <span style={styles.slotDay}>{slot.day}</span>
                                  <span style={styles.slotTime}>{slot.time}</span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p style={styles.noSlotsText}>{t('consultDoctor.noSlots')}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Consultation Configuration Box (Mode & Symptoms Notes) */}
          {selectedDoctor && (
            <div className="card-base" style={styles.configCard}>
              <h3 style={styles.configHeading}>{t('consultDoctor.chooseMode')}</h3>

              <div style={styles.modePickerGrid}>
                <div
                  style={{
                    ...styles.modeCard,
                    borderColor: consultMode === 'video' ? '#6D28D9' : '#E2E8F0',
                    backgroundColor: consultMode === 'video' ? '#F5F3FF' : '#FFFFFF',
                  }}
                  onClick={() => setConsultMode('video')}
                  role="button"
                  tabIndex={0}
                >
                  <div style={styles.modeIconBox}>
                    <Video size={20} color={consultMode === 'video' ? '#6D28D9' : '#64748B'} />
                  </div>
                  <div style={styles.modeDetails}>
                    <span style={styles.modeTitle}>{t('consultDoctor.videoMode')}</span>
                    <span style={styles.modeSub}>{t('consultDoctor.videoModeDesc')}</span>
                  </div>
                  {consultMode === 'video' && <CheckCircle2 size={18} color="#6D28D9" />}
                </div>

                <div
                  style={{
                    ...styles.modeCard,
                    borderColor: consultMode === 'chat' ? '#6D28D9' : '#E2E8F0',
                    backgroundColor: consultMode === 'chat' ? '#F5F3FF' : '#FFFFFF',
                  }}
                  onClick={() => setConsultMode('chat')}
                  role="button"
                  tabIndex={0}
                >
                  <div style={styles.modeIconBox}>
                    <MessageSquare size={20} color={consultMode === 'chat' ? '#6D28D9' : '#64748B'} />
                  </div>
                  <div style={styles.modeDetails}>
                    <span style={styles.modeTitle}>{t('consultDoctor.chatMode')}</span>
                    <span style={styles.modeSub}>{t('consultDoctor.chatModeDesc')}</span>
                  </div>
                  {consultMode === 'chat' && <CheckCircle2 size={18} color="#6D28D9" />}
                </div>
              </div>

              {/* Symptoms / Reason Notes */}
              <div style={styles.formGroup}>
                <label style={styles.fieldLabel}>
                  <FileText size={15} color="#6D28D9" />
                  <span>{t('consultDoctor.symptomsNotes')}</span>
                </label>
                <textarea
                  rows={3}
                  placeholder={t('consultDoctor.symptomsPlaceholder')}
                  value={symptomsNotes}
                  onChange={(e) => setSymptomsNotes(e.target.value)}
                  style={styles.textarea}
                  maxLength={500}
                />
              </div>

              {/* Confirm Booking CTA */}
              <button
                type="button"
                onClick={handleConfirmBooking}
                disabled={bookingLoading || !selectedSlot}
                style={{
                  ...styles.confirmBtn,
                  opacity: selectedSlot && !bookingLoading ? 1 : 0.6,
                }}
              >
                <Sparkles size={18} color="#FFFFFF" strokeWidth={2.4} />
                <span>
                  {bookingLoading ? t('consultDoctor.bookingBtn') : t('consultDoctor.confirmBooking')}
                </span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    paddingBottom: '24px',
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
    flexShrink: 0,
  },
  pageTitle: {
    fontSize: '1.2rem',
    fontWeight: '800',
    color: '#1E1B4B',
    margin: 0,
  },
  pageSub: {
    fontSize: '0.76rem',
    color: '#64748B',
    margin: '2px 0 0',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    backgroundColor: '#FEF2F2',
    border: '1.5px solid #FECACA',
    borderRadius: '10px',
    color: '#DC2626',
    fontSize: '0.8rem',
    fontWeight: '600',
  },
  specializationPillsTray: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    paddingBottom: '2px',
  },
  specPill: {
    padding: '6px 14px',
    borderRadius: '9999px',
    border: '1.5px solid',
    fontSize: '0.76rem',
    fontWeight: '700',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #E2E8F0',
    borderRadius: '12px',
    padding: '0 4px',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    padding: '10px 12px',
    fontSize: '0.82rem',
    color: '#1E1B4B',
  },
  doctorsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
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
    borderRadius: '14px',
  },
  emptyTitle: {
    fontSize: '0.94rem',
    fontWeight: '800',
    color: '#1E1B4B',
    margin: '8px 0 4px',
  },
  emptySub: {
    fontSize: '0.78rem',
    color: '#64748B',
    margin: 0,
  },
  doctorCard: {
    padding: '14px',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid',
    borderRadius: '14px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    transition: 'all 0.2s ease',
  },
  docHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  docAvatar: {
    width: '46px',
    height: '46px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  docInfo: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '6px',
  },
  docName: {
    fontSize: '0.92rem',
    fontWeight: '800',
    color: '#1E1B4B',
    margin: 0,
  },
  verifiedTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '0.64rem',
    fontWeight: '800',
    color: '#059669',
    backgroundColor: '#ECFDF5',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  docSpecialization: {
    fontSize: '0.78rem',
    color: '#6D28D9',
    fontWeight: '700',
    margin: '2px 0',
  },
  docHospital: {
    fontSize: '0.72rem',
    color: '#64748B',
    margin: 0,
  },
  docStatsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '6px',
    flexWrap: 'wrap',
  },
  ratingBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '0.7rem',
    fontWeight: '800',
    color: '#B45309',
  },
  statDot: {
    color: '#CBD5E1',
    fontSize: '0.7rem',
  },
  statText: {
    fontSize: '0.7rem',
    color: '#475569',
    fontWeight: '600',
  },
  slotsSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: '10px',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  slotsSectionHead: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  slotsTitle: {
    fontSize: '0.74rem',
    fontWeight: '800',
    color: '#1E1B4B',
  },
  slotsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
    gap: '6px',
  },
  slotPill: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '6px 8px',
    borderRadius: '8px',
    border: '1.5px solid',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  slotDay: {
    fontSize: '0.66rem',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  slotTime: {
    fontSize: '0.72rem',
    fontWeight: '800',
    marginTop: '1px',
  },
  noSlotsText: {
    fontSize: '0.72rem',
    color: '#94A3B8',
    margin: 0,
  },
  configCard: {
    padding: '16px',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #DDD6FE',
    borderRadius: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  configHeading: {
    fontSize: '0.88rem',
    fontWeight: '800',
    color: '#1E1B4B',
    margin: 0,
  },
  modePickerGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  modeCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px',
    borderRadius: '10px',
    border: '1.5px solid',
    cursor: 'pointer',
  },
  modeIconBox: {
    flexShrink: 0,
  },
  modeDetails: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  modeTitle: {
    fontSize: '0.76rem',
    fontWeight: '800',
    color: '#1E1B4B',
  },
  modeSub: {
    fontSize: '0.64rem',
    color: '#64748B',
    lineHeight: '1.2',
    marginTop: '1px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  fieldLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.74rem',
    fontWeight: '700',
    color: '#334155',
  },
  textarea: {
    padding: '10px',
    border: '1.5px solid #E2E8F0',
    borderRadius: '10px',
    fontSize: '0.78rem',
    color: '#1E1B4B',
    resize: 'none',
    outline: 'none',
    fontFamily: 'inherit',
  },
  confirmBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#6D28D9',
    border: 'none',
    borderRadius: '12px',
    color: '#FFFFFF',
    fontSize: '0.84rem',
    fontWeight: '800',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(109, 40, 217, 0.25)',
  },
  successCard: {
    padding: '24px 16px',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #A7F3D0',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '12px',
  },
  successIconCircle: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: '#059669',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successHeading: {
    fontSize: '1.1rem',
    fontWeight: '900',
    color: '#065F46',
    margin: 0,
  },
  successSub: {
    fontSize: '0.78rem',
    color: '#475569',
    margin: 0,
  },
  tokenHighlightBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px 24px',
    backgroundColor: '#F5F3FF',
    border: '1.5px solid #DDD6FE',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '240px',
  },
  tokenPrompt: {
    fontSize: '0.68rem',
    fontWeight: '700',
    color: '#6D28D9',
    textTransform: 'uppercase',
  },
  tokenNumber: {
    fontSize: '1.6rem',
    fontWeight: '900',
    color: '#1E1B4B',
    lineHeight: '1.1',
    margin: '2px 0',
  },
  tokenSlot: {
    fontSize: '0.72rem',
    color: '#64748B',
    fontWeight: '600',
  },
  bookingMetaTable: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: '10px',
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    textAlign: 'left',
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.74rem',
  },
  metaKey: {
    color: '#64748B',
  },
  metaVal: {
    color: '#1E1B4B',
    fontWeight: '700',
  },
  successActionsCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    width: '100%',
    marginTop: '6px',
  },
  joinCallBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '12px',
    backgroundColor: '#6D28D9',
    border: 'none',
    borderRadius: '10px',
    color: '#FFFFFF',
    fontSize: '0.82rem',
    fontWeight: '800',
    cursor: 'pointer',
  },
  returnHomeBtn: {
    padding: '10px',
    backgroundColor: '#F1F5F9',
    border: 'none',
    borderRadius: '10px',
    color: '#475569',
    fontSize: '0.78rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
};

export default ConsultDoctorPage;
