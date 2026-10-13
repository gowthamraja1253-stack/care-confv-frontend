import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  User,
  Phone,
  Mail,
  Lock,
  MapPin,
  Globe,
  Stethoscope,
  Heart,
  ShieldCheck,
  Pill,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Crosshair,
  Building2
} from 'lucide-react';

export const AuthPage = () => {
  const { t, i18n } = useTranslation();
  const { login, register } = useAuth();
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('ramesh@example.com');
  const [loginPassword, setLoginPassword] = useState('Password123');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regIdentifier, setRegIdentifier] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('patient'); // 'patient' | 'doctor' | 'admin' | 'pharmacy'
  const [regVillage, setRegVillage] = useState('Rampur, Block B');
  const [regLanguage, setRegLanguage] = useState('English');

  // Pharmacy / Healthcare Center specific registration states
  const [regFacilityName, setRegFacilityName] = useState('');
  const [regFacilityAddress, setRegFacilityAddress] = useState('');
  const [regFacilityPhone, setRegFacilityPhone] = useState('');
  const [regFacilityHours, setRegFacilityHours] = useState('08:00 AM - 09:30 PM (Daily)');
  const [regFacilityLat, setRegFacilityLat] = useState('28.8050');
  const [regFacilityLng, setRegFacilityLng] = useState('79.0280');
  const [gpsAcquiring, setGpsAcquiring] = useState(false);
  const [gpsSuccess, setGpsSuccess] = useState(false);

  // Patient Medical Profile State
  const [regDob, setRegDob] = useState('');
  const [regGender, setRegGender] = useState('Male');
  const [regBloodGroup, setRegBloodGroup] = useState('O+');
  const [regAllergies, setRegAllergies] = useState('');
  const [regChronicConditions, setRegChronicConditions] = useState('');
  const [regSurgeries, setRegSurgeries] = useState('');
  const [regCurrentMedications, setRegCurrentMedications] = useState('');
  const [regImportantNotes, setRegImportantNotes] = useState('');
  const [regContact1Name, setRegContact1Name] = useState('Ramesh Kumar');
  const [regContact1Rel, setRegContact1Rel] = useState('Brother');
  const [regContact1Phone, setRegContact1Phone] = useState('+91 98765 43210');
  const [regContact2Name, setRegContact2Name] = useState('');
  const [regContact2Rel, setRegContact2Rel] = useState('');
  const [regContact2Phone, setRegContact2Phone] = useState('');

  // Automatically detect real GPS coordinates on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setRegFacilityLat(pos.coords.latitude.toFixed(4));
          setRegFacilityLng(pos.coords.longitude.toFixed(4));
          setGpsSuccess(true);
        },
        (err) => {
          console.warn('[AuthPage] Geolocation auto-detect fallback:', err.message);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  }, []);

  const handleDetectGPS = () => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      setGpsAcquiring(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setRegFacilityLat(pos.coords.latitude.toFixed(4));
          setRegFacilityLng(pos.coords.longitude.toFixed(4));
          setGpsAcquiring(false);
          setGpsSuccess(true);
        },
        (err) => {
          alert(`Location access denied or unavailable: ${err.message}`);
          setGpsAcquiring(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      alert('Geolocation is not supported by your browser');
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!loginIdentifier || !loginPassword) {
      setErrorMessage('Please provide both phone/email and password');
      return;
    }
    setLoading(true);
    const res = await login(loginIdentifier, loginPassword);
    setLoading(false);
    if (!res.success) {
      setErrorMessage(res.message || 'Login failed. Check your credentials.');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!regName || !regIdentifier || !regPassword) {
      setErrorMessage('Please fill in name, phone/email, and password');
      return;
    }

    const emergencyContacts = [
      {
        name: regContact1Name || 'Ramesh Kumar',
        relationship: regContact1Rel || 'Brother',
        phone: regContact1Phone || '+91 98765 43210',
        priority: 1,
      },
      ...(regContact2Name
        ? [
            {
              name: regContact2Name,
              relationship: regContact2Rel || 'Family',
              phone: regContact2Phone,
              priority: 2,
            },
          ]
        : []),
    ];

    setLoading(true);
    const res = await register({
      name: regName,
      identifier: regIdentifier,
      password: regPassword,
      role: regRole,
      village: regVillage,
      preferredLanguage: regLanguage,
      dob: regDob,
      gender: regGender,
      bloodGroup: regBloodGroup,
      allergies: regAllergies ? regAllergies.split(',').map((s) => s.trim()).filter(Boolean) : [],
      chronicConditions: regChronicConditions ? regChronicConditions.split(',').map((s) => s.trim()).filter(Boolean) : [],
      chronicFlags: regChronicConditions ? regChronicConditions.split(',').map((s) => s.trim()).filter(Boolean) : [],
      surgeries: regSurgeries ? regSurgeries.split(',').map((s) => s.trim()).filter(Boolean) : [],
      currentMedications: regCurrentMedications ? regCurrentMedications.split(',').map((s) => s.trim()).filter(Boolean) : [],
      importantNotes: regImportantNotes,
      emergencyContacts,
      facilityName: regFacilityName || `${regName} Medical Store`,
      facilityAddress: regFacilityAddress || regVillage,
      facilityPhone: regFacilityPhone || regIdentifier,
      facilityHours: regFacilityHours,
      facilityLocation: {
        lat: parseFloat(regFacilityLat) || 28.805,
        lng: parseFloat(regFacilityLng) || 79.028,
      },
    });
    setLoading(false);
    if (!res.success) {
      setErrorMessage(res.message || 'Registration failed.');
    }
  };

  const roleOptions = [
    { id: 'patient', label: t('auth.patientRole') || 'Patient / Citizen', icon: Heart, desc: t('auth.patientDesc') || 'Access healthcare, records & teleconsults' },
    { id: 'doctor', label: t('auth.doctorRole') || 'Doctor / Specialist', icon: Stethoscope, desc: t('auth.doctorDesc') || 'Conduct video consultations & e-prescribe' },
    { id: 'pharmacy', label: t('auth.pharmacyRole') || 'Pharmacy Operator', icon: Pill, desc: t('auth.pharmacyDesc') || 'Manage stock & Jan Aushadhi inventory' },
    { id: 'admin', label: t('auth.adminRole') || 'Health Administrator', icon: ShieldCheck, desc: t('auth.adminDesc') || 'District health stats & center management' },
  ];

  const languageOptions = [
    'English',
    'Hindi (हिंदी)',
    'Tamil (தமிழ்)',
    'Telugu (తెలుగు)',
    'Kannada (ಕನ್ನಡ)',
    'Malayalam (മലയാളം)',
  ];

  return (
    <div className="app-container" style={styles.container}>
      {/* Header Branding */}
      <div style={styles.header}>
        <div style={styles.logoBadge}>
          <span style={styles.logoIcon}>+</span>
        </div>
        <h1 style={styles.title}>{t('app.title')}</h1>
        <p style={styles.subtitle}>{t('app.subtitle')}</p>
      </div>

      {/* Auth Box / Card */}
      <div style={styles.scrollArea}>
        <div className="card-base" style={styles.authCard}>
          {/* Tab Switcher */}
          <div style={styles.tabContainer}>
            <button
              style={{
                ...styles.tabButton,
                ...(activeTab === 'login' ? styles.tabActive : {})
              }}
              onClick={() => {
                setActiveTab('login');
                setErrorMessage('');
              }}
            >
              {t('auth.signIn')}
            </button>
            <button
              style={{
                ...styles.tabButton,
                ...(activeTab === 'register' ? styles.tabActive : {})
              }}
              onClick={() => {
                setActiveTab('register');
                setErrorMessage('');
              }}
            >
              {t('auth.register')}
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div style={styles.errorAlert}>
              <AlertCircle size={18} color="#DC2626" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} style={styles.form}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>{t('auth.phoneOrEmail')}</label>
                <div style={styles.inputWrapper}>
                  <Mail size={18} color="#6D28D9" style={styles.inputIcon} />
                  <input
                    type="text"
                    style={styles.input}
                    placeholder="e.g. 9876543210 or name@mail.com"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>{t('auth.password')}</label>
                <div style={styles.inputWrapper}>
                  <Lock size={18} color="#6D28D9" style={styles.inputIcon} />
                  <input
                    type="password"
                    style={styles.input}
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                style={styles.submitBtn}
                disabled={loading}
              >
                <span>{loading ? t('auth.authenticating') : t('auth.signInBtn')}</span>
                <ArrowRight size={18} color="#FFFFFF" />
              </button>

              <div style={styles.quickFillNotice}>
                <span>Default test login: ramesh@example.com / Password123</span>
              </div>
            </form>
          )}

          {/* REGISTER FORM */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} style={styles.form}>
              {/* Role Selector */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>{t('auth.selectRole')}</label>
                <div style={styles.roleGrid}>
                  {roleOptions.map((role) => {
                    const IconComp = role.icon;
                    const isSelected = regRole === role.id;
                    return (
                      <button
                        type="button"
                        key={role.id}
                        style={{
                          ...styles.roleCard,
                          ...(isSelected ? styles.roleCardActive : {})
                        }}
                        onClick={() => setRegRole(role.id)}
                      >
                        <div
                          style={{
                            ...styles.roleIconBox,
                            backgroundColor: isSelected ? '#EDE9FE' : '#F5F3FF',
                            color: isSelected ? '#6D28D9' : '#64748B'
                          }}
                        >
                          <IconComp size={20} color={isSelected ? '#6D28D9' : '#64748B'} strokeWidth={2.4} />
                        </div>
                        <span style={{ ...styles.roleLabel, color: isSelected ? '#6D28D9' : '#1E1B4B' }}>
                          {role.label}
                        </span>
                        <span style={styles.roleDesc}>{role.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Full Name */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>{t('profile.fullName')}</label>
                <div style={styles.inputWrapper}>
                  <User size={18} color="#6D28D9" style={styles.inputIcon} />
                  <input
                    type="text"
                    style={styles.input}
                    placeholder="e.g. Sunita Devi"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Phone or Email */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>{t('auth.phoneOrEmail')}</label>
                <div style={styles.inputWrapper}>
                  <Phone size={18} color="#6D28D9" style={styles.inputIcon} />
                  <input
                    type="text"
                    style={styles.input}
                    placeholder="e.g. 9876543210 or user@domain.com"
                    value={regIdentifier}
                    onChange={(e) => setRegIdentifier(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>{t('auth.passwordMin')}</label>
                <div style={styles.inputWrapper}>
                  <Lock size={18} color="#6D28D9" style={styles.inputIcon} />
                  <input
                    type="password"
                    style={styles.input}
                    placeholder="Create a secure password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>
              </div>

              {/* Village */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>{t('profile.village')}</label>
                <div style={styles.inputWrapper}>
                  <MapPin size={18} color="#6D28D9" style={styles.inputIcon} />
                  <input
                    type="text"
                    style={styles.input}
                    placeholder="e.g. Rampur, Block B"
                    value={regVillage}
                    onChange={(e) => setRegVillage(e.target.value)}
                  />
                </div>
              </div>

              {/* Preferred Language */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>{t('profile.language')}</label>
                <div style={styles.inputWrapper}>
                  <Globe size={18} color="#6D28D9" style={styles.inputIcon} />
                  <select
                    style={styles.select}
                    value={regLanguage}
                    onChange={(e) => setRegLanguage(e.target.value)}
                  >
                    {languageOptions.map((lang) => (
                      <option key={lang} value={lang.split(' ')[0]}>
                        {lang}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Patient Medical Profile & Emergency Contacts Onboarding */}
              {regRole === 'patient' && (
                <div style={styles.pharmacySetupBox}>
                  <div style={styles.pharmacySetupHeader}>
                    <Heart size={16} color="#DC2626" />
                    <span style={{ ...styles.pharmacySetupTitle, color: '#991B1B' }}>
                      Patient Medical Profile & Emergency Contacts
                    </span>
                  </div>

                  <div style={styles.fieldRow2}>
                    <div style={styles.fieldGroup}>
                      <label style={styles.label}>Date of Birth (DOB)</label>
                      <input
                        type="date"
                        style={styles.inputPlain}
                        value={regDob}
                        onChange={(e) => setRegDob(e.target.value)}
                      />
                    </div>
                    <div style={styles.fieldGroup}>
                      <label style={styles.label}>Gender</label>
                      <select
                        style={styles.inputPlain}
                        value={regGender}
                        onChange={(e) => setRegGender(e.target.value)}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>
                  </div>

                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Blood Group</label>
                    <select
                      style={styles.inputPlain}
                      value={regBloodGroup}
                      onChange={(e) => setRegBloodGroup(e.target.value)}
                    >
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="Unknown">Unknown</option>
                    </select>
                  </div>

                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Allergies (comma-separated)</label>
                    <input
                      type="text"
                      style={styles.inputPlain}
                      placeholder="e.g. Penicillin, Peanuts, Dust (or none)"
                      value={regAllergies}
                      onChange={(e) => setRegAllergies(e.target.value)}
                    />
                  </div>

                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Existing / Chronic Conditions (comma-separated)</label>
                    <input
                      type="text"
                      style={styles.inputPlain}
                      placeholder="e.g. Type 2 Diabetes, Hypertension, Asthma"
                      value={regChronicConditions}
                      onChange={(e) => setRegChronicConditions(e.target.value)}
                    />
                  </div>

                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Previous Surgeries / Major Medical History</label>
                    <input
                      type="text"
                      style={styles.inputPlain}
                      placeholder="e.g. Appendectomy 2018, Gallbladder removal"
                      value={regSurgeries}
                      onChange={(e) => setRegSurgeries(e.target.value)}
                    />
                  </div>

                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Current Medications</label>
                    <input
                      type="text"
                      style={styles.inputPlain}
                      placeholder="e.g. Metformin 500mg, Amlodipine 5mg"
                      value={regCurrentMedications}
                      onChange={(e) => setRegCurrentMedications(e.target.value)}
                    />
                  </div>

                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Important Medical Notes</label>
                    <textarea
                      style={{ ...styles.inputPlain, minHeight: '60px', resize: 'vertical' }}
                      placeholder="e.g. Prone to dizziness in morning, pacemaker, strict sodium restrictions"
                      value={regImportantNotes}
                      onChange={(e) => setRegImportantNotes(e.target.value)}
                    />
                  </div>

                  {/* Emergency Contacts */}
                  <div style={{ marginTop: '12px', borderTop: '1px solid #FEE2E2', paddingTop: '10px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#991B1B', marginBottom: '8px' }}>
                      Primary Emergency Contact (Priority 1) *
                    </div>
                    <div style={styles.fieldRow2}>
                      <input
                        type="text"
                        style={styles.inputPlain}
                        placeholder="Contact Name (e.g. Ramesh Kumar)"
                        value={regContact1Name}
                        onChange={(e) => setRegContact1Name(e.target.value)}
                        required
                      />
                      <input
                        type="text"
                        style={styles.inputPlain}
                        placeholder="Relationship (e.g. Brother / Spouse)"
                        value={regContact1Rel}
                        onChange={(e) => setRegContact1Rel(e.target.value)}
                        required
                      />
                    </div>
                    <div style={{ marginTop: '6px' }}>
                      <input
                        type="tel"
                        style={styles.inputPlain}
                        placeholder="Emergency Phone Number (+91 98765 43210)"
                        value={regContact1Phone}
                        onChange={(e) => setRegContact1Phone(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: '12px', borderTop: '1px solid #FEE2E2', paddingTop: '10px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#6B7280', marginBottom: '8px' }}>
                      Secondary Emergency Contact (Optional)
                    </div>
                    <div style={styles.fieldRow2}>
                      <input
                        type="text"
                        style={styles.inputPlain}
                        placeholder="Name (e.g. Sunita Devi)"
                        value={regContact2Name}
                        onChange={(e) => setRegContact2Name(e.target.value)}
                      />
                      <input
                        type="text"
                        style={styles.inputPlain}
                        placeholder="Relationship (e.g. Mother / Neighbor)"
                        value={regContact2Rel}
                        onChange={(e) => setRegContact2Rel(e.target.value)}
                      />
                    </div>
                    <div style={{ marginTop: '6px' }}>
                      <input
                        type="tel"
                        style={styles.inputPlain}
                        placeholder="Phone Number"
                        value={regContact2Phone}
                        onChange={(e) => setRegContact2Phone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Pharmacy / Medical Center Specific Setup Fields */}
              {regRole === 'pharmacy' && (
                <div style={styles.pharmacySetupBox}>
                  <div style={styles.pharmacySetupHeader}>
                    <Pill size={16} color="#6D28D9" />
                    <span style={styles.pharmacySetupTitle}>Medical Center / Shop Setup</span>
                  </div>

                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Medical Center / Shop Name *</label>
                    <input
                      type="text"
                      style={styles.inputPlain}
                      placeholder="e.g. Rampur Jan Aushadhi & Medicals"
                      value={regFacilityName}
                      onChange={(e) => setRegFacilityName(e.target.value)}
                      required
                    />
                  </div>

                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Shop Physical Address & Landmark *</label>
                    <input
                      type="text"
                      style={styles.inputPlain}
                      placeholder="e.g. Shop 4, Near Bus Stand, Main Market, Rampur"
                      value={regFacilityAddress}
                      onChange={(e) => setRegFacilityAddress(e.target.value)}
                      required
                    />
                  </div>

                  <div style={styles.fieldRow2}>
                    <div style={styles.fieldGroup}>
                      <label style={styles.label}>Shop Phone / Helpline</label>
                      <input
                        type="text"
                        style={styles.inputPlain}
                        placeholder="e.g. +91 98765 20003"
                        value={regFacilityPhone}
                        onChange={(e) => setRegFacilityPhone(e.target.value)}
                      />
                    </div>

                    <div style={styles.fieldGroup}>
                      <label style={styles.label}>Operating Hours</label>
                      <input
                        type="text"
                        style={styles.inputPlain}
                        placeholder="e.g. 08:00 AM - 09:30 PM"
                        value={regFacilityHours}
                        onChange={(e) => setRegFacilityHours(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* GPS Coordinates & Auto-Detect Button */}
                  <div style={styles.fieldGroup}>
                    <div style={styles.gpsLabelRow}>
                      <label style={styles.label}>Shop GPS Location (Lat, Lng)</label>
                      <button
                        type="button"
                        style={styles.detectGpsBtn}
                        onClick={handleDetectGPS}
                        disabled={gpsAcquiring}
                      >
                        <Crosshair size={12} color="#6D28D9" />
                        <span>{gpsAcquiring ? 'Acquiring...' : gpsSuccess ? 'GPS Locked ✓' : 'Auto-Detect My GPS'}</span>
                      </button>
                    </div>
                    <div style={styles.fieldRow2}>
                      <input
                        type="text"
                        style={styles.inputPlain}
                        placeholder="Latitude (e.g. 28.805)"
                        value={regFacilityLat}
                        onChange={(e) => setRegFacilityLat(e.target.value)}
                      />
                      <input
                        type="text"
                        style={styles.inputPlain}
                        placeholder="Longitude (e.g. 79.028)"
                        value={regFacilityLng}
                        onChange={(e) => setRegFacilityLng(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                style={styles.submitBtn}
                disabled={loading}
              >
                <span>{loading ? t('auth.creating') : t('auth.registerBtn')}</span>
                <Sparkles size={18} color="#FFFFFF" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FE',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: '16px',
    marginTop: '8px',
  },
  logoBadge: {
    width: '52px',
    height: '52px',
    borderRadius: '16px',
    backgroundColor: '#6D28D9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '10px',
    boxShadow: '0 6px 16px rgba(109, 40, 217, 0.3)',
  },
  logoIcon: {
    fontSize: '32px',
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: '1',
  },
  title: {
    fontSize: '1.4rem',
    fontWeight: '800',
    color: '#1E1B4B',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '0.84rem',
    color: '#6D28D9',
    fontWeight: '700',
    marginTop: '4px',
  },
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    paddingBottom: '20px',
  },
  authCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '20px',
    padding: '18px',
    border: '1.5px solid #E9D5FF',
    boxShadow: '0 8px 24px -4px rgba(109, 40, 217, 0.1)',
  },
  tabContainer: {
    display: 'flex',
    backgroundColor: '#F5F3FF',
    borderRadius: '12px',
    padding: '4px',
    marginBottom: '18px',
    border: '1.5px solid #DDD6FE',
  },
  tabButton: {
    flex: 1,
    padding: '9px 0',
    borderRadius: '9px',
    border: 'none',
    background: 'transparent',
    color: '#64748B',
    fontWeight: '700',
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  tabActive: {
    backgroundColor: '#6D28D9',
    color: '#FFFFFF',
    fontWeight: '800',
    boxShadow: '0 2px 8px rgba(109, 40, 217, 0.25)',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#FEF2F2',
    border: '1.5px solid #FECACA',
    borderRadius: '10px',
    padding: '10px 12px',
    color: '#DC2626',
    fontSize: '0.82rem',
    fontWeight: '600',
    marginBottom: '14px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.82rem',
    fontWeight: '700',
    color: '#1E1B4B',
    letterSpacing: '0.01em',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '12px',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    height: '46px',
    backgroundColor: '#F8F9FE',
    border: '1.5px solid #DDD6FE',
    borderRadius: '10px',
    padding: '0 12px 0 40px',
    color: '#1E1B4B',
    fontSize: '0.88rem',
    fontWeight: '600',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },
  select: {
    width: '100%',
    height: '46px',
    backgroundColor: '#F8F9FE',
    border: '1.5px solid #DDD6FE',
    borderRadius: '10px',
    padding: '0 12px 0 40px',
    color: '#1E1B4B',
    fontSize: '0.88rem',
    fontWeight: '600',
    outline: 'none',
    cursor: 'pointer',
  },
  roleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  roleCard: {
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #E9D5FF',
    borderRadius: '12px',
    padding: '10px 6px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  roleCardActive: {
    borderColor: '#6D28D9',
    backgroundColor: '#F5F3FF',
    boxShadow: '0 0 0 1.5px #6D28D9',
  },
  roleIconBox: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '6px',
  },
  roleLabel: {
    fontSize: '0.84rem',
    fontWeight: '800',
    lineHeight: '1.2',
  },
  roleDesc: {
    fontSize: '0.66rem',
    color: '#64748B',
    marginTop: '2px',
    lineHeight: '1.1',
    fontWeight: '500',
  },
  submitBtn: {
    marginTop: '6px',
    height: '48px',
    backgroundColor: '#6D28D9',
    border: 'none',
    borderRadius: '12px',
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: '0.94rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(109, 40, 217, 0.3)',
    transition: 'transform 0.15s ease, opacity 0.2s ease',
  },
  quickFillNotice: {
    textAlign: 'center',
    fontSize: '0.72rem',
    color: '#64748B',
    marginTop: '4px',
    fontWeight: '500',
  },
  pharmacySetupBox: {
    backgroundColor: '#F5F3FF',
    border: '1.5px solid #DDD6FE',
    borderRadius: '12px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  pharmacySetupHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#5B21B6',
    fontWeight: '800',
    fontSize: '0.84rem',
  },
  pharmacySetupTitle: {
    color: '#5B21B6',
    fontWeight: '800',
    fontSize: '0.84rem',
  },
  inputPlain: {
    width: '100%',
    height: '42px',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #CBD5E1',
    borderRadius: '10px',
    padding: '0 12px',
    color: '#1E1B4B',
    fontSize: '0.84rem',
    fontWeight: '600',
    outline: 'none',
  },
  fieldRow2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
  },
  gpsLabelRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '2px',
  },
  detectGpsBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 8px',
    borderRadius: '6px',
    backgroundColor: '#EDE9FE',
    border: '1px solid #C4B5FD',
    color: '#6D28D9',
    fontSize: '0.68rem',
    fontWeight: '800',
    cursor: 'pointer',
  },
};

export default AuthPage;
