import React from 'react';
import { Video, Stethoscope, FileText, Pill, Mic, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const QuickActionsGrid = ({ onActionClick }) => {
  const { t } = useTranslation();

  const actions = [
    {
      id: 'consult',
      title: t('quickActions.consult'),
      subtitle: t('quickActions.consultSub'),
      icon: Video,
      iconColor: '#6D28D9',
      bgColor: '#F5F3FF',
      borderColor: '#DDD6FE',
      badge: t('quickActions.consultBadge')
    },
    {
      id: 'symptom-checker',
      title: t('quickActions.symptom'),
      subtitle: t('quickActions.symptomSub'),
      icon: Stethoscope,
      iconColor: '#0284C7',
      bgColor: '#F0F9FF',
      borderColor: '#BAE6FD',
      badge: t('quickActions.symptomBadge'),
      hasVoice: true
    },
    {
      id: 'records',
      title: t('quickActions.records'),
      subtitle: t('quickActions.recordsSub'),
      icon: FileText,
      iconColor: '#7C3AED',
      bgColor: '#FAF5FF',
      borderColor: '#E9D5FF',
      badge: t('quickActions.recordsBadge')
    },
    {
      id: 'medicines',
      title: t('quickActions.medicines'),
      subtitle: t('quickActions.medicinesSub'),
      icon: Pill,
      iconColor: '#D97706',
      bgColor: '#FFFBEB',
      borderColor: '#FDE68A',
      badge: t('quickActions.medicinesBadge')
    }
  ];

  return (
    <section>
      <div className="section-title">
        <span>{t('quickActions.title')}</span>
        <span className="link">{t('quickActions.viewAll')}</span>
      </div>

      {/* Voice Assistant Quick Action Strip */}
      <div
        className="card-base"
        style={styles.voiceBanner}
        role="button"
        tabIndex={0}
        onClick={() => onActionClick && onActionClick('symptom-checker-voice')}
      >
        <div style={styles.voiceLeft}>
          <div style={styles.voiceMicCircle}>
            <Mic size={20} color="#FFFFFF" strokeWidth={2.5} />
          </div>
          <div style={styles.voiceTextWrap}>
            <div style={styles.voiceTitleRow}>
              <span style={styles.voiceTitle}>{t('voice.quickVoiceCheck')}</span>
              <span style={styles.voiceBadge}>{t('voice.voiceCheckBadge')}</span>
            </div>
            <p style={styles.voiceSub}>{t('voice.speakSymptoms')}</p>
          </div>
        </div>
        <div style={styles.voiceRightIcon}>
          <Sparkles size={18} color="#6D28D9" />
        </div>
      </div>
      
      <div style={styles.grid}>
        {actions.map((action) => {
          const IconComponent = action.icon;
          return (
            <div
              key={action.id}
              className="card-base"
              style={{
                ...styles.actionCard,
                borderColor: action.borderColor
              }}
              role="button"
              tabIndex={0}
              onClick={() => onActionClick && onActionClick(action.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onActionClick && onActionClick(action.id);
                }
              }}
            >
              <div style={styles.cardHeader}>
                <div
                  style={{
                    ...styles.iconWrapper,
                    backgroundColor: action.bgColor,
                    borderColor: action.borderColor
                  }}
                >
                  <IconComponent size={24} color={action.iconColor} strokeWidth={2.4} />
                </div>
                <div style={styles.headerBadgesRow}>
                  {action.hasVoice && (
                    <button
                      type="button"
                      style={styles.cardMicBtn}
                      title={t('voice.speakSymptoms')}
                      aria-label={t('voice.speakSymptoms')}
                      onClick={(e) => {
                        e.stopPropagation();
                        onActionClick && onActionClick('symptom-checker-voice');
                      }}
                    >
                      <Mic size={15} color="#0284C7" strokeWidth={2.5} />
                    </button>
                  )}
                  {action.badge && (
                    <span
                      style={{
                        ...styles.badge,
                        color: action.iconColor,
                        backgroundColor: action.bgColor,
                        borderColor: action.borderColor
                      }}
                    >
                      {action.badge}
                    </span>
                  )}
                </div>
              </div>

              <h2 style={styles.cardTitle}>{action.title}</h2>
              <p style={styles.cardSubtitle}>{action.subtitle}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
};

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    marginTop: '6px',
  },
  actionCard: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '144px',
    cursor: 'pointer',
    padding: '14px',
    backgroundColor: '#FFFFFF',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '10px',
  },
  iconWrapper: {
    width: '46px',
    height: '46px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1.5px solid',
  },
  badge: {
    fontSize: '0.66rem',
    fontWeight: '800',
    padding: '2px 7px',
    borderRadius: '6px',
    letterSpacing: '0.02em',
    whiteSpace: 'nowrap',
    border: '1px solid',
  },
  cardTitle: {
    fontSize: '0.94rem',
    fontWeight: '800',
    color: '#1E1B4B',
    marginBottom: '4px',
    lineHeight: '1.25',
  },
  cardSubtitle: {
    fontSize: '0.76rem',
    color: '#475569',
    lineHeight: '1.35',
    fontWeight: '500',
  },
  voiceBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    backgroundColor: '#FAF5FF',
    border: '1.5px solid #DDD6FE',
    borderRadius: '16px',
    marginBottom: '10px',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(109, 40, 217, 0.06)',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  },
  voiceLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  voiceMicCircle: {
    width: '38px',
    height: '38px',
    borderRadius: '12px',
    backgroundColor: '#6D28D9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(109, 40, 217, 0.3)',
    flexShrink: 0,
  },
  voiceTextWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  voiceTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  voiceTitle: {
    fontSize: '0.88rem',
    fontWeight: '800',
    color: '#4C1D95',
  },
  voiceBadge: {
    fontSize: '0.62rem',
    fontWeight: '800',
    padding: '2px 6px',
    borderRadius: '6px',
    backgroundColor: '#EDE9FE',
    color: '#6D28D9',
    border: '1px solid #C4B5FD',
    letterSpacing: '0.04em',
  },
  voiceSub: {
    fontSize: '0.74rem',
    color: '#6B21A8',
    fontWeight: '500',
    margin: 0,
  },
  voiceRightIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px',
    borderRadius: '8px',
    backgroundColor: '#EDE9FE',
  },
  headerBadgesRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  cardMicBtn: {
    width: '26px',
    height: '26px',
    borderRadius: '8px',
    backgroundColor: '#E0F2FE',
    border: '1px solid #BAE6FD',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
    boxShadow: '0 1px 3px rgba(2, 132, 199, 0.15)',
  }
};

export default QuickActionsGrid;
