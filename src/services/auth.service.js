import { apiRequest } from '../utils/httpClient';

const API_BASE = '/api/auth';

export const authService = {
  async register(userData) {
    return await apiRequest(`${API_BASE}/register`, {
      method: 'POST',
      body: userData,
      timeoutMs: 4500,
    });
  },

  async login(credentials) {
    return await apiRequest(`${API_BASE}/login`, {
      method: 'POST',
      body: credentials,
      timeoutMs: 4500,
    });
  },

  async logout(token) {
    try {
      await apiRequest(`${API_BASE}/logout`, {
        method: 'POST',
        token,
        timeoutMs: 2000,
        retries: 0,
      });
    } catch (e) {
      // Ignore network errors on logout
    }
  },

  async getMe(token) {
    return await apiRequest(`${API_BASE}/me`, {
      method: 'GET',
      token,
      timeoutMs: 4000,
      retries: 1,
    });
  },

  async updateProfile(profileData, token) {
    return await apiRequest(`${API_BASE}/profile`, {
      method: 'PUT',
      token,
      body: profileData,
      timeoutMs: 4000,
    });
  },
};

export default authService;
