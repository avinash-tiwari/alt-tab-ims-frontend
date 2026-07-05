import { precacheAndRoute } from 'workbox-precaching';

precacheAndRoute(self.__WB_MANIFEST);

const DB_NAME = 'ims-notification-db';
const DB_VERSION = 2;
const STORE_NAME = 'polling';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getLastPolled(type) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(type);
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function setLastPolled(type, ts) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(ts, type);
  } catch {
    // silent fail
  }
}

async function getAlertedIds() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get('alertedLowStockIds');
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

async function setAlertedIds(ids) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(ids, 'alertedLowStockIds');
  } catch {
    // silent fail
  }
}

let config = {
  apiBaseUrl: '',
  token: '',
  pollNewOrder: 30000,
  pollLowStock: 60000
};

const CTA_ROUTES = {
  new_order: '/orders?tab=NEW',
  low_stock: '/items?tab=stock-update'
};

let timers = {};

function setupPolling() {
  if (timers.new_order) clearInterval(timers.new_order);
  if (timers.low_stock) clearInterval(timers.low_stock);

  timers.new_order = setInterval(
    () => pollNewOrders(),
    Math.max(config.pollNewOrder, 10000)
  );
  timers.low_stock = setInterval(
    () => pollLowStock(),
    Math.max(config.pollLowStock, 10000)
  );
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'NOTIFICATION_CONFIG') {
    config = { ...config, ...event.data.payload };
    if (config.apiBaseUrl && config.token) {
      setupPolling();
    }
  }
});

function getCustomerName(order) {
  if (!order) return 'Customer';
  return (
    order.customerDisplayName ||
    order.customerName ||
    (order.customer && (order.customer.displayName || order.customer.name)) ||
    order.customerId ||
    'Customer'
  );
}

async function pollNewOrders() {
  if (!config.apiBaseUrl || !config.token) return;

  const since = await getLastPolled('new_order');
  const params = new URLSearchParams({ status: 'NEW' });
  if (since) params.set('createdFrom', since);

  try {
    const response = await fetch(`${config.apiBaseUrl}/orders?${params}`, {
      headers: { 'x-tenant-token': config.token }
    });

    if (!response.ok) return;

    const orders = await response.json();
    if (orders && orders.length > 0) {
      await setLastPolled('new_order', new Date().toISOString());
      orders.forEach((order) => {
        const name = getCustomerName(order);
        const amount = order.total || order.grandTotal || 0;
        self.registration.showNotification('New Order', {
          body: `${name} — ₹${Number(amount).toLocaleString('en-IN')}`,
          icon: '/icon-192.svg',
          badge: '/favicon.svg',
          tag: `order-${order.id}`,
          data: { url: CTA_ROUTES.new_order, type: 'new_order' },
          requireInteraction: true
        });
      });
    }
  } catch {
    // silent fail
  }
}

async function pollLowStock() {
  if (!config.apiBaseUrl || !config.token) return;

  try {
    const response = await fetch(`${config.apiBaseUrl}/items/low-stock`, {
      headers: { 'x-tenant-token': config.token }
    });

    if (!response.ok) return;

    const items = await response.json();
    if (!items || items.length === 0) return;

    const alertedIds = await getAlertedIds();
    const alertedSet = new Set(alertedIds);
    const newItems = items.filter(item => !alertedSet.has(item.id));

    if (newItems.length > 0) {
      const updatedIds = [...alertedIds, ...newItems.map(item => item.id)];
      await setAlertedIds(updatedIds);

      newItems.forEach((item) => {
        self.registration.showNotification('Low Stock Alert', {
          body: `${item.name} — only ${item.stock} left (threshold: ${item.threshold})`,
          icon: '/icon-192.svg',
          badge: '/favicon.svg',
          tag: `lowstock-${item.id}`,
          data: { url: CTA_ROUTES.low_stock, type: 'low_stock' },
          requireInteraction: true
        });
      });
    }
  } catch {
    // silent fail
  }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/orders';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const matchingClient = windowClients.find((c) => c.url.includes(self.location.host));
      if (matchingClient) {
        return matchingClient.focus().then((client) => client.navigate(url));
      }
      return clients.openWindow(url);
    })
  );
});
