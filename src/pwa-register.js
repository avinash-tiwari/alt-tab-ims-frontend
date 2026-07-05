import { registerSW } from 'virtual:pwa-register';

export function sendConfigToSW() {
  if (!navigator.serviceWorker?.controller) return;

  navigator.serviceWorker.controller.postMessage({
    type: 'NOTIFICATION_CONFIG',
    payload: {
      apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
      token: (() => {
        try {
          return localStorage.getItem('ims_tenant_token') || '';
        } catch {
          return '';
        }
      })(),
      pollNewOrder: Number(import.meta.env.VITE_POLL_NEW_ORDER) || 30000,
      pollLowStock: Number(import.meta.env.VITE_POLL_LOW_STOCK) || 60000
    }
  });
}

registerSW({
  onNeedRefresh() {
    console.log('New content available, please refresh.');
  },
  onOfflineReady() {
    console.log('App ready to work offline.');
  },
  onRegistered(registration) {
    if (!registration?.active) return;

    setTimeout(sendConfigToSW, 500);

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      setTimeout(sendConfigToSW, 500);
    });
  }
});
