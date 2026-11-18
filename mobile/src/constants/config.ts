/**
 * API Configuration for Chaad Baad (चाडबाड)
 */

// Change this to your machine's local IP when testing on a physical device
// e.g., 'http://192.168.1.100:8000'
export const API_BASE_URL = 'http://localhost:8000';

export const API_ENDPOINTS = {
  // Auth
  TOKEN: '/api/token/',
  TOKEN_REFRESH: '/api/token/refresh/',
  REGISTER: '/api/auth/register/',
  PROFILE: '/api/auth/profile/',
  LOGOUT: '/api/auth/logout/',
  CHANGE_PASSWORD: '/api/auth/change-password/',
  PASSWORD_RESET: '/api/auth/password-reset/',
  PASSWORD_RESET_CONFIRM: '/api/auth/password-reset/confirm/',

  // Festivals
  FESTIVALS: '/api/festivals/',
  CALENDAR: '/api/festivals/calendar/',

  // Marketplace
  SHOPS: '/api/marketplace/shops/',
  PRODUCTS: '/api/marketplace/products/',
  CATEGORIES: '/api/marketplace/categories/',

  // Orders
  CART: '/api/orders/cart/',
  ORDERS: '/api/orders/',
};

export const APP_CONFIG = {
  APP_NAME: 'Chaad Baad',
  APP_NAME_NE: 'चाडबाड',
  DEFAULT_LANGUAGE: 'ne',
  SUPPORTED_CITIES: ['Damak', 'Birtamod', 'Itahari'],
  PAYMENT_METHODS: ['cash_on_delivery'],
};
