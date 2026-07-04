// src/context/AuthContext.jsx
// Provides { user, token, login, register, loginWithToken, logout } to the whole app.
// Drop this into your component tree above your Router.

import React, { createContext, useContext, useState, useCallback } from 'react';
import api from '../api/axios';
import socket from '../api/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,  setUser]  = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user',  JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (email, password, name, role = 'student') => {
    const { data } = await api.post('/api/auth/register', { email, password, name, role });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user',  JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  // Used by the Google OAuth callback: the backend hands us a JWT in the URL,
  // we store it (so the axios interceptor attaches it) and fetch the user.
  const loginWithToken = useCallback(async (newToken) => {
    localStorage.setItem('token', newToken);
    const { data } = await api.get('/api/auth/me');
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(newToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    socket.disconnect();
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, register, loginWithToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}