import React, {createContext, useContext, useEffect, useState} from 'react';
import {User} from '../types';
import {getAccessToken, getRefreshToken, setTokens, clearAuth, getStoredUser, setStoredUser} from '../lib/storage';
import {getMeApi, logoutApi} from '../lib/services/auth.service';
import {loginPurchases, logoutPurchases} from '../lib/purchases';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (accessToken: string, refreshToken: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const token = await getAccessToken();
        if (!token) {setLoading(false); return;}
        const stored = await getStoredUser();
        if (stored) {setUser(JSON.parse(stored));}
        const fresh = await getMeApi();
        setUser(fresh);
        await setStoredUser(fresh);
        await loginPurchases(fresh.id);
      } catch {
        await clearAuth();
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  async function login(accessToken: string, refreshToken: string, u: User) {
    await setTokens(accessToken, refreshToken);
    await setStoredUser(u);
    setUser(u);
    await loginPurchases(u.id);
  }

  async function logout() {
    try {
      const refresh = await getRefreshToken();
      if (refresh) {await logoutApi(refresh);}
    } catch {}
    await logoutPurchases();
    await clearAuth();
    setUser(null);
  }

  async function refreshUser() {
    try {
      const fresh = await getMeApi();
      setUser(fresh);
      await setStoredUser(fresh);
    } catch {}
  }

  return (
    <AuthContext.Provider value={{user, loading, login, logout, refreshUser}}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
