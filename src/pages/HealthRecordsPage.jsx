import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';
import { useTranslation } from 'react-i18next';
import healthRecordService from '../services/healthRecord.service';
import {
  translateDynamicContent,
  translateTag,
  formatLocalizedDate,
} from '../utils/contentTranslator';
import {
  FileText,
  Clock,
  User,
  Stethoscope,
  Pill,
  FlaskConical,
  ScrollText,
  UploadCloud,
  Plus,
  Search,
  ArrowLeft,
  Trash2,
  ExternalLink,
  Eye,
  Download,
  Calendar,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  X,
  FileCheck,
  Image as ImageIcon,
  Sparkles,
  Tag,
  WifiOff,
  ShoppingBag,
} from 'lucide-react';
import OrderMedicineModal from '../components/medicine/OrderMedicineModal';


const CATEGORIES = [
  { id: 'all', key: 'tabAll', icon: FileText, color: '#6D28D9', bg: '#F5F3FF', border: '#DDD6FE' },
  { id: 'medical-history', key: 'tabHistory', icon: ScrollText, color: '#7C3AED', bg: '#FAF5FF', border: '#E9D5FF' },
  { id: 'prescription', key: 'tabPrescriptions', icon: Pill, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  { id: 'test-result', key: 'tabTestResults', icon: FlaskConical, color: '#0284C7', bg: '#F0F9FF', border: '#BAE6FD' },
  { id: 'consultation-note', key: 'tabConsultations', icon: Stethoscope, color: '#0D9488', bg: '#F0FDF4', border: '#A7F3D0' },
];

export const HealthRecordsPage = ({ onBack, onNavigateConsult }) => {
  const { t, i18n } = useTranslation();
  const { user, token } = useAuth();
  const { isOnline } = useOffline();

  const isDoctor = user?.role === 'doctor' || user?.role === 'admin';

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [records, setRecords] = useState([]);
  const [isOfflineData, setIsOfflineData] = useState(false);
  const [counts, setCounts] = useState({ all: 0, 'medical-history': 0, prescription: 0, 'test-result': 0, 'consultation-note': 0 });
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewMedia, setPreviewMedia] = useState(null); // { url, name, type }

  // Patient Selection for Doctors
  const [patientsList, setPatientsList] = useState([]);
  const [selectedPatientFilter, setSelectedPatientFilter] = useState('');
  const [formPatientId, setFormPatientId] = useState('');

  // AI Explanation State & In-Memory Cache
  const [explanationsCache, setExplanationsCache] = useState({}); // { [recId]: explanationData }
  const [explainingIds, setExplainingIds] = useState({}); // { [recId]: boolean }
  const [expandedExplanationIds, setExpandedExplanationIds] = useState({}); // { [recId]: boolean }
  const [orderModalPrescription, setOrderModalPrescription] = useState(null);

  // Upload Form State
  const [formType, setFormType] = useState('medical-history');
  const [formTitle, setFormTitle] = useState('');
  const [formDoctorName, setFormDoctorName] = useState(() => (isDoctor ? (user?.name?.startsWith('Dr.') ? user.name : `Dr. ${user?.name || 'Doctor'}`) : ''));
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formTextContent, setFormTextContent] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formTags, setFormTags] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  const fileInputRef = useRef(null);

  // Fetch registered patients list for doctors
  useEffect(() => {
    if (isDoctor && token) {
      healthRecordService.getPatients(token)
        .then((res) => {
          if (res.success && Array.isArray(res.patients)) {
            setPatientsList(res.patients);
          }
        })
        .catch((err) => console.warn('Could not fetch patients list:', err.message));
    }
  }, [isDoctor, token]);

  const fetchRecords = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await healthRecordService.getPatientRecords(token, activeTab, searchQuery, selectedPatientFilter);
      if (data.success) {
        setRecords(data.records || []);
        setIsOfflineData(Boolean(data.offline || !isOnline));
        if (data.counts) {
          setCounts(data.counts);
        }
      }
    } catch (err) {
      console.warn('Error fetching health records:', err.message);
      setIsOfflineData(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [token, activeTab, searchQuery, selectedPatientFilter, isOnline]);

  useEffect(() => {
    // Invalidate stale-language AI explanation cache when language switches
    setExplanationsCache({});
  }, [i18n.language]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setFormError('File size exceeds 10MB limit.');
      return;
    }

    setSelectedFile(file);
    setFormError('');

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setFilePreviewUrl(reader.result);
      reader.readAsDataURL(file);
    } else {
      setFilePreviewUrl(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreateRecord = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Please enter a record title.');
      return;
    }

    if (isDoctor && !formPatientId) {
      setFormError('Please select a patient for this health record.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const tagsArray = formTags
        ? formTags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];

      const docName = isDoctor
        ? (user?.name?.startsWith('Dr.') ? user.name : `Dr. ${user?.name || 'Doctor'}`)
        : (formDoctorName.trim() || undefined);

      const payload = {
        type: formType,
        title: formTitle.trim(),
        patientId: isDoctor ? formPatientId : undefined,
        doctorName: docName,
        doctorId: isDoctor ? user?._id : undefined,
        date: formDate,
        textContent: formTextContent.trim() || undefined,
        notes: formNotes.trim() || undefined,
        tags: tagsArray,
      };

      const data = await healthRecordService.createRecord(token, payload, selectedFile);
      if (data.success) {
        setShowUploadModal(false);
        // Reset form
        setFormTitle('');
        setFormDoctorName(isDoctor ? (user?.name?.startsWith('Dr.') ? user.name : `Dr. ${user?.name || 'Doctor'}`) : '');
        setFormPatientId('');
        setFormTextContent('');
        setFormNotes('');
        setFormTags('');
        setSelectedFile(null);
        setFilePreviewUrl(null);
        setSuccessToast(data.message || t('healthRecords.uploadSuccess'));
        setTimeout(() => setSuccessToast(''), 4000);
        fetchRecords();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to save health record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitRecord = handleCreateRecord;

  const handleDeleteRecord = async (id) => {
    if (!window.confirm(t('healthRecords.confirmDelete'))) return;
    try {
      await healthRecordService.deleteRecord(token, id);
      setRecords((prev) => prev.filter((r) => (r._id || r.id) !== id));
      setSuccessToast('Record deleted successfully');
      setTimeout(() => setSuccessToast(''), 3000);
      fetchRecords();
    } catch (err) {
      alert(err.message || 'Failed to delete record');
    }
  };

  const handleExplainReport = async (record, forceRefresh = false) => {
    const recId = record._id || record.id;
    const isExpanded = expandedExplanationIds[recId];

    // If currently expanded and not forcing refresh, simply toggle closed
    if (isExpanded && !forceRefresh) {
      setExpandedExplanationIds((prev) => ({ ...prev, [recId]: false }));
      return;
    }

    const currentLang = (i18n.language || user?.preferredLanguage || 'en').substring(0, 2).toLowerCase();
    const existingExplanation = explanationsCache[recId];

    // Cache is only valid if it explicitly matches the active language
    if (
      !forceRefresh &&
      existingExplanation &&
      existingExplanation.summary &&
      existingExplanation.language === currentLang
    ) {
      setExpandedExplanationIds((prev) => ({ ...prev, [recId]: true }));
      return;
    }

    // Otherwise, fetch from AI service in active language
    setExplainingIds((prev) => ({ ...prev, [recId]: true }));
    try {
      const data = await healthRecordService.explainReport(
        token,
        recId,
        currentLang,
        true // force refresh on language mismatch to get target language
      );

      if (data.success && data.explanation) {
        setExplanationsCache((prev) => ({ ...prev, [recId]: data.explanation }));
        setExpandedExplanationIds((prev) => ({ ...prev, [recId]: true }));
      }
    } catch (err) {
      console.warn('AI Explanation error:', err.message);
      alert('Could not generate AI explanation: ' + (err.message || 'Please try again.'));
    } finally {
      setExplainingIds((prev) => ({ ...prev, [recId]: false }));
    }
  };

  const getCategoryMeta = (type) => {
    const found = CATEGORIES.find((c) => c.id === type);
    return found || CATEGORIES[1];
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Recent';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div style={styles.container}>
      {/* Toast Notification */}
      {successToast && (
        <div style={styles.toast}>
          <CheckCircle2 size={18} color="#059669" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Offline Mode Banner */}
      {(!isOnline || isOfflineData) && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1.5px solid #FECACA',
            borderRadius: '12px',
            padding: '10px 14px',
            margin: '12px 16px 0 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 2px 6px rgba(220, 38, 38, 0.06)',
          }}
        >
          <WifiOff size={18} color="#DC2626" />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '0.84rem', fontWeight: '800', color: '#B91C1C', display: 'block' }}>
              {t('offline.cachedNoticeTitle', { defaultValue: 'Offline Mode • Displaying Cached Records' })}
            </span>
            <span style={{ fontSize: '0.74rem', color: '#7F1D1D' }}>
              {t('offline.cachedNoticeSub', {
                defaultValue: 'Showing locally stored health records from IndexedDB. New entries will sync automatically.',
              })}
            </span>
          </div>
        </div>
      )}

      {/* Top Bar / Header */}
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
              <h1 style={styles.pageTitle}>{t('healthRecords.title')}</h1>
              <span style={styles.badgeAbha}>
                <ShieldCheck size={12} color="#059669" />
                {t('healthRecords.encryptedBadge')}
              </span>
            </div>
            <p style={styles.pageSub}>{t('healthRecords.subtitle')}</p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div style={styles.toolbar}>
          <div style={styles.searchBox}>
            <Search size={16} color="#64748B" style={styles.searchIcon} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('healthRecords.searchPlaceholder')}
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

          {isDoctor && patientsList.length > 0 && (
            <select
              value={selectedPatientFilter}
              onChange={(e) => setSelectedPatientFilter(e.target.value)}
              style={{
                ...styles.searchInput,
                width: 'auto',
                minWidth: '140px',
                padding: '9px 10px',
                cursor: 'pointer',
                flex: 'none',
              }}
              title="Filter by patient"
            >
              <option value="">All Patients</option>
              {patientsList.map((p) => (
                <option key={p._id || p.id} value={p._id || p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            style={styles.uploadBtn}
            onClick={() => setShowUploadModal(true)}
          >
            <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
            <span>{t('healthRecords.uploadBtn')}</span>
          </button>
        </div>

        {/* Stats Metrics Cards */}
        <div style={styles.statsGrid}>
          <div
            style={{ ...styles.statCard, borderColor: activeTab === 'all' ? '#6D28D9' : '#E2E8F0' }}
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab('all')}
          >
            <span style={styles.statLabel}>{t('healthRecords.statsTotal')}</span>
            <span style={{ ...styles.statValue, color: '#6D28D9' }}>{counts.all || records.length}</span>
          </div>
          <div
            style={{ ...styles.statCard, borderColor: activeTab === 'prescription' ? '#D97706' : '#E2E8F0' }}
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab('prescription')}
          >
            <span style={styles.statLabel}>{t('healthRecords.statsPrescriptions')}</span>
            <span style={{ ...styles.statValue, color: '#D97706' }}>{counts.prescription || 0}</span>
          </div>
          <div
            style={{ ...styles.statCard, borderColor: activeTab === 'test-result' ? '#0284C7' : '#E2E8F0' }}
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab('test-result')}
          >
            <span style={styles.statLabel}>{t('healthRecords.statsLabTests')}</span>
            <span style={{ ...styles.statValue, color: '#0284C7' }}>{counts['test-result'] || 0}</span>
          </div>
          <div
            style={{ ...styles.statCard, borderColor: activeTab === 'consultation-note' ? '#0D9488' : '#E2E8F0' }}
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab('consultation-note')}
          >
            <span style={styles.statLabel}>{t('healthRecords.statsConsults')}</span>
            <span style={{ ...styles.statValue, color: '#0D9488' }}>{counts['consultation-note'] || 0}</span>
          </div>
        </div>

        {/* Category Tabs */}
        <div style={styles.tabsScrollWrap}>
          <div style={styles.tabsRow}>
            {CATEGORIES.map((cat) => {
              const IconComp = cat.icon;
              const isActive = activeTab === cat.id;
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
                  onClick={() => setActiveTab(cat.id)}
                >
                  <IconComp size={15} color={isActive ? '#FFFFFF' : cat.color} strokeWidth={2.2} />
                  <span>{t(`healthRecords.${cat.key}`)}</span>
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

      {/* Main Content / Records List */}
      <div style={styles.content}>
        {loading ? (
          <div style={styles.loadingBox}>
            <div style={styles.spinner} />
            <p style={styles.loadingText}>Loading Health Records...</p>
          </div>
        ) : records.length === 0 ? (
          <div style={styles.emptyCard}>
            <div style={styles.emptyIconCircle}>
              <FileText size={32} color="#6D28D9" />
            </div>
            <h3 style={styles.emptyTitle}>{t('healthRecords.emptyTitle')}</h3>
            <p style={styles.emptySub}>{t('healthRecords.emptySub')}</p>
            <div style={styles.emptyActions}>
              <button
                type="button"
                style={styles.emptyUploadBtn}
                onClick={() => setShowUploadModal(true)}
              >
                <Plus size={16} color="#FFFFFF" />
                <span>{t('healthRecords.uploadBtn')}</span>
              </button>
              {onNavigateConsult && (
                <button
                  type="button"
                  style={styles.emptyConsultBtn}
                  onClick={onNavigateConsult}
                >
                  <Stethoscope size={16} color="#6D28D9" />
                  <span>{t('quickActions.consult')}</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div style={styles.recordsList}>
            {records.map((rec) => {
              const catMeta = getCategoryMeta(rec.type);
              const CatIcon = catMeta.icon;
              const hasFile = Boolean(rec.fileUrl);
              const isPdf = rec.fileType?.includes('pdf') || rec.fileName?.endsWith('.pdf');
              const isImage = rec.fileType?.startsWith('image') || /\.(jpg|jpeg|png|webp)$/i.test(rec.fileName || '');

              return (
                <div key={rec._id || rec.id} className="card-base" style={styles.recordCard}>
                  {/* Card Top: Category Badge & Actions */}
                  <div style={styles.cardTopRow}>
                    <div style={styles.cardBadgeWrap}>
                      <div
                        style={{
                          ...styles.categoryIconCircle,
                          backgroundColor: catMeta.bg,
                          borderColor: catMeta.border,
                        }}
                      >
                        <CatIcon size={18} color={catMeta.color} strokeWidth={2.4} />
                      </div>
                      <div>
                        <span
                          style={{
                            ...styles.categoryBadge,
                            color: catMeta.color,
                            backgroundColor: catMeta.bg,
                            borderColor: catMeta.border,
                          }}
                        >
                          {t(`healthRecords.${catMeta.key}`)}
                        </span>
                        {rec.appointmentId && (
                          <span style={styles.autoBadge}>
                            <Sparkles size={10} color="#0D9488" />
                            {t('healthRecords.autoGenerated')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={styles.cardActionsRow}>
                      <button
                        type="button"
                        style={styles.deleteCardBtn}
                        title={t('healthRecords.deleteBtn')}
                        aria-label={t('healthRecords.deleteBtn')}
                        onClick={() => handleDeleteRecord(rec._id || rec.id)}
                      >
                        <Trash2 size={15} color="#EF4444" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Metadata */}
                  <h2 style={styles.recordTitle}>{translateDynamicContent(rec.title, i18n.language)}</h2>

                  <div style={styles.metaRow}>
                    <div style={styles.metaItem}>
                      <Calendar size={13} color="#64748B" />
                      <span>{formatLocalizedDate(rec.date || rec.createdAt, i18n.language)}</span>
                    </div>
                    {rec.patientName && isDoctor && (
                      <div style={styles.metaItem}>
                        <User size={13} color="#059669" />
                        <span style={{ color: '#047857', fontWeight: '700' }}>
                          Patient: {rec.patientName}
                        </span>
                      </div>
                    )}
                    {rec.doctorName && (
                      <div style={styles.metaItem}>
                        <User size={13} color="#6D28D9" />
                        <span style={{ color: '#4C1D95', fontWeight: '700' }}>{rec.doctorName}</span>
                      </div>
                    )}
                  </div>

                  {/* Text Content / Clinical Findings */}
                  {rec.textContent && (
                    <div style={styles.textContentBox}>
                      <p style={styles.textContent}>{translateDynamicContent(rec.textContent, i18n.language)}</p>
                    </div>
                  )}

                  {/* Notes */}
                  {rec.notes && rec.notes !== rec.textContent && (
                    <div style={styles.notesBox}>
                      <span style={styles.notesLabel}>{t('healthRecords.doctorRemarks') || 'Doctor Remarks'}:</span>
                      <p style={styles.notesText}>{translateDynamicContent(rec.notes, i18n.language)}</p>
                    </div>
                  )}

                  {/* Tags */}
                  {Array.isArray(rec.tags) && rec.tags.length > 0 && (
                    <div style={styles.tagsRow}>
                      {rec.tags.map((tag, i) => (
                        <span key={i} style={styles.tagChip}>
                          <Tag size={10} color="#6D28D9" />
                          {translateTag(tag, i18n.language)}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* File Attachment Strip */}
                  {hasFile && (
                    <div style={styles.attachmentStrip}>
                      <div style={styles.attachmentLeft}>
                        {isPdf ? (
                          <div style={styles.pdfIconWrap}>
                            <FileText size={18} color="#DC2626" />
                          </div>
                        ) : isImage ? (
                          <div style={styles.imgIconWrap}>
                            <ImageIcon size={18} color="#0284C7" />
                          </div>
                        ) : (
                          <div style={styles.fileIconWrap}>
                            <FileCheck size={18} color="#059669" />
                          </div>
                        )}
                        <div style={styles.attachmentTextWrap}>
                          <span style={styles.attachmentFileName}>
                            {rec.fileName || 'Attached Medical Document'}
                          </span>
                          <span style={styles.attachmentFileSize}>
                            {rec.fileSize ? `${Math.round(rec.fileSize / 1024)} KB` : 'Verified Document'}
                          </span>
                        </div>
                      </div>

                      <div style={styles.attachmentActions}>
                        <button
                          type="button"
                          style={styles.viewAttachmentBtn}
                          onClick={() =>
                            setPreviewMedia({
                              url: rec.fileUrl,
                              name: rec.fileName || rec.title,
                              type: isPdf ? 'pdf' : isImage ? 'image' : 'file',
                            })
                          }
                        >
                          <Eye size={14} color="#6D28D9" />
                          <span>{t('healthRecords.viewFile')}</span>
                        </button>
                        <a
                          href={rec.fileUrl}
                          download={rec.fileName || 'health_record'}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={styles.downloadLink}
                        >
                          <Download size={14} color="#475569" />
                        </a>
                      </div>
                    </div>
                  )}

                  {/* AI "EXPLAIN THIS REPORT" ACTION (For Prescriptions & Test Results) */}
                  {(rec.type === 'prescription' || rec.type === 'test-result' || Boolean(rec.textContent)) && (
                    <div style={styles.aiActionRow}>
                      {/* Direct Order from Nearby Medical Shop */}
                      {rec.type === 'prescription' && (
                        <button
                          type="button"
                          style={{
                            ...styles.explainBtn,
                            backgroundColor: '#059669',
                            color: '#FFFFFF',
                            borderColor: '#059669',
                            boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)',
                          }}
                          onClick={() => setOrderModalPrescription(rec)}
                          title="Order prescribed medicines from nearby pharmacy"
                        >
                          <ShoppingBag size={15} color="#FFFFFF" strokeWidth={2.4} />
                          <span>Order Medicines</span>
                        </button>
                      )}

                      <button
                        type="button"
                        style={{
                          ...styles.explainBtn,
                          backgroundColor: expandedExplanationIds[rec._id || rec.id] ? '#FAF5FF' : '#6D28D9',
                          color: expandedExplanationIds[rec._id || rec.id] ? '#6D28D9' : '#FFFFFF',
                          borderColor: '#7C3AED',
                        }}
                        disabled={explainingIds[rec._id || rec.id]}
                        onClick={() => handleExplainReport(rec)}
                      >
                        {explainingIds[rec._id || rec.id] ? (
                          <>
                            <div style={styles.miniSpinner} />
                            <span>{t('healthRecords.explaining')}</span>
                          </>
                        ) : (
                          <>
                            <Sparkles
                              size={15}
                              color={expandedExplanationIds[rec._id || rec.id] ? '#6D28D9' : '#FFFFFF'}
                              strokeWidth={2.4}
                            />
                            <span>
                              {expandedExplanationIds[rec._id || rec.id]
                                ? t('healthRecords.hideExplanation')
                                : t('healthRecords.explainBtn')}
                            </span>
                            {(explanationsCache[rec._id || rec.id] || rec.aiExplanation?.summary) &&
                              !expandedExplanationIds[rec._id || rec.id] && (
                                <span style={styles.cachedPill}>{t('healthRecords.cachedBadge')}</span>
                              )}
                          </>
                        )}
                      </button>
                    </div>
                  )}


                  {/* EXPANDABLE AI CLINICAL INTERPRETATION CARD */}
                  {expandedExplanationIds[rec._id || rec.id] &&
                    (explanationsCache[rec._id || rec.id] || rec.aiExplanation) && (
                      <div style={styles.aiExplanationCard}>
                        <div style={styles.aiCardHeader}>
                          <div style={styles.aiTitleWrap}>
                            <div style={styles.aiSparkleIconBox}>
                              <Sparkles size={16} color="#6D28D9" />
                            </div>
                            <div>
                              <h4 style={styles.aiExplanationTitle}>{t('healthRecords.explanationTitle')}</h4>
                              <span style={styles.aiExplanationSub}>{t('healthRecords.explanationSub')}</span>
                            </div>
                          </div>
                          <div style={styles.aiBadgeGroup}>
                            <span style={styles.aiSourceBadge}>
                              {(explanationsCache[rec._id || rec.id] || rec.aiExplanation)?.source === 'llm'
                                ? '✨ Groq Clinical AI'
                                : '🛡️ Clinical AI Assistant'}
                            </span>
                            <button
                              type="button"
                              style={styles.refreshAiBtn}
                              title={t('healthRecords.refreshExplanation')}
                              onClick={() => handleExplainReport(rec, true)}
                            >
                              ↻ {t('healthRecords.refreshExplanation')}
                            </button>
                          </div>
                        </div>

                        {/* Plain Language Summary */}
                        <div style={styles.aiSummaryBox}>
                          <p style={styles.aiSummaryText}>
                            {(explanationsCache[rec._id || rec.id] || rec.aiExplanation)?.summary}
                          </p>
                        </div>

                        {/* Key Findings Bullet Points */}
                        {Array.isArray(
                          (explanationsCache[rec._id || rec.id] || rec.aiExplanation)?.keyFindings
                        ) &&
                          (explanationsCache[rec._id || rec.id] || rec.aiExplanation)?.keyFindings
                            .length > 0 && (
                            <div style={styles.aiFindingsBox}>
                              <span style={styles.aiSectionLabel}>
                                {t('healthRecords.keyFindingsTitle')}
                              </span>
                              <ul style={styles.aiFindingsList}>
                                {(
                                  explanationsCache[rec._id || rec.id] || rec.aiExplanation
                                )?.keyFindings.map((point, idx) => (
                                  <li key={idx} style={styles.aiFindingItem}>
                                    <CheckCircle2
                                      size={14}
                                      color="#059669"
                                      style={{ flexShrink: 0, marginTop: '2px' }}
                                    />
                                    <span>{point}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                        {/* Actionable Patient Advice */}
                        {(explanationsCache[rec._id || rec.id] || rec.aiExplanation)
                          ?.actionableAdvice && (
                          <div style={styles.aiAdviceBox}>
                            <div style={styles.aiAdviceHeader}>
                              <AlertCircle size={14} color="#B45309" />
                              <span style={styles.aiAdviceLabel}>{t('healthRecords.adviceTitle')}</span>
                            </div>
                            <p style={styles.aiAdviceText}>
                              {(explanationsCache[rec._id || rec.id] || rec.aiExplanation)
                                ?.actionableAdvice}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Health Record Modal */}
      {showUploadModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalDialog}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>{t('healthRecords.uploadModalTitle')}</h3>
                <p style={styles.modalSub}>{t('healthRecords.uploadModalSub')}</p>
              </div>
              <button
                type="button"
                style={styles.closeModalBtn}
                onClick={() => setShowUploadModal(false)}
              >
                <X size={18} color="#475569" />
              </button>
            </div>

            <form onSubmit={handleCreateRecord} style={styles.modalForm}>
              {formError && (
                <div style={styles.formErrorBox}>
                  <AlertCircle size={16} color="#DC2626" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 1. Category Selector */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>{t('healthRecords.recordType')}</label>
                <div style={styles.typeGrid}>
                  {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => {
                    const IconComp = cat.icon;
                    const isSelected = formType === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        style={{
                          ...styles.typeSelectBtn,
                          borderColor: isSelected ? cat.color : '#E2E8F0',
                          backgroundColor: isSelected ? cat.bg : '#FFFFFF',
                          color: isSelected ? cat.color : '#475569',
                          fontWeight: isSelected ? '800' : '600',
                        }}
                        onClick={() => setFormType(cat.id)}
                      >
                        <IconComp size={16} color={isSelected ? cat.color : '#64748B'} />
                        <span>{t(`healthRecords.${cat.key}`)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Record Title */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>
                  {t('healthRecords.recordTitle')} <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('healthRecords.recordTitlePlaceholder')}
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  style={styles.formInput}
                />
              </div>

              {/* 3. Patient (for Doctor) or Doctor Name (for Patient) & Date Row */}
              <div style={styles.formRow}>
                {isDoctor ? (
                  <div style={{ ...styles.formGroup, flex: 1.2 }}>
                    <label style={styles.formLabel}>
                      {t('healthRecords.selectPatient', { defaultValue: 'Select Patient' })}{' '}
                      <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <select
                      value={formPatientId}
                      onChange={(e) => setFormPatientId(e.target.value)}
                      required
                      style={styles.formInput}
                    >
                      <option value="">-- Choose Patient --</option>
                      {patientsList.map((p) => (
                        <option key={p._id || p.id} value={p._id || p.id}>
                          {p.name} {p.village ? `(${p.village})` : ''} {p.phone ? `• ${p.phone}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div style={{ ...styles.formGroup, flex: 1.2 }}>
                    <label style={styles.formLabel}>{t('healthRecords.doctorName')}</label>
                    <input
                      type="text"
                      placeholder={t('healthRecords.doctorNamePlaceholder')}
                      value={formDoctorName}
                      onChange={(e) => setFormDoctorName(e.target.value)}
                      style={styles.formInput}
                    />
                  </div>
                )}
                <div style={{ ...styles.formGroup, flex: 0.8 }}>
                  <label style={styles.formLabel}>{t('healthRecords.recordDate')}</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    style={styles.formInput}
                  />
                </div>
              </div>

              {/* 4. Clinical Notes / Text Content */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>{t('healthRecords.textContent')}</label>
                <textarea
                  rows={4}
                  placeholder={t('healthRecords.textContentPlaceholder')}
                  value={formTextContent}
                  onChange={(e) => setFormTextContent(e.target.value)}
                  style={styles.formTextarea}
                />
              </div>

              {/* 5. Tags */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Tags / Keywords (Comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Vitals, Diabetes, Rampur PHC, Follow-up"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  style={styles.formInput}
                />
              </div>

              {/* 6. File Upload Dropzone */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>{t('healthRecords.fileUpload')}</label>
                <div
                  style={styles.dropZone}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/png, image/jpeg, image/webp, application/pdf"
                    style={{ display: 'none' }}
                  />

                  {selectedFile ? (
                    <div style={styles.fileSelectedBox}>
                      {filePreviewUrl ? (
                        <img src={filePreviewUrl} alt="Preview" style={styles.imgThumbnail} />
                      ) : (
                        <FileText size={28} color="#6D28D9" />
                      )}
                      <div style={styles.fileSelectedInfo}>
                        <span style={styles.fileNameText}>{selectedFile.name}</span>
                        <span style={styles.fileSizeText}>
                          {Math.round(selectedFile.size / 1024)} KB • Click to change
                        </span>
                      </div>
                      <button
                        type="button"
                        style={styles.removeFileBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile();
                        }}
                      >
                        <X size={14} color="#EF4444" />
                      </button>
                    </div>
                  ) : (
                    <div style={styles.dropZoneContent}>
                      <div style={styles.dropIconWrap}>
                        <UploadCloud size={24} color="#6D28D9" />
                      </div>
                      <span style={styles.dropZoneText}>{t('healthRecords.dragDrop')}</span>
                      <span style={styles.dropZoneHint}>{t('healthRecords.fileUploadHint')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Buttons */}
              <div style={styles.modalFooter}>
                <button
                  type="button"
                  style={styles.cancelBtn}
                  onClick={() => setShowUploadModal(false)}
                  disabled={submitting}
                >
                  {t('healthRecords.cancelBtn')}
                </button>
                <button
                  type="submit"
                  style={styles.submitBtn}
                  disabled={submitting}
                >
                  {submitting ? (
                    <span>{t('healthRecords.saving')}</span>
                  ) : (
                    <>
                      <CheckCircle2 size={16} color="#FFFFFF" />
                      <span>{t('healthRecords.saveBtn')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Prescription Medicine Order Modal */}
      {orderModalPrescription && (
        <OrderMedicineModal
          isOpen={Boolean(orderModalPrescription)}
          prescription={orderModalPrescription}
          onClose={() => setOrderModalPrescription(null)}
          onOrderSuccess={(placedOrder) => {
            setSuccessToast(`Prescription Order ${placedOrder.orderId} successfully routed to ${placedOrder.pharmacyName || 'nearby medical shop'}!`);
            setTimeout(() => setSuccessToast(''), 6000);
          }}
        />
      )}

      {/* Attachment Preview Modal */}
      {previewMedia && (
        <div style={styles.modalOverlay} onClick={() => setPreviewMedia(null)}>
          <div style={styles.previewDialog} onClick={(e) => e.stopPropagation()}>
            <div style={styles.previewHeader}>
              <span style={styles.previewTitle}>{previewMedia.name}</span>
              <div style={styles.previewHeaderRight}>
                <a
                  href={previewMedia.url}
                  download={previewMedia.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.downloadHeaderBtn}
                >
                  <Download size={16} color="#475569" />
                </a>
                <button
                  type="button"
                  style={styles.closeModalBtn}
                  onClick={() => setPreviewMedia(null)}
                >
                  <X size={18} color="#475569" />
                </button>
              </div>
            </div>
            <div style={styles.previewBody}>
              {previewMedia.type === 'image' ? (
                <img
                  src={previewMedia.url}
                  alt={previewMedia.name}
                  style={styles.fullPreviewImg}
                />
              ) : previewMedia.type === 'pdf' ? (
                <iframe
                  src={previewMedia.url}
                  title={previewMedia.name}
                  style={styles.pdfIframe}
                />
              ) : (
                <div style={styles.genericFilePreview}>
                  <FileText size={48} color="#6D28D9" />
                  <p>{previewMedia.name}</p>
                  <a
                    href={previewMedia.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.externalLinkBtn}
                  >
                    <ExternalLink size={16} color="#FFFFFF" />
                    <span>Open in New Window</span>
                  </a>
                </div>
              )}
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
  toast: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: '#ECFDF5',
    border: '1.5px solid #A7F3D0',
    borderRadius: '12px',
    color: '#065F46',
    fontSize: '0.84rem',
    fontWeight: '700',
    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.1)',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
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
    gap: '3px',
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
    fontSize: '1.25rem',
    fontWeight: '900',
    color: '#1E1B4B',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  badgeAbha: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.68rem',
    fontWeight: '800',
    backgroundColor: '#ECFDF5',
    color: '#065F46',
    padding: '3px 8px',
    borderRadius: '8px',
    border: '1px solid #A7F3D0',
  },
  pageSub: {
    fontSize: '0.78rem',
    color: '#64748B',
    margin: 0,
    lineHeight: '1.35',
    fontWeight: '500',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  searchBox: {
    position: 'relative',
    flex: 1,
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
  uploadBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '9px 14px',
    backgroundColor: '#6D28D9',
    color: '#FFFFFF',
    borderRadius: '12px',
    border: 'none',
    fontSize: '0.82rem',
    fontWeight: '800',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(109, 40, 217, 0.25)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    border: '1.5px solid',
    borderRadius: '12px',
    padding: '8px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  statLabel: {
    fontSize: '0.64rem',
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  statValue: {
    fontSize: '1.1rem',
    fontWeight: '900',
  },
  tabsScrollWrap: {
    overflowX: 'auto',
    paddingBottom: '4px',
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
    fontSize: '0.68rem',
    fontWeight: '800',
    padding: '1px 6px',
    borderRadius: '10px',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  loadingBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 16px',
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
    fontSize: '0.84rem',
    color: '#6D28D9',
    fontWeight: '700',
  },
  emptyCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '40px 20px',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #E9D5FF',
    borderRadius: '16px',
  },
  emptyIconCircle: {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    backgroundColor: '#F5F3FF',
    border: '1.5px solid #DDD6FE',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '12px',
  },
  emptyTitle: {
    fontSize: '1rem',
    fontWeight: '800',
    color: '#1E1B4B',
    marginBottom: '6px',
  },
  emptySub: {
    fontSize: '0.8rem',
    color: '#64748B',
    lineHeight: '1.4',
    maxWidth: '320px',
    marginBottom: '18px',
  },
  emptyActions: {
    display: 'flex',
    gap: '10px',
  },
  emptyUploadBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '9px 16px',
    backgroundColor: '#6D28D9',
    color: '#FFFFFF',
    borderRadius: '12px',
    border: 'none',
    fontSize: '0.82rem',
    fontWeight: '800',
    cursor: 'pointer',
  },
  emptyConsultBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '9px 16px',
    backgroundColor: '#FAF5FF',
    color: '#6D28D9',
    borderRadius: '12px',
    border: '1.5px solid #DDD6FE',
    fontSize: '0.82rem',
    fontWeight: '800',
    cursor: 'pointer',
  },
  recordsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  recordCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '16px',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #E2E8F0',
    borderRadius: '16px',
  },
  cardTopRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardBadgeWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  categoryIconCircle: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    border: '1.5px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBadge: {
    fontSize: '0.72rem',
    fontWeight: '800',
    padding: '2px 8px',
    borderRadius: '6px',
    border: '1px solid',
    display: 'inline-block',
  },
  autoBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '0.64rem',
    fontWeight: '700',
    color: '#0D9488',
    backgroundColor: '#F0FDF4',
    border: '1px solid #A7F3D0',
    padding: '2px 6px',
    borderRadius: '6px',
    marginLeft: '6px',
  },
  cardActionsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  deleteCardBtn: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    backgroundColor: '#FEF2F2',
    border: '1px solid #FECACA',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  recordTitle: {
    fontSize: '1rem',
    fontWeight: '800',
    color: '#1E1B4B',
    margin: 0,
    lineHeight: '1.3',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    fontSize: '0.76rem',
    color: '#64748B',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontWeight: '600',
  },
  textContentBox: {
    backgroundColor: '#F8F9FE',
    border: '1px solid #EDE9FE',
    borderRadius: '10px',
    padding: '10px 12px',
  },
  textContent: {
    fontSize: '0.82rem',
    color: '#334155',
    lineHeight: '1.45',
    margin: 0,
    whiteSpace: 'pre-line',
    fontWeight: '500',
  },
  notesBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '8px 10px',
    backgroundColor: '#FFFBEB',
    border: '1px solid #FDE68A',
    borderRadius: '8px',
  },
  notesLabel: {
    fontSize: '0.68rem',
    fontWeight: '800',
    color: '#92400E',
    textTransform: 'uppercase',
  },
  notesText: {
    fontSize: '0.78rem',
    color: '#78350F',
    margin: 0,
    lineHeight: '1.35',
    fontWeight: '500',
  },
  tagsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  tagChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.68rem',
    fontWeight: '700',
    color: '#6D28D9',
    backgroundColor: '#F5F3FF',
    border: '1px solid #DDD6FE',
    padding: '2px 7px',
    borderRadius: '6px',
  },
  attachmentStrip: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    border: '1px solid #E2E8F0',
    borderRadius: '10px',
    padding: '8px 12px',
    gap: '10px',
  },
  attachmentLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minWidth: 0,
  },
  pdfIconWrap: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    backgroundColor: '#FEE2E2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  imgIconWrap: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    backgroundColor: '#E0F2FE',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  fileIconWrap: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    backgroundColor: '#DCFCE7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  attachmentTextWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    minWidth: 0,
  },
  attachmentFileName: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: '#1E293B',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  attachmentFileSize: {
    fontSize: '0.68rem',
    color: '#64748B',
    fontWeight: '500',
  },
  attachmentActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0,
  },
  viewAttachmentBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '5px 10px',
    borderRadius: '8px',
    backgroundColor: '#EDE9FE',
    color: '#6D28D9',
    border: '1px solid #DDD6FE',
    fontSize: '0.74rem',
    fontWeight: '800',
    cursor: 'pointer',
  },
  downloadLink: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #CBD5E1',
    cursor: 'pointer',
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
  modalDialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '520px',
    maxHeight: '90vh',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '18px 20px 14px 20px',
    borderBottom: '1px solid #E2E8F0',
  },
  modalTitle: {
    fontSize: '1.1rem',
    fontWeight: '900',
    color: '#1E1B4B',
    margin: '0 0 2px 0',
  },
  modalSub: {
    fontSize: '0.76rem',
    color: '#64748B',
    margin: 0,
    fontWeight: '500',
  },
  closeModalBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '8px',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    padding: '18px 20px',
  },
  formErrorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    backgroundColor: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: '10px',
    color: '#DC2626',
    fontSize: '0.8rem',
    fontWeight: '700',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  formRow: {
    display: 'flex',
    gap: '10px',
  },
  formLabel: {
    fontSize: '0.78rem',
    fontWeight: '800',
    color: '#334155',
  },
  typeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  typeSelectBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '9px 12px',
    borderRadius: '10px',
    border: '1.5px solid',
    fontSize: '0.78rem',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s ease',
  },
  formInput: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#F8FAFC',
    border: '1.5px solid #E2E8F0',
    borderRadius: '10px',
    fontSize: '0.82rem',
    color: '#1E293B',
    fontWeight: '600',
    outline: 'none',
    boxSizing: 'border-box',
  },
  formTextarea: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#F8FAFC',
    border: '1.5px solid #E2E8F0',
    borderRadius: '10px',
    fontSize: '0.82rem',
    color: '#1E293B',
    fontWeight: '500',
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  dropZone: {
    border: '2px dashed #CBD5E1',
    borderRadius: '12px',
    padding: '16px',
    backgroundColor: '#F8FAFC',
    cursor: 'pointer',
    transition: 'border-color 0.15s ease',
    textAlign: 'center',
  },
  dropZoneContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  dropIconWrap: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: '#EDE9FE',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '4px',
  },
  dropZoneText: {
    fontSize: '0.82rem',
    fontWeight: '800',
    color: '#4C1D95',
  },
  dropZoneHint: {
    fontSize: '0.7rem',
    color: '#64748B',
    fontWeight: '500',
  },
  fileSelectedBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    textAlign: 'left',
  },
  imgThumbnail: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    objectFit: 'cover',
    border: '1px solid #CBD5E1',
  },
  fileSelectedInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    flex: 1,
    minWidth: 0,
  },
  fileNameText: {
    fontSize: '0.82rem',
    fontWeight: '800',
    color: '#1E293B',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  fileSizeText: {
    fontSize: '0.7rem',
    color: '#64748B',
    fontWeight: '500',
  },
  removeFileBtn: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    backgroundColor: '#FEE2E2',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  modalFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '10px',
    paddingTop: '6px',
    borderTop: '1px solid #E2E8F0',
  },
  cancelBtn: {
    padding: '10px 18px',
    borderRadius: '12px',
    backgroundColor: '#F1F5F9',
    color: '#475569',
    border: 'none',
    fontSize: '0.82rem',
    fontWeight: '800',
    cursor: 'pointer',
  },
  submitBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 20px',
    borderRadius: '12px',
    backgroundColor: '#6D28D9',
    color: '#FFFFFF',
    border: 'none',
    fontSize: '0.82rem',
    fontWeight: '800',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(109, 40, 217, 0.3)',
  },

  // Preview Dialog
  previewDialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '700px',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  previewHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px',
    borderBottom: '1px solid #E2E8F0',
  },
  previewTitle: {
    fontSize: '0.92rem',
    fontWeight: '800',
    color: '#1E1B4B',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '450px',
  },
  previewHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  downloadHeaderBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    backgroundColor: '#F1F5F9',
    border: '1px solid #CBD5E1',
    cursor: 'pointer',
  },
  previewBody: {
    padding: '16px',
    overflowY: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    minHeight: '300px',
  },
  fullPreviewImg: {
    maxWidth: '100%',
    maxHeight: '65vh',
    borderRadius: '10px',
    objectFit: 'contain',
  },
  pdfIframe: {
    width: '100%',
    height: '65vh',
    border: 'none',
    borderRadius: '8px',
  },
  genericFilePreview: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '32px',
  },
  externalLinkBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 18px',
    backgroundColor: '#6D28D9',
    color: '#FFFFFF',
    borderRadius: '10px',
    textDecoration: 'none',
    fontSize: '0.82rem',
    fontWeight: '800',
  },

  // AI Report Interpretation Styles
  aiActionRow: {
    display: 'flex',
    alignItems: 'center',
    marginTop: '2px',
  },
  explainBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 14px',
    borderRadius: '10px',
    border: '1.5px solid',
    fontSize: '0.78rem',
    fontWeight: '800',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(109, 40, 217, 0.15)',
    transition: 'all 0.15s ease',
  },
  miniSpinner: {
    width: '14px',
    height: '14px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTop: '2px solid #FFFFFF',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  cachedPill: {
    fontSize: '0.62rem',
    fontWeight: '800',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    color: '#FFFFFF',
    padding: '1px 5px',
    borderRadius: '6px',
    marginLeft: '2px',
  },
  aiExplanationCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '14px',
    backgroundColor: '#FAF5FF',
    border: '1.5px solid #DDD6FE',
    borderRadius: '14px',
    boxShadow: '0 4px 14px rgba(109, 40, 217, 0.06)',
    marginTop: '4px',
  },
  aiCardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '10px',
    flexWrap: 'wrap',
  },
  aiTitleWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  aiSparkleIconBox: {
    width: '30px',
    height: '30px',
    borderRadius: '8px',
    backgroundColor: '#EDE9FE',
    border: '1px solid #C4B5FD',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  aiExplanationTitle: {
    fontSize: '0.88rem',
    fontWeight: '800',
    color: '#4C1D95',
    margin: '0 0 1px 0',
  },
  aiExplanationSub: {
    fontSize: '0.68rem',
    color: '#6B21A8',
    fontWeight: '500',
  },
  aiBadgeGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  aiSourceBadge: {
    fontSize: '0.66rem',
    fontWeight: '800',
    backgroundColor: '#EDE9FE',
    color: '#6D28D9',
    padding: '3px 7px',
    borderRadius: '6px',
    border: '1px solid #C4B5FD',
  },
  refreshAiBtn: {
    background: '#FFFFFF',
    border: '1px solid #DDD6FE',
    borderRadius: '6px',
    padding: '3px 7px',
    fontSize: '0.66rem',
    fontWeight: '700',
    color: '#6D28D9',
    cursor: 'pointer',
  },
  aiSummaryBox: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #EDE9FE',
    borderRadius: '10px',
    padding: '10px 12px',
  },
  aiSummaryText: {
    fontSize: '0.82rem',
    color: '#1E1B4B',
    lineHeight: '1.45',
    margin: 0,
    fontWeight: '600',
  },
  aiFindingsBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  aiSectionLabel: {
    fontSize: '0.72rem',
    fontWeight: '800',
    color: '#6D28D9',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  aiFindingsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    margin: 0,
    padding: 0,
    listStyleType: 'none',
  },
  aiFindingItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    fontSize: '0.78rem',
    color: '#334155',
    lineHeight: '1.35',
    fontWeight: '500',
  },
  aiAdviceBox: {
    backgroundColor: '#FFFBEB',
    border: '1px solid #FDE68A',
    borderRadius: '10px',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  aiAdviceHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  aiAdviceLabel: {
    fontSize: '0.72rem',
    fontWeight: '800',
    color: '#92400E',
    textTransform: 'uppercase',
  },
  aiAdviceText: {
    fontSize: '0.78rem',
    color: '#78350F',
    margin: 0,
    lineHeight: '1.35',
    fontWeight: '500',
  }
};

export default HealthRecordsPage;
