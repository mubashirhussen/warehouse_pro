// API Client for WarehousePro

const API_BASE = '/api';

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

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok || data.success === false) {
      throw new Error(data.error || `HTTP error ${response.status}: ${response.statusText}`);
    }

    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error.message);
    throw error;
  }
}

export const api = {
  get: (url) => apiRequest(url, { method: 'GET' }),
  post: (url, body) => apiRequest(url, { method: 'POST', body: JSON.stringify(body) }),
  put: (url, body) => apiRequest(url, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (url) => apiRequest(url, { method: 'DELETE' })
};
