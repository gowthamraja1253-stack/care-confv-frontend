/**
 * Rural Health Link - Production-Safe Progressive Web App Service Worker
 * 
 * ARCHITECTURAL RESPONSIBILITY DISTINCTION:
 * 1. Service Worker & Cache Storage (Public/Unencrypted Browser Storage):
 *    - CACHES ONLY: App shell (index.html), JavaScript bundles, CSS stylesheets, icons, fonts, static assets.
 *    - STRICTLY EXCLUDES:
 *        * Health-record API responses (/api/health-records/*)
 *        * Patient medical data, diagnoses, and e-prescriptions
 *        * Authentication endpoints and JWT tokens (/api/auth/*)
 *        * Any request containing an Authorization header
 *        * Socket.IO, WebSockets, and WebRTC signaling traffic
 * 2. Encrypted IndexedDB (Dexie + AES-GCM 256-bit Web Crypto):
 *    - Dedicated storage for ALL patient medical data, consultation notes, and offline sync queues.
 *    - Data is protected by hardware-backed Web Crypto encryption before being written to disk,
 *      ensuring zero plaintext medical exposure.
 */

// Cache Versioning
const CACHE_VERSION = 'rhl-shell-v2';
const STATIC_CACHE_NAME = CACHE_VERSION;

// App Shell Core Assets (Static, non-sensitive)
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/vite.svg',
];

/**
 * Identify sensitive requests that MUST NEVER be stored in Service Worker Cache Storage
 */
function isSensitiveOrBypass(request, url) {
  // Non-GET requests (mutations, uploads, posts, deletes)
  if (request.method !== 'GET') return true;

  // Real-time protocols (WebSockets & Socket.IO)
  if (url.protocol.startsWith('ws') || request.headers.get('Upgrade') === 'websocket') return true;
  if (url.pathname.startsWith('/socket.io')) return true;

  // WebRTC endpoints
  if (url.pathname.startsWith('/api/webrtc') || url.pathname.startsWith('/webrtc')) return true;

  // ALL API routes: Health records, patient medical data, diagnostics, prescriptions, auth
  if (url.pathname.startsWith('/api')) return true;

  // Authenticated requests carrying JWT Bearer tokens or sensitive headers
  if (request.headers.has('Authorization')) return true;

  return false;
}

/**
 * Identify static presentation assets eligible for caching
 */
function isStaticAsset(url) {
  // Vite bundled assets (JS/CSS with content hashes)
  if (url.pathname.startsWith('/assets/')) return true;
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) return true;

  // Static images, SVGs, and web fonts
  if (url.pathname.endsWith('.svg') || url.pathname.endsWith('.png') || url.pathname.endsWith('.jpg') || url.pathname.endsWith('.ico')) return true;
  if (url.pathname.endsWith('.woff2') || url.pathname.endsWith('.woff') || url.pathname.endsWith('.ttf')) return true;

  // External static CDN fonts (Google Fonts)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') return true;

  return false;
}

// 1. Install Event: Pre-cache static app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log(`[SW] Pre-caching static app shell (${STATIC_CACHE_NAME})`);
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Pre-cache addAll warning:', err.message);
      });
    })
  );
  // Do NOT force skipWaiting() automatically during install to avoid abruptly breaking active user sessions.
  // Controlled updates are triggered safely via SKIP_WAITING message or upon next user visit.
});

// 2. Activate Event: Old-cache cleanup & claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== STATIC_CACHE_NAME) {
            console.log(`[SW] Purging outdated cache: ${name}`);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Message Event: Safe Service Worker update workflow
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING command, activating new worker immediately');
    self.skipWaiting();
  }
});

// 4. Fetch Event: Routing & Caching Policies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Policy A: Sensitive Data, Patient APIs & WebSockets -> STRICT NETWORK ONLY (Never Cached)
  if (isSensitiveOrBypass(request, url)) {
    event.respondWith(
      fetch(request).catch(() => {
        // When offline, return structured offline status for API requests
        // Client services will seamlessly read from encrypted IndexedDB
        if (url.pathname.startsWith('/api')) {
          return new Response(
            JSON.stringify({
              success: false,
              offline: true,
              message: 'Device is offline. Medical data is accessed from encrypted IndexedDB storage.',
            }),
            {
              status: 503,
              statusText: 'Service Unavailable (Offline)',
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
        return Promise.reject(new Error('Network request failed; sensitive request not cached'));
      })
    );
    return;
  }

  // Policy B: SPA HTML Navigation -> Network-First with cached app shell fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => cache.put('/index.html', clone));
          }
          return networkResponse;
        })
        .catch(() => {
          console.log(`[SW] Serving offline SPA shell for navigation: ${url.pathname}`);
          return caches.match('/index.html').then((cachedShell) => {
            return cachedShell || caches.match('/');
          });
        })
    );
    return;
  }

  // Policy C: Static Assets (JS, CSS, Icons, Fonts) -> Stale-While-Revalidate
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
              const clone = networkResponse.clone();
              caches.open(STATIC_CACHE_NAME).then((cache) => {
                cache.put(request, clone);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Policy D: Fallback for other non-sensitive GET requests
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
