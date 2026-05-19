import axios from 'axios';

// Detect deployed vs local environment
const PORT_PLACEHOLDER = '__PORT_3001__';
const isDeployed = !PORT_PLACEHOLDER.startsWith('__');
export const API_BASE = isDeployed ? `${PORT_PLACEHOLDER}/api` : '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

const TOKEN_STORAGE_KEY = 'coincides_auth_token';
let _token: string | null = null;

export function getToken(): string | null {
  if (_token) return _token;

  try {
    _token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    _token = null;
  }

  return _token;
}

export function setToken(token: string | null): void {
  _token = token;

  try {
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Keep the in-memory fallback for sandboxed or restricted browser contexts.
  }
}

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses: clear token and redirect
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
