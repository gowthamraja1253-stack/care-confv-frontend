import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/auth.service';
import i18n from '../i18n/i18n';

const AuthContext = createContext(null);

const normalizeLangCode = (lang) => {
  if (!lang) return 'en';
  const l = lang.toLowerCase();
  if (l.includes('hindi') || l === 'hi') return 'hi';
  if (l.includes('tamil') || l === 'ta') return 'ta';
  if (l.includes('telugu') || l === 'te') return 'te';
  if (l.includes('kannada') || l === 'kn') return 'kn';
  if (l.includes('malayalam') || l === 'ml') return 'ml';
  return 'en';
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('rhl_token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restore user session on mount if token exists
  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem('rhl_token');
      if (storedToken) {
        try {
          const res = await authService.getMe(storedToken);
          if (res.success && res.user) {
            setUser(res.user);
            setToken(storedToken);
            if (res.user.preferredLanguage) {
              const langCode = normalizeLangCode(res.user.preferredLanguage);
              i18n.changeLanguage(langCode);
              localStorage.setItem('i18nextLng', langCode);
            }
          } else {
            handleLogout();
          }
        } catch (err) {
          console.warn('[AuthContext] Session invalid:', err.message);
          handleLogout();
        }
      }
      setLoading(false);
    };

    restoreSession();
  }, []);

  const login = async (identifier, password) => {
    setError(null);
    try {
      const res = await authService.login({ identifier, password });
      if (res.success && res.token) {
        localStorage.setItem('rhl_token', res.token);
        setToken(res.token);
        setUser(res.user);
        if (res.user?.preferredLanguage) {
          const langCode = normalizeLangCode(res.user.preferredLanguage);
          i18n.changeLanguage(langCode);
          localStorage.setItem('i18nextLng', langCode);
        }
        return { success: true, user: res.user };
      }
    } catch (err) {
      setError(err.message);
      return { success: false, message: err.message };
    }
  };

  const register = async (userData) => {
    setError(null);
    try {
      const res = await authService.register(userData);
      if (res.success && res.token) {
        localStorage.setItem('rhl_token', res.token);
        setToken(res.token);
        setUser(res.user);
        if (res.user?.preferredLanguage) {
          const langCode = normalizeLangCode(res.user.preferredLanguage);
          i18n.changeLanguage(langCode);
          localStorage.setItem('i18nextLng', langCode);
        }
        return { success: true, user: res.user };
      }
    } catch (err) {
      setError(err.message);
      return { success: false, message: err.message };
    }
  };

  const updateProfile = async (profileData) => {
    setError(null);
    try {
      const res = await authService.updateProfile(profileData, token);
      if (res.success && res.user) {
        setUser(res.user);
        if (profileData.preferredLanguage) {
          const langCode = normalizeLangCode(profileData.preferredLanguage);
          i18n.changeLanguage(langCode);
          localStorage.setItem('i18nextLng', langCode);
        }
        return { success: true, user: res.user };
      }
    } catch (err) {
      setError(err.message);
      return { success: false, message: err.message };
    }
  };

  const changeLanguage = async (newLang) => {
    const langCode = normalizeLangCode(newLang);
    i18n.changeLanguage(langCode);
    localStorage.setItem('i18nextLng', langCode);

    if (user && token) {
      await updateProfile({ preferredLanguage: newLang });
    }
  };

  const handleLogout = async () => {
    if (token) {
      await authService.logout(token);
    }
    localStorage.removeItem('rhl_token');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    loading,
    error,
    login,
    register,
    updateProfile,
    changeLanguage,
    logout: handleLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
