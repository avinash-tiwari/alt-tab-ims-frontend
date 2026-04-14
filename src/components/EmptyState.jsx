import React from 'react';

export default function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction 
}) {
  return (
    <div className="empty-state-container">
      <div className="empty-state-content">
        <div className="empty-state-icon-wrapper">
          <Icon size={48} strokeWidth={1.5} />
        </div>
        <h3 className="empty-state-title">{title}</h3>
        <p className="empty-state-description">{description}</p>
        {actionLabel && onAction && (
          <button 
            type="button" 
            className="primary empty-state-action" 
            onClick={onAction}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
