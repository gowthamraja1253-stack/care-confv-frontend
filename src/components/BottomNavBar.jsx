import React from 'react';
import { Home, FileText, Bell, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const BottomNavBar = ({ activeTab = 'home', onTabChange }) => {
  const { t } = useTranslation();

  const navItems = [
    { id: 'home', label: t('nav.home'), icon: Home },
    { id: 'records', label: t('nav.records'), icon: FileText },
    { id: 'notifications', label: t('nav.alerts'), icon: Bell, badgeCount: 2 },
    { id: 'profile', label: t('nav.profile'), icon: User }
  ];

  const handleSelect = (tabId) => {
    if (onTabChange) {
      onTabChange(tabId);
    }
  };

  return (
    <nav style={styles.navBar} aria-label="Bottom Navigation">
      {navItems.map((item) => {
        const IconComponent = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            style={{
              ...styles.navButton,
              color: isActive ? '#6D28D9' : '#64748B'
            }}
            onClick={() => handleSelect(item.id)}
            aria-current={isActive ? 'page' : undefined}
          >
            <div style={styles.iconContainer}>
              <div
                style={{
                  ...styles.activeIndicator,
                  opacity: isActive ? 1 : 0,
                  transform: isActive ? 'scale(1)' : 'scale(0.6)'
                }}
              />
              <IconComponent
                size={24}
                strokeWidth={isActive ? 2.6 : 2}
                color={isActive ? '#6D28D9' : '#64748B'}
              />
              {item.badgeCount && (
                <span style={styles.badge}>{item.badgeCount}</span>
              )}
            </div>
            <span
              style={{
                ...styles.label,
                fontWeight: isActive ? '800' : '600',
                color: isActive ? '#6D28D9' : '#64748B'
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

const styles = {
  navBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '72px',
    backgroundColor: '#FFFFFF',
    borderTop: '1.5px solid #E9D5FF',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: '0 8px 6px 8px',
    zIndex: 20,
    boxShadow: '0 -4px 20px rgba(109, 40, 217, 0.08)',
  },
  navButton: {
    flex: 1,
    background: 'none',
    border: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    cursor: 'pointer',
    padding: '6px 0',
    transition: 'color 0.2s ease',
  },
  iconContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '42px',
    height: '30px',
  },
  activeIndicator: {
    position: 'absolute',
    width: '40px',
    height: '28px',
    borderRadius: '12px',
    backgroundColor: '#F5F3FF',
    border: '1px solid #DDD6FE',
    transition: 'all 0.2s ease',
    zIndex: -1,
  },
  badge: {
    position: 'absolute',
    top: '-3px',
    right: '3px',
    backgroundColor: '#DC2626',
    color: '#FFFFFF',
    fontSize: '0.64rem',
    fontWeight: '800',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #FFFFFF',
  },
  label: {
    fontSize: '0.74rem',
    letterSpacing: '0.01em',
    lineHeight: '1',
  }
};

export default BottomNavBar;
