import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import riskService from '../services/risk.service';
import {
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Activity,
  HeartPulse,
  RefreshCw,
  Calendar,
  Layers,
  Award,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  Stethoscope,
  Info
} from 'lucide-react';

export const RiskDetailPage = ({ onBack, onNavigateSymptomChecker }) => {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [recalcSuccess, setRecalcSuccess] = useState(false);

  const fetchRisk = async () => {
    if (!token) return;
    try {
      const res = await riskService.getRiskProfile(token);
      if (res.success && res.riskProfile) {
        setRiskData(res.riskProfile);
      }
    } catch (err) {
      console.warn('[RiskDetailPage] Error fetching risk data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRisk();
  }, [token]);

  const handleRecalculate = async () => {
    if (!token || recalculating) return;
    setRecalculating(true);
    setRecalcSuccess(false);
    try {
      const res = await riskService.recalculateRisk(token);
      if (res.success && res.riskProfile) {
        setRiskData(res.riskProfile);
        setRecalcSuccess(true);
        setTimeout(() => setRecalcSuccess(false), 3000);
      }
    } catch (err) {
      console.error('[RiskDetailPage] Recalculation failed:', err.message);
    } finally {
      setRecalculating(false);
    }
  };

  const getLevelTheme = (level) => {
    switch (level) {
      case 'high':
        return {
          label: t('riskProfile.levelHigh'),
          color: '#DC2626',
          bg: '#FEF2F2',
          border: '#FECACA',
          badgeBg: '#DC2626',
          badgeText: '#FFFFFF',
          icon: ShieldAlert,
          actionTitle: t('riskProfile.actionHighTitle'),
          actionSub: t('riskProfile.actionHighSub'),
        };
      case 'medium':
        return {
          label: t('riskProfile.levelMedium'),
          color: '#D97706',
          bg: '#FFFBEB',
          border: '#FDE68A',
          badgeBg: '#D97706',
          badgeText: '#FFFFFF',
          icon: AlertTriangle,
          actionTitle: t('riskProfile.actionMediumTitle'),
          actionSub: t('riskProfile.actionMediumSub'),
        };
      case 'low':
      default:
        return {
          label: t('riskProfile.levelLow'),
          color: '#059669',
          bg: '#ECFDF5',
          border: '#A7F3D0',
          badgeBg: '#059669',
          badgeText: '#FFFFFF',
          icon: ShieldCheck,
          actionTitle: t('riskProfile.actionLowTitle'),
          actionSub: t('riskProfile.actionLowSub'),
        };
    }
  };

  const getRiskTypeLabel = (type) => {
    switch (type) {
      case 'diabetes':
        return t('riskProfile.typeDiabetes');
      case 'hypertension':
        return t('riskProfile.typeHypertension');
      case 'cardiovascular':
        return t('riskProfile.typeCardiovascular');
      case 'respiratory':
        return t('riskProfile.typeRespiratory');
      case 'maternal':
        return t('riskProfile.typeMaternal');
      default:
        return t('riskProfile.typeGeneral');
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>{t('riskProfile.loading')}</p>
      </div>
    );
  }

  const score = riskData?.score ?? 24;
  const level = riskData?.level ?? 'low';
  const riskType = riskData?.riskType ?? 'general';
  const explanation =
    riskData?.explanation ||
    'Low baseline health risk profile based on current age and clinical parameters.';
  const factors = Array.isArray(riskData?.factors) ? riskData.factors : [];
  const history = Array.isArray(riskData?.history) ? riskData.history : [];
  const theme = getLevelTheme(level);
  const LevelIcon = theme.icon;

  return (
    <div style={styles.pageContainer}>
      {/* Top Header with Back Button */}
      <div style={styles.topNav}>
        <button
          onClick={onBack}
          style={styles.backButton}
          aria-label="Back to Dashboard"
        >
          <ArrowLeft size={18} color="#6D28D9" strokeWidth={2.5} />
        </button>
        <div style={styles.navTitleBox}>
          <div style={styles.headerIconCircle}>
            <HeartPulse size={18} color="#6D28D9" strokeWidth={2.4} />
          </div>
          <div>
            <h1 style={styles.pageTitle}>{t('riskProfile.detailTitle')}</h1>
            <p style={styles.pageSubtitle}>{t('riskProfile.detailSubtitle')}</p>
          </div>
        </div>
      </div>

      {/* Recalculation Toast */}
      {recalcSuccess && (
        <div style={styles.successBanner}>
          <CheckCircle2 size={18} color="#059669" strokeWidth={2.6} />
          <span>{t('riskProfile.recalcSuccess')}</span>
        </div>
      )}

      {/* Main Score Hero Card */}
      <div
        className="card-base"
        style={{
          ...styles.heroCard,
          borderColor: theme.border,
          background: `radial-gradient(circle at top right, ${theme.bg}, #FFFFFF 70%)`,
        }}
      >
        <div style={styles.heroTop}>
          <div
            style={{
              ...styles.heroScoreCircle,
              borderColor: theme.color,
              backgroundColor: theme.bg,
            }}
          >
            <span style={{ ...styles.heroScoreText, color: theme.color }}>{score}</span>
            <span style={styles.heroScoreMax}>{t('riskProfile.outOf100')}</span>
          </div>

          <div style={styles.heroMeta}>
            <span style={styles.gaugeLabelText}>{t('riskProfile.scoreGaugeLabel')}</span>
            <div style={styles.badgeRow}>
              <div
                style={{
                  ...styles.levelBadge,
                  backgroundColor: theme.badgeBg,
                  color: theme.badgeText,
                }}
              >
                <LevelIcon size={14} strokeWidth={2.6} />
                <span>{theme.label}</span>
              </div>
              <span style={styles.typeBadge}>{getRiskTypeLabel(riskType)}</span>
            </div>
            <p style={styles.heroExplanation}>{explanation}</p>
          </div>
        </div>

        {/* Action button in hero */}
        <button
          type="button"
          onClick={handleRecalculate}
          disabled={recalculating}
          style={styles.recalcBtn}
        >
          <RefreshCw
            size={14}
            className={recalculating ? 'pulse-dot' : ''}
            style={{
              transform: recalculating ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.4s ease',
            }}
          />
          <span>{recalculating ? t('riskProfile.recalculating') : t('riskProfile.recalcBtn')}</span>
        </button>
      </div>

      {/* Recommended Action Advice Card */}
      <div
        className="card-base"
        style={{
          ...styles.actionCard,
          backgroundColor: theme.bg,
          borderColor: theme.border,
        }}
      >
        <div style={styles.actionHead}>
          <LevelIcon size={18} color={theme.color} />
          <h3 style={{ ...styles.actionTitle, color: theme.color }}>{theme.actionTitle}</h3>
        </div>
        <p style={styles.actionSubText}>{theme.actionSub}</p>
      </div>

      {/* Contributing Risk Factors */}
      <div className="card-base" style={styles.sectionCard}>
        <div style={styles.sectionHead}>
          <Layers size={18} color="#6D28D9" />
          <h3 style={styles.sectionTitle}>{t('riskProfile.factorsTitle')}</h3>
        </div>

        {factors.length === 0 ? (
          <p style={styles.emptyText}>{t('riskProfile.standardBaseline')}</p>
        ) : (
          <div style={styles.factorsList}>
            {factors.map((factor, idx) => (
              <div key={idx} style={styles.factorItem}>
                <div style={styles.factorLeft}>
                  <strong style={styles.factorName}>{factor.name}</strong>
                  {factor.description && (
                    <span style={styles.factorDesc}>{factor.description}</span>
                  )}
                </div>
                <div
                  style={{
                    ...styles.factorContribution,
                    backgroundColor:
                      factor.contribution >= 25
                        ? '#FEE2E2'
                        : factor.contribution >= 15
                        ? '#FEF3C7'
                        : '#EDE9FE',
                    color:
                      factor.contribution >= 25
                        ? '#DC2626'
                        : factor.contribution >= 15
                        ? '#D97706'
                        : '#6D28D9',
                  }}
                >
                  +{factor.contribution} {t('riskProfile.pts')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Score History & Timeline */}
      <div className="card-base" style={styles.sectionCard}>
        <div style={styles.sectionHead}>
          <Clock size={18} color="#6D28D9" />
          <h3 style={styles.sectionTitle}>{t('riskProfile.historyTitle')}</h3>
        </div>

        {history.length === 0 ? (
          <p style={styles.emptyText}>{t('riskProfile.noHistory')}</p>
        ) : (
          <div style={styles.timelineList}>
            {history.map((entry, hIdx) => {
              const itemDate = new Date(entry.date || Date.now());
              const formattedDate = itemDate.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });
              const formattedTime = itemDate.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              });

              const isHigh = entry.level === 'high';
              const isMed = entry.level === 'medium';
              const entryColor = isHigh ? '#DC2626' : isMed ? '#D97706' : '#059669';
              const entryBg = isHigh ? '#FEE2E2' : isMed ? '#FEF3C7' : '#D1FAE5';

              return (
                <div key={hIdx} style={styles.timelineItem}>
                  <div style={{ ...styles.timelineDot, backgroundColor: entryColor }} />
                  <div style={styles.timelineContent}>
                    <div style={styles.timelineTopRow}>
                      <div style={styles.timelineDateRow}>
                        <Calendar size={12} color="#64748B" />
                        <span style={styles.timelineDateText}>
                          {formattedDate} • {formattedTime}
                        </span>
                      </div>
                      <span
                        style={{
                          ...styles.historyScoreChip,
                          backgroundColor: entryBg,
                          color: entryColor,
                        }}
                      >
                        {entry.score} / 100 • {entry.level.toUpperCase()}
                      </span>
                    </div>
                    <p style={styles.timelineReasonText}>{entry.reason || t('riskProfile.riskUpdate')}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Action to run Symptom Checker */}
      {onNavigateSymptomChecker && (
        <button
          type="button"
          onClick={onNavigateSymptomChecker}
          style={styles.checkSymptomBtn}
        >
          <Stethoscope size={18} />
          <span>{t('riskProfile.runSymptomAssessment')}</span>
          <ChevronRight size={18} style={{ marginLeft: 'auto' }} />
        </button>
      )}
    </div>
  );
};

const styles = {
  pageContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    paddingBottom: '24px',
  },
  topNav: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '2px',
  },
  backButton: {
    width: '38px',
    height: '38px',
    borderRadius: '12px',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #E9D5FF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(109, 40, 217, 0.08)',
    flexShrink: 0,
  },
  navTitleBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  headerIconCircle: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    backgroundColor: '#F5F3FF',
    border: '1.5px solid #DDD6FE',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: '1.05rem',
    fontWeight: '800',
    color: '#1E1B4B',
    lineHeight: '1.2',
  },
  pageSubtitle: {
    fontSize: '0.74rem',
    color: '#64748B',
    fontWeight: '500',
  },
  successBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#ECFDF5',
    border: '1.5px solid #A7F3D0',
    borderRadius: '12px',
    padding: '10px 14px',
    fontSize: '0.8rem',
    color: '#065F46',
    fontWeight: '700',
  },
  heroCard: {
    padding: '18px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    border: '2px solid',
    boxShadow: '0 6px 20px -4px rgba(0, 0, 0, 0.06)',
  },
  heroTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  heroScoreCircle: {
    width: '76px',
    height: '76px',
    borderRadius: '50%',
    border: '4px solid',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  },
  heroScoreText: {
    fontSize: '1.6rem',
    fontWeight: '900',
    lineHeight: '1',
  },
  heroScoreMax: {
    fontSize: '0.54rem',
    color: '#64748B',
    fontWeight: '800',
    marginTop: '2px',
    letterSpacing: '0.04em',
  },
  heroMeta: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  gaugeLabelText: {
    fontSize: '0.7rem',
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  badgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
  },
  levelBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.76rem',
    fontWeight: '800',
    padding: '3px 10px',
    borderRadius: '8px',
  },
  typeBadge: {
    fontSize: '0.72rem',
    fontWeight: '700',
    color: '#475569',
    backgroundColor: '#F1F5F9',
    padding: '3px 8px',
    borderRadius: '8px',
  },
  heroExplanation: {
    fontSize: '0.78rem',
    color: '#334155',
    lineHeight: '1.4',
    marginTop: '2px',
    fontWeight: '500',
  },
  recalcBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #DDD6FE',
    borderRadius: '10px',
    padding: '8px 14px',
    fontSize: '0.78rem',
    fontWeight: '700',
    color: '#6D28D9',
    cursor: 'pointer',
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
  },
  actionCard: {
    padding: '14px 16px',
    borderRadius: '14px',
    border: '1.5px solid',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  actionHead: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  actionTitle: {
    fontSize: '0.88rem',
    fontWeight: '800',
  },
  actionSubText: {
    fontSize: '0.76rem',
    color: '#334155',
    lineHeight: '1.4',
  },
  sectionCard: {
    padding: '16px',
    backgroundColor: '#FFFFFF',
    borderColor: '#E9D5FF',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sectionHead: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sectionTitle: {
    fontSize: '0.92rem',
    fontWeight: '800',
    color: '#1E1B4B',
  },
  factorsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  factorItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FE',
    border: '1px solid #E2E8F0',
    borderRadius: '10px',
    padding: '10px 12px',
    gap: '8px',
  },
  factorLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  factorName: {
    fontSize: '0.8rem',
    color: '#1E1B4B',
  },
  factorDesc: {
    fontSize: '0.7rem',
    color: '#64748B',
  },
  factorContribution: {
    fontSize: '0.72rem',
    fontWeight: '800',
    padding: '3px 8px',
    borderRadius: '6px',
    whiteSpace: 'nowrap',
  },
  timelineList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    position: 'relative',
    paddingLeft: '12px',
    borderLeft: '2px solid #EDE9FE',
    marginLeft: '6px',
  },
  timelineItem: {
    position: 'relative',
  },
  timelineDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    position: 'absolute',
    left: '-18px',
    top: '4px',
    border: '2px solid #FFFFFF',
  },
  timelineContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  timelineTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineDateRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  timelineDateText: {
    fontSize: '0.72rem',
    fontWeight: '700',
    color: '#475569',
  },
  historyScoreChip: {
    fontSize: '0.68rem',
    fontWeight: '800',
    padding: '2px 8px',
    borderRadius: '6px',
  },
  timelineReasonText: {
    fontSize: '0.76rem',
    color: '#334155',
    fontStyle: 'italic',
    marginTop: '2px',
  },
  checkSymptomBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#6D28D9',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '12px',
    padding: '12px 18px',
    fontSize: '0.86rem',
    fontWeight: '800',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(109, 40, 217, 0.3)',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    gap: '12px',
  },
  spinner: {
    width: '36px',
    height: '36px',
    border: '3px solid #EDE9FE',
    borderTop: '3px solid #6D28D9',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: '0.86rem',
    color: '#6D28D9',
    fontWeight: '700',
  },
  emptyText: {
    fontSize: '0.78rem',
    color: '#64748B',
    fontStyle: 'italic',
  },
};

export default RiskDetailPage;
