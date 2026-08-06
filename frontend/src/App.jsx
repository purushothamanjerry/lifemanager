import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar.jsx';
import PanicButton from './components/PanicButton.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Relationships from './pages/relationships/Relationships.jsx';
import PersonProfile from './pages/relationships/PersonProfile.jsx';
import Notes from './pages/Notes.jsx';
import Memories from './pages/Memories.jsx';
import Links from './pages/Links.jsx';
import Profile from './pages/Profile.jsx';
import { profileApi, authApi } from './utils/api.js';
import './styles/global.css';
import './styles/Login.css';

function LoginScreen({ onLoginSuccess }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter your password.');
      triggerShake();
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Temporarily store password for verification check in Axios interceptor
      localStorage.setItem('auth_pass', password);
      
      // Test the credentials against the backend profile route
      await profileApi.get();
      
      // Store success timestamp
      localStorage.setItem('auth_login_time', Date.now().toString());
      onLoginSuccess();
    } catch (err) {
      localStorage.removeItem('auth_pass');
      localStorage.removeItem('auth_login_time');
      setError('Invalid password. Access denied.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  return (
    <div className="login-container">
      <div className="login-glow" />
      <div className={`login-card ${shake ? 'shake' : ''}`}>
        <div className="login-logo">✨</div>
        <h1 className="login-title">Life Manager</h1>
        <p className="login-subtitle">Secure access to your personal universe</p>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-group">
            <label className="login-label">Access Password</label>
            <input
              type="password"
              className="login-input"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>
          
          {error && <div className="login-error">{error}</div>}
          
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? <div className="spinner" /> : 'Unlock Vault'}
          </button>
        </form>
        
        <div className="login-footer">
          Secured with local hardware storage · Session active for 24h
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem('lm-theme') || 'dark');
  const [open,  setOpen]  = useState(() => window.innerWidth > 768);

  // Sync saved session on mount and query backend auth status
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const savedPass = localStorage.getItem('auth_pass');
        const loginTime = localStorage.getItem('auth_login_time');
        
        // 1. Verify if backend requires auth
        const statusRes = await authApi.getStatus();
        const { authRequired } = statusRes.data;

        if (!authRequired) {
          setIsAuthenticated(true);
        } else {
          // 2. Check if a valid 24h session exists
          if (savedPass) {
            if (loginTime && Date.now() - Number(loginTime) > 24 * 60 * 60 * 1000) {
              localStorage.removeItem('auth_pass');
              localStorage.removeItem('auth_login_time');
              setIsAuthenticated(false);
            } else {
              setIsAuthenticated(true);
            }
          } else {
            setIsAuthenticated(false);
          }
        }
      } catch (err) {
        console.error('Failed to check auth status:', err);
        // Fallback: check localStorage session on network error
        const savedPass = localStorage.getItem('auth_pass');
        setIsAuthenticated(!!savedPass);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Auto-logout when backend API returns 401
  useEffect(() => {
    const handleUnauthorized = () => {
      setIsAuthenticated(false);
    };
    window.addEventListener('auth-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth-unauthorized', handleUnauthorized);
  }, []);

  // Apply theme to HTML
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('lm-theme', theme);
  }, [theme]);

  // Sync saved theme preference on mount
  useEffect(() => {
    const saved = localStorage.getItem('lm-theme');
    if (saved && saved !== theme) {
      setTheme(saved);
    }
  }, []); // eslint-disable-line

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  if (checkingAuth) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--bg-base)',
        color: 'var(--text-1)',
        fontFamily: 'var(--font-body)'
      }}>
        <div className="spinner" style={{ width: '40px', height: '40px', borderTopColor: 'var(--gold)' }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="app-container">
        {/* Mobile Header Navbar */}
        <header className="mobile-navbar">
          <button className="mobile-menu-btn" onClick={() => setOpen(true)} title="Open Menu">☰</button>
          <div className="mobile-navbar-logo">life<span>mgr</span></div>
          <NavLink to="/profile" className="mobile-profile-btn" title="My Profile">◉</NavLink>
        </header>

        <Sidebar open={open} onToggle={() => setOpen(o => !o)} theme={theme} onThemeToggle={toggleTheme} />
        
        {/* Backdrop for mobile drawer closing */}
        {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} />}
        
        <main className={`main-content ${open ? 'sidebar-open' : 'sidebar-collapsed'}`}>
          <Routes>
            <Route path="/"                  element={<Dashboard />} />
            <Route path="/relationships"     element={<Relationships />} />
            <Route path="/relationships/:id" element={<PersonProfile />} />
            <Route path="/notes"             element={<Notes />} />
            <Route path="/memories"          element={<Memories />} />
            <Route path="/links"             element={<Links />} />
            <Route path="/profile"           element={<Profile theme={theme} onThemeChange={setTheme} />} />
          </Routes>
        </main>

        {/* Global panic/safety lock button — floats over everything */}
        <PanicButton />
      </div>
    </Router>
  );
}