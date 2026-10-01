// API Client for WarehousePro - Universal Local & Production Support

const envApiUrl = import.meta.env.VITE_API_URL;
// Normalize base URL without trailing slashes
const normalizedHost = envApiUrl ? envApiUrl.trim().replace(/\/+$/, '') : '';
const API_BASE = normalizedHost 
  ? (normalizedHost.endsWith('/api') ? normalizedHost : `${normalizedHost}/api`) 
  : '/api';

export async function apiRequest(endpoint, options = {}) {
  const role = localStorage.getItem('warehouse_role') || 'Admin';
  const username = localStorage.getItem('warehouse_username') || 'admin';

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'x-user-role': role,
    'x-username': username
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  };

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${API_BASE}${cleanEndpoint}`;

  try {
    const response = await fetch(fullUrl, config);
    const data = await response.json();

    if (!response.ok || data.success === false) {
      throw new Error(data.error || `HTTP error ${response.status}: ${response.statusText}`);
    }

    return data;
  } catch (error) {
    console.error(`API Error [${fullUrl}]:`, error.message);
    throw error;
  }
}

export const api = {
  get: (url) => apiRequest(url, { method: 'GET' }),
  post: (url, body) => apiRequest(url, { method: 'POST', body: JSON.stringify(body) }),
  put: (url, body) => apiRequest(url, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (url) => apiRequest(url, { method: 'DELETE' })
};
