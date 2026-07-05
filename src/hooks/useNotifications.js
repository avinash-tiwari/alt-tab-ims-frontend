import { useEffect, useRef, useState, useCallback } from 'react';
import { listOrders, listLowStockItems, getStoredToken } from '../api';
import * as notificationService from '../notificationService';
import { sendConfigToSW } from '../pwa-register';

export default function useNotifications(enabled) {
  const [currentNotification, setCurrentNotification] = useState(null);
  const queueRef = useRef([]);
  const showingRef = useRef(false);

  const showNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      showingRef.current = false;
      setCurrentNotification(null);
      return;
    }
    showingRef.current = true;
    setCurrentNotification(queueRef.current.shift());
  }, []);

  const dismiss = useCallback(() => {
    showingRef.current = false;
    setCurrentNotification(null);
    setTimeout(showNext, 300);
  }, [showNext]);

  useEffect(() => {
    if (!enabled) return;

    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    notificationService.setApis(listOrders, listLowStockItems);
    notificationService.configure(getStoredToken);
    notificationService.startAll();
    sendConfigToSW();

    const unsub = notificationService.on('notification', (n) => {
      queueRef.current.push(n);
      if (!showingRef.current) {
        showNext();
      }
    });

    return () => {
      unsub();
      notificationService.stopAll();
      queueRef.current = [];
      showingRef.current = false;
      setCurrentNotification(null);
    };
  }, [enabled, showNext]);

  return { currentNotification, dismiss };
}
