/**
 * Provider-Agnostic Client Environment & Secure Protocol Configuration
 * Supports HTTPS frontends, HTTPS backends, secure WebSockets (WSS),
 * WebRTC ICE/TURN servers, and dynamic cloud/on-prem environments.
 */

/**
 * Check if current runtime is in a Secure Context (HTTPS or localhost)
 * Required by browser specifications for Web Crypto, WebRTC getUserMedia, and Service Workers.
 */
export const isSecureContext = () => {
  if (typeof window === 'undefined') return true;
  if (window.isSecureContext) return true;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
};

/**
 * Get base API URL.
 * Defaults to empty string (relative '/api') so that:
 * - Vite dev proxy handles it locally
 * - Same-domain or reverse proxy handles it in production
 * - Or VITE_API_URL overrides it for decoupled/cross-domain deployments.
 */
export const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    let clean = envUrl.trim().replace(/\/+$/, '');
    // In HTTPS frontend context, upgrade http:// to https:// to prevent mixed-content blocking
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && clean.startsWith('http://')) {
      clean = clean.replace(/^http:\/\//i, 'https://');
    }
    return clean;
  }
  return '';
};

/**
 * Resolve an endpoint to a full or relative URL with HTTPS/mixed-content protection.
 */
export const resolveApiUrl = (endpoint) => {
  if (!endpoint) return '';
  // If already an absolute URL
  if (/^https?:\/\//i.test(endpoint)) {
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && endpoint.startsWith('http://')) {
      return endpoint.replace(/^http:\/\//i, 'https://');
    }
    return endpoint;
  }
  const base = getApiBaseUrl();
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let finalUrl = base ? `${base}${path}` : path;
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && finalUrl.startsWith('http://')) {
    finalUrl = finalUrl.replace(/^http:\/\//i, 'https://');
  }
  return finalUrl;
};

/**
 * Get Socket.IO server URL with automatic secure WebSocket (WSS) protocol matching.
 * Derives backend origin without requiring hard-coded wss://.
 */
export const getSocketUrl = () => {
  let envSocketUrl = import.meta.env.VITE_SOCKET_URL;
  if (!envSocketUrl && import.meta.env.VITE_API_URL) {
    try {
      const parsed = new URL(import.meta.env.VITE_API_URL, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
      envSocketUrl = parsed.origin;
    } catch {
      envSocketUrl = String(import.meta.env.VITE_API_URL).replace(/\/api\/?$/i, '');
    }
  }

  if (envSocketUrl && typeof envSocketUrl === 'string' && envSocketUrl.trim()) {
    let clean = envSocketUrl.trim().replace(/\/+$/, '');
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && clean.startsWith('http://')) {
      clean = clean.replace(/^http:\/\//i, 'https://');
    }
    return clean;
  }
  // When running in browser, default to current origin (works with reverse proxies and dev server proxy)
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }
  return '';
};

/**
 * Get WebRTC Default ICE (STUN) configuration.
 * Note: Production TURN credentials must NEVER be permanently hardcoded or exposed in frontend env.
 * They are fetched as short-lived, authenticated tokens from GET /api/webrtc/ice-servers.
 */
export const getDefaultIceServers = () => {
  const envIce = import.meta.env.VITE_WEBRTC_ICE_SERVERS;
  if (envIce) {
    try {
      const parsed = JSON.parse(envIce);
      if (Array.isArray(parsed)) return { iceServers: parsed, iceTransportPolicy: 'all' };
      if (parsed.iceServers) return { iceTransportPolicy: 'all', ...parsed };
    } catch (e) {
      console.warn('[WebRTC] Could not parse VITE_WEBRTC_ICE_SERVERS JSON, using fallback:', e.message);
    }
  }

  // Public STUN servers for direct P2P candidate discovery
  const defaultStun = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ];

  return {
    iceServers: defaultStun,
    // Preserve direct P2P connections; TURN is only used as relay fallback when required
    iceTransportPolicy: 'all',
  };
};

export const getIceServers = getDefaultIceServers;

/**
 * Get Leaflet/OpenStreetMap Tile URL (always HTTPS compatible)
 */
export const getMapTileUrl = () => {
  const envTile = import.meta.env.VITE_MAP_TILE_URL;
  if (envTile && typeof envTile === 'string' && envTile.trim()) {
    let clean = envTile.trim();
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && clean.startsWith('http://')) {
      clean = clean.replace(/^http:\/\//i, 'https://');
    }
    return clean;
  }
  return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
};

/**
 * Get Translation API URL (optional custom service override, e.g. LibreTranslate)
 */
export const getTranslationApiUrl = () => {
  return import.meta.env.VITE_TRANSLATION_API_URL || '';
};
