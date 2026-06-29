import React from 'react';

export default function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{
      padding: '40px 40px 0',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      marginBottom: '32px'
    }}>
      <div>
        <h1 style={{ marginBottom: '4px' }}>{title}</h1>
        {subtitle && <p style={{ fontSize: '0.95rem' }}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
