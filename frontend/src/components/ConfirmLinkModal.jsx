import React, { useEffect } from 'react';
import './ConfirmLinkModal.css';

export default function ConfirmLinkModal({ link, onConfirm, onCancel }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  if (!link) return null;

  const url = typeof link === 'string' ? link : link.url;
  const name = typeof link === 'object' && link.name ? link.name : 'External Link';

  return (
    <div className="confirm-link-overlay" onClick={onCancel}>
      <div className="confirm-link-card" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-link-header">
          <div className="confirm-link-icon">🌐</div>
          <div>
            <h3>Open External Link?</h3>
            <p className="confirm-link-subtext">Confirmation before leaving Life Manager</p>
          </div>
        </div>

        <div className="confirm-link-body">
          <p className="confirm-link-notice">
            You are about to open an external link in a new tab:
          </p>
          <div className="confirm-link-box">
            <div className="confirm-link-title">{name}</div>
            <div className="confirm-link-url" title={url}>{url}</div>
          </div>
        </div>

        <div className="confirm-link-actions">
          <button 
            type="button" 
            className="btn btn-ghost confirm-btn-cancel" 
            onClick={onCancel}
            autoFocus
          >
            ✕ Cancel
          </button>
          <button 
            type="button" 
            className="btn btn-primary confirm-btn-open" 
            onClick={() => onConfirm(url)}
          >
            🚀 Open Link
          </button>
        </div>
      </div>
    </div>
  );
}
