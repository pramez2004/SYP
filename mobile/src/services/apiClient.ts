import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, API_ENDPOINTS } from '../constants/config';

/**
 * Axios instance configured for the Chaad Baad backend API.
 * Automatically attaches JWT access tokens and handles token refresh.
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach access token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

let refreshPromise: Promise<string> | null = null;

// Response interceptor — handle 401 and refresh tokens
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Do not attempt refresh on auth endpoints to prevent loops
    const url = originalRequest?.url || '';
    const isAuthEndpoint =
      url.includes(API_ENDPOINTS.TOKEN) ||
      url.includes(API_ENDPOINTS.TOKEN_REFRESH) ||
      url.includes('register') ||
      url.includes('password-reset');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      // Check if another concurrent request already refreshed the token
      const currentToken = await AsyncStorage.getItem('access_token');
      const authHeader = (originalRequest.headers?.Authorization as string) || '';
      const requestToken = authHeader.replace(/^Bearer\s+/i, '').trim();

      if (currentToken && requestToken && currentToken !== requestToken) {
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${currentToken}`;
        return apiClient(originalRequest);
      }

      // Share a single in-flight refresh promise across all concurrent 401s
      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            const refreshToken = await AsyncStorage.getItem('refresh_token');
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            const { data } = await axios.post(`${API_BASE_URL}${API_ENDPOINTS.TOKEN_REFRESH}`, {
              refresh: refreshToken,
            });

            const newAccess = data.access as string;
            await AsyncStorage.setItem('access_token', newAccess);
            if (data.refresh) {
              await AsyncStorage.setItem('refresh_token', data.refresh);
            }
            return newAccess;
          } catch (refreshError) {
            await AsyncStorage.removeItem('access_token');
            await AsyncStorage.removeItem('refresh_token');
            throw refreshError;
          } finally {
            refreshPromise = null;
          }
        })();
      }

      try {
        const newAccessToken = await refreshPromise;
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
