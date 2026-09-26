import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OfflineProvider } from './context/OfflineContext';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import { initDevHealthCheck } from './utils/devHealthCheck';

function MainRouter() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-container" style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Connecting to Rural Health Link...</p>
      </div>
    );
  }

  return isAuthenticated ? <HomePage /> : <AuthPage />;
}

function App() {
  useEffect(() => {
    initDevHealthCheck();
  }, []);

  return (
    <AuthProvider>
      <OfflineProvider>
        <MainRouter />
      </OfflineProvider>
    </AuthProvider>
  );
}

const styles = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    backgroundColor: '#F8F9FE',
  },
  spinner: {
    width: '42px',
    height: '42px',
    border: '4px solid #EDE9FE',
    borderTop: '4px solid #6D28D9',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: '0.92rem',
    color: '#6D28D9',
    fontWeight: '700',
  }
};

export default App;
