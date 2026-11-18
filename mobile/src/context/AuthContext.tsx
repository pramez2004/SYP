import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../services/apiClient';
import { API_ENDPOINTS } from '../constants/config';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  avatar: string | null;
  role: 'customer' | 'seller' | 'admin';
  city: string;
  address: string;
  preferred_language: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  password2: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: 'customer' | 'seller';
  city: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string, newPassword2: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (token) {
        const response = await apiClient.get(API_ENDPOINTS.PROFILE);
        setUser(response.data);
      }
    } catch (error) {
      // Token expired or invalid
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('refresh_token');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    const response = await apiClient.post(API_ENDPOINTS.TOKEN, {
      username,
      password,
    });
    await AsyncStorage.setItem('access_token', response.data.access);
    await AsyncStorage.setItem('refresh_token', response.data.refresh);
    await loadUser();
  };

  const register = async (data: RegisterData) => {
    await apiClient.post(API_ENDPOINTS.REGISTER, data);
    // Auto-login after registration
    await login(data.username, data.password);
  };

  const logout = async () => {
    try {
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (refreshToken) {
        // Blacklist refresh token server-side
        await apiClient.post(API_ENDPOINTS.LOGOUT, { refresh: refreshToken });
      }
    } catch (error) {
      // Ignore network errors on logout, proceed with clearing local storage
    } finally {
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('refresh_token');
      setUser(null);
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    const response = await apiClient.patch(API_ENDPOINTS.PROFILE, data);
    setUser(response.data);
  };

  const changePassword = async (oldPassword: string, newPassword: string, newPassword2: string) => {
    await apiClient.post(API_ENDPOINTS.CHANGE_PASSWORD, {
      old_password: oldPassword,
      new_password: newPassword,
      new_password2: newPassword2,
    });
  };

  const refreshProfile = async () => {
    await loadUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
