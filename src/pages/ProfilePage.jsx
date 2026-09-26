import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  User,
  MapPin,
  Globe,
  Heart,
  Stethoscope,
  ShieldCheck,
  Edit3,
  Check,
  X,
  AlertCircle,
  Clock,
  Phone,
  ShieldAlert,
  Plus,
  Trash2,
  Calendar,
  CalendarCheck,
  Pill,
  Building2
} from 'lucide-react';

export const ProfilePage = () => {
  const { t, i18n } = useTranslation();
  const { user, updateProfile, changeLanguage } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Common fields
  const [name, setName] = useState('');
  const [village, setVillage] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('English');

  // Patient fields
  const [age, setAge] = useState(35);
  const [gender, setGender] = useState('Male');
  const [chronicFlags, setChronicFlags] = useState([]);

  // Emergency Contact fields
  const [emergencyContactName, setEmergencyContactName] = useState('Ramesh Kumar');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('+91 98765 43210');
  const [emergencyContactRelation, setEmergencyContactRelation] = useState('Brother');

  // Doctor fields
  const [specialization, setSpecialization] = useState('');
  const [licenseId, setLicenseId] = useState('');
  const [availability, setAvailability] = useState([]);
  const [availabilitySlots, setAvailabilitySlots] = useState([
    { id: 'slot-1', day: 'Today', time: '10:30 AM - 11:00 AM', period: 'morning', isBooked: false },
    { id: 'slot-2', day: 'Today', time: '11:30 AM - 12:00 PM', period: 'morning', isBooked: false },
    { id: 'slot-3', day: 'Today', time: '04:30 PM - 05:00 PM', period: 'afternoon', isBooked: false },
    { id: 'slot-4', day: 'Today', time: '05:30 PM - 06:00 PM', period: 'evening', isBooked: false },
    { id: 'slot-5', day: 'Tomorrow', time: '10:00 AM - 10:30 AM', period: 'morning', isBooked: false },
    { id: 'slot-6', day: 'Tomorrow', time: '04:00 PM - 04:30 PM', period: 'afternoon', isBooked: false },
  ]);

  // New slot inputs
  const [newSlotDay, setNewSlotDay] = useState('Today');
  const [newSlotTime, setNewSlotTime] = useState('02:00 PM - 02:30 PM');
  const [newSlotPeriod, setNewSlotPeriod] = useState('afternoon');

  // Admin fields
  const [designation, setDesignation] = useState('');

  // Pharmacy / Healthcare Center fields
  const [facilityName, setFacilityName] = useState('');
  const [facilityAddress, setFacilityAddress] = useState('');
  const [facilityPhone, setFacilityPhone] = useState('');
  const [facilityHours, setFacilityHours] = useState('08:00 AM - 09:30 PM (Daily)');
  const [facilityLat, setFacilityLat] = useState('28.8050');
  const [facilityLng, setFacilityLng] = useState('79.0280');

  // Populate state from current user
  useEffect(() => {
    if (user) {
      const currentLangName =
        i18n.language === 'hi'
          ? 'Hindi'
          : i18n.language === 'ta'
          ? 'Tamil'
          : i18n.language === 'te'
          ? 'Telugu'
          : i18n.language === 'kn'
          ? 'Kannada'
          : i18n.language === 'ml'
          ? 'Malayalam'
          : 'English';
      setName(user.name || '');
      setVillage(user.village || '');
      setPreferredLanguage(user.preferredLanguage || currentLangName);
      setAge(user.age !== undefined ? user.age : 35);
      setGender(user.gender || 'Male');
      setChronicFlags(user.chronicFlags || []);
      setEmergencyContactName(user.emergencyContact?.name || 'Ramesh Kumar');
      setEmergencyContactPhone(user.emergencyContact?.phone || '+91 98765 43210');
      setEmergencyContactRelation(user.emergencyContact?.relation || 'Brother');
      setSpecialization(user.specialization || 'General Physician');
      setLicenseId(user.licenseId || 'MCI-2021-08492');
      setAvailability(user.availability || ['Mon - Fri: 09:00 AM - 01:00 PM', 'Mon - Fri: 04:00 PM - 07:00 PM']);
      if (Array.isArray(user.availabilitySlots) && user.availabilitySlots.length > 0) {
        setAvailabilitySlots(user.availabilitySlots);
      }
      setDesignation(user.designation || 'Primary Health Center Officer');
      setFacilityName(user.facilityName || `${user.name} Medical Store`);
      setFacilityAddress(user.facilityAddress || user.village || 'Main Market, Rampur');
      setFacilityPhone(user.facilityPhone || user.phone || '+91 98765 20003');
      setFacilityHours(user.facilityHours || '08:00 AM - 09:30 PM (Daily)');
      if (user.facilityLocation) {
        setFacilityLat(String(user.facilityLocation.lat || '28.8050'));
        setFacilityLng(String(user.facilityLocation.lng || '79.0280'));
      }
    }
  }, [user, i18n.language]);

  const handleToggleChronicFlag = (flag) => {
    if (!isEditing) return;
    if (chronicFlags.includes(flag)) {
      setChronicFlags(chronicFlags.filter((f) => f !== flag));
    } else {
      setChronicFlags([...chronicFlags, flag]);
    }
  };

  const handleLanguageChange = async (newLang) => {
    setPreferredLanguage(newLang);
    await changeLanguage(newLang);
  };

  const handleAddSlot = () => {
    if (!newSlotTime.trim()) return;
    const newSlot = {
      id: 'slot-' + Date.now(),
      day: newSlotDay,
      time: newSlotTime.trim(),
      period: newSlotPeriod,
      isBooked: false,
    };
    setAvailabilitySlots([...availabilitySlots, newSlot]);
  };

  const handleRemoveSlot = (slotId) => {
    setAvailabilitySlots(availabilitySlots.filter((s) => s.id !== slotId));
  };

  const handleToggleSlotBooked = (slotId) => {
    setAvailabilitySlots(
      availabilitySlots.map((s) => (s.id === slotId ? { ...s, isBooked: !s.isBooked } : s))
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage('');
    setSaveSuccess(false);

    const updatePayload = {
      name,
      village,
      preferredLanguage,
    };

    if (user.role === 'patient') {
      updatePayload.age = Number(age);
      updatePayload.gender = gender;
      updatePayload.chronicFlags = chronicFlags;
      updatePayload.emergencyContact = {
        name: emergencyContactName,
        phone: emergencyContactPhone,
        relation: emergencyContactRelation,
      };
    } else if (user.role === 'doctor') {
      updatePayload.specialization = specialization;
      updatePayload.licenseId = licenseId;
      updatePayload.availability = availability;
      updatePayload.availabilitySlots = availabilitySlots;
    } else if (user.role === 'admin') {
      updatePayload.designation = designation;
    } else if (user.role === 'pharmacy') {
      updatePayload.facilityName = facilityName;
      updatePayload.facilityAddress = facilityAddress;
      updatePayload.facilityPhone = facilityPhone;
      updatePayload.facilityHours = facilityHours;
      updatePayload.facilityLocation = {
        lat: parseFloat(facilityLat) || 28.805,
        lng: parseFloat(facilityLng) || 79.028,
      };
    }

    const res = await updateProfile(updatePayload);
    setSaving(false);

    if (res.success) {
      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 3500);
    } else {
      setErrorMessage(res.message || 'Failed to save profile');
    }
  };

  const availableChronicTags = [
    'Diabetes Type-2',
    'Hypertension',
    'Asthma',
    'Arthritis',
    'Thyroid',
    'Heart Disease',
    'Kidney Condition',
    'Anemia',
  ];

  return (
    <div style={styles.container}>
      {/* Header Profile Badge */}
      <div className="card-base" style={styles.profileHeaderCard}>
        <div style={styles.avatarLarge}>
          <User size={34} color="#6D28D9" strokeWidth={2.4} />
        </div>
        <div style={styles.headerMeta}>
          <div style={styles.nameRow}>
            <h2 style={styles.userNameText}>{user?.name}</h2>
            <span style={{ ...styles.roleTag, textTransform: 'uppercase' }}>{user?.role}</span>
          </div>
          <p style={styles.identifierText}>{user?.identifier || user?.email || user?.phone}</p>
          <div style={styles.locationTag}>
            <MapPin size={14} color="#6D28D9" />
            <span>{user?.village || 'Rampur Village'}</span>
          </div>
        </div>
      </div>

      {/* Save Success Alert */}
      {saveSuccess && (
        <div style={styles.successBanner}>
          <Check size={18} color="#059669" strokeWidth={2.6} />
          <span>{t('profile.successMsg')}</span>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div style={styles.errorBanner}>
          <AlertCircle size={18} color="#DC2626" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* View / Edit Mode Action Bar */}
      <div style={styles.modeBar}>
        <span style={styles.modeTitle}>
          {isEditing ? t('profile.editingTitle') : t('profile.title')}
        </span>
        <button
          style={{
            ...styles.modeBtn,
            backgroundColor: isEditing ? '#FEF2F2' : '#F5F3FF',
            borderColor: isEditing ? '#FECACA' : '#DDD6FE',
            color: isEditing ? '#DC2626' : '#6D28D9',
          }}
          onClick={() => {
            if (isEditing) {
              setIsEditing(false);
              setErrorMessage('');
            } else {
              setIsEditing(true);
            }
          }}
        >
          {isEditing ? (
            <>
              <X size={15} strokeWidth={2.5} />
              <span>{t('profile.cancelBtn')}</span>
            </>
          ) : (
            <>
              <Edit3 size={15} strokeWidth={2.5} />
              <span>{t('profile.editBtn')}</span>
            </>
          )}
        </button>
      </div>

      {/* Profile Form / View */}
      <form onSubmit={handleSave} style={styles.form}>
        {/* SECTION 1: Personal Details */}
        <div className="card-base" style={styles.sectionCard}>
          <h3 style={styles.sectionHeading}>{t('profile.basicInfo')}</h3>

          <div style={styles.field}>
            <label style={styles.label}>{t('profile.fullName')}</label>
            {isEditing ? (
              <input
                type="text"
                style={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            ) : (
              <p style={styles.valueText}>{name}</p>
            )}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>{t('profile.village')}</label>
            {isEditing ? (
              <input
                type="text"
                style={styles.input}
                value={village}
                onChange={(e) => setVillage(e.target.value)}
              />
            ) : (
              <p style={styles.valueText}>{village}</p>
            )}
          </div>

          {/* Quick Real-Time Language Selector */}
          <div style={styles.field}>
            <div style={styles.langHeaderRow}>
              <label style={styles.label}>{t('profile.language')}</label>
              <Globe size={14} color="#6D28D9" />
            </div>
            <select
              style={styles.select}
              value={preferredLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
            >
              <option value="English">English</option>
              <option value="Hindi">हिंदी (Hindi)</option>
              <option value="Tamil">தமிழ் (Tamil)</option>
              <option value="Telugu">తెలుగు (Telugu)</option>
              <option value="Kannada">ಕನ್ನಡ (Kannada)</option>
              <option value="Malayalam">മലയാളം (Malayalam)</option>
            </select>
          </div>
        </div>

        {/* SECTION 2: Role-Specific Details */}

        {/* PATIENT ROLE SPECIFICS */}
        {user?.role === 'patient' && (
          <div className="card-base" style={styles.sectionCard}>
            <div style={styles.sectionHeaderWithIcon}>
              <Heart size={18} color="#6D28D9" strokeWidth={2.4} />
              <h3 style={styles.sectionHeading}>{t('profile.patientHeader')}</h3>
            </div>

            <div style={styles.twoColGrid}>
              <div style={styles.field}>
                <label style={styles.label}>{t('profile.age')}</label>
                {isEditing ? (
                  <input
                    type="number"
                    style={styles.input}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    min={0}
                    max={120}
                  />
                ) : (
                  <p style={styles.valueText}>{age} {t('profile.years')}</p>
                )}
              </div>

              <div style={styles.field}>
                <label style={styles.label}>{t('profile.gender')}</label>
                {isEditing ? (
                  <select
                    style={styles.select}
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                ) : (
                  <p style={styles.valueText}>{gender}</p>
                )}
              </div>
            </div>

            {/* Chronic Conditions Tags */}
            <div style={styles.field}>
              <label style={styles.label}>{t('profile.chronicConditions')}</label>
              {isEditing ? (
                <div style={styles.chipsSelector}>
                  <div style={styles.chipsRow}>
                    {availableChronicTags.map((tag) => {
                      const isSelected = chronicFlags.includes(tag);
                      return (
                        <button
                          type="button"
                          key={tag}
                          style={{
                            ...styles.chipBtn,
                            ...(isSelected ? styles.chipSelected : {}),
                          }}
                          onClick={() => handleToggleChronicFlag(tag)}
                        >
                          {isSelected && <Check size={14} strokeWidth={2.8} />}
                          <span>{tag}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={styles.chipsRow}>
                  {chronicFlags.length > 0 ? (
                    chronicFlags.map((flag, i) => (
                      <span key={i} style={styles.chronicBadge}>
                        {flag}
                      </span>
                    ))
                  ) : (
                    <p style={styles.mutedText}>{t('profile.noChronic')}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* EMERGENCY CONTACT SECTION (for Patients) */}
        {user?.role === 'patient' && (
          <div className="card-base" style={styles.sectionCard}>
            <div style={styles.sectionHeaderWithIcon}>
              <ShieldAlert size={18} color="#DC2626" strokeWidth={2.4} />
              <h3 style={styles.sectionHeading}>{t('emergencyAlert.profileHeader')}</h3>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>{t('emergencyAlert.contactName')}</label>
              {isEditing ? (
                <input
                  type="text"
                  style={styles.input}
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                />
              ) : (
                <p style={styles.valueText}>{emergencyContactName || 'Ramesh Kumar'}</p>
              )}
            </div>

            <div style={styles.twoColGrid}>
              <div style={styles.field}>
                <label style={styles.label}>{t('emergencyAlert.contactPhone')}</label>
                {isEditing ? (
                  <input
                    type="tel"
                    style={styles.input}
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={14} color="#6D28D9" />
                    <p style={styles.valueText}>{emergencyContactPhone || '+91 98765 43210'}</p>
                  </div>
                )}
              </div>

              <div style={styles.field}>
                <label style={styles.label}>{t('emergencyAlert.contactRelation')}</label>
                {isEditing ? (
                  <input
                    type="text"
                    style={styles.input}
                    value={emergencyContactRelation}
                    onChange={(e) => setEmergencyContactRelation(e.target.value)}
                    placeholder="e.g. Brother / Spouse / Neighbor"
                  />
                ) : (
                  <p style={styles.valueText}>{emergencyContactRelation || 'Brother'}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* DOCTOR ROLE SPECIFICS */}
        {user?.role === 'doctor' && (
          <div className="card-base" style={styles.sectionCard}>
            <div style={styles.sectionHeaderWithIcon}>
              <Stethoscope size={18} color="#6D28D9" strokeWidth={2.4} />
              <h3 style={styles.sectionHeading}>{t('profile.doctorHeader')}</h3>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>{t('profile.specialization')}</label>
              {isEditing ? (
                <input
                  type="text"
                  style={styles.input}
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="e.g. General Physician, Pediatrics"
                />
              ) : (
                <p style={styles.valueText}>{specialization}</p>
              )}
            </div>

            <div style={styles.field}>
              <label style={styles.label}>{t('profile.licenseId')}</label>
              {isEditing ? (
                <input
                  type="text"
                  style={styles.input}
                  value={licenseId}
                  onChange={(e) => setLicenseId(e.target.value)}
                  placeholder="e.g. MCI-2022-9842"
                />
              ) : (
                <p style={styles.valueText}>{licenseId || 'MCI-2022-08412'}</p>
              )}
            </div>

            <div style={styles.field}>
              <label style={styles.label}>{t('profile.availability')}</label>
              <div style={styles.availabilityList}>
                {availability.map((slot, i) => (
                  <div key={i} style={styles.availItem}>
                    <Clock size={15} color="#6D28D9" strokeWidth={2.4} />
                    <span style={styles.availText}>{slot}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Extended Availability Slots */}
            <div style={styles.field}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={styles.label}>Interactive Teleconsultation Slots ({availabilitySlots.length})</label>
                {isEditing && (
                  <span style={{ fontSize: '0.7rem', color: '#6D28D9', fontWeight: '700' }}>
                    Click slot to toggle booked state
                  </span>
                )}
              </div>

              {/* Slot Cards List */}
              <div style={styles.slotsGrid}>
                {availabilitySlots.map((slot) => (
                  <div
                    key={slot.id}
                    style={{
                      ...styles.slotCard,
                      backgroundColor: slot.isBooked ? '#FEF2F2' : '#F5F3FF',
                      borderColor: slot.isBooked ? '#FECACA' : '#DDD6FE',
                    }}
                    onClick={() => isEditing && handleToggleSlotBooked(slot.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ ...styles.slotDayTag, color: slot.isBooked ? '#991B1B' : '#6D28D9' }}>
                        {slot.day} • {slot.period}
                      </span>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveSlot(slot.id);
                          }}
                          style={styles.deleteSlotBtn}
                          title="Remove slot"
                        >
                          <Trash2 size={13} color="#DC2626" />
                        </button>
                      )}
                    </div>
                    <span style={{ ...styles.slotTimeText, color: slot.isBooked ? '#7F1D1D' : '#1E1B4B' }}>
                      {slot.time}
                    </span>
                    <span
                      style={{
                        ...styles.slotStatusTag,
                        backgroundColor: slot.isBooked ? '#FEE2E2' : '#DCFCE7',
                        color: slot.isBooked ? '#DC2626' : '#166534',
                      }}
                    >
                      {slot.isBooked ? 'Booked' : 'Available'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Add New Slot Form in Edit Mode */}
              {isEditing && (
                <div style={styles.addSlotBox}>
                  <strong style={{ fontSize: '0.78rem', color: '#4C1D95' }}>+ Add Teleconsultation Slot</strong>
                  <div style={styles.addSlotInputsRow}>
                    <select
                      style={styles.slotSelect}
                      value={newSlotDay}
                      onChange={(e) => setNewSlotDay(e.target.value)}
                    >
                      <option value="Today">Today</option>
                      <option value="Tomorrow">Tomorrow</option>
                      <option value="Mon">Monday</option>
                      <option value="Tue">Tuesday</option>
                      <option value="Wed">Wednesday</option>
                      <option value="Thu">Thursday</option>
                      <option value="Fri">Friday</option>
                      <option value="Sat">Saturday</option>
                    </select>

                    <input
                      type="text"
                      placeholder="e.g. 10:00 AM - 10:30 AM"
                      value={newSlotTime}
                      onChange={(e) => setNewSlotTime(e.target.value)}
                      style={styles.slotInput}
                    />

                    <select
                      style={styles.slotSelect}
                      value={newSlotPeriod}
                      onChange={(e) => setNewSlotPeriod(e.target.value)}
                    >
                      <option value="morning">Morning</option>
                      <option value="afternoon">Afternoon</option>
                      <option value="evening">Evening</option>
                    </select>

                    <button
                      type="button"
                      onClick={handleAddSlot}
                      style={styles.addSlotBtn}
                    >
                      <Plus size={16} color="#FFFFFF" strokeWidth={2.6} />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ADMIN ROLE SPECIFICS */}
        {user?.role === 'admin' && (
          <div className="card-base" style={styles.sectionCard}>
            <div style={styles.sectionHeaderWithIcon}>
              <ShieldCheck size={18} color="#6D28D9" strokeWidth={2.4} />
              <h3 style={styles.sectionHeading}>{t('profile.adminHeader')}</h3>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>{t('profile.designation')}</label>
              {isEditing ? (
                <input
                  type="text"
                  style={styles.input}
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Primary Health Center Officer"
                />
              ) : (
                <p style={styles.valueText}>{designation}</p>
              )}
            </div>

            <div style={styles.field}>
              <label style={styles.label}>{t('profile.jurisdiction')}</label>
              <p style={styles.valueText}>{t('profile.jurisdictionVal')}</p>
            </div>
          </div>
        )}

        {/* PHARMACY / HEALTHCARE CENTER ROLE SPECIFICS */}
        {user?.role === 'pharmacy' && (
          <div className="card-base" style={styles.sectionCard}>
            <div style={styles.sectionHeaderWithIcon}>
              <Building2 size={18} color="#6D28D9" strokeWidth={2.4} />
              <h3 style={styles.sectionHeading}>Healthcare Center & Medical Shop Details</h3>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Medical Center / Shop Name</label>
              {isEditing ? (
                <input
                  type="text"
                  style={styles.input}
                  value={facilityName}
                  onChange={(e) => setFacilityName(e.target.value)}
                  placeholder="e.g. Rampur Jan Aushadhi & Medicals"
                />
              ) : (
                <p style={styles.valueText}>{facilityName || `${user?.name} Medical Store`}</p>
              )}
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Physical Address & Landmark</label>
              {isEditing ? (
                <input
                  type="text"
                  style={styles.input}
                  value={facilityAddress}
                  onChange={(e) => setFacilityAddress(e.target.value)}
                  placeholder="e.g. Shop 4, Main Market, Rampur"
                />
              ) : (
                <p style={styles.valueText}>{facilityAddress || user?.village || 'Rampur Village Hub'}</p>
              )}
            </div>

            <div style={styles.twoColGrid}>
              <div style={styles.field}>
                <label style={styles.label}>Shop Helpline / Phone</label>
                {isEditing ? (
                  <input
                    type="text"
                    style={styles.input}
                    value={facilityPhone}
                    onChange={(e) => setFacilityPhone(e.target.value)}
                    placeholder="e.g. +91 98765 20003"
                  />
                ) : (
                  <p style={styles.valueText}>{facilityPhone || user?.phone || '+91 98765 20003'}</p>
                )}
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Operating Hours</label>
                {isEditing ? (
                  <input
                    type="text"
                    style={styles.input}
                    value={facilityHours}
                    onChange={(e) => setFacilityHours(e.target.value)}
                    placeholder="e.g. 08:00 AM - 09:30 PM (Daily)"
                  />
                ) : (
                  <p style={styles.valueText}>{facilityHours || '08:00 AM - 09:30 PM (Daily)'}</p>
                )}
              </div>
            </div>

            <div style={styles.twoColGrid}>
              <div style={styles.field}>
                <label style={styles.label}>GPS Latitude</label>
                {isEditing ? (
                  <input
                    type="text"
                    style={styles.input}
                    value={facilityLat}
                    onChange={(e) => setFacilityLat(e.target.value)}
                  />
                ) : (
                  <p style={styles.valueText}>{facilityLat}° N</p>
                )}
              </div>

              <div style={styles.field}>
                <label style={styles.label}>GPS Longitude</label>
                {isEditing ? (
                  <input
                    type="text"
                    style={styles.input}
                    value={facilityLng}
                    onChange={(e) => setFacilityLng(e.target.value)}
                  />
                ) : (
                  <p style={styles.valueText}>{facilityLng}° E</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Save Button (when editing) */}
        {isEditing && (
          <button type="submit" style={styles.saveSubmitBtn} disabled={saving}>
            <Check size={18} color="#FFFFFF" strokeWidth={2.6} />
            <span>{saving ? t('profile.saving') : t('profile.saveBtn')}</span>
          </button>
        )}
      </form>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  profileHeaderCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '16px',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #DDD6FE',
  },
  avatarLarge: {
    width: '60px',
    height: '60px',
    borderRadius: '16px',
    backgroundColor: '#EDE9FE',
    border: '2px solid #C4B5FD',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerMeta: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  userNameText: {
    fontSize: '1.08rem',
    fontWeight: '800',
    color: '#1E1B4B',
    lineHeight: '1.2',
  },
  roleTag: {
    fontSize: '0.66rem',
    fontWeight: '800',
    color: '#6D28D9',
    backgroundColor: '#F5F3FF',
    padding: '3px 8px',
    borderRadius: '6px',
    border: '1px solid #DDD6FE',
  },
  identifierText: {
    fontSize: '0.78rem',
    color: '#475569',
    fontWeight: '600',
    marginTop: '3px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  locationTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '0.78rem',
    color: '#6D28D9',
    fontWeight: '700',
    marginTop: '4px',
  },
  successBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#ECFDF5',
    border: '1.5px solid #A7F3D0',
    borderRadius: '12px',
    padding: '11px 14px',
    color: '#059669',
    fontSize: '0.84rem',
    fontWeight: '800',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#FEF2F2',
    border: '1.5px solid #FECACA',
    borderRadius: '12px',
    padding: '11px 14px',
    color: '#DC2626',
    fontSize: '0.84rem',
    fontWeight: '700',
  },
  modeBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '2px',
  },
  modeTitle: {
    fontSize: '0.86rem',
    fontWeight: '800',
    color: '#4C1D95',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  modeBtn: {
    border: '1.5px solid',
    borderRadius: '10px',
    padding: '6px 12px',
    fontSize: '0.78rem',
    fontWeight: '800',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sectionCard: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #E9D5FF',
  },
  sectionHeaderWithIcon: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sectionHeading: {
    fontSize: '0.92rem',
    fontWeight: '800',
    color: '#1E1B4B',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  langHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: '0.78rem',
    fontWeight: '700',
    color: '#475569',
  },
  valueText: {
    fontSize: '0.9rem',
    color: '#1E1B4B',
    fontWeight: '700',
    backgroundColor: '#F8F9FE',
    padding: '9px 12px',
    borderRadius: '10px',
    border: '1.5px solid #DDD6FE',
  },
  input: {
    backgroundColor: '#F8F9FE',
    border: '1.5px solid #DDD6FE',
    borderRadius: '10px',
    padding: '9px 12px',
    color: '#1E1B4B',
    fontSize: '0.88rem',
    fontWeight: '600',
    outline: 'none',
  },
  select: {
    backgroundColor: '#F8F9FE',
    border: '1.5px solid #DDD6FE',
    borderRadius: '10px',
    padding: '9px 12px',
    color: '#1E1B4B',
    fontSize: '0.88rem',
    fontWeight: '700',
    outline: 'none',
    cursor: 'pointer',
  },
  twoColGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  chipsSelector: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  chipsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  chipBtn: {
    backgroundColor: '#F8F9FE',
    border: '1.5px solid #DDD6FE',
    borderRadius: '9999px',
    padding: '6px 12px',
    fontSize: '0.78rem',
    fontWeight: '700',
    color: '#475569',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  chipSelected: {
    backgroundColor: '#6D28D9',
    borderColor: '#6D28D9',
    color: '#FFFFFF',
    fontWeight: '800',
    boxShadow: '0 2px 8px rgba(109, 40, 217, 0.25)',
  },
  chronicBadge: {
    backgroundColor: '#F5F3FF',
    border: '1.5px solid #DDD6FE',
    color: '#6D28D9',
    fontSize: '0.78rem',
    fontWeight: '800',
    padding: '4px 10px',
    borderRadius: '9999px',
  },
  mutedText: {
    fontSize: '0.8rem',
    color: '#64748B',
    fontStyle: 'italic',
  },
  availabilityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  availItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#F5F3FF',
    padding: '8px 12px',
    borderRadius: '10px',
    border: '1px solid #DDD6FE',
  },
  availText: {
    fontSize: '0.82rem',
    color: '#1E1B4B',
    fontWeight: '700',
  },
  slotsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '8px',
    marginTop: '4px',
  },
  slotCard: {
    padding: '8px 10px',
    borderRadius: '10px',
    border: '1.5px solid',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  slotDayTag: {
    fontSize: '0.68rem',
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  deleteSlotBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotTimeText: {
    fontSize: '0.78rem',
    fontWeight: '800',
  },
  slotStatusTag: {
    alignSelf: 'flex-start',
    fontSize: '0.62rem',
    fontWeight: '800',
    padding: '1px 6px',
    borderRadius: '4px',
    marginTop: '2px',
  },
  addSlotBox: {
    marginTop: '8px',
    padding: '10px 12px',
    backgroundColor: '#F5F3FF',
    borderRadius: '10px',
    border: '1px dashed #C4B5FD',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  addSlotInputsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    alignItems: 'center',
  },
  slotSelect: {
    padding: '6px 8px',
    borderRadius: '8px',
    border: '1px solid #DDD6FE',
    backgroundColor: '#FFFFFF',
    fontSize: '0.74rem',
    fontWeight: '700',
    color: '#1E1B4B',
    outline: 'none',
  },
  slotInput: {
    flex: 1,
    minWidth: '130px',
    padding: '6px 8px',
    borderRadius: '8px',
    border: '1px solid #DDD6FE',
    backgroundColor: '#FFFFFF',
    fontSize: '0.74rem',
    color: '#1E1B4B',
    outline: 'none',
  },
  addSlotBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#6D28D9',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    padding: '6px 10px',
    fontSize: '0.74rem',
    fontWeight: '800',
    cursor: 'pointer',
  },
  saveSubmitBtn: {
    height: '46px',
    backgroundColor: '#6D28D9',
    border: 'none',
    borderRadius: '12px',
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: '0.92rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(109, 40, 217, 0.3)',
    marginTop: '6px',
  }
};

export default ProfilePage;
