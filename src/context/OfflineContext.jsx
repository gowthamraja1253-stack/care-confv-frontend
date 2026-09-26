import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  getPendingSyncCount,
  getPendingActions,
  replaySyncQueue,
  addToSyncQueue,
  SYNC_ACTIONS,
} from '../offline/syncQueue';
import { isLowBandwidthConnection, fetchWithTimeout } from '../utils/httpClient';

const OfflineContext = createContext();

export const OfflineProvider = ({ children }) => {
  const { token } = useAuth();
  
  // Real connectivity & bandwidth state
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [isLowBandwidth, setIsLowBandwidth] = useState(() => isLowBandwidthConnection());
  const [bandwidthQuality, setBandwidthQuality] = useState(() => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline';
    return isLowBandwidthConnection() ? 'low-bandwidth' : 'good';
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [lastCheckedAt, setLastCheckedAt] = useState(null);
  const [lastSyncResult, setLastSyncResult] = useState(null);

  const isSyncingRef = useRef(false);
  const pingIntervalRef = useRef(null);

  // Update pending queue count
  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getPendingSyncCount();
      setPendingCount(count);
    } catch (err) {
      console.warn('[OfflineContext] Failed to count pending sync items:', err);
    }
  }, []);

  // Ping backend /api/health with fast 2500ms timeout to confirm connectivity without clogging 2G
  const checkConnectivity = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      setBandwidthQuality('offline');
      setLastCheckedAt(new Date());
      return false;
    }

    try {
      const startTime = Date.now();
      const res = await fetchWithTimeout('/api/health', { method: 'GET', cache: 'no-store' }, 2500);
      const rtt = Date.now() - startTime;
      
      const connected = res.ok;
      setIsOnline(connected);
      const lowBandwidth = !connected || rtt > 600 || isLowBandwidthConnection();
      setIsLowBandwidth(lowBandwidth);
      setBandwidthQuality(connected ? (lowBandwidth ? 'low-bandwidth' : 'good') : 'offline');
      setLastCheckedAt(new Date());
      return connected;
    } catch (err) {
      // Fast timeout or server unreachable
      setIsOnline(false);
      setBandwidthQuality('offline');
      setLastCheckedAt(new Date());
      return false;
    }
  }, []);

  // Manual or automatic Sync trigger
  const syncNow = useCallback(async () => {
    if (isSyncingRef.current) return;
    
    const count = await getPendingSyncCount();
    if (count === 0) {
      return;
    }

    try {
      isSyncingRef.current = true;
      setIsSyncing(true);
      setSyncProgress({ current: 0, total: count });

      const result = await replaySyncQueue(token, (prog) => {
        setSyncProgress({ current: prog.current, total: prog.total });
      });

      setLastSyncResult(result);
      await refreshPendingCount();
    } catch (err) {
      console.error('[OfflineContext] Sync error:', err);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
      setSyncProgress({ current: 0, total: 0 });
    }
  }, [token, refreshPendingCount]);

  // Initial load, navigator listeners, and light adaptive ping
  useEffect(() => {
    refreshPendingCount();
    checkConnectivity();

    const handleOnline = async () => {
      console.log('[OfflineContext] Browser online event');
      const connected = await checkConnectivity();
      if (connected) {
        syncNow();
      }
    };

    const handleOffline = () => {
      console.log('[OfflineContext] Browser offline event');
      setIsOnline(false);
      setBandwidthQuality('offline');
    };

    const handleQueueChange = () => {
      refreshPendingCount();
    };

    const handleConnectionChange = () => {
      const low = isLowBandwidthConnection();
      setIsLowBandwidth(low);
      if (navigator.onLine) {
        setBandwidthQuality(low ? 'low-bandwidth' : 'good');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('syncqueue-changed', handleQueueChange);
    window.addEventListener('syncqueue-completed', handleQueueChange);

    const navConn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (navConn) {
      navConn.addEventListener('change', handleConnectionChange);
    }

    // Adaptive 25s ping interval to conserve bandwidth on rural cellular
    pingIntervalRef.current = setInterval(() => {
      checkConnectivity();
    }, 25000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('syncqueue-changed', handleQueueChange);
      window.removeEventListener('syncqueue-completed', handleQueueChange);
      if (navConn) {
        navConn.removeEventListener('change', handleConnectionChange);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, [checkConnectivity, refreshPendingCount, syncNow]);

  // Auto trigger sync if token becomes available and there are pending items
  useEffect(() => {
    if (token && isOnline && pendingCount > 0 && !isSyncing) {
      syncNow();
    }
  }, [token, isOnline, pendingCount, isSyncing, syncNow]);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        isLowBandwidth,
        bandwidthQuality,
        isSyncing,
        pendingCount,
        syncProgress,
        lastCheckedAt,
        lastSyncResult,
        checkConnectivity,
        syncNow,
        addToQueue: addToSyncQueue,
        refreshPendingCount,
        SYNC_ACTIONS,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};

export default OfflineContext;
