import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import medicineService from '../services/medicine.service';
import facilityService from '../services/facility.service';
import {
  Search,
  ArrowLeft,
  Pill,
  Building2,
  MapPin,
  Navigation,
  Phone,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  X,
  Plus,
  Edit3,
  Package,
  Layers,
  Sparkles,
  RefreshCw,
  Lock,
  Compass,
  Crosshair,
  TrendingDown,
  Info,
} from 'lucide-react';

const POPULAR_MEDICINES = [
  'Paracetamol 650mg',
  'Amoxicillin & Potassium Clavulanate 625mg',
  'Oral Rehydration Salts (ORS) Sachet',
  'Metformin Hydrochloride 500mg (SR)',
  'Cetirizine Hydrochloride 10mg',
  'Azithromycin 500mg',
  'Amlodipine Besylate 5mg',
  'Salbutamol / Albuterol 100mcg Inhaler',
  'Insulin Glargine 100 IU/ml Cartridge',
];

const DEFAULT_RURAL_COORDS = { lat: 28.8031, lng: 79.0252, label: 'Rampur Village Hub' };

export const FindMedicinesPage = ({ onBack }) => {
  const { t } = useTranslation();
  const { user, token } = useAuth();

  const MEDICINE_CATEGORIES = [
    { id: 'all', label: t('findMedicines.categoryAll') },
    { id: 'Fever & Pain Relief', label: t('findMedicines.catFever') },
    { id: 'Antibiotics & Infection', label: t('findMedicines.catAntibiotics') },
    { id: 'Diabetes & Blood Sugar', label: t('findMedicines.catDiabetes') },
    { id: 'Blood Pressure & Heart', label: t('findMedicines.catHeart') },
    { id: 'Respiratory & Cough', label: t('findMedicines.catRespiratory') },
    { id: 'Gastro & Digestion', label: t('findMedicines.catGastro') },
    { id: 'First Aid & Antiseptics', label: t('findMedicines.catFirstAid') },
  ];

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [nearbyResults, setNearbyResults] = useState([]);
  const [catalogMedicines, setCatalogMedicines] = useState([]);
  const [pharmaciesList, setPharmaciesList] = useState([]);
  const [loading, setLoading] = useState(true);

  // User GPS coordinates
  const [userLocation, setUserLocation] = useState(() => {
    if (user?.facilityLocation?.lat && user?.facilityLocation?.lng) {
      return {
        lat: Number(user.facilityLocation.lat),
        lng: Number(user.facilityLocation.lng),
        label: user.facilityName || user.village || 'Your Registered Location',
      };
    }
    return DEFAULT_RURAL_COORDS;
  });
  const [gpsStatus, setGpsStatus] = useState('acquiring');

  // Stock Update Form Modal state (for pharmacy / admin roles)
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockPharmacyId, setStockPharmacyId] = useState('');
  const [stockMedName, setStockMedName] = useState('');
  const [stockInStock, setStockInStock] = useState(true);
  const [stockQuantity, setStockQuantity] = useState(50);
  const [stockPrice, setStockPrice] = useState(15.0);
  const [stockBatch, setStockBatch] = useState('');
  const [stockUpdating, setStockUpdating] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState(null);

  // Check if current user is authorized to update stock
  const isAuthorizedToUpdate = user?.role === 'admin' || user?.role === 'pharmacy';

  // 1. Acquire GPS location
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            label: 'Your Live GPS Location',
          });
          setGpsStatus('active');
        },
        (err) => {
          console.warn('[FindMedicines] GPS fallback:', err.message);
          setGpsStatus('fallback');
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
      );
    } else {
      setGpsStatus('fallback');
    }
  }, []);

  // 2. Fetch available pharmacies for the dropdown
  useEffect(() => {
    const loadPharmacies = async () => {
      try {
        const res = await facilityService.getNearbyFacilities(userLocation.lat, userLocation.lng, 'pharmacy');
        if (res.success && Array.isArray(res.facilities)) {
          setPharmaciesList(res.facilities);
          if (res.facilities.length > 0 && !stockPharmacyId) {
            setStockPharmacyId(res.facilities[0]._id || res.facilities[0].id);
          }
        }
      } catch (err) {
        console.warn('Failed to load pharmacies:', err.message);
      }
    };
    loadPharmacies();
  }, [userLocation.lat, userLocation.lng]);

  // 3. Perform Proximity Search for In-Stock Medicines
  const performNearbySearch = async () => {
    setLoading(true);
    try {
      const data = await medicineService.getNearbyStock({
        medicine: searchTerm,
        lat: userLocation.lat,
        lng: userLocation.lng,
      });

      if (data.success && Array.isArray(data.results)) {
        let list = data.results;
        // Filter by category if one is selected
        if (selectedCategory !== 'all') {
          const matchingNames = catalogMedicines
            .filter((m) => m.category.toLowerCase() === selectedCategory.toLowerCase())
            .map((m) => m.name.toLowerCase());

          if (matchingNames.length > 0) {
            list = list.filter((item) =>
              matchingNames.some(
                (name) =>
                  item.medicineName.toLowerCase().includes(name) ||
                  name.includes(item.medicineName.toLowerCase())
              )
            );
          }
        }
        setNearbyResults(list);
      }
    } catch (err) {
      console.warn('Error fetching nearby medicine stock:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // 4. Fetch Full Catalog for browsing / quick selection
  const loadCatalog = async () => {
    try {
      const data = await medicineService.searchMedicines({
        search: searchTerm,
        category: selectedCategory,
      });
      if (data.success && Array.isArray(data.medicines)) {
        setCatalogMedicines(data.medicines);
      }
    } catch (err) {
      console.warn('Error fetching catalog:', err.message);
    }
  };

  useEffect(() => {
    performNearbySearch();
    loadCatalog();
  }, [searchTerm, selectedCategory, userLocation.lat, userLocation.lng]);

  const handleSelectPopular = (medName) => {
    setSearchTerm(medName);
  };

  // Handle Stock Update Submission
  const handleStockSubmit = async (e) => {
    e.preventDefault();
    if (!stockPharmacyId || !stockMedName) {
      setStatusFeedback({ type: 'error', message: 'Please select pharmacy and medicine name' });
      return;
    }

    setStockUpdating(true);
    setStatusFeedback(null);

    try {
      const res = await medicineService.updatePharmacyStock(
        {
          pharmacyId: stockPharmacyId,
          medicineName: stockMedName,
          inStock: stockInStock,
          quantity: parseInt(stockQuantity, 10) || 0,
          price: parseFloat(stockPrice) || 0,
          batchNumber: stockBatch || 'BATCH-STD',
        },
        token
      );

      if (res.success) {
        setStatusFeedback({ type: 'success', message: `${t('app.save')}: ${stockMedName}` });
        setShowStockModal(false);
        performNearbySearch();
        loadCatalog();
      }
    } catch (err) {
      setStatusFeedback({ type: 'error', message: err.message || 'Failed to update stock' });
    } finally {
      setStockUpdating(false);
    }
  };

  const openStockModalForMedicine = (medName, pharmacyId = null, currentStock = true, qty = 50, price = 15) => {
    setStockMedName(medName);
    if (pharmacyId) setStockPharmacyId(pharmacyId);
    setStockInStock(currentStock);
    setStockQuantity(qty);
    setStockPrice(price);
    setShowStockModal(true);
    setStatusFeedback(null);
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Recently';
    const d = new Date(dateStr);
    const mins = Math.round((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
  };

  return (
    <div style={styles.container}>
      {/* Top Header */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          {onBack && (
            <button
              type="button"
              style={styles.backBtn}
              onClick={onBack}
              title={t('app.back')}
              aria-label={t('app.back')}
            >
              <ArrowLeft size={20} color="#1E1B4B" />
            </button>
          )}
          <div style={styles.titleWrap}>
            <div style={styles.titleRow}>
              <h1 style={styles.pageTitle}>{t('findMedicines.title')}</h1>
              <span style={styles.badgeGovt}>
                <ShieldCheck size={12} color="#059669" />
                {t('findMedicines.govtGeneric')}
              </span>
            </div>
            <p style={styles.pageSub}>
              {t('findMedicines.subtitle')}
            </p>
          </div>
        </div>

        {/* Live Search Input */}
        <div style={styles.searchBox}>
          <Search size={17} color="#6D28D9" style={styles.searchIcon} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('findMedicines.searchPlaceholder')}
            style={styles.searchInput}
          />
          {searchTerm && (
            <button
              type="button"
              style={styles.clearSearchBtn}
              onClick={() => setSearchTerm('')}
            >
              <X size={15} color="#64748B" />
            </button>
          )}
        </div>

        {/* Popular Medicine Suggestions Chips */}
        <div style={styles.popularWrap}>
          <div style={styles.popularScroll}>
            {POPULAR_MEDICINES.map((med, idx) => {
              const isSelected = searchTerm.toLowerCase() === med.toLowerCase();
              return (
                <button
                  key={idx}
                  type="button"
                  style={{
                    ...styles.popularChip,
                    backgroundColor: isSelected ? '#6D28D9' : '#FFFFFF',
                    color: isSelected ? '#FFFFFF' : '#475569',
                    borderColor: isSelected ? '#6D28D9' : '#E2E8F0',
                  }}
                  onClick={() => handleSelectPopular(isSelected ? '' : med)}
                >
                  <Pill size={11} color={isSelected ? '#FFFFFF' : '#D97706'} />
                  <span>{med.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div style={styles.categoryScroll}>
          {MEDICINE_CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                style={{
                  ...styles.categoryPill,
                  backgroundColor: isActive ? '#D97706' : '#FFFBEB',
                  color: isActive ? '#FFFFFF' : '#92400E',
                  borderColor: isActive ? '#D97706' : '#FDE68A',
                }}
                onClick={() => setSelectedCategory(cat.id)}
              >
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* GPS Proximity Banner */}
        <div style={styles.gpsBanner}>
          <div style={styles.gpsLeft}>
            <Crosshair size={14} color="#6D28D9" />
            <span style={styles.gpsText}>
              {gpsStatus === 'active'
                ? `GPS: ${userLocation.lat.toFixed(3)}° N, ${userLocation.lng.toFixed(3)}° E`
                : `${userLocation.label}`}
            </span>
          </div>
          <div style={styles.gpsRight}>
            <span style={styles.sortIndicator}>📍 {t('facilityLocator.sortedByDistance')}</span>
          </div>
        </div>
      </div>

      {/* Role-Specific Action Bar: Stock Update Management */}
      <div className="card-base" style={styles.roleActionBar}>
        <div style={styles.roleLeft}>
          <div style={styles.roleIconBox}>
            <Package size={18} color="#6D28D9" strokeWidth={2.4} />
          </div>
          <div>
            <div style={styles.roleTitleRow}>
              <span style={styles.roleTitle}>
                {user?.role === 'pharmacy'
                  ? `${user.facilityName || user.name}`
                  : t('pharmacyDashboard.title')}
              </span>
              {isAuthorizedToUpdate ? (
                <span style={styles.roleBadgeAuth}>{t('roles.pharmacy')}</span>
              ) : (
                <span style={styles.roleBadgePublic}>{t('facilityLocator.verifiedBadge')}</span>
              )}
            </div>
            <p style={styles.roleSub}>
              {t('pharmacyDashboard.sub')}
            </p>
          </div>
        </div>

        {isAuthorizedToUpdate && (
          <button
            type="button"
            style={styles.updateStockBtn}
            onClick={() => {
              setStockPharmacyId(user?.facilityId || (pharmaciesList[0]?._id || ''));
              setStockMedName(searchTerm || 'Paracetamol 650mg');
              setShowStockModal(true);
            }}
          >
            <Plus size={15} color="#FFFFFF" strokeWidth={2.5} />
            <span>{t('pharmacyDashboard.addMedBtn')}</span>
          </button>
        )}
      </div>

      {/* Status Feedback Toast */}
      {statusFeedback && (
        <div
          style={{
            ...styles.feedbackBanner,
            backgroundColor: statusFeedback.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            borderColor: statusFeedback.type === 'success' ? '#A7F3D0' : '#FECACA',
            color: statusFeedback.type === 'success' ? '#065F46' : '#991B1B',
          }}
        >
          {statusFeedback.type === 'success' ? (
            <CheckCircle2 size={16} color="#059669" />
          ) : (
            <AlertTriangle size={16} color="#DC2626" />
          )}
          <span>{statusFeedback.message}</span>
          <button
            type="button"
            style={styles.closeFeedbackBtn}
            onClick={() => setStatusFeedback(null)}
          >
            <X size={14} color="#64748B" />
          </button>
        </div>
      )}

      {/* Results Header */}
      <div style={styles.resultsHeader}>
        <div style={styles.resultsTitleRow}>
          <h2 style={styles.resultsTitle}>
            {t('facilityLocator.nearbyHeading')}
            <span style={styles.resultsCountBadge}>{nearbyResults.length}</span>
          </h2>
          {searchTerm && (
            <span style={styles.searchActiveChip}>
              &ldquo;{searchTerm}&rdquo;
            </span>
          )}
        </div>
      </div>

      {/* Main Results Listing */}
      {loading ? (
        <div style={styles.loadingBox}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>{t('app.loading')}</p>
        </div>
      ) : nearbyResults.length === 0 ? (
        <div className="card-base" style={styles.emptyCard}>
          <div style={styles.emptyIconCircle}>
            <Pill size={32} color="#D97706" />
          </div>
          <h3 style={styles.emptyTitle}>{t('findMedicines.noMedicinesTitle')}</h3>
          <p style={styles.emptySub}>
            {t('findMedicines.noMedicinesSub')}
          </p>
          <div style={styles.emptyActions}>
            <button
              type="button"
              style={styles.clearFiltersBtn}
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
              }}
            >
              <RefreshCw size={14} color="#6D28D9" />
              <span>{t('app.clear')}</span>
            </button>
            {isAuthorizedToUpdate && (
              <button
                type="button"
                style={styles.addStockEmptyBtn}
                onClick={() => {
                  setStockMedName(searchTerm || 'Paracetamol 650mg');
                  setShowStockModal(true);
                }}
              >
                <Plus size={14} color="#FFFFFF" />
                <span>{t('pharmacyDashboard.addMedBtn')}</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={styles.cardsGrid}>
          {nearbyResults.map((item, idx) => {
            const fac = item.pharmacy;
            const isMyCenter = user?.facilityId && (String(user.facilityId) === String(fac._id) || String(user.facilityId) === String(fac.id));
            const isSameCenterName = user?.facilityName && fac.name && user.facilityName.trim().toLowerCase() === fac.name.trim().toLowerCase();

            let distanceDisplay = `${item.distanceKm} ${t('findMedicines.distanceKm')}`;
            if (isMyCenter || isSameCenterName) {
              distanceDisplay = `0.1 ${t('app.km')}`;
            }

            return (
              <div key={item._id || idx} className="card-base" style={styles.stockResultCard}>
                {/* Card Top: Distance + In-Stock Badge */}
                <div style={styles.cardTopRow}>
                  <div style={styles.distanceBadge}>
                    <Navigation size={13} color="#6D28D9" strokeWidth={2.4} />
                    <span>{distanceDisplay}</span>
                  </div>

                  <div style={styles.inStockBadge}>
                    <CheckCircle2 size={13} color="#059669" strokeWidth={2.4} />
                    <span>{t('findMedicines.inStock')} ({item.quantity} units)</span>
                  </div>
                </div>

                {/* Medicine Title & Generic Details */}
                <div style={styles.medNameSection}>
                  <div style={styles.medIconBox}>
                    <Pill size={18} color="#D97706" strokeWidth={2.4} />
                  </div>
                  <div style={styles.medTextWrap}>
                    <h3 style={styles.medTitle}>{item.medicineName}</h3>
                    <div style={styles.medMetaRow}>
                      <span style={styles.priceTag}>
                        ₹{item.price.toFixed(2)}{' '}
                        <span style={styles.subsidizedLabel}>{t('findMedicines.janAushadhiBadge')}</span>
                      </span>
                      <span style={styles.lastUpdatedText}>
                        • {formatTimeAgo(item.lastUpdated)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pharmacy Information Strip */}
                <div style={styles.pharmacyDetailsBox}>
                  <div style={styles.pharmacyHeaderRow}>
                    <h4 style={styles.pharmacyName}>{fac.name}</h4>
                    {fac.isGovernmentVerified && (
                      <span style={styles.govtChip}>
                        <ShieldCheck size={11} color="#059669" />
                        {t('facilityLocator.verifiedBadge')}
                      </span>
                    )}
                  </div>

                  <div style={styles.pharmacyInfoRow}>
                    <MapPin size={13} color="#64748B" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={styles.pharmacyAddress}>{fac.address}</span>
                  </div>

                  <div style={styles.pharmacyInfoRow}>
                    <Clock size={13} color="#059669" style={{ flexShrink: 0 }} />
                    <span style={styles.pharmacyHours}>{fac.hours}</span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div style={styles.cardActionRow}>
                  {fac.location && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${fac.location.lat},${fac.location.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.directionsBtn}
                    >
                      <Navigation size={14} color="#FFFFFF" strokeWidth={2.4} />
                      <span>{t('facilityLocator.getDirections')}</span>
                    </a>
                  )}

                  {fac.phone && (
                    <a
                      href={`tel:${fac.phone.replace(/[^0-9+]/g, '')}`}
                      style={styles.callBtn}
                      title={`${t('facilityLocator.callFacility')}: ${fac.name}`}
                    >
                      <Phone size={14} color="#6D28D9" strokeWidth={2.4} />
                      <span>{t('findMedicines.callPharmacy')}</span>
                    </a>
                  )}

                  {isAuthorizedToUpdate && (
                    <button
                      type="button"
                      style={styles.editStockBtn}
                      onClick={() =>
                        openStockModalForMedicine(
                          item.medicineName,
                          fac._id || fac.id,
                          item.inStock,
                          item.quantity,
                          item.price
                        )
                      }
                      title={t('app.edit')}
                    >
                      <Edit3 size={14} color="#6D28D9" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stock Update Form Modal Dialog (Pharmacy & Admin Role Restricted) */}
      {showStockModal && (
        <div style={styles.modalOverlay} onClick={() => setShowStockModal(false)}>
          <div style={styles.modalDialog} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalHeaderLeft}>
                <div style={styles.modalIconBox}>
                  <Package size={20} color="#6D28D9" />
                </div>
                <div>
                  <h3 style={styles.modalTitle}>{t('pharmacyDashboard.modalAddTitle')}</h3>
                  <span style={styles.modalSubtitle}>{t('roles.pharmacy')}</span>
                </div>
              </div>
              <button
                type="button"
                style={styles.closeModalBtn}
                onClick={() => setShowStockModal(false)}
              >
                <X size={18} color="#475569" />
              </button>
            </div>

            <form onSubmit={handleStockSubmit} style={styles.modalForm}>
              {/* Select Pharmacy Center */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>{t('profile.pharmacyHeader')} *</label>
                {user?.role === 'pharmacy' ? (
                  <div style={styles.myCenterPill}>
                    <Building2 size={15} color="#6D28D9" />
                    <span style={styles.myCenterText}>
                      {user.facilityName || `${user.name} Medical Store`}
                    </span>
                  </div>
                ) : (
                  <select
                    value={stockPharmacyId}
                    onChange={(e) => setStockPharmacyId(e.target.value)}
                    style={styles.formSelect}
                    required
                  >
                    {pharmaciesList.length === 0 ? (
                      <option value="">No registered pharmacies found</option>
                    ) : (
                      pharmaciesList.map((p) => (
                        <option key={p._id || p.id} value={p._id || p.id}>
                          {p.name}
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>

              {/* Medicine Name */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>{t('pharmacyDashboard.medNameLabel')} *</label>
                <input
                  type="text"
                  value={stockMedName}
                  onChange={(e) => setStockMedName(e.target.value)}
                  placeholder={t('findMedicines.searchPlaceholder')}
                  style={styles.formInput}
                  required
                />
              </div>

              {/* In-Stock Status Toggle */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>{t('pharmacyDashboard.inStockLabel')}</label>
                <div style={styles.toggleRow}>
                  <button
                    type="button"
                    style={{
                      ...styles.toggleBtn,
                      backgroundColor: stockInStock ? '#ECFDF5' : '#FFFFFF',
                      borderColor: stockInStock ? '#10B981' : '#E2E8F0',
                      color: stockInStock ? '#065F46' : '#64748B',
                      fontWeight: stockInStock ? '800' : '600',
                    }}
                    onClick={() => {
                      setStockInStock(true);
                      if (stockQuantity === 0) setStockQuantity(50);
                    }}
                  >
                    <CheckCircle2 size={16} color={stockInStock ? '#059669' : '#94A3B8'} />
                    <span>{t('findMedicines.inStock')}</span>
                  </button>

                  <button
                    type="button"
                    style={{
                      ...styles.toggleBtn,
                      backgroundColor: !stockInStock ? '#FEF2F2' : '#FFFFFF',
                      borderColor: !stockInStock ? '#EF4444' : '#E2E8F0',
                      color: !stockInStock ? '#991B1B' : '#64748B',
                      fontWeight: !stockInStock ? '800' : '600',
                    }}
                    onClick={() => {
                      setStockInStock(false);
                      setStockQuantity(0);
                    }}
                  >
                    <AlertTriangle size={16} color={!stockInStock ? '#DC2626' : '#94A3B8'} />
                    <span>{t('findMedicines.outOfStock')}</span>
                  </button>
                </div>
              </div>

              {/* Quantity and Price Grid */}
              <div style={styles.formRow2}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>{t('pharmacyDashboard.qtyLabel')}</label>
                  <input
                    type="number"
                    min="0"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    style={styles.formInput}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>{t('pharmacyDashboard.priceLabel')}</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={stockPrice}
                    onChange={(e) => setStockPrice(e.target.value)}
                    style={styles.formInput}
                  />
                </div>
              </div>

              {/* Batch Number */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>{t('pharmacyDashboard.batchLabel')}</label>
                <input
                  type="text"
                  value={stockBatch}
                  onChange={(e) => setStockBatch(e.target.value)}
                  placeholder="e.g. JA-2026-B01"
                  style={styles.formInput}
                />
              </div>

              {/* Modal Buttons */}
              <div style={styles.modalActions}>
                <button
                  type="button"
                  style={styles.cancelBtn}
                  onClick={() => setShowStockModal(false)}
                >
                  {t('app.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={stockUpdating}
                  style={styles.submitStockBtn}
                >
                  {stockUpdating ? t('healthRecords.saving') : t('pharmacyDashboard.saveStockBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    paddingBottom: '24px',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  headerTop: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  backBtn: {
    width: '38px',
    height: '38px',
    borderRadius: '12px',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #E2E8F0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  titleWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '8px',
  },
  pageTitle: {
    fontSize: '1.2rem',
    fontWeight: '900',
    color: '#1E1B4B',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  badgeGovt: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.66rem',
    fontWeight: '800',
    color: '#059669',
    backgroundColor: '#ECFDF5',
    border: '1px solid #A7F3D0',
    padding: '2px 8px',
    borderRadius: '9999px',
  },
  pageSub: {
    fontSize: '0.74rem',
    color: '#64748B',
    margin: 0,
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #E2E8F0',
    borderRadius: '12px',
    padding: '0 10px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
  },
  searchIcon: {
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    padding: '10px 8px',
    fontSize: '0.8rem',
    color: '#1E1B4B',
  },
  clearSearchBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
  },
  popularWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  popularScroll: {
    display: 'flex',
    gap: '6px',
    overflowX: 'auto',
    paddingBottom: '2px',
  },
  popularChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '9999px',
    border: '1.5px solid',
    fontSize: '0.72rem',
    fontWeight: '700',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease',
  },
  categoryScroll: {
    display: 'flex',
    gap: '6px',
    overflowX: 'auto',
    paddingBottom: '2px',
  },
  categoryPill: {
    padding: '5px 12px',
    borderRadius: '9999px',
    border: '1.5px solid',
    fontSize: '0.72rem',
    fontWeight: '700',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease',
  },
  gpsBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 10px',
    backgroundColor: '#F5F3FF',
    border: '1px solid #DDD6FE',
    borderRadius: '8px',
  },
  gpsLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  gpsText: {
    fontSize: '0.7rem',
    fontWeight: '700',
    color: '#6D28D9',
  },
  gpsRight: {},
  sortIndicator: {
    fontSize: '0.68rem',
    fontWeight: '700',
    color: '#059669',
  },
  roleActionBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #DDD6FE',
  },
  roleLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 1,
  },
  roleIconBox: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    backgroundColor: '#F5F3FF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  roleTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  roleTitle: {
    fontSize: '0.84rem',
    fontWeight: '800',
    color: '#1E1B4B',
  },
  roleBadgeAuth: {
    fontSize: '0.64rem',
    fontWeight: '800',
    color: '#6D28D9',
    backgroundColor: '#EDE9FE',
    padding: '1px 6px',
    borderRadius: '4px',
  },
  roleBadgePublic: {
    fontSize: '0.64rem',
    fontWeight: '800',
    color: '#059669',
    backgroundColor: '#ECFDF5',
    padding: '1px 6px',
    borderRadius: '4px',
  },
  roleSub: {
    fontSize: '0.7rem',
    color: '#64748B',
    margin: '2px 0 0',
  },
  updateStockBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 12px',
    backgroundColor: '#6D28D9',
    border: 'none',
    borderRadius: '8px',
    color: '#FFFFFF',
    fontSize: '0.74rem',
    fontWeight: '800',
    cursor: 'pointer',
    flexShrink: 0,
  },
  feedbackBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1.5px solid',
    fontSize: '0.76rem',
    fontWeight: '700',
  },
  closeFeedbackBtn: {
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
  },
  resultsHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultsTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  resultsTitle: {
    fontSize: '0.92rem',
    fontWeight: '800',
    color: '#1E1B4B',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  resultsCountBadge: {
    fontSize: '0.7rem',
    fontWeight: '800',
    backgroundColor: '#EDE9FE',
    color: '#6D28D9',
    padding: '1px 6px',
    borderRadius: '9999px',
  },
  searchActiveChip: {
    fontSize: '0.7rem',
    fontWeight: '600',
    color: '#64748B',
  },
  loadingBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 16px',
    gap: '12px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #EDE9FE',
    borderTop: '3px solid #6D28D9',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: '0.78rem',
    color: '#6D28D9',
    fontWeight: '700',
  },
  emptyCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '30px 16px',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #E2E8F0',
    borderRadius: '14px',
  },
  emptyIconCircle: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: '#FFFBEB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '10px',
  },
  emptyTitle: {
    fontSize: '0.92rem',
    fontWeight: '800',
    color: '#1E1B4B',
    margin: '0 0 6px',
  },
  emptySub: {
    fontSize: '0.76rem',
    color: '#64748B',
    maxWidth: '320px',
    lineHeight: '1.4',
    margin: '0 0 16px',
  },
  emptyActions: {
    display: 'flex',
    gap: '8px',
  },
  clearFiltersBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    backgroundColor: '#F5F3FF',
    border: '1.5px solid #DDD6FE',
    borderRadius: '8px',
    color: '#6D28D9',
    fontSize: '0.76rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
  addStockEmptyBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    backgroundColor: '#6D28D9',
    border: 'none',
    borderRadius: '8px',
    color: '#FFFFFF',
    fontSize: '0.76rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
  cardsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  stockResultCard: {
    padding: '14px',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #E2E8F0',
    borderRadius: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  cardTopRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  distanceBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.72rem',
    fontWeight: '800',
    color: '#6D28D9',
    backgroundColor: '#F5F3FF',
    padding: '3px 8px',
    borderRadius: '6px',
    border: '1px solid #DDD6FE',
  },
  inStockBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.72rem',
    fontWeight: '800',
    color: '#059669',
    backgroundColor: '#ECFDF5',
    padding: '3px 8px',
    borderRadius: '6px',
    border: '1px solid #A7F3D0',
  },
  medNameSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  medIconBox: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    backgroundColor: '#FFFBEB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  medTextWrap: {
    flex: 1,
  },
  medTitle: {
    fontSize: '0.94rem',
    fontWeight: '800',
    color: '#1E1B4B',
    margin: 0,
  },
  medMetaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '2px',
  },
  priceTag: {
    fontSize: '0.78rem',
    fontWeight: '800',
    color: '#059669',
  },
  subsidizedLabel: {
    fontSize: '0.68rem',
    fontWeight: '600',
    color: '#D97706',
  },
  lastUpdatedText: {
    fontSize: '0.68rem',
    color: '#94A3B8',
  },
  pharmacyDetailsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: '10px',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  pharmacyHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '2px',
  },
  pharmacyName: {
    fontSize: '0.84rem',
    fontWeight: '800',
    color: '#1E1B4B',
    margin: 0,
  },
  govtChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '0.64rem',
    fontWeight: '800',
    color: '#059669',
  },
  pharmacyInfoRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '6px',
  },
  pharmacyAddress: {
    fontSize: '0.72rem',
    color: '#64748B',
    lineHeight: '1.3',
  },
  pharmacyHours: {
    fontSize: '0.72rem',
    color: '#059669',
    fontWeight: '600',
  },
  cardActionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  directionsBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '8px 12px',
    backgroundColor: '#6D28D9',
    borderRadius: '8px',
    color: '#FFFFFF',
    fontSize: '0.76rem',
    fontWeight: '700',
    textDecoration: 'none',
  },
  callBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '8px 12px',
    backgroundColor: '#F5F3FF',
    border: '1.5px solid #DDD6FE',
    borderRadius: '8px',
    color: '#6D28D9',
    fontSize: '0.76rem',
    fontWeight: '700',
    textDecoration: 'none',
  },
  editStockBtn: {
    padding: '8px 10px',
    backgroundColor: '#F1F5F9',
    border: '1.5px solid #CBD5E1',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    zIndex: 100,
    backdropFilter: 'blur(3px)',
  },
  modalDialog: {
    width: '100%',
    maxWidth: '440px',
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    borderBottom: '1.5px solid #F1F5F9',
  },
  modalHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  modalIconBox: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    backgroundColor: '#F5F3FF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: '0.94rem',
    fontWeight: '800',
    color: '#1E1B4B',
    margin: 0,
  },
  modalSubtitle: {
    fontSize: '0.68rem',
    color: '#64748B',
  },
  closeModalBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
  },
  modalForm: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  formLabel: {
    fontSize: '0.74rem',
    fontWeight: '700',
    color: '#334155',
  },
  myCenterPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#F5F3FF',
    border: '1.5px solid #DDD6FE',
    borderRadius: '8px',
  },
  myCenterText: {
    fontSize: '0.78rem',
    fontWeight: '700',
    color: '#6D28D9',
  },
  formSelect: {
    padding: '8px 10px',
    border: '1.5px solid #CBD5E1',
    borderRadius: '8px',
    fontSize: '0.8rem',
    color: '#1E1B4B',
    outline: 'none',
    backgroundColor: '#FFFFFF',
  },
  formInput: {
    padding: '8px 10px',
    border: '1.5px solid #CBD5E1',
    borderRadius: '8px',
    fontSize: '0.8rem',
    color: '#1E1B4B',
    outline: 'none',
  },
  toggleRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
  },
  toggleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '8px',
    border: '1.5px solid',
    borderRadius: '8px',
    fontSize: '0.74rem',
    cursor: 'pointer',
  },
  formRow2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  modalActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '6px',
  },
  cancelBtn: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#F1F5F9',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.78rem',
    fontWeight: '700',
    color: '#475569',
    cursor: 'pointer',
  },
  submitStockBtn: {
    flex: 2,
    padding: '10px',
    backgroundColor: '#6D28D9',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.78rem',
    fontWeight: '800',
    color: '#FFFFFF',
    cursor: 'pointer',
  },
};

export default FindMedicinesPage;
