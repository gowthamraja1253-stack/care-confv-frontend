import React, { useState } from 'react';
import TopHeader from '../components/TopHeader';
import HomeRouter from '../components/HomeRouter';
import ProfilePage from './ProfilePage';
import SymptomCheckerPage from './SymptomCheckerPage';
import RiskDetailPage from './RiskDetailPage';
import ConsultDoctorPage from './ConsultDoctorPage';
import TeleconsultationRoom from './TeleconsultationRoom';
import ConsultationHistoryPage from './ConsultationHistoryPage';
import HealthRecordsPage from './HealthRecordsPage';
import FacilityLocatorPage from './FacilityLocatorPage';
import FindMedicinesPage from './FindMedicinesPage';
import BottomNavBar from '../components/BottomNavBar';
import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const HomePage = () => {
  const { t } = useTranslation();
  const [currentTab, setCurrentTab] = useState('home');
  const [activeSubView, setActiveSubView] = useState(null);
  const [autoVoiceMode, setAutoVoiceMode] = useState(false);
  const [activeAppointment, setActiveAppointment] = useState(null);

  const handleTabChange = (newTab) => {
    setActiveSubView(null);
    setAutoVoiceMode(false);
    setCurrentTab(newTab);
  };

  const handleNavigate = (viewId, metaData = null) => {
    if (viewId === 'symptom-checker') {
      setAutoVoiceMode(false);
      setActiveSubView('symptom-checker');
    } else if (viewId === 'symptom-checker-voice') {
      setAutoVoiceMode(true);
      setActiveSubView('symptom-checker');
    } else if (viewId === 'consult') {
      setAutoVoiceMode(false);
      setActiveSubView('consult');
    } else if (viewId === 'consult-history') {
      setAutoVoiceMode(false);
      setActiveSubView('consult-history');
    } else if (viewId === 'teleconsult-room') {
      setAutoVoiceMode(false);
      if (metaData) setActiveAppointment(metaData);
      setActiveSubView('teleconsult-room');
    } else if (viewId === 'risk-detail') {
      setAutoVoiceMode(false);
      setActiveSubView('risk-detail');
    } else if (viewId === 'medicines') {
      setAutoVoiceMode(false);
      setActiveSubView('medicines');
    } else if (viewId === 'facility-locator') {
      setAutoVoiceMode(false);
      setActiveSubView('facility-locator');
    } else if (viewId === 'records') {
      setActiveSubView(null);
      setAutoVoiceMode(false);
      setCurrentTab('records');
    }
  };

  return (
    <div className="app-container">
      {/* 1. Top Header */}
      <TopHeader />

      {/* Main Scrollable Content */}
      <main className="app-content">
        {activeSubView === 'symptom-checker' ? (
          <SymptomCheckerPage
            onBack={() => {
              setActiveSubView(null);
              setAutoVoiceMode(false);
            }}
            initialAutoVoice={autoVoiceMode}
          />
        ) : activeSubView === 'consult' ? (
          <ConsultDoctorPage
            onBack={() => setActiveSubView(null)}
            onStartCall={(apt) => {
              setActiveAppointment(apt);
              setActiveSubView('teleconsult-room');
            }}
          />
        ) : activeSubView === 'consult-history' ? (
          <ConsultationHistoryPage
            onBack={() => setActiveSubView(null)}
            onStartCall={(apt) => {
              setActiveAppointment(apt);
              setActiveSubView('teleconsult-room');
            }}
          />
        ) : activeSubView === 'teleconsult-room' ? (
          <TeleconsultationRoom
            appointment={activeAppointment}
            onLeaveRoom={() => {
              setActiveSubView(null);
              setActiveAppointment(null);
            }}
          />
        ) : activeSubView === 'medicines' ? (
          <FindMedicinesPage
            onBack={() => setActiveSubView(null)}
          />
        ) : activeSubView === 'facility-locator' ? (
          <FacilityLocatorPage
            onBack={() => setActiveSubView(null)}
          />
        ) : activeSubView === 'risk-detail' ? (
          <RiskDetailPage
            onBack={() => setActiveSubView(null)}
            onNavigateSymptomChecker={() => setActiveSubView('symptom-checker')}
          />
        ) : (
          <>
            {currentTab === 'home' && <HomeRouter onNavigate={handleNavigate} />}

            {currentTab === 'profile' && <ProfilePage />}

            {currentTab === 'records' && (
              <HealthRecordsPage
                onBack={() => setCurrentTab('home')}
                onNavigateConsult={() => handleNavigate('consult')}
              />
            )}

            {currentTab === 'notifications' && (
              <div style={styles.tabContent}>
                <div className="section-title">
                  <span>{t('alertsTab.title')}</span>
                  <span className="link">{t('alertsTab.markRead')}</span>
                </div>
                <div className="card-base" style={styles.placeholderCard}>
                  <div style={styles.iconCircle}>
                    <Bell size={28} color="#D97706" strokeWidth={2.4} />
                  </div>
                  <h3 style={styles.placeholderTitle}>{t('alertsTab.heading')}</h3>
                  <p style={styles.placeholderText}>
                    {t('alertsTab.sub')}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Fixed Bottom Navigation Bar */}
      <BottomNavBar activeTab={currentTab} onTabChange={handleTabChange} />
    </div>
  );
};

const styles = {
  tabContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  placeholderCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '36px 18px',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #E9D5FF',
  },
  iconCircle: {
    width: '60px',
    height: '60px',
    borderRadius: '18px',
    backgroundColor: '#F5F3FF',
    border: '1.5px solid #DDD6FE',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '14px',
  },
  placeholderTitle: {
    fontSize: '1.05rem',
    fontWeight: '800',
    color: '#1E1B4B',
    marginBottom: '8px',
  },
  placeholderText: {
    fontSize: '0.84rem',
    color: '#475569',
    lineHeight: '1.45',
    maxWidth: '320px',
    fontWeight: '500',
  }
};

export default HomePage;
