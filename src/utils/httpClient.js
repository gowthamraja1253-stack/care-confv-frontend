/**
 * Resilient Low-Bandwidth HTTP Client for Rural Health Link
 * Features:
 * - Strict timeout (default 3500ms, configurable) via AbortController
 * - Low-bandwidth / 2G / 3G awareness
 * - Exponential backoff retry on transient drops
 * - Standardized error reporting with timeout & offline tags
 */

import { resolveApiUrl, getApiBaseUrl } from '../config/env';

export function isLowBandwidthConnection() {
  if (typeof navigator === 'undefined') return false;
  if (!navigator.onLine) return true;
  
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn) {
    if (conn.saveData) return true;
    if (conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g' || conn.effectiveType === '3g') {
      return true;
    }
    if (conn.rtt && conn.rtt > 600) return true;
  }
  return false;
}

export async function fetchWithTimeout(url, options = {}, timeoutMs = 3500) {
  const resolvedUrl = resolveApiUrl(url);

  // For standard requests on low-bandwidth networks, provide headroom (4500ms).
  // For AI/LLM inferences, explanations, or translations (timeoutMs > 4000), preserve or extend the timeout.
  let adaptiveTimeout = timeoutMs;
  if (isLowBandwidthConnection()) {
    adaptiveTimeout = timeoutMs > 4000 ? Math.max(timeoutMs, 25000) : 4500;
  }
  
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), adaptiveTimeout);

  try {
    const response = await fetch(resolvedUrl, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timerId);
    return response;
  } catch (err) {
    clearTimeout(timerId);
    if (err.name === 'AbortError') {
      const timeoutError = new Error(`Request timed out after ${adaptiveTimeout}ms (Low bandwidth network)`);
      timeoutError.isTimeout = true;
      timeoutError.isNetworkError = true;
      throw timeoutError;
    }
    err.isNetworkError = true;
    throw err;
  }
}

/**
 * Standard API Request wrapper with retry and timeout protection
 */
export async function apiRequest(endpoint, {
  method = 'GET',
  token = null,
  body = null,
  headers = {},
  timeoutMs = 3500,
  retries = 1,
} = {}) {
  const reqHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  const reqOptions = {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  };

  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(endpoint, reqOptions, timeoutMs);
      const data = await response.json();
      
      if (!response.ok) {
        const error = new Error(data.message || `HTTP ${response.status} request failed`);
        error.status = response.status;
        error.data = data;
        throw error;
      }
      
      return data;
    } catch (err) {
      lastError = err;
      // Do not retry on 4xx client validation errors
      if (err.status && err.status >= 400 && err.status < 500) {
        throw err;
      }
      
      // If we have retries left and it was a network/timeout error, wait briefly
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

export default {
  fetchWithTimeout,
  apiRequest,
  isLowBandwidthConnection,
};
