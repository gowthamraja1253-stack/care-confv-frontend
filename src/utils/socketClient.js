/**
 * Provider-Agnostic Secure Socket.IO Client Factory
 * Derives secure WebSocket transport from HTTPS backend configuration.
 * Preserves authentication credentials and handles automatic reconnection.
 */

import io from 'socket.io-client';
import { getSocketUrl } from '../config/env';

/**
 * Creates and initializes a Socket.IO connection.
 * @param {object} customOptions - Extra Socket.IO configuration options
 */
export function createSocket(customOptions = {}) {
  const socketUrl = getSocketUrl();
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

  // Read stored auth token to preserve authentication across connections
  const token = typeof window !== 'undefined' ? localStorage.getItem('rhl_token') : null;

  // Let Socket.IO client natively negotiate secure transport from the HTTPS URL/origin.
  // We do NOT hardcode wss://; passing an https:// URL automatically enables TLS (secure: true)
  // and issues wss:// upgrade headers cleanly.
  const defaultOptions = {
    // Both transports enabled for robust upgrade negotiation through reverse proxies & load balancers
    transports: ['websocket', 'polling'],
    upgrade: true,
    withCredentials: true,
    // Robust reconnect policy for unstable / rural network conditions
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    randomizationFactor: 0.5,
    timeout: 10000,
    autoConnect: true,
    auth: {
      token: token || undefined,
    },
    ...customOptions,
  };

  // Merge auth if custom options provided additional auth fields
  if (customOptions.auth) {
    defaultOptions.auth = {
      ...(token ? { token } : {}),
      ...customOptions.auth,
    };
  }

  // Derive secure transport from HTTPS origin or configured HTTPS URL without hardcoding wss://
  if (isHttps || (socketUrl && socketUrl.startsWith('https:'))) {
    defaultOptions.secure = true;
  }

  console.log(`[Socket] Initializing connection to: ${socketUrl || 'current-origin'} (Secure: ${Boolean(defaultOptions.secure)})`);

  // Connect using backend origin / URL. Socket.IO client automatically negotiates WSS when secure/https
  if (!socketUrl || (typeof window !== 'undefined' && socketUrl === window.location.origin)) {
    return io(defaultOptions);
  }

  return io(socketUrl, defaultOptions);
}

export default createSocket;
