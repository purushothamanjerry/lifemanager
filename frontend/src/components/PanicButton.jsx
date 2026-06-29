import React, { useState, useEffect, useRef, useCallback } from 'react';
import { profileApi } from '../utils/api.js';
import './PanicButton.css';

const SESSION_KEY = 'lm-safety-locked';

function parseShortcut(str = '') {
  const parts = str.toLowerCase().split('+').map(s => s.trim());
  return {
    ctrl:  parts.includes('ctrl'),
    shift: parts.includes('shift'),
    alt:   parts.includes('alt'),
    key:   parts.find(p => !['ctrl','shift','alt','meta'].includes(p)) || '',
  };
}
function matchShortcut(e, combo) {
  if (!combo.key) return false;
  return e.ctrlKey  === combo.ctrl  &&
         e.shiftKey === combo.shift &&
         e.altKey   === combo.alt   &&
         e.key.toLowerCase() === combo.key;
}

// Live clock that ticks every second
function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="pb-safe-header">
      <div className="pb-safe-time">
        {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className="pb-safe-date">
        {now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
      </div>
    </div>
  );
}

// PIN input dots
function PinDots({ pin, onPin, onSubmit }) {
  const refs = useRef([]);
  const handleChange = (i, v) => {
    if (!/^\d?$/.test(v)) return;
    const arr = (pin + '      ').split('').slice(0, 6);
    arr[i] = v;
    const next = arr.join('').trimEnd();
    onPin(next);
    if (v && i < 5) refs.current[i + 1]?.focus();
    if (v && i === 5) setTimeout(() => onSubmit(next), 80);
  };
  const handleKD = (i, e) => {
    if (e.key === 'Backspace' && !pin[i] && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'Enter') onSubmit(pin);
  };
  return (
    <div className="pb-pin-row">
      {Array.from({ length: 6 }, (_, i) => (
        <input key={i} ref={el => refs.current[i] = el}
          className={`pb-pin-dot ${pin[i] ? 'filled' : ''}`}
          type="password" inputMode="numeric" maxLength={1}
          value={pin[i] || ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKD(i, e)}
          autoFocus={i === 0}
        />
      ))}
    </div>
  );
}

export default function PanicButton() {
  const [profile,  setProfile]  = useState(null);
  // Read initial locked state from sessionStorage — survives refresh
  const [locked,   setLocked]   = useState(() => sessionStorage.getItem(SESSION_KEY) === '1');
  const [pin,      setPin]      = useState('');
  const [err,      setErr]      = useState('');
  const [shake,    setShake]    = useState(false);
  const [hover,    setHover]    = useState(false);
  const lastEsc = useRef(0);

  // Load profile
  useEffect(() => {
    profileApi.get().then(r => setProfile(r.data)).catch(() => {});
  }, []);

  // Persist locked state to sessionStorage on every change
  useEffect(() => {
    if (locked) {
      sessionStorage.setItem(SESSION_KEY, '1');
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, [locked]);

  // Lock function
  const lock = useCallback(() => {
    sessionStorage.setItem(SESSION_KEY, '1'); // set immediately before re-render
    setLocked(true);
    setPin('');
    setErr('');
  }, []);

  // Unlock — PIN required if one is set
  const tryUnlock = useCallback(async (pinVal) => {
    const hasPin = !!profile?.safetyModePinHash;
    if (!hasPin) {
      sessionStorage.removeItem(SESSION_KEY);
      setLocked(false);
      setPin('');
      return;
    }
    try {
      const res = await profileApi.verifyPin(pinVal);
      if (res.data?.valid) {
        sessionStorage.removeItem(SESSION_KEY);
        setLocked(false);
        setPin('');
        setErr('');
      } else {
        setErr('Wrong PIN — try again');
        setPin('');
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    } catch {
      setErr('Could not verify PIN');
    }
  }, [profile]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      // Double-ESC to lock (400ms window) — always available
      if (e.key === 'Escape') {
        const now = Date.now();
        if (now - lastEsc.current < 400 && !locked) {
          e.preventDefault();
          lock();
        }
        lastEsc.current = now;
        return;
      }

      if (!profile) return;

      // Panic shortcut → lock
      if (profile.panicModeEnabled && !locked) {
        const combo = parseShortcut(profile.panicShortcut || 'Ctrl+Alt+P');
        if (matchShortcut(e, combo)) { e.preventDefault(); lock(); return; }
      }

      // Safety shortcut → toggle
      if (profile.safetyModeEnabled) {
        const combo = parseShortcut(profile.safetyShortcut || 'Ctrl+Shift+S');
        if (matchShortcut(e, combo)) {
          e.preventDefault();
          if (locked) tryUnlock(pin);
          else lock();
          return;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [profile, locked, lock, tryUnlock, pin]);

  // Auto-lock on inactivity
  useEffect(() => {
    if (!profile?.safetyModeEnabled || !profile?.safetyModeAutoLock || locked) return;
    const ms = (profile.safetyModeLockMins || 5) * 60 * 1000;
    let timer = setTimeout(lock, ms);
    const reset = () => { clearTimeout(timer); timer = setTimeout(lock, ms); };
    const events = ['mousemove','keydown','click','scroll','touchstart'];
    events.forEach(ev => window.addEventListener(ev, reset, { passive: true }));
    return () => {
      clearTimeout(timer);
      events.forEach(ev => window.removeEventListener(ev, reset));
    };
  }, [profile, locked, lock]);

  const hasPin     = !!profile?.safetyModePinHash;
  const showButton = !locked && (profile?.safetyModeEnabled || profile?.panicModeEnabled);

  return (
    <>
      {/* ── Floating lock button ── */}
      {showButton && (
        <button
          className={`panic-fab ${hover ? 'hovered' : ''}`}
          onClick={lock}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          title="Lock screen"
        >
          <span className="panic-fab-icon">🔒</span>
          {hover && <span className="panic-fab-label">Lock</span>}
        </button>
      )}

      {/* ── Lock overlay — covers entire screen including sidebar ── */}
      {locked && (
        <div className="pb-overlay">
          <div className={`pb-card ${shake ? 'shake' : ''}`}>

            <LiveClock />

            <div className="pb-lock-ring">
              <span className="pb-lock-emoji">🔒</span>
            </div>

            <div className="pb-title">Screen Locked</div>
            <div className="pb-sub">
              {hasPin
                ? 'Enter your PIN to unlock'
                : 'Press the button below to exit safety mode'}
            </div>

            {hasPin && (
              <>
                <PinDots pin={pin} onPin={setPin} onSubmit={tryUnlock} />
                {err && <div className="pb-err">{err}</div>}
              </>
            )}

            <button className="pb-unlock-btn" onClick={() => tryUnlock(pin)}>
              🔓 {hasPin ? 'Unlock' : 'Exit Safety Mode'}
            </button>

            {hasPin && <div className="pb-hint">Type all 6 digits — unlocks automatically</div>}

            <div className="pb-shortcut-hint">
              Shortcuts: <kbd>{profile?.safetyShortcut || 'Ctrl+Shift+S'}</kbd>
              &nbsp;·&nbsp; double-tap <kbd>ESC</kbd>
            </div>
          </div>
        </div>
      )}
    </>
  );
}