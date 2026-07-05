import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, AlertTriangle, X } from 'lucide-react';
import { getCTA } from '../notificationService';

const ICON_MAP = {
  new_order: ShoppingBag,
  low_stock: AlertTriangle
};

export default function NotificationToast({ notification, onDismiss }) {
  const navigate = useNavigate();
  const [exiting, setExiting] = useState(false);

  const cta = notification ? getCTA(notification.type) : null;
  const Icon = notification ? ICON_MAP[notification.type] : null;

  useEffect(() => {
    if (!notification) return;
    setExiting(false);
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onDismiss, 300);
    }, 6000);
    return () => clearTimeout(timer);
  }, [notification, onDismiss]);

  if (!notification) return null;

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(onDismiss, 300);
  };

  const handleCTAClick = () => {
    if (cta) {
      navigate(cta.path);
    }
    handleDismiss();
  };

  return (
    <div className={`notification-toast ${exiting ? 'notification-toast--exit' : ''}`}>
      <div className="notification-toast-body" onClick={handleCTAClick}>
        <div className="notification-toast-icon">
          {Icon && <Icon size={20} />}
        </div>
        <div className="notification-toast-content">
          <div className="notification-toast-title">{notification.title}</div>
          <div className="notification-toast-message">{notification.message}</div>
        </div>
      </div>
      <div className="notification-toast-actions">
        {cta && (
          <button type="button" className="notification-toast-cta" onClick={handleCTAClick}>
            {cta.label}
          </button>
        )}
        <button type="button" className="notification-toast-close" onClick={handleDismiss} aria-label="Dismiss">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
