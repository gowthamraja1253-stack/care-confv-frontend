import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOffline } from '../../context/OfflineContext';
import { healthRecordService } from '../../services/healthRecord.service';
import LabTrendChart from './LabTrendChart';
import {
  analyzeAllTests,
  STATUS_COLORS,
  statusLabel,
  directionArrow,
  DIRECTION,
} from '../../utils/healthTrendEngine';
import {
  Activity,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  FlaskConical,
  HeartPulse,
  AlertCircle
} from 'lucide-react';

const LAB_CATEGORIES = {
  'Hematology': ['Hemoglobin', 'RBC', 'WBC', 'Platelets', 'Hematocrit', 'MCV', 'MCH', 'MCHC'],
  'Kidney / Renal': ['Creatinine', 'Urea', 'BUN', 'Urea / BUN', 'eGFR', 'Uric Acid'],
  'Liver': ['ALT', 'SGPT', 'ALT / SGPT', 'AST', 'SGOT', 'AST / SGOT', 'ALP', 'Bilirubin', 'Albumin'],
  'Electrolytes & Minerals': ['Sodium', 'Potassium', 'Calcium', 'Chloride'],
  'Metabolic': ['Fasting Glucose', 'Glucose', 'HbA1c'],
  'Lipid': ['Total Cholesterol', 'Cholesterol', 'LDL', 'HDL', 'Triglycerides']
};

export default function PatientHealthOverview({ onNavigate }) {
  const { token } = useAuth();
  const { isOnline } = useOffline();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAllTrends, setShowAllTrends] = useState(false);
  const [isDemoActive, setIsDemoActive] = useState(localStorage.getItem('USE_DEMO_HEALTH_DATA') === 'true');

  const loadOverview = useCallback(async (mounted) => {
    try {
      setLoading(true);
      if (!isOnline) {
        if (mounted) setError('This information is not available in your current offline records.');
        if (mounted) setLoading(false);
        return;
      }

      const res = await healthRecordService.getPatientOverview(token);
      if (mounted && res.success) {
        setData(res.overview);
      } else if (mounted) {
        setError(res.message || 'Failed to load health overview');
      }
    } catch (err) {
      if (mounted) setError(err.message || 'An error occurred while loading your health overview');
    } finally {
      if (mounted) setLoading(false);
    }
  }, [token, isOnline]);

  useEffect(() => {
    let mounted = true;
    loadOverview(mounted);
    return () => { mounted = false; };
  }, [loadOverview, isDemoActive]);

  const toggleDemoData = (state) => {
    if (state) {
      localStorage.setItem('USE_DEMO_HEALTH_DATA', 'true');
    } else {
      localStorage.removeItem('USE_DEMO_HEALTH_DATA');
    }
    setIsDemoActive(state);
    setData(null);
  };

  // MUST be called before any early returns (React Rules of Hooks)
  // analyzeAllTests gracefully handles empty/null input
  const engineResults = useMemo(
    () => analyzeAllTests(data?.labResultsByTest || {}),
    [data]
  );

  if (loading) {
    return <div style={styles.centerMessage}>Loading your health overview...</div>;
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <AlertCircle size={24} color="#DC2626" />
        <p style={styles.errorText}>{error}</p>
      </div>
    );
  }

  if (!data) return null;

  // Categorize Lab Results
  const categorizedLabs = {};
  const allTestNames = Object.keys(data.labResultsByTest || {});
  
  allTestNames.forEach(testName => {
    let assignedCategory = 'Other Results';
    for (const [catName, tests] of Object.entries(LAB_CATEGORIES)) {
      if (tests.some(t => testName.toLowerCase().includes(t.toLowerCase()))) {
        assignedCategory = catName;
        break;
      }
    }
    if (!categorizedLabs[assignedCategory]) categorizedLabs[assignedCategory] = [];
    categorizedLabs[assignedCategory].push(testName);
  });

  return (
    <div style={styles.container}>
      <div style={{...styles.headerRow, justifyContent: 'space-between'}}>
        <h2 style={styles.mainTitle}>MY HEALTH {isDemoActive && <span style={styles.demoBadge}>DEMO DATA</span>}</h2>
        <div style={styles.demoControls}>
          {!isDemoActive ? (
            <button onClick={() => toggleDemoData(true)} style={styles.demoBtnOn}>Load Sample Health Data</button>
          ) : (
            <button onClick={() => toggleDemoData(false)} style={styles.demoBtnOff}>Clear Sample Data</button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div style={styles.summaryGrid}>
        {data.totalConsultations > 0 ? (
          <div style={styles.summaryCard}>
            <div style={styles.cardHeader}>
              <Activity size={18} color="#6D28D9" />
              <span style={styles.cardTitle}>Consultations</span>
            </div>
            <div style={styles.cardValue}>{data.totalConsultations}</div>
            <div style={styles.cardSub}>Latest: {new Date(data.latestConsultation).toLocaleDateString()}</div>
          </div>
        ) : (
          <div style={styles.emptyCard}>
            <p style={styles.emptyText}>No consultation history available.</p>
          </div>
        )}

        {data.totalRecords > 0 ? (
          <div style={styles.summaryCard}>
            <div style={styles.cardHeader}>
              <FileText size={18} color="#059669" />
              <span style={styles.cardTitle}>Medical Records</span>
            </div>
            <div style={styles.cardValue}>{data.totalRecords}</div>
            <div style={styles.cardSub}>Latest: {new Date(data.latestRecord).toLocaleDateString()}</div>
          </div>
        ) : (
          <div style={styles.emptyCard}>
            <p style={styles.emptyText}>No medical records available.</p>
          </div>
        )}
      </div>

      {/* Recent Medical Records Section */}
      {data.recentRecords && data.recentRecords.length > 0 && (
        <div style={styles.section}>
          <div style={styles.headerRow}>
            <h3 style={styles.sectionTitle}>
              <FileText size={20} color="#4B5563" /> RECENT MEDICAL RECORDS
            </h3>
          </div>
          <div style={styles.recordList}>
            {data.recentRecords.map((record) => (
              <div key={record._id || record.id} style={styles.recordItem}>
                <div style={styles.recordHeader}>
                  <span style={styles.recordTitle}>{record.title}</span>
                  <span style={styles.recordDate}>
                    {new Date(record.date).toLocaleDateString()}
                  </span>
                </div>
                <div style={styles.recordTypeBadge}>
                  {record.type.replace('-', ' ').toUpperCase()}
                </div>
                {record.notes && (
                  <p style={styles.recordNotes}>{record.notes.substring(0, 100)}{record.notes.length > 100 ? '...' : ''}</p>
                )}
              </div>
            ))}
          </div>
          <div style={styles.footerNavLeft}>
            <button 
              style={styles.navButtonSecondary} 
              onClick={() => onNavigate && onNavigate('records')}
            >
              View All Medical Records
            </button>
          </div>
        </div>
      )}

      {/* Recent Changes Section — powered by healthTrendEngine */}
      {data.recentChanges && data.recentChanges.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <TrendingUp size={20} color="#4B5563" /> RECENT CHANGES
          </h3>
          <div style={styles.changesList}>
            {data.recentChanges.map((change, idx) => {
              // Pull engine result for this test if available
              const eng = engineResults[change.testName];
              const effectiveDirection = eng ? eng.direction : change.direction;
              const effectiveStatus    = eng ? eng.status    : 'unknown';
              const statusColors       = STATUS_COLORS[effectiveStatus] || STATUS_COLORS.unknown;
              return (
                <div key={idx} style={{ ...styles.changeItem, borderLeft: `4px solid ${statusColors.stroke}` }}>
                  <div style={styles.changeHeader}>
                    <strong>{change.testName}</strong>
                    <span style={{
                      ...badgeBase,
                      backgroundColor: statusColors.badge,
                      border: `1px solid ${statusColors.badgeBorder}`,
                      color: statusColors.label,
                    }}>
                      {statusLabel(effectiveStatus)}
                    </span>
                  </div>
                  <div style={styles.changeBody}>
                    <div style={styles.changeValueRow}>
                      <span style={styles.oldValue}>{change.previousValue}</span>
                      <span style={styles.arrow}>→</span>
                      <span style={styles.newValue}>{change.latestValue} {change.unit}</span>
                    </div>
                    <div style={styles.directionRow}>
                      <span aria-label={effectiveDirection} style={{ fontSize: '1rem' }}>
                        {directionArrow(effectiveDirection)}
                      </span>
                      <span style={styles.directionText}>{effectiveDirection}</span>
                      {eng?.percentChange && (
                        <span style={styles.pctChange}>{eng.percentChange}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Progressive Disclosure - Vitals and Labs */}
      {allTestNames.length > 0 || (data.vitals && data.vitals.length > 0) ? (
        <div style={styles.section}>
          <div style={styles.headerRow}>
            <h3 style={styles.sectionTitle}>
              <FlaskConical size={20} color="#4B5563" /> HEALTH TRENDS
            </h3>
            <button 
              onClick={() => setShowAllTrends(!showAllTrends)} 
              style={styles.viewAllBtn}
            >
              {showAllTrends ? 'Hide Full Trends' : 'View All Health Trends'}
            </button>
          </div>

          {/* If there's no data, but we passed the check above, it shouldn't happen */}
          {/* We only render the categories if they choose View All OR we show a preview */}
          {showAllTrends ? (
            <div style={styles.categoriesContainer}>
              {/* Render Vitals Category if exists */}
              {data.vitals && data.vitals.length > 0 && (
                <div style={styles.categoryBlock}>
                  <h4 style={styles.categoryTitle}><HeartPulse size={16} /> Vitals</h4>
                  <p style={styles.emptyText}>Vitals visualization implemented in records directly.</p>
                  {/* Phase 3 supports lab structure strongly. Vitals can be added here if formatted similarly. */}
                </div>
              )}

              {/* Render Lab Categories */}
              {Object.keys(categorizedLabs).map(categoryName => (
                <div key={categoryName} style={styles.categoryBlock}>
                  <h4 style={styles.categoryTitle}>{categoryName.toUpperCase()}</h4>
                  {categorizedLabs[categoryName].map(testName => {
                    const testData = data.labResultsByTest[testName];
                    const unit = testData[0]?.unit || '';
                    const refRange = testData[0]?.referenceRange || 'unavailable';
                    
                    return (
                      <LabTrendChart 
                        key={testName}
                        parameterName={testName}
                        data={testData}
                        unit={unit}
                        referenceRange={refRange}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.previewBox}>
              <p style={styles.previewText}>
                You have recorded observations across {Object.keys(categorizedLabs).length} clinical categories.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <FlaskConical size={20} color="#4B5563" /> HEALTH TRENDS
          </h3>
          <p style={styles.emptyText}>No laboratory results available yet.</p>
        </div>
      )}

      {/* Quick Nav Links */}
      <div style={styles.footerNav}>
        <button 
          style={styles.navButton} 
          onClick={() => onNavigate && onNavigate('records')}
        >
          View Medical Records
        </button>
      </div>

    </div>
  );
}

const styles = {
  container: {
    padding: '16px',
    backgroundColor: '#F8FAFC',
    borderRadius: '16px',
    marginBottom: '20px',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  mainTitle: {
    margin: 0,
    fontSize: '1.2rem',
    fontWeight: '800',
    color: '#1E293B',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '12px',
    marginBottom: '24px',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #E2E8F0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  cardTitle: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#475569',
  },
  cardValue: {
    fontSize: '1.8rem',
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: '4px',
  },
  cardSub: {
    fontSize: '0.75rem',
    color: '#64748B',
  },
  emptyCard: {
    backgroundColor: '#F8FAFC',
    border: '1px dashed #CBD5E1',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: '0.85rem',
    color: '#64748B',
    fontStyle: 'italic',
    textAlign: 'center',
    margin: 0,
  },
  section: {
    marginBottom: '24px',
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    padding: '16px',
    border: '1px solid #E2E8F0',
  },
  sectionTitle: {
    margin: '0 0 16px 0',
    fontSize: '0.95rem',
    fontWeight: '800',
    color: '#334155',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    textTransform: 'uppercase',
  },
  changesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  changeItem: {
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: '12px',
    padding: '12px',
  },
  changeHeader: {
    fontSize: '0.95rem',
    color: '#1E293B',
    marginBottom: '8px',
  },
  changeBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  changeValueRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.9rem',
    color: '#475569',
    fontWeight: '600',
  },
  oldValue: {
    color: '#64748B',
  },
  arrow: {
    color: '#94A3B8',
  },
  newValue: {
    color: '#0F172A',
  },
  directionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.8rem',
    fontWeight: '700',
    color: '#4B5563',
  },
  directionText: {
    textTransform: 'uppercase',
  },
  pctChange: {
    fontSize: '0.78rem',
    color: '#6B7280',
    fontWeight: '500',
  },
  viewAllBtn: {
    backgroundColor: 'transparent',
    color: '#6D28D9',
    border: 'none',
    fontSize: '0.85rem',
    fontWeight: '700',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  previewBox: {
    padding: '12px',
    backgroundColor: '#F8FAFC',
    borderRadius: '8px',
    textAlign: 'center',
  },
  previewText: {
    margin: 0,
    fontSize: '0.9rem',
    color: '#475569',
  },
  categoriesContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  categoryBlock: {
    borderTop: '2px solid #F1F5F9',
    paddingTop: '16px',
  },
  categoryTitle: {
    margin: '0 0 12px 0',
    fontSize: '0.9rem',
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: '0.5px',
  },
  footerNav: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '16px',
  },
  navButton: {
    backgroundColor: '#6D28D9',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '24px',
    padding: '10px 20px',
    fontSize: '0.9rem',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(109, 40, 217, 0.2)',
  },
  centerMessage: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#64748B',
    fontSize: '0.9rem',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '30px',
    backgroundColor: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: '12px',
    color: '#DC2626',
    textAlign: 'center',
    gap: '12px',
  },
  errorText: {
    margin: 0,
    fontSize: '0.9rem',
    fontWeight: '600',
  },
  recordList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  recordItem: {
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: '12px',
    padding: '12px',
  },
  recordHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  recordTitle: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: '#1E293B',
  },
  recordDate: {
    fontSize: '0.8rem',
    color: '#64748B',
  },
  recordTypeBadge: {
    display: 'inline-block',
    fontSize: '0.7rem',
    fontWeight: '700',
    backgroundColor: '#E0E7FF',
    color: '#4338CA',
    padding: '2px 8px',
    borderRadius: '12px',
    marginBottom: '8px',
  },
  recordNotes: {
    margin: 0,
    fontSize: '0.85rem',
    color: '#475569',
  },
  footerNavLeft: {
    marginTop: '12px',
    display: 'flex',
    justifyContent: 'flex-start',
  },
  navButtonSecondary: {
    backgroundColor: '#F1F5F9',
    color: '#475569',
    border: '1px solid #CBD5E1',
    borderRadius: '24px',
    padding: '8px 16px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  demoBadge: {
    backgroundColor: '#F59E0B',
    color: 'white',
    fontSize: '0.65rem',
    fontWeight: '800',
    padding: '2px 6px',
    borderRadius: '4px',
    marginLeft: '10px',
    verticalAlign: 'middle',
  },
  demoControls: {
    display: 'flex',
    alignItems: 'center',
  },
  demoBtnOn: {
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
  demoBtnOff: {
    backgroundColor: '#EF4444',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '700',
    cursor: 'pointer',
  }
};

const badgeBase = {
  display: 'inline-block',
  fontSize: '0.7rem',
  fontWeight: '700',
  borderRadius: '20px',
  padding: '2px 9px',
  marginLeft: '8px',
};
