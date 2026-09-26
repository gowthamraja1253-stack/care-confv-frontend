import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './i18n/i18n';
import './styles/global.css';
import 'leaflet/dist/leaflet.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Production-Safe Service Worker Registration (Secure Contexts: HTTPS or localhost)
if (
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  (window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[PWA] Service Worker active with scope:', registration.scope);

        // Safe Service Worker Update Detection
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New update available; inform the worker or prompt user
                console.log('[PWA] New version installed and ready for activation');
                // Auto-activate when user is idle or send SKIP_WAITING
                installingWorker.postMessage({ type: 'SKIP_WAITING' });
              } else {
                console.log('[PWA] App shell content cached for offline use');
              }
            }
          });
        });
      })
      .catch((error) => {
        console.warn('[PWA] Service Worker registration skipped/failed:', error.message);
      });

    // Handle seamless controller change on new worker takeover
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        console.log('[PWA] Service Worker controller updated');
      }
    });
  });
}

