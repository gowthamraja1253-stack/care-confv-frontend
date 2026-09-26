import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import riskService from '../services/risk.service';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
  Activity,
  Sparkles,
  TrendingUp,
  HeartPulse
} from 'lucide-react';

export const HealthRiskCard = ({ onOpenDetails }) => {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchRisk = async () => {
      if (!token) return;
      try {
        const res = await riskService.getRiskProfile(token);
        if (isMounted && res.success && res.riskProfile) {
          setRiskData(res.riskProfile);
        }
      } catch (err) {
        console.warn('[HealthRiskCard] Failed to fetch risk profile:', err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRisk();
    return () => {
      isMounted = false;
    };
  }, [token]);

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
      <section>
        <div className="section-title">
          <span>{t('riskProfile.widgetTitle')}</span>
        </div>
        <div className="card-base skeleton-shimmer" style={{ height: '110px' }} />
      </section>
    );
  }

  const score = riskData?.score ?? 24;
  const level = riskData?.level ?? 'low';
  const riskType = riskData?.riskType ?? 'general';
  const explanation =
    riskData?.explanation ||
    'Low baseline health risk profile based on current age and clinical parameters.';
  const theme = getLevelTheme(level);
  const Icon = theme.icon;

  return (
    <section>
      <div className="section-title">
        <span>{t('riskProfile.widgetTitle')}</span>
        <span
          className="link"
          onClick={onOpenDetails}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
        >
          <span>{t('riskProfile.viewDetails')}</span>
          <ChevronRight size={14} />
        </span>
      </div>

      <div
        className="card-base"
        style={{
          ...styles.card,
          borderColor: theme.border,
          background: `radial-gradient(circle at top right, ${theme.bg}, #FFFFFF 75%)`,
        }}
        onClick={onOpenDetails}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpenDetails();
          }
        }}
      >
        <div style={styles.topRow}>
          {/* Circular Score Ring Gauge */}
          <div
            style={{
              ...styles.scoreGaugeCircle,
              borderColor: theme.color,
              backgroundColor: theme.bg,
            }}
          >
            <div style={styles.gaugeInner}>
              <span style={{ ...styles.gaugeScore, color: theme.color }}>{score}</span>
              <span style={styles.gaugeMax}>/100</span>
            </div>
          </div>

          <div style={styles.headerMeta}>
            <div style={styles.badgeRow}>
              <div
                style={{
                  ...styles.levelBadge,
                  backgroundColor: theme.badgeBg,
                  color: theme.badgeText,
                }}
              >
                <Icon size={12} strokeWidth={2.6} />
                <span>{theme.label}</span>
              </div>
              <span style={styles.typeTag}>{getRiskTypeLabel(riskType)}</span>
            </div>

            <p style={styles.explanationText}>{explanation}</p>
          </div>
        </div>

        {/* Bottom subtle progress / drill-through hint */}
        <div style={styles.bottomBar}>
          <div style={styles.scoreBarTrack}>
            <div
              style={{
                ...styles.scoreBarFill,
                width: `${Math.min(100, Math.max(8, score))}%`,
                backgroundColor: theme.color,
              }}
            />
          </div>
          <div style={styles.drillThroughHint}>
            <HeartPulse size={12} color={theme.color} />
            <span style={{ color: theme.color }}>{t('riskProfile.tapToView')}</span>
            <ChevronRight size={12} color={theme.color} />
          </div>
        </div>
      </div>
    </section>
  );
};

const styles = {
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '14px',
    cursor: 'pointer',
    backgroundColor: '#FFFFFF',
    boxShadow: '0 3px 14px rgba(109, 40, 217, 0.06)',
    marginTop: '2px',
  },
  topRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  scoreGaugeCircle: {
    width: '54px',
    height: '54px',
    borderRadius: '50%',
    border: '3px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
  },
  gaugeInner: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    lineHeight: '1',
  },
  gaugeScore: {
    fontSize: '1.15rem',
    fontWeight: '900',
  },
  gaugeMax: {
    fontSize: '0.58rem',
    color: '#64748B',
    fontWeight: '700',
  },
  headerMeta: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
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
    fontSize: '0.72rem',
    fontWeight: '800',
    padding: '2px 8px',
    borderRadius: '6px',
    letterSpacing: '0.02em',
  },
  typeTag: {
    fontSize: '0.68rem',
    fontWeight: '700',
    color: '#475569',
    backgroundColor: '#F1F5F9',
    padding: '2px 6px',
    borderRadius: '6px',
  },
  explanationText: {
    fontSize: '0.74rem',
    color: '#334155',
    lineHeight: '1.35',
    fontWeight: '500',
  },
  bottomBar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginTop: '2px',
  },
  scoreBarTrack: {
    height: '4px',
    backgroundColor: '#E2E8F0',
    borderRadius: '999px',
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: '999px',
    transition: 'width 0.4s ease',
  },
  drillThroughHint: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '3px',
    fontSize: '0.66rem',
    fontWeight: '700',
  },
};

export default HealthRiskCard;
