import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './Sidebar.css';

const NAV = [
  { path: '/',              icon: '⌂',  label: 'Dashboard'     },
  { path: '/relationships', icon: '◎',  label: 'Relationships' },
  { path: '/notes',         icon: '✦',  label: 'Notes'         },
  { path: '/memories',      icon: '◈',  label: 'Memories'      },
  { path: '/health',        icon: '♡',  label: 'Health'        },
  { path: '/links',         icon: '🔗', label: 'Links'         },
];

export default function Sidebar({ open, onToggle, theme, onThemeToggle }) {
  const [hovered, setHovered] = useState(null);
  const navigate = useNavigate();

  return (
    <aside className={`sidebar ${open ? 'open' : 'collapsed'}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-mark">L</div>
        {open && <div className="logo-text">life<span>mgr</span></div>}
        <button className="toggle-btn" onClick={onToggle}>
          {open ? '‹' : '›'}
        </button>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {open && <div className="nav-section-label">Menu</div>}
        {NAV.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onMouseEnter={() => setHovered(item.path)}
            onMouseLeave={() => setHovered(null)}
            title={!open ? item.label : undefined}
          >
            <span className="nav-icon">{item.icon}</span>
            {open && <span className="nav-label">{item.label}</span>}
            {!open && hovered === item.path && (
              <span className="nav-tooltip">{item.label}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button className="theme-toggle" onClick={onThemeToggle} title="Toggle theme">
          <span className="nav-icon">{theme === 'dark' ? '☀' : '☽'}</span>
          {open && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        {/* Profile link — acts as user avatar slot */}
        <NavLink to="/profile"
          className={({ isActive }) => `sidebar-user sidebar-user-link ${isActive ? 'active' : ''}`}
          title={!open ? 'My Profile' : undefined}
          onMouseEnter={() => setHovered('/profile')}
          onMouseLeave={() => setHovered(null)}
        >
          <div className="sidebar-user-avatar">◉</div>
          {open && (
            <div>
              <div className="sidebar-user-name">My Profile</div>
              <div className="sidebar-user-sub">Settings & Privacy</div>
            </div>
          )}
          {!open && hovered === '/profile' && (
            <span className="nav-tooltip">My Profile</span>
          )}
        </NavLink>
      </div>
    </aside>
  );
}