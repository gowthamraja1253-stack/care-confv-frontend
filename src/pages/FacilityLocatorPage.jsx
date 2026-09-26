import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import facilityService from '../services/facility.service';
import { getMapTileUrl } from '../config/env';
import {
  MapPin,
  Navigation,
  Phone,
  Clock,
  Search,
  ArrowLeft,
  Hospital,
  Stethoscope,
  Building2,
  Pill,
  ShieldCheck,
  Compass,
  Crosshair,
  ExternalLink,
  Info,
  CheckCircle2,
  X,
  Bed,
  Users,
  AlertCircle
} from 'lucide-react';

const CATEGORY_TABS = [
  { id: 'all', key: 'tabAll', icon: Building2, color: '#6D28D9', bg: '#F5F3FF', border: '#DDD6FE' },
  { id: 'primary-health-centre', key: 'tabPhc', icon: Stethoscope, color: '#0D9488', bg: '#F0FDF4', border: '#A7F3D0' },
  { id: 'government-hospital', key: 'tabHospital', icon: Hospital, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  { id: 'clinic', key: 'tabClinic', icon: Building2, color: '#7C3AED', bg: '#FAF5FF', border: '#E9D5FF' },
  { id: 'pharmacy', key: 'tabPharmacy', icon: Pill, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
];

const DEFAULT_RURAL_COORDS = { lat: 28.8031, lng: 79.0252, label: 'Rampur District Grid' };

export const FacilityLocatorPage = ({ onBack }) => {
  const { t } = useTranslation();

  const [facilities, setFacilities] = useState([]);
  const [counts, setCounts] = useState({ all: 0, 'primary-health-centre': 0, 'government-hospital': 0, clinic: 0, pharmacy: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFacility, setSelectedFacility] = useState(null);

  // User GPS coordinates
  const [userLocation, setUserLocation] = useState(DEFAULT_RURAL_COORDS);
  const [gpsStatus, setGpsStatus] = useState('acquiring'); // 'acquiring' | 'active' | 'denied' | 'fallback'

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const userMarkerRef = useRef(null);

  // 1. Request Browser GPS Location
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            label: 'Your Current GPS Location',
          };
          setUserLocation(coords);
          setGpsStatus('active');
        },
        (err) => {
          console.warn('[Geolocation] Browser GPS access denied or timed out:', err.message);
          setGpsStatus('fallback');
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    } else {
      setGpsStatus('fallback');
    }
  }, []);

  // 2. Fetch Facilities with GPS Distance Sorting
  const fetchFacilities = async () => {
    setLoading(true);
    try {
      const data = await facilityService.getNearbyFacilities(
        userLocation.lat,
        userLocation.lng,
        selectedCategory,
        searchQuery
      );
      if (data.success && Array.isArray(data.facilities)) {
        setFacilities(data.facilities);
        if (data.counts) {
          setCounts(data.counts);
        }
      }
    } catch (err) {
      console.warn('Could not fetch facilities:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilities();
  }, [userLocation.lat, userLocation.lng, selectedCategory, searchQuery]);

  // 3. Initialize & Update Leaflet Interactive Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [userLocation.lat, userLocation.lng],
        zoom: 13,
        zoomControl: true,
      });

      L.tileLayer(getMapTileUrl(), {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;

    // Clear existing markers
    markersGroup.clearLayers();

    // Custom Icon for User's GPS Location
    const userHtml = `
      <div style="
        width: 22px; 
        height: 22px; 
        background: #6D28D9; 
        border: 3px solid #FFFFFF; 
        border-radius: 50%; 
        box-shadow: 0 0 0 6px rgba(109, 40, 217, 0.35);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="width: 6px; height: 6px; background: #FFFFFF; border-radius: 50%;"></div>
      </div>
    `;
    const userIcon = L.divIcon({
      html: userHtml,
      className: 'user-gps-marker',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
      .bindPopup(`<strong>📍 ${userLocation.label}</strong><br><span style="font-size: 11px; color: #64748B;">GPS Reference Point</span>`)
      .addTo(markersGroup);

    userMarkerRef.current = userMarker;

    // Helper to get category color & emoji
    const getCategoryStyles = (type) => {
      switch (type) {
        case 'government-hospital':
          return { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', symbol: '🏥' };
        case 'primary-health-centre':
          return { color: '#0D9488', bg: '#F0FDF4', border: '#A7F3D0', symbol: '🩺' };
        case 'clinic':
          return { color: '#7C3AED', bg: '#FAF5FF', border: '#E9D5FF', symbol: '🏨' };
        case 'pharmacy':
          return { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', symbol: '💊' };
        default:
          return { color: '#6D28D9', bg: '#F5F3FF', border: '#DDD6FE', symbol: '📍' };
      }
    };

    // Add Facility Markers
    facilities.forEach((fac) => {
      if (!fac.location || !fac.location.lat || !fac.location.lng) return;

      const meta = getCategoryStyles(fac.type);
      const markerHtml = `
        <div style="
          background-color: ${meta.color};
          width: 32px;
          height: 32px;
          border-radius: 10px;
          border: 2px solid #FFFFFF;
          box-shadow: 0 4px 10px rgba(0,0,0,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          color: #FFFFFF;
          cursor: pointer;
        ">
          ${meta.symbol}
        </div>
      `;

      const facilityIcon = L.divIcon({
        html: markerHtml,
        className: 'facility-custom-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const popupHtml = `
        <div style="font-family: inherit; padding: 2px; min-width: 170px;">
          <strong style="color: #1E1B4B; font-size: 13px; display: block; margin-bottom: 2px;">${fac.name}</strong>
          <span style="font-size: 11px; color: ${meta.color}; font-weight: 700; background: ${meta.bg}; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-bottom: 4px;">
            ${fac.distanceKm !== undefined ? `${fac.distanceKm} km away` : 'Nearby'}
          </span>
          <p style="margin: 3px 0; font-size: 11px; color: #475569;">${fac.address}</p>
          <div style="margin-top: 6px; display: flex; gap: 6px;">
            <a href="https://www.google.com/maps/dir/?api=1&destination=${fac.location.lat},${fac.location.lng}" target="_blank" rel="noopener noreferrer" style="background: #6D28D9; color: #FFFFFF; text-decoration: none; padding: 4px 8px; font-size: 11px; font-weight: 700; border-radius: 6px; display: inline-block;">
              Get Directions ↗
            </a>
          </div>
        </div>
      `;

      const marker = L.marker([fac.location.lat, fac.location.lng], { icon: facilityIcon })
        .bindPopup(popupHtml)
        .addTo(markersGroup);

      marker.on('click', () => {
        setSelectedFacility(fac);
      });
    });

    // Fit map bounds to include all markers if facilities exist
    if (facilities.length > 0) {
      const bounds = L.latLngBounds(
        [[userLocation.lat, userLocation.lng], ...facilities.map((f) => [f.location.lat, f.location.lng])]
      );
      map.fitBounds(bounds, { padding: [35, 35], maxZoom: 15 });
    }
  }, [facilities, userLocation]);

  const handleRecenterMap = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 14, { animate: true });
      if (userMarkerRef.current) {
        userMarkerRef.current.openPopup();
      }
    }
  };

  const handleFocusFacility = (fac) => {
    setSelectedFacility(fac);
    if (mapInstanceRef.current && fac.location) {
      mapInstanceRef.current.setView([fac.location.lat, fac.location.lng], 15, { animate: true });
    }
  };

  const getCategoryMeta = (type) => {
    const found = CATEGORY_TABS.find((c) => c.id === type);
    return found || CATEGORY_TABS[0];
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
              title="Back"
              aria-label="Back"
            >
              <ArrowLeft size={20} color="#1E1B4B" />
            </button>
          )}
          <div style={styles.titleWrap}>
            <div style={styles.titleRow}>
              <h1 style={styles.pageTitle}>{t('facilityLocator.title')}</h1>
              <span style={styles.badgeGovt}>
                <ShieldCheck size={12} color="#059669" />
                {t('facilityLocator.verifiedBadge')}
              </span>
            </div>
            <p style={styles.pageSub}>{t('facilityLocator.subtitle')}</p>
          </div>
        </div>

        {/* GPS Location & Live Search Bar */}
        <div style={styles.toolbar}>
          <div style={styles.searchBox}>
            <Search size={16} color="#64748B" style={styles.searchIcon} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('facilityLocator.searchPlaceholder')}
              style={styles.searchInput}
            />
            {searchQuery && (
              <button
                type="button"
                style={styles.clearSearchBtn}
                onClick={() => setSearchQuery('')}
              >
                <X size={14} color="#64748B" />
              </button>
            )}
          </div>
        </div>

        {/* GPS Status Banner */}
        <div style={styles.gpsBanner}>
          <div style={styles.gpsLeft}>
            <Crosshair size={14} color="#6D28D9" />
            <span style={styles.gpsStatusText}>
              {gpsStatus === 'active'
                ? `GPS Active: ${userLocation.lat.toFixed(4)}° N, ${userLocation.lng.toFixed(4)}° E`
                : `${userLocation.label} (Approximate Proximity)`}
            </span>
          </div>
          <button
            type="button"
            style={styles.recenterBtn}
            onClick={handleRecenterMap}
            title="Recenter Map"
          >
            <Compass size={13} color="#6D28D9" />
            <span>{t('facilityLocator.recenterBtn')}</span>
          </button>
        </div>

        {/* Category Tabs */}
        <div style={styles.tabsScrollWrap}>
          <div style={styles.tabsRow}>
            {CATEGORY_TABS.map((cat) => {
              const IconComp = cat.icon;
              const isActive = selectedCategory === cat.id;
              const countVal = cat.id === 'all' ? counts.all : counts[cat.id] || 0;
              return (
                <button
                  key={cat.id}
                  type="button"
                  style={{
                    ...styles.tabBtn,
                    backgroundColor: isActive ? cat.color : '#FFFFFF',
                    color: isActive ? '#FFFFFF' : '#475569',
                    borderColor: isActive ? cat.color : '#E2E8F0',
                  }}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <IconComp size={15} color={isActive ? '#FFFFFF' : cat.color} strokeWidth={2.2} />
                  <span>{t(`facilityLocator.${cat.key}`)}</span>
                  <span
                    style={{
                      ...styles.tabCount,
                      backgroundColor: isActive ? 'rgba(255, 255, 255, 0.25)' : cat.bg,
                      color: isActive ? '#FFFFFF' : cat.color,
                    }}
                  >
                    {countVal}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Interactive Map Container */}
      <div style={styles.mapCard}>
        <div ref={mapContainerRef} style={styles.mapElement} />
        <div style={styles.mapOverlayHint}>
          <Info size={12} color="#6D28D9" />
          <span>{t('facilityLocator.mapHint')}</span>
        </div>
      </div>

      {/* Facilities List Section */}
      <div style={styles.listSection}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>
            {t('facilityLocator.nearbyHeading')} ({facilities.length})
          </h2>
          <span style={styles.sortBadge}>📍 {t('facilityLocator.sortedByDistance')}</span>
        </div>

        {loading ? (
          <div style={styles.loadingBox}>
            <div style={styles.spinner} />
            <p style={styles.loadingText}>{t('app.loading')}</p>
          </div>
        ) : facilities.length === 0 ? (
          <div style={styles.emptyCard}>
            <Building2 size={36} color="#6D28D9" style={{ marginBottom: '8px' }} />
            <h3 style={styles.emptyTitle}>{t('facilityLocator.noFacilitiesTitle')}</h3>
            <p style={styles.emptySub}>{t('facilityLocator.noFacilitiesSub')}</p>
          </div>
        ) : (
          <div style={styles.facilitiesGrid}>
            {facilities.map((fac) => {
              const catMeta = getCategoryMeta(fac.type);
              const CatIcon = catMeta.icon;

              return (
                <div
                  key={fac._id || fac.id}
                  className="card-base"
                  style={{
                    ...styles.facilityCard,
                    borderColor: selectedFacility?._id === fac._id ? catMeta.color : '#E2E8F0',
                  }}
                  onClick={() => handleFocusFacility(fac)}
                >
                  {/* Top Row: Type Badge + Distance Chip */}
                  <div style={styles.cardHeaderRow}>
                    <div style={styles.cardCategoryWrap}>
                      <div
                        style={{
                          ...styles.categoryIconBox,
                          backgroundColor: catMeta.bg,
                          borderColor: catMeta.border,
                        }}
                      >
                        <CatIcon size={16} color={catMeta.color} strokeWidth={2.4} />
                      </div>
                      <span
                        style={{
                          ...styles.categoryPill,
                          color: catMeta.color,
                          backgroundColor: catMeta.bg,
                          borderColor: catMeta.border,
                        }}
                      >
                        {t(`facilityLocator.${catMeta.key}`)}
                      </span>
                    </div>

                    <div style={styles.distanceBadge}>
                      <Navigation size={12} color="#6D28D9" />
                      <span>{fac.distanceKm} {t('findMedicines.distanceKm')}</span>
                    </div>
                  </div>

                  {/* Facility Name */}
                  <h3 style={styles.facilityName}>{fac.name}</h3>

                  {/* Address */}
                  <div style={styles.infoRow}>
                    <MapPin size={13} color="#64748B" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={styles.addressText}>{fac.address}</span>
                  </div>

                  {/* Operating Hours */}
                  <div style={styles.infoRow}>
                    <Clock size={13} color="#059669" style={{ flexShrink: 0 }} />
                    <span style={styles.hoursText}>{fac.hours}</span>
                  </div>

                  {/* Key Services Badges */}
                  {Array.isArray(fac.services) && fac.services.length > 0 && (
                    <div style={styles.servicesRow}>
                      {fac.services.slice(0, 3).map((srv, idx) => (
                        <span key={idx} style={styles.serviceChip}>
                          <CheckCircle2 size={10} color="#059669" />
                          {srv}
                        </span>
                      ))}
                      {fac.services.length > 3 && (
                        <span style={styles.moreServicesText}>+{fac.services.length - 3}</span>
                      )}
                    </div>
                  )}

                  {/* Action Buttons Row */}
                  <div style={styles.cardActions}>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${fac.location.lat},${fac.location.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.directionsBtn}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Navigation size={14} color="#FFFFFF" strokeWidth={2.4} />
                      <span>{t('facilityLocator.getDirections')}</span>
                    </a>

                    {fac.phone && (
                      <a
                        href={`tel:${fac.phone.replace(/[^0-9+]/g, '')}`}
                        style={styles.callBtn}
                        onClick={(e) => e.stopPropagation()}
                        title={`Call ${fac.name}`}
                      >
                        <Phone size={14} color="#6D28D9" strokeWidth={2.4} />
                        <span>{t('facilityLocator.callFacility')}</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Facility Details Modal Sheet */}
      {selectedFacility && (
        <div style={styles.modalOverlay} onClick={() => setSelectedFacility(null)}>
          <div style={styles.facilityModalDialog} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <span
                  style={{
                    ...styles.categoryPill,
                    color: getCategoryMeta(selectedFacility.type).color,
                    backgroundColor: getCategoryMeta(selectedFacility.type).bg,
                    borderColor: getCategoryMeta(selectedFacility.type).border,
                  }}
                >
                  {t(`facilityLocator.${getCategoryMeta(selectedFacility.type).key}`)}
                </span>
                <h3 style={styles.modalFacilityName}>{selectedFacility.name}</h3>
              </div>
              <button
                type="button"
                style={styles.closeModalBtn}
                onClick={() => setSelectedFacility(null)}
              >
                <X size={18} color="#475569" />
              </button>
            </div>

            <div style={styles.modalBody}>
              {/* Distance & Verification */}
              <div style={styles.modalHighlights}>
                <div style={styles.highlightItem}>
                  <Navigation size={15} color="#6D28D9" />
                  <span>
                    <strong>{selectedFacility.distanceKm} km</strong> from your location
                  </span>
                </div>
                <div style={styles.highlightItem}>
                  <ShieldCheck size={15} color="#059669" />
                  <span>Verified Health Facility</span>
                </div>
              </div>

              {/* Address & Hours */}
              <div style={styles.detailSection}>
                <div style={styles.detailRow}>
                  <MapPin size={16} color="#64748B" />
                  <div>
                    <strong style={styles.detailLabel}>Address</strong>
                    <p style={styles.detailVal}>{selectedFacility.address}</p>
                  </div>
                </div>

                <div style={styles.detailRow}>
                  <Clock size={16} color="#059669" />
                  <div>
                    <strong style={styles.detailLabel}>Operating Hours</strong>
                    <p style={styles.detailVal}>{selectedFacility.hours}</p>
                  </div>
                </div>

                {selectedFacility.phone && (
                  <div style={styles.detailRow}>
                    <Phone size={16} color="#6D28D9" />
                    <div>
                      <strong style={styles.detailLabel}>Helpline / Contact</strong>
                      <p style={styles.detailVal}>{selectedFacility.phone}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Beds & Doctors Stats */}
              <div style={styles.facilityStatsGrid}>
                {selectedFacility.bedsAvailable !== undefined && selectedFacility.bedsAvailable > 0 && (
                  <div style={styles.fStatCard}>
                    <Bed size={18} color="#0284C7" />
                    <div>
                      <span style={styles.fStatVal}>{selectedFacility.bedsAvailable} Beds</span>
                      <span style={styles.fStatSub}>Capacity</span>
                    </div>
                  </div>
                )}

                {selectedFacility.doctorsCount !== undefined && (
                  <div style={styles.fStatCard}>
                    <Users size={18} color="#0D9488" />
                    <div>
                      <span style={styles.fStatVal}>{selectedFacility.doctorsCount} Doctors</span>
                      <span style={styles.fStatSub}>Duty Staff</span>
                    </div>
                  </div>
                )}

                {selectedFacility.genericMedicineStock && (
                  <div style={styles.fStatCard}>
                    <Pill size={18} color="#D97706" />
                    <div>
                      <span style={styles.fStatVal}>Generic Stock</span>
                      <span style={styles.fStatSub}>Available</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Complete Services List */}
              {Array.isArray(selectedFacility.services) && selectedFacility.services.length > 0 && (
                <div style={styles.servicesSection}>
                  <h4 style={styles.servicesTitle}>Available Medical Services:</h4>
                  <div style={styles.fullServicesGrid}>
                    {selectedFacility.services.map((srv, i) => (
                      <div key={i} style={styles.serviceItemFull}>
                        <CheckCircle2 size={13} color="#059669" />
                        <span>{srv}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom Direction CTA */}
              <div style={styles.modalFooterActions}>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedFacility.location.lat},${selectedFacility.location.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.modalDirectionsBtn}
                >
                  <Navigation size={16} color="#FFFFFF" strokeWidth={2.5} />
                  <span>Open Directions in Google Maps</span>
                </a>
              </div>
            </div>
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
    gap: '12px',
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
    backgroundColor: '#ECFDF5',
    color: '#065F46',
    padding: '3px 8px',
    borderRadius: '8px',
    border: '1px solid #A7F3D0',
  },
  pageSub: {
    fontSize: '0.76rem',
    color: '#64748B',
    margin: 0,
    lineHeight: '1.35',
    fontWeight: '500',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
  },
  searchBox: {
    position: 'relative',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '9px 34px 9px 34px',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #E2E8F0',
    borderRadius: '12px',
    fontSize: '0.82rem',
    color: '#1E293B',
    fontWeight: '600',
    outline: 'none',
  },
  clearSearchBtn: {
    position: 'absolute',
    right: '10px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px',
  },
  gpsBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '7px 12px',
    backgroundColor: '#F5F3FF',
    border: '1.5px solid #DDD6FE',
    borderRadius: '10px',
  },
  gpsLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.74rem',
    fontWeight: '700',
    color: '#5B21B6',
  },
  gpsStatusText: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '220px',
  },
  recenterBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    borderRadius: '6px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #C4B5FD',
    fontSize: '0.7rem',
    fontWeight: '800',
    color: '#6D28D9',
    cursor: 'pointer',
  },
  tabsScrollWrap: {
    overflowX: 'auto',
    paddingBottom: '2px',
    scrollbarWidth: 'none',
  },
  tabsRow: {
    display: 'flex',
    gap: '8px',
    minWidth: 'max-content',
  },
  tabBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 12px',
    borderRadius: '10px',
    border: '1.5px solid',
    fontSize: '0.78rem',
    fontWeight: '800',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  tabCount: {
    fontSize: '0.66rem',
    fontWeight: '800',
    padding: '1px 6px',
    borderRadius: '10px',
  },
  mapCard: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    border: '1.5px solid #E2E8F0',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
  },
  mapElement: {
    height: '240px',
    width: '100%',
    zIndex: 1,
  },
  mapOverlayHint: {
    position: 'absolute',
    bottom: '8px',
    left: '8px',
    zIndex: 500,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    backdropFilter: 'blur(4px)',
    padding: '4px 10px',
    borderRadius: '8px',
    border: '1px solid #CBD5E1',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '0.68rem',
    fontWeight: '700',
    color: '#475569',
  },
  listSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: '0.94rem',
    fontWeight: '800',
    color: '#1E1B4B',
    margin: 0,
  },
  sortBadge: {
    fontSize: '0.7rem',
    fontWeight: '700',
    color: '#6D28D9',
    backgroundColor: '#FAF5FF',
    padding: '2px 8px',
    borderRadius: '6px',
    border: '1px solid #DDD6FE',
  },
  loadingBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '36px 16px',
    gap: '10px',
  },
  spinner: {
    width: '30px',
    height: '30px',
    border: '3px solid #EDE9FE',
    borderTop: '3px solid #6D28D9',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: '0.82rem',
    color: '#6D28D9',
    fontWeight: '700',
  },
  emptyCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '32px 16px',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #E2E8F0',
    borderRadius: '16px',
  },
  emptyTitle: {
    fontSize: '0.94rem',
    fontWeight: '800',
    color: '#1E1B4B',
    margin: '0 0 4px 0',
  },
  emptySub: {
    fontSize: '0.78rem',
    color: '#64748B',
    margin: 0,
  },
  facilitiesGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  facilityCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '14px',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #E2E8F0',
    borderRadius: '16px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  cardHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardCategoryWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  categoryIconBox: {
    width: '30px',
    height: '30px',
    borderRadius: '8px',
    border: '1.5px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryPill: {
    fontSize: '0.68rem',
    fontWeight: '800',
    padding: '2px 8px',
    borderRadius: '6px',
    border: '1px solid',
  },
  distanceBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.72rem',
    fontWeight: '800',
    color: '#6D28D9',
    backgroundColor: '#F5F3FF',
    border: '1px solid #DDD6FE',
    padding: '3px 8px',
    borderRadius: '8px',
  },
  facilityName: {
    fontSize: '0.96rem',
    fontWeight: '800',
    color: '#1E1B4B',
    margin: 0,
    lineHeight: '1.3',
  },
  infoRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '6px',
    fontSize: '0.76rem',
  },
  addressText: {
    color: '#475569',
    lineHeight: '1.35',
    fontWeight: '500',
  },
  hoursText: {
    color: '#047857',
    fontWeight: '700',
  },
  servicesRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '5px',
    alignItems: 'center',
    marginTop: '2px',
  },
  serviceChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '0.64rem',
    fontWeight: '700',
    color: '#065F46',
    backgroundColor: '#ECFDF5',
    border: '1px solid #A7F3D0',
    padding: '2px 6px',
    borderRadius: '6px',
  },
  moreServicesText: {
    fontSize: '0.64rem',
    fontWeight: '700',
    color: '#64748B',
  },
  cardActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '6px',
    paddingTop: '8px',
    borderTop: '1px solid #F1F5F9',
  },
  directionsBtn: {
    flex: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '8px 12px',
    backgroundColor: '#6D28D9',
    color: '#FFFFFF',
    borderRadius: '10px',
    textDecoration: 'none',
    fontSize: '0.78rem',
    fontWeight: '800',
    boxShadow: '0 2px 6px rgba(109, 40, 217, 0.2)',
  },
  callBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
    padding: '8px 12px',
    backgroundColor: '#FAF5FF',
    color: '#6D28D9',
    borderRadius: '10px',
    border: '1.5px solid #DDD6FE',
    textDecoration: 'none',
    fontSize: '0.78rem',
    fontWeight: '800',
  },

  // Modal Styles
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
    padding: '16px',
    zIndex: 9999,
  },
  facilityModalDialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '520px',
    maxHeight: '88vh',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '18px 20px 14px 20px',
    borderBottom: '1px solid #E2E8F0',
  },
  modalFacilityName: {
    fontSize: '1.05rem',
    fontWeight: '900',
    color: '#1E1B4B',
    margin: '4px 0 0 0',
  },
  closeModalBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
  },
  modalBody: {
    padding: '18px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  modalHighlights: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  highlightItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: '#F8FAFC',
    borderRadius: '10px',
    border: '1px solid #E2E8F0',
    fontSize: '0.76rem',
    color: '#334155',
  },
  detailSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    backgroundColor: '#F8FAFC',
    padding: '12px 14px',
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
  },
  detailRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
  },
  detailLabel: {
    fontSize: '0.72rem',
    color: '#64748B',
    textTransform: 'uppercase',
    display: 'block',
  },
  detailVal: {
    fontSize: '0.8rem',
    color: '#1E293B',
    fontWeight: '600',
    margin: '1px 0 0 0',
  },
  facilityStatsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  fStatCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 10px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '10px',
  },
  fStatVal: {
    fontSize: '0.78rem',
    fontWeight: '800',
    color: '#1E1B4B',
    display: 'block',
  },
  fStatSub: {
    fontSize: '0.64rem',
    color: '#64748B',
    fontWeight: '600',
  },
  servicesSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  servicesTitle: {
    fontSize: '0.78rem',
    fontWeight: '800',
    color: '#334155',
    margin: 0,
  },
  fullServicesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '6px',
  },
  serviceItemFull: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.74rem',
    color: '#1E293B',
    fontWeight: '600',
    backgroundColor: '#ECFDF5',
    padding: '5px 8px',
    borderRadius: '8px',
    border: '1px solid #A7F3D0',
  },
  modalFooterActions: {
    marginTop: '6px',
    paddingTop: '10px',
    borderTop: '1px solid #E2E8F0',
  },
  modalDirectionsBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#6D28D9',
    color: '#FFFFFF',
    borderRadius: '12px',
    textDecoration: 'none',
    fontSize: '0.84rem',
    fontWeight: '800',
    boxShadow: '0 3px 10px rgba(109, 40, 217, 0.3)',
    boxSizing: 'border-box',
  }
};

export default FacilityLocatorPage;
