import React from 'react';
import {
  Users,
  UserCheck,
  Video,
  AlertTriangle,
  Building2,
  Package
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const AdminDashboard = () => {
  const { t } = useTranslation();

  const kpis = [
    { label: t('adminDashboard.registeredPatients'), value: '1,480', change: t('adminDashboard.moChange'), icon: Users, color: '#6D28D9', bg: '#F5F3FF', border: '#DDD6FE' },
    { label: t('adminDashboard.activeDoctors'), value: '6 / 8', change: t('adminDashboard.onlineNow'), icon: UserCheck, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
    { label: t('adminDashboard.consultsToday'), value: '48', change: t('adminDashboard.avgTime'), icon: Video, color: '#0284C7', bg: '#F0F9FF', border: '#BAE6FD' },
    { label: t('adminDashboard.criticalStockAlerts'), value: '3', change: t('adminDashboard.actionRequired'), icon: AlertTriangle, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  ];

  const stockAlerts = [
    { medicine: 'Amoxicillin 500mg', location: 'PHC Rampur', status: 'Stock < 10%', level: 'Urgent' },
    { medicine: 'Oral Rehydration Salts (ORS)', location: 'Sub-Centre Kalyanpur', status: 'Stock < 15%', level: 'Moderate' },
    { medicine: 'Paracetamol 650mg', location: 'Jan Aushadhi Kendra B', status: 'Stock < 5%', level: 'Critical' },
  ];

  const villageCoverage = [
    { village: 'Rampur Village', registered: 450, teleconsults: 18, status: t('app.active') },
    { village: 'Kalyanpur Block', registered: 380, teleconsults: 14, status: t('app.active') },
    { village: 'Sonapur South', registered: 320, teleconsults: 11, status: t('app.normal') },
    { village: 'Bishnupur Hub', registered: 330, teleconsults: 5, status: t('app.normal') },
  ];

  return (
    <div style={styles.container}>
      {/* Admin Title Banner */}
      <div className="card-base" style={styles.facilityBanner}>
        <div style={styles.facilityIcon}>
          <Building2 size={22} color="#6D28D9" strokeWidth={2.4} />
        </div>
        <div style={styles.facilityInfo}>
          <h3 style={styles.facilityName}>{t('adminDashboard.facilityTitle')}</h3>
          <p style={styles.facilitySub}>{t('adminDashboard.facilitySub')}</p>
        </div>
      </div>

      {/* 2x2 KPI Analytics Cards */}
      <div style={styles.kpiGrid}>
        {kpis.map((kpi, idx) => {
          const IconComp = kpi.icon;
          return (
            <div
              key={idx}
              className="card-base"
              style={{
                ...styles.kpiCard,
                backgroundColor: '#FFFFFF',
                borderColor: kpi.border,
              }}
            >
              <div style={styles.kpiTop}>
                <div style={{ ...styles.kpiIconBox, backgroundColor: kpi.bg }}>
                  <IconComp size={18} color={kpi.color} strokeWidth={2.4} />
                </div>
                <span style={{ ...styles.kpiChange, color: kpi.color }}>{kpi.change}</span>
              </div>
              <span style={styles.kpiValue}>{kpi.value}</span>
              <span style={styles.kpiLabel}>{kpi.label}</span>
            </div>
          );
        })}
      </div>

      {/* Medicine Inventory Critical Stock */}
      <div>
        <div className="section-title">
          <span>{t('adminDashboard.stockAlertsTitle')}</span>
          <span className="link">{t('adminDashboard.fullInventory')}</span>
        </div>

        <div style={styles.stockList}>
          {stockAlerts.map((item, idx) => (
            <div key={idx} className="card-base" style={styles.stockCard}>
              <div style={styles.stockLeft}>
                <div style={styles.stockIconBox}>
                  <Package size={18} color="#D97706" strokeWidth={2.4} />
                </div>
                <div>
                  <h4 style={styles.stockName}>{item.medicine}</h4>
                  <p style={styles.stockLocation}>{item.location}</p>
                </div>
              </div>
              <span
                style={{
                  ...styles.stockTag,
                  backgroundColor: item.level === 'Critical' ? '#FEF2F2' : '#FFFBEB',
                  borderColor: item.level === 'Critical' ? '#FECACA' : '#FDE68A',
                  color: item.level === 'Critical' ? '#DC2626' : '#D97706',
                }}
              >
                {item.level === 'Critical' ? t('app.critical') : t('app.urgent')} • {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Village Health Coverage */}
      <div>
        <div className="section-title">
          <span>{t('adminDashboard.villageCoverageTitle')}</span>
          <span className="link">{t('app.viewAll')}</span>
        </div>

        <div className="card-base" style={styles.tableCard}>
          {villageCoverage.map((vc, idx) => (
            <div
              key={idx}
              style={{
                ...styles.tableRow,
                borderBottom: idx < villageCoverage.length - 1 ? '1.5px solid #F5F3FF' : 'none',
              }}
            >
              <div style={styles.villageDetails}>
                <span style={styles.villageTitle}>{vc.village}</span>
                <span style={styles.regCount}>{vc.registered} {t('roles.patient')}</span>
              </div>
              <div style={styles.villageStats}>
                <span style={styles.consultCount}>{vc.teleconsults} {t('appointment.title')}</span>
                <span style={styles.statusIndicatorText}>{vc.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  facilityBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #DDD6FE',
  },
  facilityIcon: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    backgroundColor: '#F5F3FF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  facilityInfo: {
    flex: 1,
    minWidth: 0,
  },
  facilityName: {
    fontSize: '0.94rem',
    fontWeight: '800',
    color: '#1E1B4B',
    lineHeight: '1.2',
  },
  facilitySub: {
    fontSize: '0.74rem',
    color: '#6D28D9',
    fontWeight: '600',
    marginTop: '2px',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  kpiCard: {
    padding: '14px',
    border: '1.5px solid',
    borderRadius: '14px',
    display: 'flex',
    flexDirection: 'column',
  },
  kpiTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  kpiIconBox: {
    width: '32px',
    height: '32px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiChange: {
    fontSize: '0.68rem',
    fontWeight: '800',
  },
  kpiValue: {
    fontSize: '1.3rem',
    fontWeight: '800',
    color: '#1E1B4B',
    lineHeight: '1.2',
  },
  kpiLabel: {
    fontSize: '0.72rem',
    fontWeight: '700',
    color: '#64748B',
    marginTop: '2px',
  },
  stockList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '8px',
  },
  stockCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #E2E8F0',
    borderRadius: '12px',
  },
  stockLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  stockIconBox: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    backgroundColor: '#FFFBEB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockName: {
    fontSize: '0.84rem',
    fontWeight: '800',
    color: '#1E1B4B',
    margin: 0,
  },
  stockLocation: {
    fontSize: '0.72rem',
    color: '#64748B',
    fontWeight: '500',
    margin: '2px 0 0',
  },
  stockTag: {
    fontSize: '0.7rem',
    fontWeight: '800',
    padding: '3px 8px',
    borderRadius: '6px',
    border: '1px solid',
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #E2E8F0',
    borderRadius: '14px',
    overflow: 'hidden',
    marginTop: '8px',
  },
  tableRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 14px',
  },
  villageDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  villageTitle: {
    fontSize: '0.84rem',
    fontWeight: '800',
    color: '#1E1B4B',
  },
  regCount: {
    fontSize: '0.72rem',
    color: '#64748B',
    fontWeight: '500',
  },
  villageStats: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  consultCount: {
    fontSize: '0.76rem',
    fontWeight: '700',
    color: '#6D28D9',
  },
  statusIndicatorText: {
    fontSize: '0.7rem',
    fontWeight: '800',
    color: '#059669',
    backgroundColor: '#ECFDF5',
    padding: '2px 8px',
    borderRadius: '9999px',
    border: '1px solid #A7F3D0',
  },
};

export default AdminDashboard;
