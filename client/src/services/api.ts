import axios from 'axios';

// Detect deployed vs local environment
const PORT_PLACEHOLDER = '__PORT_3001__';
const isDeployed = !PORT_PLACEHOLDER.startsWith('__');
const API_BASE = isDeployed ? `${PORT_PLACEHOLDER}/api` : '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// In-memory token store (sandboxed iframe — no persistent storage)
let _token: string | null = null;

export function getToken(): string | null {
  return _token;
}

export function setToken(token: string | null): void {
  _token = token;
}

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses — clear token and redirect
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      setToken(null);
      const hash = window.location.hash;
      if (!hash.includes('/login') && !hash.includes('/register')) {
        window.location.hash = '#/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
