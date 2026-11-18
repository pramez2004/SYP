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

// Response interceptor — handle 401 and refresh tokens
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do not attempt refresh on auth endpoints to prevent loops
    const url = originalRequest?.url || '';
    const isAuthEndpoint =
      url.includes(API_ENDPOINTS.TOKEN) ||
      url.includes(API_ENDPOINTS.TOKEN_REFRESH) ||
      url.includes('register');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        if (refreshToken) {
          const { data } = await axios.post(`${API_BASE_URL}${API_ENDPOINTS.TOKEN_REFRESH}`, {
            refresh: refreshToken,
          });

          await AsyncStorage.setItem('access_token', data.access);
          if (data.refresh) {
            await AsyncStorage.setItem('refresh_token', data.refresh);
          }

          originalRequest.headers.Authorization = `Bearer ${data.access}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed — clear tokens (user needs to log in again)
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('refresh_token');
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
