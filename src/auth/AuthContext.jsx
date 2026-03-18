import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  auth as authApi,
  bootstrapAuth,
  setAccessToken,
  setRefreshToken,
  clearAccessToken,
  clearRefreshToken,
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]         = useState(null);
  const [profile, setProfile]   = useState(null);
  const [isLoading, setLoading] = useState(true);

  // On app load: attempt to restore session from stored refresh token
  useEffect(() => {
    bootstrapAuth()
      .then(result => {
        if (result) { setUser(result.user); setProfile(result.profile); }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async ({ email, password, rememberMe = false, deviceLabel }) => {
    const data = await authApi.login({ email, password, remember_me: rememberMe, device_label: deviceLabel });
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch {}
    clearAccessToken();
    clearRefreshToken();
    setUser(null);
    setProfile(null);
  }, []);

  const updateUser = useCallback((updates) => {
    setUser(prev => prev ? { ...prev, ...updates } : prev);
  }, []);

  const updateProfile = useCallback((updates) => {
    setProfile(prev => prev ? { ...prev, ...updates } : prev);
  }, []);

  const value = {
    user,
    profile,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    updateUser,
    updateProfile,
    setProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
