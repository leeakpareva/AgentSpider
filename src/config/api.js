// API configuration that works both locally and on Vercel
const getApiUrl = () => {
  // In production (Vercel), use relative URLs for API routes
  if (import.meta.env.PROD) {
    return '/api';
  }
  
  // In development, use the local backend server
  // You can override this with VITE_API_URL environment variable
  return import.meta.env.VITE_API_URL || 'http://192.168.0.32:3001/api';
};

export const API_URL = getApiUrl();

export const API_ENDPOINTS = {
  systemStatus: `${API_URL}/system-status`,
  chat: `${API_URL}/chat`,
  crawler: `${API_URL}/crawler`,
};