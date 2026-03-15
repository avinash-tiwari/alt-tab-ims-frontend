const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const TOKEN_KEY = 'ims_tenant_token';
const TENANT_KEY = 'ims_tenant_info';

function buildQuery(query = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === '' || value === undefined || value === null) {
      return;
    }
    params.set(key, String(value));
  });
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

async function request(path, { method = 'GET', body, token, query } = {}) {
  const headers = {};

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['x-tenant-token'] = token;
  }

  const response = await fetch(`${API_BASE_URL}${path}${buildQuery(query)}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.message || `Request failed: ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function storeSession(token, tenant) {
  localStorage.setItem(TOKEN_KEY, token);
  if (tenant) {
    localStorage.setItem(TENANT_KEY, JSON.stringify(tenant));
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TENANT_KEY);
}

export function getStoredTenant() {
  const raw = localStorage.getItem(TENANT_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function login({ loginId, password }) {
  return request('/auth/login', {
    method: 'POST',
    body: { loginId, password }
  });
}

export async function listItems(token, query) {
  return request('/items', { token, query });
}

export async function getItem(token, itemId) {
  return request(`/items/${itemId}`, { token });
}

export async function listLowStockItems(token) {
  return request('/items/low-stock', { token });
}

export async function createItem(token, payload) {
  return request('/items', {
    method: 'POST',
    token,
    body: payload
  });
}

export async function updateItem(token, itemId, payload) {
  return request(`/items/${itemId}`, {
    method: 'PATCH',
    token,
    body: payload
  });
}

export async function deleteItem(token, itemId) {
  return request(`/items/${itemId}`, {
    method: 'DELETE',
    token
  });
}

export async function listCustomers(token) {
  return request('/customers', { token });
}

export async function getCustomer(token, customerId) {
  return request(`/customers/${customerId}`, { token });
}

export async function createCustomer(token, payload) {
  return request('/customers', {
    method: 'POST',
    token,
    body: payload
  });
}

export async function updateCustomer(token, customerId, payload) {
  return request(`/customers/${customerId}`, {
    method: 'PATCH',
    token,
    body: payload
  });
}

export async function deleteCustomer(token, customerId) {
  return request(`/customers/${customerId}`, {
    method: 'DELETE',
    token
  });
}

export async function setCustomerPrices(token, customerId, prices) {
  return request(`/customers/${customerId}/prices`, {
    method: 'PUT',
    token,
    body: { prices }
  });
}
