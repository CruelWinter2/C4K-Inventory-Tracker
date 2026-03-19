import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [loading, setLoading] = useState(true);

  // Axios interceptor: attach token from localStorage to every request
  useEffect(() => {
    const id = axios.interceptors.request.use(config => {
      const t = localStorage.getItem('c4k_token');
      if (t) config.headers.Authorization = `Bearer ${t}`;
      return config;
    });
    return () => axios.interceptors.request.eject(id);
  }, []);

  // Verify stored token on mount
  useEffect(() => {
    const t = localStorage.getItem('c4k_token');
    if (t) {
      axios.get(`${API}/auth/me`)
        .then(res => {
          setUser(res.data);
          setMustChangePassword(res.data.must_change_password);
        })
        .catch(() => {
          localStorage.removeItem('c4k_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await axios.post(`${API}/auth/login`, { username, password });
    const { access_token, must_change_password, username: uname, role } = res.data;
    localStorage.setItem('c4k_token', access_token);
    setUser({ username: uname, must_change_password, role });
    setMustChangePassword(must_change_password);
    return { must_change_password };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('c4k_token');
    setUser(null);
    setMustChangePassword(false);
  }, []);

  const onPasswordChanged = useCallback(() => {
    setMustChangePassword(false);
    setUser(prev => prev ? { ...prev, must_change_password: false } : prev);
  }, []);

  return (
    <AuthContext.Provider value={{ user, mustChangePassword, login, logout, onPasswordChanged, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
