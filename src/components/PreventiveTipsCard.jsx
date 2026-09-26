import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import preventiveTipService from '../services/preventiveTip.service';
import { translateDynamicContent } from '../utils/contentTranslator';
import { getSpeechLanguageCode } from '../hooks/useSpeechToText';
import {
  Sparkles,
  RefreshCw,
  Volume2,
  VolumeX,
  Lightbulb,
  ShieldCheck,
  Calendar,
  ChevronRight,
  Leaf,
  Apple,
  Heart,
  Droplets,
  CheckCircle2,
  Sun
} from 'lucide-react';

export const PreventiveTipsCard = () => {
  const { t, i18n } = useTranslation();
  const { token, user } = useAuth();

  const [tips, setTips] = useState([]);
  const [season, setSeason] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [speakingTipId, setSpeakingTipId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);

  const fetchTips = async (force = false) => {
    if (!token) {
      setLoading(false);
      return;
    }

    if (force) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const currentLang = (i18n.language || user?.preferredLanguage || 'en').substring(0, 2).toLowerCase();
      const res = await preventiveTipService.getPreventiveTips(token, currentLang, force);

      if (res.success && Array.isArray(res.tips) && res.tips.length > 0) {
        setTips(res.tips);
        if (res.season) setSeason(res.season);
        if (force) {
          setToastMessage(t('preventiveTips.refreshedToast'));
          setTimeout(() => setToastMessage(''), 3000);
        }
      }
    } catch (err) {
      console.warn('[PreventiveTipsCard] Error fetching tips:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTips();
  }, [token, i18n.language]);

  // Audio Playback / Read Aloud
  const handleToggleSpeech = (tipId, text, advice) => {
    if (!synthRef.current) return;

    if (speakingTipId === tipId) {
      synthRef.current.cancel();
      setSpeakingTipId(null);
      return;
    }

    synthRef.current.cancel();
    setSpeakingTipId(tipId);

    const fullTextToRead = `${text}. ${advice || ''}`;
    const cleanText = fullTextToRead.replace(/[*#_`>~]/g, '').trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = getSpeechLanguageCode(i18n.language || user?.preferredLanguage || 'en');
    utterance.rate = 0.95;

    utterance.onend = () => {
      setSpeakingTipId(null);
    };

    utterance.onerror = () => {
      setSpeakingTipId(null);
    };

    synthRef.current.speak(utterance);
  };

  const getCategoryMeta = (cat) => {
    switch (cat) {
      case 'seasonal':
        return {
          label: t('preventiveTips.catSeasonal'),
          icon: Leaf,
          color: '#0D9488',
          bg: '#F0FDF4',
          border: '#A7F3D0',
        };
      case 'nutrition':
        return {
          label: t('preventiveTips.catNutrition'),
          icon: Apple,
          color: '#D97706',
          bg: '#FFFBEB',
          border: '#FDE68A',
        };
      case 'chronic-care':
        return {
          label: t('preventiveTips.catChronic'),
          icon: Heart,
          color: '#DC2626',
          bg: '#FEF2F2',
          border: '#FECACA',
        };
      case 'hydration':
        return {
          label: t('preventiveTips.catHydration'),
          icon: Droplets,
          color: '#0284C7',
          bg: '#F0F9FF',
          border: '#BAE6FD',
        };
      case 'hygiene':
      default:
        return {
          label: t('preventiveTips.catHygiene'),
          icon: ShieldCheck,
          color: '#6D28D9',
          bg: '#F5F3FF',
          border: '#DDD6FE',
        };
    }
  };

  if (loading) {
    return (
      <section>
        <div className="section-title">
          <span>{t('preventiveTips.title')}</span>
        </div>
        <div className="card-base skeleton-shimmer" style={{ height: '140px', marginTop: '6px' }} />
      </section>
    );
  }

  if (!tips || tips.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="section-title">
        <div style={styles.titleRow}>
          <Sparkles size={16} color="#6D28D9" />
          <span>{t('preventiveTips.title')}</span>
          {season && (
            <span style={styles.seasonBadge}>
              <Sun size={11} color="#D97706" />
              {season}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => fetchTips(true)}
          disabled={refreshing}
          style={styles.refreshIconBtn}
          title={t('preventiveTips.refreshBtn')}
        >
          <RefreshCw
            size={14}
            color="#6D28D9"
            style={{
              transform: refreshing ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.4s ease',
            }}
          />
          <span style={styles.refreshText}>
            {refreshing ? t('preventiveTips.refreshing') : t('preventiveTips.refreshBtn')}
          </span>
        </button>
      </div>

      {toastMessage && (
        <div style={styles.toast}>
          <CheckCircle2 size={14} color="#059669" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 2-3 Stacked Tip Cards */}
      <div style={styles.tipsList}>
        {tips.map((tip, idx) => {
          const tipId = tip._id || `tip-${idx}`;
          const isSpeaking = speakingTipId === tipId;
          const catMeta = getCategoryMeta(tip.category);
          const CatIcon = catMeta.icon;

          return (
            <div
              key={tipId}
              className="card-base"
              style={{
                ...styles.tipCard,
                borderColor: catMeta.border,
                background: `linear-gradient(135deg, ${catMeta.bg} 0%, #FFFFFF 85%)`,
              }}
            >
              <div style={styles.cardHeader}>
                <div style={styles.badgeGroup}>
                  <div
                    style={{
                      ...styles.catBadge,
                      backgroundColor: catMeta.bg,
                      borderColor: catMeta.border,
                      color: catMeta.color,
                    }}
                  >
                    <CatIcon size={12} strokeWidth={2.4} />
                    <span>{catMeta.label}</span>
                  </div>
                  {tip.source === 'llm' && (
                    <span style={styles.aiBadge}>
                      <Sparkles size={10} color="#7C3AED" />
                      AI Tailored
                    </span>
                  )}
                </div>

                {/* Speaker Audio Button */}
                <button
                  type="button"
                  style={{
                    ...styles.speakerBtn,
                    color: isSpeaking ? '#DC2626' : '#6D28D9',
                  }}
                  onClick={() => handleToggleSpeech(tipId, tip.tipText, tip.actionableAdvice)}
                  title={isSpeaking ? 'Stop audio' : 'Listen in your language'}
                >
                  {isSpeaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  <span style={styles.speakerBtnLabel}>
                    {isSpeaking ? t('preventiveTips.stopAudio') : t('preventiveTips.listenAudio')}
                  </span>
                </button>
              </div>

              {/* Main Tip Text */}
              <p style={styles.tipText}>
                {translateDynamicContent(tip.tipText, i18n.language)}
              </p>

              {/* Actionable Guideline Box */}
              {tip.actionableAdvice && (
                <div style={styles.adviceBox}>
                  <strong style={styles.adviceHeading}>{t('preventiveTips.actionTitle')}: </strong>
                  <span style={styles.adviceText}>
                    {translateDynamicContent(tip.actionableAdvice, i18n.language)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

const styles = {
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  seasonBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.64rem',
    fontWeight: '800',
    color: '#92400E',
    backgroundColor: '#FEF3C7',
    padding: '2px 6px',
    borderRadius: '6px',
    border: '1px solid #FDE68A',
  },
  refreshIconBtn: {
    background: 'none',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
    padding: '2px',
  },
  refreshText: {
    fontSize: '0.74rem',
    fontWeight: '700',
    color: '#6D28D9',
  },
  toast: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#ECFDF5',
    border: '1px solid #A7F3D0',
    borderRadius: '8px',
    padding: '6px 10px',
    fontSize: '0.74rem',
    color: '#065F46',
    fontWeight: '700',
    marginTop: '4px',
    marginBottom: '6px',
  },
  tipsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '6px',
  },
  tipCard: {
    padding: '13px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    border: '1.5px solid',
    borderRadius: '16px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
    transition: 'transform 0.15s ease',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  catBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.68rem',
    fontWeight: '800',
    padding: '2px 8px',
    borderRadius: '6px',
    border: '1px solid',
  },
  aiBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '0.62rem',
    fontWeight: '800',
    color: '#6D28D9',
    backgroundColor: '#EDE9FE',
    padding: '2px 6px',
    borderRadius: '6px',
  },
  speakerBtn: {
    background: 'none',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
    padding: '2px',
  },
  speakerBtnLabel: {
    fontSize: '0.68rem',
    fontWeight: '700',
  },
  tipText: {
    fontSize: '0.86rem',
    fontWeight: '700',
    color: '#1E1B4B',
    lineHeight: '1.35',
    margin: 0,
  },
  adviceBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    border: '1px dashed #E2E8F0',
    borderRadius: '8px',
    padding: '6px 8px',
    fontSize: '0.74rem',
    color: '#334155',
    lineHeight: '1.35',
  },
  adviceHeading: {
    color: '#4C1D95',
    fontWeight: '800',
  },
  adviceText: {
    fontWeight: '500',
  },
};

export default PreventiveTipsCard;
