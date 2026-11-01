import React, { createContext, useContext, useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { User } from '../types';
import {
  loginApi,
  registerApi,
  getMeApi,
  updateProfileApi,
  LoginPayload,
  RegisterPayload,
} from '../api/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<{ user: User; chatId: string }>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<User>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('privateid_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    try {
      const res = await getMeApi();
      if (res.success && res.user) {
        setUser(res.user);
      }
    } catch (err) {
      console.warn('Failed to refresh user profile:', err);
      logout();
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('privateid_token');
      if (storedToken) {
        setToken(storedToken);
        try {
          const res = await getMeApi();
          if (res.success && res.user) {
            setUser(res.user);
          } else {
            logout();
          }
        } catch {
          logout();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (payload: LoginPayload): Promise<User> => {
    const res = await loginApi(payload);
    localStorage.setItem('privateid_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const register = async (payload: RegisterPayload): Promise<{ user: User; chatId: string }> => {
    const res = await registerApi(payload);
    localStorage.setItem('privateid_token', res.token);
    setToken(res.token);
    setUser(res.user);

    // Celebrate new unique Chat ID with subtle confetti
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#7c3aed', '#6366f1', '#3b82f6', '#ec4899'],
      });
    } catch {
      // Ignore if confetti fails
    }

    return { user: res.user, chatId: res.chatId || res.user.chatId };
  };

  const logout = () => {
    localStorage.removeItem('privateid_token');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (data: Partial<User>): Promise<User> => {
    const res = await updateProfileApi(data);
    setUser(res.user);
    return res.user;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && token),
        isLoading,
        login,
        register,
        logout,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
