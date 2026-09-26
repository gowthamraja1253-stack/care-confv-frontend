import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Video, UserCheck, ChevronRight, CalendarPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import appointmentService from '../services/appointment.service';
import { translateDynamicContent } from '../utils/contentTranslator';

export const UpcomingAppointmentCard = ({ onNavigate }) => {
  const { t, i18n } = useTranslation();
  const { token } = useAuth();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchAppointment = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await appointmentService.getUpcomingAppointments(token);
        if (isMounted) {
          if (data.success && Array.isArray(data.appointments) && data.appointments.length > 0) {
            setAppointment(data.appointments[0]);
          } else {
            setAppointment(null);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.warn('[UpcomingAppointmentCard] API fetch warning:', err.message);
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAppointment();

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <section>
      <div className="section-title">
        <span>{t('appointment.title')}</span>
        <span
          className="link"
          style={{ cursor: 'pointer' }}
          onClick={() => onNavigate && onNavigate('consult-history')}
        >
          {t('appointment.history')}
        </span>
      </div>

      {/* 1. LOADING SKELETON */}
      {loading && (
        <div className="card-base" style={styles.card}>
          <div style={styles.skeletonTopRow}>
            <div className="skeleton-shimmer" style={styles.skelBadge} />
            <div className="skeleton-shimmer" style={styles.skelPill} />
          </div>
          <div style={styles.skeletonDoctorRow}>
            <div className="skeleton-shimmer" style={styles.skelAvatar} />
            <div style={styles.skelLines}>
              <div className="skeleton-shimmer" style={styles.skelTitle} />
              <div className="skeleton-shimmer" style={styles.skelSub} />
            </div>
          </div>
          <div className="skeleton-shimmer" style={styles.skelSchedule} />
          <div className="skeleton-shimmer" style={styles.skelBtn} />
        </div>
      )}

      {/* 2. EMPTY STATE */}
      {!loading && !appointment && (
        <div className="card-base" style={styles.emptyCard}>
          <div style={styles.emptyIconBox}>
            <CalendarPlus size={26} color="#6D28D9" strokeWidth={2.2} />
          </div>
          <div style={styles.emptyContent}>
            <h4 style={styles.emptyTitle}>{t('appointment.emptyTitle')}</h4>
            <p style={styles.emptySub}>{t('appointment.emptySub')}</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('consult')}
            style={styles.bookNowBtn}
          >
            <Video size={16} color="#FFFFFF" strokeWidth={2.4} />
            <span>{t('appointment.bookBtn')}</span>
          </button>
        </div>
      )}

      {/* 3. POPULATED DATA STATE */}
      {!loading && appointment && (
        <div className="card-base subtle-purple-glow" style={styles.card}>
          {/* Card Header Tag */}
          <div style={styles.topBadgeRow}>
            <div style={styles.typeBadge}>
              <Video size={14} color="#6D28D9" strokeWidth={2.5} />
              <span>{appointment.consultType || (appointment.mode === 'chat' ? 'In-App Live Chat' : t('appointment.videoConsult'))}</span>
            </div>
            <div style={styles.statusBadge}>
              <span style={styles.statusDot} />
              <span>{appointment.status || t('appointment.confirmed')}</span>
            </div>
          </div>

          {/* Doctor Info Row */}
          <div style={styles.doctorSection}>
            <div style={styles.avatarBox}>
              <UserCheck size={26} color="#6D28D9" strokeWidth={2.4} />
            </div>
            <div style={styles.doctorDetails}>
              <div style={styles.nameRow}>
                <h3 style={styles.doctorName}>{appointment.doctorName}</h3>
                {appointment.tokenNumber && (
                  <span style={styles.tokenBadge}>{t('appointment.token')} #{appointment.tokenNumber}</span>
                )}
              </div>
              <p style={styles.qualification}>{translateDynamicContent(appointment.doctorSpecialization || appointment.qualification, i18n.language)}</p>
              <p style={styles.hospital}>{translateDynamicContent(appointment.hospital, i18n.language)}</p>
            </div>
          </div>

          {/* Schedule Box */}
          <div style={styles.scheduleBox}>
            <div style={styles.scheduleItem}>
              <Calendar size={15} color="#6D28D9" strokeWidth={2.4} />
              <span>{translateDynamicContent(appointment.slot?.day || appointment.date || 'Today', i18n.language)}</span>
            </div>
            <div style={styles.divider} />
            <div style={styles.scheduleItem}>
              <Clock size={15} color="#6D28D9" strokeWidth={2.4} />
              <span>{appointment.slot?.time || appointment.time || '10:30 AM'}</span>
            </div>
          </div>

          {/* Action Button */}
          <div style={styles.actionRow}>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('teleconsult-room', appointment)}
              style={styles.joinBtn}
            >
              <Video size={18} color="#FFFFFF" strokeWidth={2.4} />
              <span>{t('appointment.joinBtn')}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('teleconsult-room', appointment)}
              style={styles.detailsBtn}
              title="Appointment Details"
            >
              <ChevronRight size={20} color="#6D28D9" />
            </button>
          </div>
        </div>
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
    border: '1.5px solid #DDD6FE',
    backgroundColor: '#FFFFFF',
  },
  topBadgeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.76rem',
    fontWeight: '700',
    color: '#6D28D9',
    backgroundColor: '#F5F3FF',
    padding: '4px 10px',
    borderRadius: '8px',
    border: '1px solid #DDD6FE',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.76rem',
    fontWeight: '800',
    color: '#059669',
    backgroundColor: '#ECFDF5',
    padding: '4px 10px',
    borderRadius: '8px',
    border: '1px solid #A7F3D0',
  },
  statusDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: '#059669',
  },
  doctorSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatarBox: {
    width: '50px',
    height: '50px',
    borderRadius: '14px',
    backgroundColor: '#EDE9FE',
    border: '1.5px solid #DDD6FE',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  doctorDetails: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  doctorName: {
    fontSize: '1rem',
    fontWeight: '800',
    color: '#1E1B4B',
    lineHeight: '1.2',
  },
  tokenBadge: {
    fontSize: '0.72rem',
    fontWeight: '800',
    color: '#6D28D9',
    backgroundColor: '#F5F3FF',
    padding: '2px 8px',
    borderRadius: '6px',
    border: '1px solid #DDD6FE',
  },
  qualification: {
    fontSize: '0.78rem',
    color: '#6D28D9',
    fontWeight: '700',
    marginTop: '2px',
  },
  hospital: {
    fontSize: '0.75rem',
    color: '#475569',
    marginTop: '1px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontWeight: '500',
  },
  scheduleBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F5F3FF',
    padding: '10px 12px',
    borderRadius: '12px',
    border: '1.5px solid #DDD6FE',
  },
  scheduleItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    fontSize: '0.82rem',
    color: '#1E1B4B',
    fontWeight: '700',
  },
  divider: {
    width: '1.5px',
    height: '18px',
    backgroundColor: '#DDD6FE',
  },
  actionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '2px',
  },
  joinBtn: {
    flex: 1,
    height: '42px',
    backgroundColor: '#6D28D9',
    border: 'none',
    borderRadius: '12px',
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(109, 40, 217, 0.25)',
  },
  detailsBtn: {
    width: '42px',
    height: '42px',
    backgroundColor: '#F5F3FF',
    border: '1.5px solid #DDD6FE',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
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
    border: '1.5px dashed #DDD6FE',
    gap: '12px',
  },
  emptyIconBox: {
    width: '48px',
    height: '48px',
    borderRadius: '14px',
    backgroundColor: '#F5F3FF',
    border: '1.5px solid #DDD6FE',
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
  bookNowBtn: {
    height: '40px',
    padding: '0 18px',
    backgroundColor: '#6D28D9',
    border: 'none',
    borderRadius: '10px',
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: '0.84rem',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    boxShadow: '0 3px 10px rgba(109, 40, 217, 0.2)',
  },

  // SKELETON STYLES
  skeletonTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  skelBadge: {
    width: '120px',
    height: '22px',
    borderRadius: '6px',
  },
  skelPill: {
    width: '70px',
    height: '22px',
    borderRadius: '6px',
  },
  skeletonDoctorRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  skelAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
  },
  skelLines: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  skelTitle: {
    width: '60%',
    height: '16px',
  },
  skelSub: {
    width: '40%',
    height: '12px',
  },
  skelSchedule: {
    width: '100%',
    height: '38px',
    borderRadius: '10px',
  },
  skelBtn: {
    width: '100%',
    height: '40px',
    borderRadius: '12px',
  }
};

export default UpcomingAppointmentCard;
