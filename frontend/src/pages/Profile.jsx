import React, { useState, useEffect, useCallback, useRef } from 'react';
import { format, differenceInYears, parseISO } from 'date-fns';
import { profileApi } from '../utils/api.js';
import { useNavigate } from 'react-router-dom';
import './Profile.css';

// ─── Helpers ───────────────────────────────────────────────────────────────
const calcAge = dob => {
  try { return differenceInYears(new Date(), parseISO(dob)); }
  catch { return null; }
};
const fmtCurrency = (n, cur) => {
  if (!n) return '—';
  const sym = { INR:'₹', USD:'$', EUR:'€', GBP:'£', JPY:'¥' }[cur] || cur;
  return `${sym}${Number(n).toLocaleString('en-IN', {maximumFractionDigits:0})}`;
};
const fmtDate = ts => {
  try { return format(new Date(ts), 'MMM d, h:mm a'); }
  catch { return ''; }
};

const CURRENCIES = ['INR','USD','EUR','GBP','JPY','AUD','CAD','SGD'];
const PAGES = [
  { path:'/',              label:'Dashboard'     },
  { path:'/relationships', label:'Relationships' },
  { path:'/notes',         label:'Notes'         },
  { path:'/memories',      label:'Memories'      },
  { path:'/plans',         label:'Plans'         },
  { path:'/finance',       label:'Finance'       },
  { path:'/health',        label:'Health'        },
  { path:'/activity',      label:'Activity'      },
];
const PERSONALITY_OPTS = ['Introvert','Extrovert','Ambivert','Analytical','Creative','Empathetic','Leader','Adventurous','Organized','Spontaneous','Reserved','Outgoing'];
const HOBBY_SUGGESTIONS = ['Reading','Photography','Gaming','Cooking','Travelling','Music','Art','Writing','Fitness','Yoga','Cycling','Swimming','Hiking','Movies','Dancing'];
const INTEREST_SUGGESTIONS = ['Technology','Science','Philosophy','History','Psychology','Finance','Literature','Space','Nature','Politics','Sports','Fashion','Food','Health'];

// ─── Section component ─────────────────────────────────────────────────────
function Section({ id, icon, title, subtitle, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="prf-section" id={id}>
      <button className="prf-section-header" onClick={() => setOpen(o => !o)}>
        <div className="prf-section-hl">
          <span className="prf-section-icon">{icon}</span>
          <div>
            <div className="prf-section-title">{title}</div>
            {subtitle && <div className="prf-section-sub">{subtitle}</div>}
          </div>
        </div>
        <span className={`prf-chevron ${open ? 'open' : ''}`}>›</span>
      </button>
      {open && <div className="prf-section-body">{children}</div>}
    </section>
  );
}

// ─── Tag input ─────────────────────────────────────────────────────────────
function TagInput({ value = [], onChange, suggestions = [], placeholder = 'Type and press Enter' }) {
  const [input, setInput] = useState('');
  const [showSug, setShowSug] = useState(false);
  const filtered = suggestions.filter(s => !value.includes(s) && s.toLowerCase().includes(input.toLowerCase()));

  const add = v => {
    const t = v.trim();
    if (t && !value.includes(t)) { onChange([...value, t]); setInput(''); setShowSug(false); }
  };
  const remove = t => onChange(value.filter(x => x !== t));

  return (
    <div className="tag-input-wrap">
      <div className="tag-input-tags">
        {value.map(t => (
          <span key={t} className="tag-chip">
            {t}
            <button onClick={() => remove(t)}>✕</button>
          </span>
        ))}
        <div className="tag-input-field-wrap">
          <input
            className="tag-input-field"
            placeholder={placeholder}
            value={input}
            onChange={e => { setInput(e.target.value); setShowSug(true); }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(input); } if (e.key === 'Backspace' && !input) remove(value[value.length - 1]); }}
            onFocus={() => setShowSug(true)}
            onBlur={() => setTimeout(() => setShowSug(false), 150)}
          />
          {showSug && filtered.length > 0 && (
            <div className="tag-suggestions">
              {filtered.slice(0, 8).map(s => (
                <button key={s} className="tag-sug-item" onMouseDown={() => add(s)}>{s}</button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PIN Entry ─────────────────────────────────────────────────────────────
function PinModal({ title, onConfirm, onCancel, confirmLabel = 'Confirm' }) {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const inputs = useRef([]);

  const handleKey = (i, v) => {
    if (!/^\d*$/.test(v)) return;
    const arr = pin.split('').slice(0, 6);
    arr[i] = v;
    setPin(arr.join('').slice(0, 6));
    if (v && i < 5) inputs.current[i + 1]?.focus();
  };
  const handleKD = (i, e) => {
    if (e.key === 'Backspace' && !pin[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const submit = () => {
    if (pin.length < 4) { setErr('PIN must be at least 4 digits'); return; }
    onConfirm(pin);
  };

  return (
    <div className="pin-overlay">
      <div className="pin-modal">
        <div className="pin-title">{title}</div>
        <div className="pin-dots">
          {Array.from({ length: 6 }, (_, i) => (
            <input key={i} ref={el => inputs.current[i] = el}
              className="pin-dot-input" type="password" maxLength={1}
              value={pin[i] || ''}
              onChange={e => handleKey(i, e.target.value)}
              onKeyDown={e => handleKD(i, e)}
              autoFocus={i === 0}
            />
          ))}
        </div>
        {err && <div className="pin-err">{err}</div>}
        <div className="pin-actions">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Stat card ─────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color, onClick }) {
  return (
    <div className={`stat-card ${onClick ? 'clickable' : ''}`} onClick={onClick}
      style={{ '--sc-color': color }}>
      <div className="sc-icon">{icon}</div>
      <div className="sc-value" style={{ color }}>{value ?? '—'}</div>
      <div className="sc-label">{label}</div>
    </div>
  );
}

// ─── Recent feed item ──────────────────────────────────────────────────────
function FeedItem({ item }) {
  return (
    <div className="feed-item" style={{ '--fi-color': item.color }}>
      <div className="fi-dot" style={{ color: item.color }}>{item.icon}</div>
      <div className="fi-body">
        <div className="fi-label">{item.label}</div>
        <div className="fi-sub">
          <span className="fi-type">{item.sub}</span>
          <span className="fi-ts">{fmtDate(item.ts)}</span>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  MAIN PROFILE PAGE
// ══════════════════════════════════════════════════════════════════════════
export default function Profile({ theme: appTheme, onThemeChange }) {
  const navigate = useNavigate();

  const [profile,  setProfile]  = useState(null);
  const [stats,    setStats]    = useState(null);
  const [recent,   setRecent]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  // Editable form state (mirrors profile fields)
  const [form, setForm] = useState(null);

  // Modal states
  const [showSetPin,    setShowSetPin]    = useState(false);
  const [showVerifyPin, setShowVerifyPin] = useState(false);
  const [pinAction,     setPinAction]     = useState(null); // what to do after verify
  const [pinMsg,        setPinMsg]        = useState('');
  const [activeSection, setActiveSection] = useState('overview');

  // Photo upload
  const photoRef = useRef();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pR, sR, rR] = await Promise.all([profileApi.get(), profileApi.getStats(), profileApi.getRecent()]);
      setProfile(pR.data);
      setForm(pR.data);
      setStats(sR.data);
      setRecent(rR.data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Keep theme picker in sync with App-level theme
  useEffect(() => {
    if (appTheme && form) setForm(p => ({ ...p, theme: appTheme }));
  }, [appTheme]); // eslint-disable-line

  const f = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const { profilePhoto, safetyModePinHash, ...body } = form;
      await profileApi.update(body);
      // Apply theme globally via App callback
      if (form.theme && onThemeChange) {
        onThemeChange(form.theme);
      } else if (form.theme) {
        document.documentElement.setAttribute('data-theme', form.theme);
        localStorage.setItem('lm-theme', form.theme);
      }
      await load();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch(e) {}
    finally { setSaving(false); }
  };

  const handlePhotoChange = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('photo', file);
    try {
      await profileApi.uploadPhoto(fd);
      await load();
    } catch(e) {}
  };

  const handleSetPin = async pin => {
    try {
      await profileApi.setPin(pin);
      setShowSetPin(false);
      setPinMsg('PIN set successfully ✓');
      setTimeout(() => setPinMsg(''), 3000);
    } catch(e) {}
  };

  // Export data
  const handleExport = () => {
    const data = { profile: form, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `lifemgr-profile-${format(new Date(),'yyyy-MM-dd')}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const age = form?.birthday ? calcAge(form.birthday) : null;
  const hasPhoto = profile?.profilePhoto;

  const NAV_SECTIONS = [
    { id:'overview',   label:'Overview'       },
    { id:'personal',   label:'Personal Info'  },
    { id:'traits',     label:'Traits & Goals' },
    { id:'stats',      label:'Life Stats'     },
    { id:'activity',   label:'Activity Feed'  },
    { id:'safety',     label:'Safety Mode'    },
    { id:'privacy',    label:'Privacy'        },
    { id:'prefs',      label:'Preferences'    },
    { id:'data',       label:'Data & Backup'  },
  ];

  const scrollTo = id => {
    document.getElementById(id)?.scrollIntoView({ behavior:'smooth', block:'start' });
    setActiveSection(id);
  };

  if (loading || !form) return <div className="profile-loading"><div className="spinner"/></div>;

  return (
    <div className="profile-page">

      {/* ── Sticky side nav ── */}
      <nav className="profile-sidenav">
        <div className="psn-title">My Profile</div>
        {NAV_SECTIONS.map(s => (
          <button key={s.id} className={`psn-item ${activeSection===s.id?'active':''}`}
            onClick={() => scrollTo(s.id)}>{s.label}</button>
        ))}
        <div className="psn-save-wrap">
          <button className={`btn btn-primary psn-save ${saved?'saved':''}`}
            onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Changes'}
          </button>
        </div>
      </nav>

      {/* ── Main content ── */}
      <div className="profile-main">

        {/* ━━━━━━━ OVERVIEW ━━━━━━━ */}
        <section id="overview" className="prf-overview-section">
          {/* Hero header */}
          <div className="profile-hero">
            <div className="hero-bg-blur"/>
            <div className="hero-content">
              {/* Photo */}
              <div className="hero-photo-wrap">
                <div className="hero-photo"
                  style={hasPhoto ? { backgroundImage: `url(http://localhost:5000${profile.profilePhoto})` } : {}}>
                  {!hasPhoto && <span className="hero-photo-initial">
                    {(form.fullName||form.nickname||'?')[0]?.toUpperCase()}
                  </span>}
                </div>
                <button className="hero-photo-edit" onClick={() => photoRef.current?.click()}>📷</button>
                <input ref={photoRef} type="file" accept="image/*" style={{display:'none'}}
                  onChange={handlePhotoChange}/>
              </div>

              {/* Name / bio */}
              <div className="hero-info">
                <div className="hero-name">
                  {form.fullName || <span className="hero-placeholder">Your Name</span>}
                  {form.nickname && <span className="hero-nickname">"{form.nickname}"</span>}
                </div>
                <div className="hero-meta">
                  {age && <span>🎂 {age} yrs</span>}
                  {form.gender && <span>{form.gender}</span>}
                  {form.location && <span>📍 {form.location}</span>}
                  {form.occupation && <span>💼 {form.occupation}</span>}
                </div>
                {form.bio && <div className="hero-bio">{form.bio}</div>}
                {form.hobbies?.length > 0 && (
                  <div className="hero-hobbies">
                    {form.hobbies.slice(0, 5).map(h => (
                      <span key={h} className="hero-hobby-pill">{h}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick edit */}
              <button className="hero-edit-btn btn btn-ghost btn-sm"
                onClick={() => scrollTo('personal')}>
                ✏ Edit Profile
              </button>
            </div>
          </div>
        </section>

        {/* ━━━━━━━ PERSONAL INFO ━━━━━━━ */}
        <Section id="personal" icon="👤" title="Personal Information"
          subtitle="Your basic profile details">

          <div className="prf-form-grid">
            <div className="form-group">
              <label>Full Name</label>
              <input value={form.fullName||''} onChange={e=>f('fullName',e.target.value)}
                placeholder="Your full name"/>
            </div>
            <div className="form-group">
              <label>Nickname</label>
              <input value={form.nickname||''} onChange={e=>f('nickname',e.target.value)}
                placeholder="What do people call you?"/>
            </div>
            <div className="form-group">
              <label>Birthday</label>
              <input type="date" value={form.birthday||''} onChange={e=>f('birthday',e.target.value)}/>
            </div>
            <div className="form-group">
              <label>Gender</label>
              <select value={form.gender||''} onChange={e=>f('gender',e.target.value)}>
                <option value="">Prefer not to say</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Location</label>
              <input value={form.location||''} onChange={e=>f('location',e.target.value)}
                placeholder="City, Country"/>
            </div>
            <div className="form-group">
              <label>Occupation</label>
              <input value={form.occupation||''} onChange={e=>f('occupation',e.target.value)}
                placeholder="What do you do?"/>
            </div>
            <div className="form-group prf-full">
              <label>Bio / About Me</label>
              <textarea value={form.bio||''} onChange={e=>f('bio',e.target.value)} rows={3}
                placeholder="A short description about yourself…"/>
            </div>
          </div>
        </Section>

        {/* ━━━━━━━ TRAITS & GOALS ━━━━━━━ */}
        <Section id="traits" icon="✨" title="Traits & Goals"
          subtitle="Used for compatibility comparisons in Relationships">

          <div className="prf-form-grid">
            <div className="form-group prf-full">
              <label>Hobbies</label>
              <TagInput value={form.hobbies||[]} onChange={v=>f('hobbies',v)}
                suggestions={HOBBY_SUGGESTIONS} placeholder="Add hobbies…"/>
            </div>
            <div className="form-group prf-full">
              <label>Interests</label>
              <TagInput value={form.interests||[]} onChange={v=>f('interests',v)}
                suggestions={INTEREST_SUGGESTIONS} placeholder="Add interests…"/>
            </div>
            <div className="form-group prf-full">
              <label>Personality Traits</label>
              <TagInput value={form.personalityTraits||[]} onChange={v=>f('personalityTraits',v)}
                suggestions={PERSONALITY_OPTS} placeholder="Add traits…"/>
            </div>
            <div className="form-group">
              <label>Favourite Color</label>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <input type="color" value={form.favoriteColor||'#d4a853'}
                  onChange={e=>f('favoriteColor',e.target.value)}
                  style={{width:44,height:40,padding:2,cursor:'pointer'}}/>
                <input value={form.favoriteColor||''} onChange={e=>f('favoriteColor',e.target.value)}
                  placeholder="#d4a853" style={{flex:1}}/>
              </div>
            </div>
            <div className="form-group">
              <label>Favourite Food</label>
              <input value={form.favoriteFood||''} onChange={e=>f('favoriteFood',e.target.value)}
                placeholder="e.g. Biryani, Pasta…"/>
            </div>
            <div className="form-group prf-full">
              <label>Habits</label>
              <textarea value={form.habits||''} onChange={e=>f('habits',e.target.value)} rows={2}
                placeholder="Daily habits, routines…"/>
            </div>
            <div className="form-group prf-full">
              <label>Life Goals</label>
              <textarea value={form.lifeGoals||''} onChange={e=>f('lifeGoals',e.target.value)} rows={3}
                placeholder="What are you working towards?"/>
            </div>
          </div>
        </Section>

        {/* ━━━━━━━ LIFE STATS ━━━━━━━ */}
        <Section id="stats" icon="◉" title="Life Statistics"
          subtitle="Your activity across the app">
          <div className="stats-grid">
            <StatCard icon="◈" label="Memories"    value={stats?.memories}          color="var(--violet)" onClick={()=>navigate('/memories')}/>
            <StatCard icon="✦" label="Notes"        value={stats?.notes}             color="var(--teal)"   onClick={()=>navigate('/notes')}/>
            <StatCard icon="◎" label="Relationships"value={stats?.people}            color="var(--blue)"   onClick={()=>navigate('/relationships')}/>
            <StatCard icon="◇" label="Plans Done"   value={stats?.plansCompleted}    color="var(--gold)"   onClick={()=>navigate('/plans')}/>
            <StatCard icon="⚡" label="Prod. Hours"  value={stats?.productivityHours} color="var(--teal)"   onClick={()=>navigate('/activity')}/>
            <StatCard icon="◉" label="Total Spent"  value={fmtCurrency(stats?.totalExpenses, form.currency||'INR')} color="var(--rose)" onClick={()=>navigate('/finance')}/>
            <StatCard icon="♡" label="Health Logs"  value={stats?.healthLogs}        color="var(--rose)"   onClick={()=>navigate('/health')}/>
            <StatCard icon="⏱" label="Activities"   value={stats?.totalActivities}   color="var(--amber)"  onClick={()=>navigate('/activity')}/>
          </div>
        </Section>

        {/* ━━━━━━━ ACTIVITY FEED ━━━━━━━ */}
        <Section id="activity" icon="⏱" title="Recent Activity"
          subtitle="Your latest actions across all modules">
          <div className="feed-list">
            {recent.length === 0
              ? <div className="prf-empty">No recent activity yet.</div>
              : recent.map((item, i) => <FeedItem key={i} item={item}/>)
            }
          </div>
        </Section>

        {/* ━━━━━━━ SAFETY MODE ━━━━━━━ */}
        <Section id="safety" icon="🔒" title="Safety Mode"
          subtitle="Quickly hide sensitive content with a shortcut or PIN">
          <div className="prf-form-grid">

            {/* Master toggle */}
            <div className="prf-full prf-toggle-row">
              <div>
                <div className="prf-toggle-label">Enable Safety Mode</div>
                <div className="prf-toggle-desc">When active, hides sensitive modules based on your privacy settings</div>
              </div>
              <button className={`prf-toggle ${form.safetyModeEnabled?'on':''}`}
                onClick={()=>f('safetyModeEnabled',!form.safetyModeEnabled)}>
                <span className="prf-toggle-knob"/>
              </button>
            </div>

            {form.safetyModeEnabled && (<>
              {/* PIN */}
              <div className="prf-full">
                <div className="prf-pin-row">
                  <div>
                    <div className="prf-toggle-label">Safety Mode PIN</div>
                    <div className="prf-toggle-desc">Required to exit Safety Mode</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={()=>setShowSetPin(true)}>
                    {profile?.safetyModePinHash ? '🔑 Change PIN' : '🔑 Set PIN'}
                  </button>
                </div>
                {pinMsg && <div className="prf-pin-msg">{pinMsg}</div>}
              </div>

              {/* Auto-lock */}
              <div className="prf-full prf-toggle-row">
                <div>
                  <div className="prf-toggle-label">Auto-lock after inactivity</div>
                  <div className="prf-toggle-desc">Automatically activates Safety Mode when idle</div>
                </div>
                <button className={`prf-toggle ${form.safetyModeAutoLock?'on':''}`}
                  onClick={()=>f('safetyModeAutoLock',!form.safetyModeAutoLock)}>
                  <span className="prf-toggle-knob"/>
                </button>
              </div>
              {form.safetyModeAutoLock && (
                <div className="form-group">
                  <label>Auto-lock after (minutes)</label>
                  <select value={form.safetyModeLockMins||5} onChange={e=>f('safetyModeLockMins',parseInt(e.target.value))}>
                    {[1,2,5,10,15,30,60].map(m=><option key={m} value={m}>{m} min{m>1?'s':''}</option>)}
                  </select>
                </div>
              )}

              {/* Keyboard shortcut */}
              <div className="form-group">
                <label>Safety Mode Shortcut</label>
                <input value={form.safetyShortcut||'Ctrl+Shift+S'}
                  onChange={e=>f('safetyShortcut',e.target.value)}
                  placeholder="e.g. Ctrl+Shift+S"/>
                <span className="prf-hint">Press this combo anywhere to activate Safety Mode</span>
              </div>

              {/* Panic mode */}
              <div className="prf-full prf-toggle-row">
                <div>
                  <div className="prf-toggle-label">🚨 Panic Mode</div>
                  <div className="prf-toggle-desc">Instantly switches to Safety Mode and hides everything</div>
                </div>
                <button className={`prf-toggle ${form.panicModeEnabled?'on':''}`}
                  style={form.panicModeEnabled?{'--toggle-color':'var(--rose)'}:{}}
                  onClick={()=>f('panicModeEnabled',!form.panicModeEnabled)}>
                  <span className="prf-toggle-knob"/>
                </button>
              </div>
              {form.panicModeEnabled && (
                <div className="form-group">
                  <label>Panic Shortcut</label>
                  <input value={form.panicShortcut||'Ctrl+Alt+P'}
                    onChange={e=>f('panicShortcut',e.target.value)}
                    placeholder="e.g. Ctrl+Alt+P"/>
                  <span className="prf-hint">Activates immediately — use for emergency situations</span>
                </div>
              )}
            </>)}
          </div>

          {/* Safety mode preview */}
          {form.safetyModeEnabled && (
            <div className="safety-preview">
              <div className="safety-preview-title">When Safety Mode is active:</div>
              <div className="safety-preview-content">
                <div className="sp-mock-screen">
                  <div className="sp-lock-icon">🔒</div>
                  <div className="sp-lock-text">Content hidden</div>
                  <div className="sp-lock-sub">Enter PIN to unlock</div>
                </div>
              </div>
            </div>
          )}
        </Section>

        {/* ━━━━━━━ PRIVACY ━━━━━━━ */}
        <Section id="privacy" icon="🛡" title="Privacy Preferences"
          subtitle="Choose what to hide when Safety Mode is active">
          <div className="prf-privacy-grid">
            {[
              { key:'hideRelationships', label:'Relationships', icon:'◎', color:'var(--blue)'   },
              { key:'hideMemories',      label:'Memories',      icon:'◈', color:'var(--violet)' },
              { key:'hideNotes',         label:'Notes',         icon:'✦', color:'var(--teal)'   },
              { key:'hideFinance',       label:'Finance',       icon:'◉', color:'var(--rose)'   },
              { key:'hideHealth',        label:'Health',        icon:'♡', color:'var(--rose)'   },
              { key:'hideAnalytics',     label:'Analytics',     icon:'⊞', color:'var(--gold)'   },
            ].map(item => (
              <div key={item.key} className="privacy-item">
                <div className="privacy-icon" style={{color:item.color}}>{item.icon}</div>
                <div className="privacy-label">{item.label}</div>
                <div className="privacy-status">
                  {form[item.key]
                    ? <span className="privacy-hidden">Hidden in safety mode</span>
                    : <span className="privacy-visible">Visible in safety mode</span>}
                </div>
                <button className={`prf-toggle sm ${form[item.key]?'on':''}`}
                  onClick={()=>f(item.key,!form[item.key])}>
                  <span className="prf-toggle-knob"/>
                </button>
              </div>
            ))}
          </div>
        </Section>

        {/* ━━━━━━━ PREFERENCES ━━━━━━━ */}
        <Section id="prefs" icon="⚙" title="Application Preferences"
          subtitle="Customize how the app behaves">
          <div className="prf-form-grid">

            {/* Theme */}
            <div className="form-group">
              <label>Theme</label>
              <div className="theme-picker">
                {['dark','light'].map(t=>(
                  <button key={t} className={`theme-option ${form.theme===t?'active':''}`}
                    onClick={()=>f('theme',t)}>
                    <span>{t==='dark'?'☽':'☀'}</span>
                    <span>{t==='dark'?'Dark':'Light'} Mode</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Default page */}
            <div className="form-group">
              <label>Default Page on Open</label>
              <select value={form.defaultPage||'/'} onChange={e=>f('defaultPage',e.target.value)}>
                {PAGES.map(p=><option key={p.path} value={p.path}>{p.label}</option>)}
              </select>
            </div>

            {/* Currency */}
            <div className="form-group">
              <label>Preferred Currency</label>
              <select value={form.currency||'INR'} onChange={e=>f('currency',e.target.value)}>
                {CURRENCIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Time format */}
            <div className="form-group">
              <label>Time Format</label>
              <div className="prf-radio-row">
                {['12h','24h'].map(t=>(
                  <button key={t} className={`prf-radio-btn ${form.timeFormat===t?'active':''}`}
                    onClick={()=>f('timeFormat',t)}>
                    <span className="prf-radio-dot"/>
                    {t === '12h' ? '12-hour (2:30 PM)' : '24-hour (14:30)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Dashboard layout */}
            <div className="form-group prf-full">
              <label>Dashboard Layout</label>
              <div className="layout-picker">
                {[
                  { val:'grid', icon:'⊞', label:'Grid' },
                  { val:'list', icon:'≡', label:'List' },
                ].map(l=>(
                  <button key={l.val} className={`layout-option ${form.dashboardLayout===l.val?'active':''}`}
                    onClick={()=>f('dashboardLayout',l.val)}>
                    <span className="lo-icon">{l.icon}</span>
                    <span>{l.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ━━━━━━━ DATA & BACKUP ━━━━━━━ */}
        <Section id="data" icon="💾" title="Data & Backup"
          subtitle="Export, import, or reset your data">
          <div className="data-actions">

            <div className="data-action-card" onClick={handleExport}>
              <div className="dac-icon">📤</div>
              <div className="dac-body">
                <div className="dac-title">Export Profile Data</div>
                <div className="dac-desc">Download your profile settings as a JSON backup file</div>
              </div>
              <div className="dac-arrow">→</div>
            </div>

            <div className="data-action-card">
              <div className="dac-icon">📥</div>
              <div className="dac-body">
                <div className="dac-title">Import Backup</div>
                <div className="dac-desc">Restore from a previously exported backup file</div>
              </div>
              <input type="file" accept=".json" style={{position:'absolute',inset:0,opacity:0,cursor:'pointer'}}
                onChange={async e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    if (data.profile) {
                      await profileApi.update(data.profile);
                      await load();
                    }
                  } catch(err) {}
                }}/>
              <div className="dac-arrow">→</div>
            </div>

            <div className="data-action-card data-action-danger"
              onClick={()=>{
                if (window.confirm('Are you sure? This will reset your profile settings. All app data (memories, notes, etc.) will remain intact.')) {
                  profileApi.update({ fullName:'',nickname:'',bio:'',hobbies:[],interests:[],personalityTraits:[] }).then(load);
                }
              }}>
              <div className="dac-icon">🗑</div>
              <div className="dac-body">
                <div className="dac-title">Reset Profile Settings</div>
                <div className="dac-desc">Clears profile details and preferences only. App data is not affected.</div>
              </div>
              <div className="dac-arrow" style={{color:'var(--rose)'}}>→</div>
            </div>

          </div>

          {/* App version info */}
          <div className="app-meta">
            <div className="app-meta-item">
              <span className="app-meta-label">Version</span>
              <span className="app-meta-val">1.0.0</span>
            </div>
            <div className="app-meta-item">
              <span className="app-meta-label">Last saved</span>
              <span className="app-meta-val">{profile?.updatedAt ? fmtDate(profile.updatedAt) : '—'}</span>
            </div>
          </div>
        </Section>

        {/* ── Floating save bar ── */}
        <div className="prf-save-bar">
          <div className="prf-save-bar-inner">
            <span style={{color:'var(--text-3)',fontSize:'0.82rem'}}>Remember to save your changes</span>
            <button className={`btn btn-primary ${saved?'saved':''}`}
              onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : saved ? '✓ All Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>

      </div>{/* end profile-main */}

      {/* ── Modals ── */}
      {showSetPin && (
        <PinModal title="Set Safety Mode PIN"
          confirmLabel="Set PIN"
          onConfirm={handleSetPin}
          onCancel={()=>setShowSetPin(false)}/>
      )}
    </div>
  );
}