import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('stockflow_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('stockflow_token'));
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('stockflow_token')));

  const clearSession = useCallback(() => {
    localStorage.removeItem('stockflow_token');
    localStorage.removeItem('stockflow_user');
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearSession();
    };
    window.addEventListener('stockflow:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('stockflow:unauthorized', handleUnauthorized);
  }, [clearSession]);

  useEffect(() => {
    let active = true;
    async function verifySession() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        if (active && res.data?.data?.user) {
          setUser(res.data.data.user);
          localStorage.setItem('stockflow_user', JSON.stringify(res.data.data.user));
        }
      } catch {
        if (active) {
          clearSession();
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    verifySession();
    return () => {
      active = false;
    };
  }, [token, clearSession]);

  const persistSession = (nextToken, nextUser) => {
    localStorage.setItem('stockflow_token', nextToken);
    localStorage.setItem('stockflow_user', JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: nextToken, user: nextUser } = res.data.data;
    persistSession(nextToken, nextUser);
    return nextUser;
  };

  const register = async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    const { token: nextToken, user: nextUser } = res.data.data;
    persistSession(nextToken, nextUser);
    return nextUser;
  };

  const logout = () => {
    clearSession();
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('stockflow_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: Boolean(token && user),
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}

