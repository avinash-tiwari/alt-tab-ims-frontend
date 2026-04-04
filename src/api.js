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

export async function updateBulkStock(token, payload) {
  return request('/items/bulk-stock', {
    method: 'PATCH',
    token,
    body: payload
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

export async function getCustomerPrices(token, customerId) {
  return request(`/customers/${customerId}/prices`, { token });
}

export async function listOrders(token) {
  return request('/orders', { token });
}

export async function createOrder(token, payload) {
  return request('/orders', {
    method: 'POST',
    token,
    body: payload
  });
}

export async function createPublicOrder(payload, token) {
  return request('/public/orders', {
    method: 'POST',
    token,
    body: payload
  });
}

export async function getOrder(token, orderId) {
  return request(`/orders/${orderId}`, { token });
}

export async function updateOrder(token, orderId, payload) {
  return request(`/orders/${orderId}`, {
    method: 'PATCH',
    token,
    body: payload
  });
}

export async function deleteOrder(token, orderId) {
  return request(`/orders/${orderId}`, {
    method: 'DELETE',
    token
  });
}

export async function updateOrderStatus(token, orderId, status) {
  return request(`/orders/${orderId}/status`, {
    method: 'PATCH',
    token,
    body: { status }
  });
}

export async function updateOrderItemQuantity(token, orderId, orderItemId, payload) {
  return request(`/orders/${orderId}/items/${orderItemId}`, {
    method: 'PATCH',
    token,
    body: payload
  });
}

export async function deleteOrderItem(token, orderId, orderItemId) {
  return request(`/orders/${orderId}/items/${orderItemId}`, {
    method: 'DELETE',
    token
  });
}

export async function addOrderItem(token, orderId, payload) {
  return request(`/orders/${orderId}/items`, {
    method: 'POST',
    token,
    body: payload
  });
}

export async function downloadOrderPDF(token, orderId) {
  const headers = {};
  if (token) {
    headers['x-tenant-token'] = token;
  }

  const response = await fetch(`${API_BASE_URL}/orders/${orderId}/pdf`, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    const text = await response.text();
    const message = text || `Request failed: ${response.status}`;
    throw new Error(message);
  }

  return response.blob();
}

export async function downloadCustomerDeliveredOrdersPDF(token, customerId) {
  const headers = {};
  if (token) {
    headers['x-tenant-token'] = token;
  }

  const response = await fetch(`${API_BASE_URL}/customers/${customerId}/delivered-orders/pdf`, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    const text = await response.text();
    const message = text || `Request failed: ${response.status}`;
    throw new Error(message);
  }
  const disposition = getHeaderValue(response.headers, 'content-disposition') || '';
  const blob = await response.blob();
  const fallbackName = `customer-${customerId}-delivered-orders.pdf`;
  const rawFileName = deriveFilenameFromDisposition(disposition) || fallbackName;
  const fileName = appendDateToFilename(rawFileName);

  return { blob, fileName };
}

function deriveFilenameFromDisposition(disposition) {
  if (!disposition) return null;

  const parts = disposition.split(';');
  for (const part of parts) {
    const [rawName, ...rawValueParts] = part.split('=');
    if (!rawName || rawValueParts.length === 0) {
      continue;
    }

    const name = rawName.trim().toLowerCase();
    let value = rawValueParts.join('=').trim();
    if (!value) {
      continue;
    }

    const isStar = name === 'filename*';

    if (isStar) {
      const starParts = value.split("'");
      if (starParts.length >= 3) {
        value = starParts.slice(2).join("'");
      }
    }

    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }

    try {
      value = decodeURIComponent(value);
    } catch {
      // leave as-is on decode failure
    }

    if (name === 'filename*' || name === 'filename') {
      return value;
    }
  }

  return null;
}

function getHeaderValue(headers, headerName) {
  const targetName = headerName.toLowerCase();
  for (const [key, value] of headers.entries()) {
    if (value && key.toLowerCase() === targetName) {
      return value;
    }
  }
  return null;
}

function appendDateToFilename(filename, date = new Date()) {
  if (!filename) {
    return filename;
  }

  const suffix = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const lastDot = filename.lastIndexOf('.');

  if (lastDot <= 0) {
    return `${filename}-${suffix}`;
  }

  const base = filename.slice(0, lastDot);
  const extension = filename.slice(lastDot);
  return `${base}-${suffix}${extension}`;
}
