import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar.jsx';
import PanicButton from './components/PanicButton.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Relationships from './pages/relationships/Relationships.jsx';
import PersonProfile from './pages/relationships/PersonProfile.jsx';
import Notes from './pages/Notes.jsx';
import Memories from './pages/Memories.jsx';
import Plans from './pages/Plans.jsx';
import Finance from './pages/Finance.jsx';
import Health from './pages/Health.jsx';
import Activity from './pages/Activity.jsx';
import Profile from './pages/Profile.jsx';
import { profileApi } from './utils/api.js';
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
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const savedPass = localStorage.getItem('auth_pass');
    const loginTime = localStorage.getItem('auth_login_time');
    
    if (!savedPass) return false;

    // Check if 24-hour session has expired
    if (loginTime && Date.now() - Number(loginTime) > 24 * 60 * 60 * 1000) {
      localStorage.removeItem('auth_pass');
      localStorage.removeItem('auth_login_time');
      return false;
    }
    return true;
  });

  const [theme, setTheme] = useState(() => localStorage.getItem('lm-theme') || 'dark');
  const [open,  setOpen]  = useState(true);

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

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div style={{ display:'flex', minHeight:'100vh' }}>
        <Sidebar open={open} onToggle={() => setOpen(o => !o)} theme={theme} onThemeToggle={toggleTheme} />
        <main style={{
          flex: 1,
          marginLeft: open ? 'var(--sidebar-w)' : 'var(--sidebar-collapsed-w)',
          transition: 'margin-left 0.3s cubic-bezier(0.4,0,0.2,1)',
          minHeight: '100vh',
          overflow: 'auto',
          background: 'var(--bg-base)',
        }}>
          <Routes>
            <Route path="/"                  element={<Dashboard />} />
            <Route path="/relationships"     element={<Relationships />} />
            <Route path="/relationships/:id" element={<PersonProfile />} />
            <Route path="/notes"             element={<Notes />} />
            <Route path="/memories"          element={<Memories />} />
            <Route path="/plans"             element={<Plans />} />
            <Route path="/finance"           element={<Finance />} />
            <Route path="/health"            element={<Health />} />
            <Route path="/activity"          element={<Activity />} />
            <Route path="/profile"           element={<Profile theme={theme} onThemeChange={setTheme} />} />
          </Routes>
        </main>

        {/* Global panic/safety lock button — floats over everything */}
        <PanicButton />
      </div>
    </Router>
  );
}