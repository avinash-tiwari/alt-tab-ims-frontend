const LS_LAST_POLLED = 'ims_last_polled_at';
const LS_ALERTED_LOW_STOCK = 'ims_alerted_low_stock_ids';

const listeners = new Map();
let timers = {};
let getToken = null;

export const TYPES = {
  NEW_ORDER: 'new_order',
  LOW_STOCK: 'low_stock'
};

export const CTA_MAP = {
  new_order: { label: 'View Order', path: '/orders?tab=NEW' },
  low_stock: { label: 'Update Stock', path: '/items?tab=stock-update' }
};

export function getCTA(type) {
  return CTA_MAP[type] || null;
}

export function configure(tokenFn) {
  getToken = tokenFn;
}

export function on(event, callback) {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event).add(callback);
  return () => listeners.get(event)?.delete(callback);
}

function emit(event, data) {
  const set = listeners.get(event);
  if (set) {
    set.forEach(fn => fn(data));
  }
}

function getInterval(type) {
  if (type === TYPES.NEW_ORDER) {
    return Number(import.meta.env.VITE_POLL_NEW_ORDER) || 30000;
  }
  if (type === TYPES.LOW_STOCK) {
    return Number(import.meta.env.VITE_POLL_LOW_STOCK) || 60000;
  }
  return 30000;
}

function getLastPolled() {
  try {
    return localStorage.getItem(LS_LAST_POLLED) || '';
  } catch {
    return '';
  }
}

function setLastPolled() {
  try {
    localStorage.setItem(LS_LAST_POLLED, new Date().toISOString());
  } catch {
    // silent
  }
}

function getStoredAlertedIds() {
  try {
    const raw = localStorage.getItem(LS_ALERTED_LOW_STOCK);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function storeAlertedIds(ids) {
  try {
    localStorage.setItem(LS_ALERTED_LOW_STOCK, JSON.stringify([...ids]));
  } catch {
    // silent
  }
}

let listOrdersApi = null;
let listLowStockApi = null;

export function setApis(listOrdersFn, listLowStockFn) {
  listOrdersApi = listOrdersFn;
  listLowStockApi = listLowStockFn;
}

function getDisplayCustomerName(order) {
  if (!order) return 'Customer';
  return (
    order.customerDisplayName ||
    order.customerName ||
    order.customer?.displayName ||
    order.customer?.name ||
    order.customerId ||
    'Customer'
  );
}

export function startPolling(type) {
  if (timers[type]) return;

  const poll = async () => {
    const token = getToken ? getToken() : '';
    if (!token || !listOrdersApi || !listLowStockApi) return;

    try {
      if (type === TYPES.NEW_ORDER) {
        const since = getLastPolled();
        const query = { status: 'NEW' };
        if (since) query.createdFrom = since;

        const orders = await listOrdersApi(token, query);
        if (orders && orders.length > 0) {
          setLastPolled();
          orders.forEach(order => {
            const customerName = getDisplayCustomerName(order);
            const amount = order.total || order.grandTotal || 0;
            emit('notification', {
              type: 'new_order',
              title: 'New Order',
              message: `${customerName} — ₹${Number(amount).toLocaleString('en-IN')}`,
              data: {
                orderId: order.id,
                customerName,
                amount
              }
            });
          });
        }
      }

      if (type === TYPES.LOW_STOCK) {
        const items = await listLowStockApi(token);
        if (items && items.length > 0) {
          const alertedIds = getStoredAlertedIds();
          const newItems = items.filter(item => !alertedIds.has(item.id));

          if (newItems.length > 0) {
            const updatedIds = new Set(alertedIds);
            newItems.forEach(item => updatedIds.add(item.id));
            storeAlertedIds(updatedIds);

            newItems.forEach(item => {
              emit('notification', {
                type: 'low_stock',
                title: 'Low Stock Alert',
                message: `${item.name} — only ${item.stock} left (threshold: ${item.threshold})`,
                data: {
                  itemId: item.id,
                  itemName: item.name,
                  stock: item.stock,
                  threshold: item.threshold
                }
              });
            });
          }
        }
      }
    } catch {
      // silent fail — next poll will retry
    }
  };

  poll();
  timers[type] = setInterval(poll, getInterval(type));
}

export function stopPolling(type) {
  if (timers[type]) {
    clearInterval(timers[type]);
    delete timers[type];
  }
}

export function startAll() {
  Object.values(TYPES).forEach(type => startPolling(type));
}

export function stopAll() {
  Object.values(TYPES).forEach(type => stopPolling(type));
}
