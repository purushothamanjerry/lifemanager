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
import './styles/global.css';

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('lm-theme') || 'dark');
  const [open,  setOpen]  = useState(true);

  // Apply theme to <html> immediately and on change
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('lm-theme', theme);
  }, [theme]);

  // On mount, also check if profile has a saved theme preference
  useEffect(() => {
    const saved = localStorage.getItem('lm-theme');
    if (saved && saved !== theme) {
      setTheme(saved);
    }
  }, []); // eslint-disable-line

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

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