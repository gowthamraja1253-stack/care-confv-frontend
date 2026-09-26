import React, { useState } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  MapPin,
  User,
  Globe,
  LogOut,
  Database,
  CheckCircle2,
  AlertTriangle,
  X,
  Zap,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';

export const TopHeader = () => {
  const { t, i18n } = useTranslation();
  const { user: authUser, logout, changeLanguage } = useAuth();
  const {
    isOnline,
    isSyncing,
    pendingCount,
    syncProgress,
    syncNow,
    lastCheckedAt,
  } = useOffline();

  const [showSyncModal, setShowSyncModal] = useState(false);

  const user = {
    name: authUser?.name || t('roles.patient'),
    village: authUser?.village || 'Village Health Centre',
    role: authUser?.role || 'patient',
  };

  const handleToggleLanguage = () => {
    const langOrder = ['en', 'hi', 'ta', 'te', 'kn', 'ml'];
    const currentLang = i18n.language || 'en';
    const nextIndex = (langOrder.indexOf(currentLang) + 1) % langOrder.length;
    const nextLang = langOrder[nextIndex];

    const langNames = { en: 'English', hi: 'Hindi', ta: 'Tamil', te: 'Telugu', kn: 'Kannada', ml: 'Malayalam' };
    changeLanguage(langNames[nextLang]);
  };

  const getLangBtnLabel = () => {
    if (i18n.language === 'hi') return 'हिंदी';
    if (i18n.language === 'ta') return 'தமிழ்';
    if (i18n.language === 'te') return 'తెలుగు';
    if (i18n.language === 'kn') return 'ಕನ್ನಡ';
    if (i18n.language === 'ml') return 'മലയാളം';
    return 'English';
  };

  const renderStatusPill = () => {
    if (isSyncing) {
      return (
        <button
          style={{ ...styles.statusPill, ...styles.statusPillSyncing }}
          onClick={() => setShowSyncModal(true)}
          title="Active synchronization in progress"
          aria-label="Syncing status"
        >
          <RefreshCw size={13} color="#6D28D9" className="spin" style={styles.spinIcon} />
          <span style={{ ...styles.statusText, color: '#6D28D9' }}>
            {t('offline.syncing', { defaultValue: 'Syncing...' })}
            {syncProgress?.total > 0 && ` (${syncProgress.current}/${syncProgress.total})`}
          </span>
        </button>
      );
    }

    if (isOnline) {
      return (
        <button
          style={{ ...styles.statusPill, ...styles.statusPillOnline }}
          onClick={() => setShowSyncModal(true)}
          title="Online - Real-time connection active"
          aria-label="Network status online"
        >
          <span className="pulse-dot" style={styles.statusDotOnline} />
          <Wifi size={13} color="#059669" strokeWidth={2.5} />
          <span style={{ ...styles.statusText, color: '#059669' }}>
            {t('app.online', { defaultValue: 'Online' })}
          </span>
        </button>
      );
    }

    return (
      <button
        style={{ ...styles.statusPill, ...styles.statusPillOffline }}
        onClick={() => setShowSyncModal(true)}
        title="Offline Mode - Changes saved to device"
        aria-label="Network status offline"
      >
        <span style={styles.statusDotOffline} />
        <WifiOff size={13} color="#DC2626" strokeWidth={2.5} />
        <span style={{ ...styles.statusText, color: '#DC2626' }}>
          {t('app.offline', { defaultValue: 'Offline' })}
          {pendingCount > 0 && ` (${pendingCount})`}
        </span>
      </button>
    );
  };

  return (
    <>
      <header style={styles.header}>
        {/* Top Row: App Branding + Online Status Pill */}
        <div style={styles.topRow}>
          <div style={styles.branding}>
            <div style={styles.logoBadge}>
              <span style={styles.logoIcon}>+</span>
            </div>
            <div>
              <h1 style={styles.appTitle}>{t('app.title')}</h1>
              <p style={styles.regionalSubtitle}>{t('app.subtitle')}</p>
            </div>
          </div>

          {/* Dynamic Status Pill */}
          {renderStatusPill()}
        </div>

        {/* Bottom Row: User info, Village, and Quick Logout */}
        <div style={styles.userBar}>
          <div style={styles.avatar}>
            <User size={20} color="#6D28D9" strokeWidth={2.4} />
          </div>
          <div style={styles.userInfo}>
            <div style={styles.greetingRow}>
              <span style={styles.greeting}>{t('app.greeting')}</span>
              <span style={styles.userName}>{user.name}</span>
              {user.role !== 'patient' && (
                <span style={styles.roleTag}>
                  {t(`roles.${user.role}`, { defaultValue: user.role })}
                </span>
              )}
            </div>
            <div style={styles.locationRow}>
              <MapPin size={13} color="#6D28D9" />
              <span style={styles.villageName}>{user.village}</span>
            </div>
          </div>

          {/* Quick Language Switcher Button */}
          <button
            style={styles.langBtn}
            onClick={handleToggleLanguage}
            title={t('profile.language')}
          >
            <Globe size={15} color="#6D28D9" />
            <span style={styles.langBtnText}>{getLangBtnLabel()}</span>
          </button>

          {/* Quick Logout Button */}
          <button
            style={styles.logoutBtn}
            onClick={logout}
            title={t('app.logout')}
            aria-label={t('app.logout')}
          >
            <LogOut size={15} color="#DC2626" />
          </button>
        </div>
      </header>

      {/* Offline & Sync Status Dialog Modal */}
      {showSyncModal && (
        <div style={styles.modalOverlay} onClick={() => setShowSyncModal(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitleRow}>
                <Database size={20} color="#6D28D9" />
                <h3 style={styles.modalTitle}>
                  {t('offline.modalTitle', { defaultValue: 'Network & Offline Storage' })}
                </h3>
              </div>
              <button
                style={styles.modalCloseBtn}
                onClick={() => setShowSyncModal(false)}
                aria-label="Close"
              >
                <X size={18} color="#64748B" />
              </button>
            </div>

            <div style={styles.modalBody}>
              {/* Connection Status Indicator */}
              <div
                style={{
                  ...styles.statusNoticeBox,
                  backgroundColor: isOnline ? '#F0FDF4' : '#FEF2F2',
                  borderColor: isOnline ? '#BBF7D0' : '#FECACA',
                }}
              >
                {isOnline ? (
                  <CheckCircle2 size={24} color="#16A34A" />
                ) : (
                  <AlertTriangle size={24} color="#DC2626" />
                )}
                <div>
                  <h4 style={{ ...styles.noticeTitle, color: isOnline ? '#15803D' : '#B91C1C' }}>
                    {isOnline
                      ? t('offline.connectedTitle', { defaultValue: 'Live Network Connected' })
                      : t('offline.offlineTitle', { defaultValue: 'Operating in Offline Mode' })}
                  </h4>
                  <p style={styles.noticeSub}>
                    {isOnline
                      ? t('offline.connectedSub', {
                          defaultValue: 'Server pings active. All records and appointments are live.',
                        })
                      : t('offline.offlineSub', {
                          defaultValue:
                            'No internet detected. Submissions and changes are safely queued locally in IndexedDB.',
                        })}
                  </p>
                </div>
              </div>

              {/* Offline Queue Information */}
              <div style={styles.queueStatsBox}>
                <div style={styles.statItem}>
                  <span style={styles.statLabel}>
                    {t('offline.pendingQueueLabel', { defaultValue: 'Pending Sync Actions' })}:
                  </span>
                  <span
                    style={{
                      ...styles.statBadge,
                      backgroundColor: pendingCount > 0 ? '#FEF3C7' : '#EDE9FE',
                      color: pendingCount > 0 ? '#92400E' : '#6D28D9',
                    }}
                  >
                    {pendingCount} {t('offline.items', { defaultValue: 'item(s)' })}
                  </span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statLabel}>
                    {t('offline.storageType', { defaultValue: 'Local Storage Engine' })}:
                  </span>
                  <span style={styles.statValue}>IndexedDB (Dexie)</span>
                </div>
              </div>

              {/* Sync Action Button */}
              <button
                style={{
                  ...styles.syncButton,
                  opacity: isSyncing || (!isOnline && pendingCount === 0) ? 0.7 : 1,
                  cursor: isSyncing ? 'not-allowed' : 'pointer',
                }}
                disabled={isSyncing}
                onClick={syncNow}
              >
                <RefreshCw
                  size={16}
                  color="#FFFFFF"
                  className={isSyncing ? 'spin' : ''}
                  style={isSyncing ? styles.spinIcon : {}}
                />
                <span>
                  {isSyncing
                    ? t('offline.syncingBtn', { defaultValue: 'Replaying Queue...' })
                    : t('offline.syncNowBtn', { defaultValue: 'Sync Now with Server' })}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const styles = {
  header: {
    padding: '16px 16px 14px 16px',
    backgroundColor: '#FFFFFF',
    borderBottom: '1.5px solid #E9D5FF',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    zIndex: 10,
    boxShadow: '0 2px 8px rgba(109, 40, 217, 0.05)',
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  branding: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logoBadge: {
    width: '38px',
    height: '38px',
    borderRadius: '12px',
    backgroundColor: '#6D28D9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 10px rgba(109, 40, 217, 0.3)',
  },
  logoIcon: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: '1',
  },
  appTitle: {
    fontSize: '1.12rem',
    fontWeight: '800',
    color: '#1E1B4B',
    letterSpacing: '-0.02em',
    lineHeight: '1.2',
  },
  regionalSubtitle: {
    fontSize: '0.74rem',
    color: '#6D28D9',
    fontWeight: '700',
    lineHeight: '1.2',
    marginTop: '2px',
  },
  statusPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '9999px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  statusPillOnline: {
    backgroundColor: '#ECFDF5',
    border: '1.5px solid #A7F3D0',
  },
  statusPillOffline: {
    backgroundColor: '#FEF2F2',
    border: '1.5px solid #FECACA',
  },
  statusPillSyncing: {
    backgroundColor: '#F5F3FF',
    border: '1.5px solid #DDD6FE',
  },
  statusDotOnline: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#059669',
  },
  statusDotOffline: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#DC2626',
  },
  spinIcon: {
    animation: 'spin 1s linear infinite',
  },
  statusText: {
    fontSize: '0.76rem',
    fontWeight: '800',
    letterSpacing: '0.02em',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '16px',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
    border: '1.5px solid #E9D5FF',
    animation: 'fadeIn 0.2s ease-out',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #F1F5F9',
    backgroundColor: '#FAF5FF',
  },
  modalTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  modalTitle: {
    fontSize: '1rem',
    fontWeight: '800',
    color: '#1E1B4B',
    margin: 0,
  },
  modalCloseBtn: {
    background: '#F1F5F9',
    border: 'none',
    borderRadius: '8px',
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  modalBody: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  statusNoticeBox: {
    display: 'flex',
    gap: '12px',
    padding: '14px',
    borderRadius: '12px',
    border: '1.5px solid',
  },
  noticeTitle: {
    fontSize: '0.92rem',
    fontWeight: '800',
    margin: '0 0 4px 0',
  },
  noticeSub: {
    fontSize: '0.78rem',
    color: '#475569',
    lineHeight: '1.4',
    margin: 0,
  },
  queueStatsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  statItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: '0.82rem',
    color: '#64748B',
    fontWeight: '600',
  },
  statBadge: {
    fontSize: '0.76rem',
    fontWeight: '800',
    padding: '3px 8px',
    borderRadius: '6px',
  },
  statValue: {
    fontSize: '0.82rem',
    fontWeight: '700',
    color: '#1E293B',
  },
  syncButton: {
    backgroundColor: '#6D28D9',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '0.9rem',
    fontWeight: '800',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow: '0 4px 12px rgba(109, 40, 217, 0.25)',
    transition: 'all 0.2s ease',
  },
  userBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '9px 12px',
    backgroundColor: '#F5F3FF',
    borderRadius: '14px',
    border: '1.5px solid #DDD6FE',
  },
  avatar: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    backgroundColor: '#EDE9FE',
    border: '1.5px solid #C4B5FD',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  userInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    minWidth: 0,
  },
  greetingRow: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.92rem',
    lineHeight: '1.2',
    gap: '4px',
  },
  greeting: {
    color: '#475569',
    fontWeight: '500',
  },
  userName: {
    color: '#1E1B4B',
    fontWeight: '800',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  roleTag: {
    fontSize: '0.64rem',
    textTransform: 'uppercase',
    fontWeight: '800',
    color: '#6D28D9',
    backgroundColor: '#EDE9FE',
    padding: '2px 6px',
    borderRadius: '6px',
    letterSpacing: '0.04em',
    border: '1px solid #DDD6FE',
  },
  locationRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginTop: '3px',
  },
  villageName: {
    fontSize: '0.78rem',
    color: '#475569',
    fontWeight: '600',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  langBtn: {
    background: '#FFFFFF',
    border: '1.5px solid #DDD6FE',
    borderRadius: '9px',
    padding: '5px 8px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
    boxShadow: '0 1px 4px rgba(109, 40, 217, 0.08)',
  },
  langBtnText: {
    fontSize: '0.74rem',
    fontWeight: '800',
    color: '#6D28D9',
  },
  logoutBtn: {
    background: '#FEF2F2',
    border: '1.5px solid #FECACA',
    borderRadius: '9px',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  }
};

export default TopHeader;
