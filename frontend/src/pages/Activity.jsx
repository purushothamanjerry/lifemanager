import React, { useState, useEffect, useCallback, useRef } from 'react';
import { format, subDays, parseISO, addDays } from 'date-fns';
import { activityApi } from '../utils/api.js';
import './Activity.css';

// ─── Constants ─────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value:'work',          label:'Work',          emoji:'💼', color:'#60a5fa' },
  { value:'study',         label:'Study',         emoji:'📚', color:'#a78bfa' },
  { value:'exercise',      label:'Exercise',      emoji:'🏃', color:'#34d399' },
  { value:'meals',         label:'Meals',         emoji:'🍽',  color:'#fb923c' },
  { value:'personal',      label:'Personal',      emoji:'🌿', color:'#4ec9b0' },
  { value:'social',        label:'Social',        emoji:'👥', color:'#f472b6' },
  { value:'entertainment', label:'Entertainment', emoji:'🎬', color:'#fbbf24' },
  { value:'sleep',         label:'Sleep',         emoji:'😴', color:'#818cf8' },
  { value:'travel',        label:'Travel',        emoji:'✈️', color:'#67e8f9' },
  { value:'errands',       label:'Errands',       emoji:'🛒', color:'#d4a853' },
  { value:'creative',      label:'Creative',      emoji:'🎨', color:'#f9a8d4' },
  { value:'health',        label:'Health',        emoji:'❤️', color:'#e8637a' },
  { value:'other',         label:'Other',         emoji:'◦',  color:'#6b7280' },
];
const CAT = Object.fromEntries(CATEGORIES.map(c => [c.value, c]));

const MOODS = [
  { value:'great',   emoji:'😄', color:'#34d399' },
  { value:'good',    emoji:'🙂', color:'#4ec9b0' },
  { value:'okay',    emoji:'😐', color:'#fbbf24' },
  { value:'bad',     emoji:'😕', color:'#fb923c' },
  { value:'terrible',emoji:'😞', color:'#e8637a' },
];

// ─── Utilities ─────────────────────────────────────────────────────────────
const todayStr  = () => format(new Date(), 'yyyy-MM-dd');
const toMins    = t  => { if (!t) return 0; const [h,m]=t.split(':').map(Number); return h*60+m; };
const durMins   = (s,e) => { if (!s||!e) return null; let d=toMins(e)-toMins(s); if(d<0)d+=1440; return d; };
const fmtDur    = m  => { if (!m) return '—'; if (m<60) return `${m}m`; return `${Math.floor(m/60)}h ${m%60>0?m%60+'m':''}`; };
const fmtHour   = h  => { if(h===0)return'12 AM'; if(h<12)return`${h} AM`; if(h===12)return'12 PM'; return`${h-12} PM`; };
const nowTimeStr= () => format(new Date(),'HH:mm');
const snapTo15  = t  => { const[h,m]=t.split(':').map(Number); return`${String(h).padStart(2,'0')}:${String(Math.round(m/15)*15%60).padStart(2,'0')}`; };

// ─── Activity Form Modal ───────────────────────────────────────────────────
function ActivityForm({ activity, defaultDate, defaultStart, onSave, onCancel }) {
  const now = nowTimeStr();
  const [date,       setDate]       = useState(activity?.date      || defaultDate || todayStr());
  const [name,       setName]       = useState(activity?.name      || '');
  const [category,   setCategory]   = useState(activity?.category  || 'work');
  const [startTime,  setStartTime]  = useState(activity?.startTime || defaultStart || now);
  const [endTime,    setEndTime]    = useState(activity?.endTime   || '');
  const [location,   setLocation]   = useState(activity?.location  || '');
  const [notes,      setNotes]      = useState(activity?.notes     || '');
  const [mood,       setMood]       = useState(activity?.mood      || '');
  const [productive, setProductive] = useState(activity?.productive ?? false);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');

  const duration = durMins(startTime, endTime);
  const catData  = CAT[category];

  // Auto end-time: start + 1h
  const autoFillEnd = () => {
    if (startTime && !endTime) {
      const [h,m] = startTime.split(':').map(Number);
      const end = `${String((h+1)%24).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
      setEndTime(end);
    }
  };

  const handleSave = async () => {
    if (!name.trim())    { setError('Activity name is required'); return; }
    if (!startTime)      { setError('Start time is required'); return; }
    if (endTime && toMins(endTime) === toMins(startTime)) { setError('End time must differ from start'); return; }
    setSaving(true); setError('');
    try {
      const body = { date, name, category, startTime, endTime: endTime||undefined, location, notes, mood, productive };
      if (activity) await activityApi.update(activity._id, body);
      else          await activityApi.create(body);
      onSave();
    } catch(e) { setError(e.response?.data?.error || 'Something went wrong'); }
    finally { setSaving(false); }
  };

  return (
    <div className="af-overlay">
      <div className="af-modal">
        {/* Header */}
        <div className="af-header" style={{'--cat-color': catData?.color}}>
          <div className="af-header-accent"/>
          <div className="af-header-content">
            <span className="af-cat-emoji">{catData?.emoji}</span>
            <div>
              <h2>{activity ? 'Edit Activity' : 'Log Activity'}</h2>
              <div className="af-duration-preview">
                {duration ? <span>{fmtDur(duration)}</span> : <span className="af-dur-placeholder">Set start & end to see duration</span>}
              </div>
            </div>
          </div>
          <button className="af-close" onClick={onCancel}>✕</button>
        </div>

        {error && <div className="af-error">{error}</div>}

        <div className="af-body">
          {/* Name + Date */}
          <div className="af-grid-2">
            <div className="form-group">
              <label>Activity Name *</label>
              <input value={name} onChange={e=>setName(e.target.value)}
                placeholder="What were you doing?" autoFocus/>
            </div>
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)}/>
            </div>
          </div>

          {/* Time row */}
          <div className="af-grid-3">
            <div className="form-group">
              <label>Start Time *</label>
              <input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)}
                onBlur={autoFillEnd}/>
            </div>
            <div className="form-group">
              <label>End Time</label>
              <input type="time" value={endTime} onChange={e=>setEndTime(e.target.value)}/>
            </div>
            <div className="form-group">
              <label>Duration</label>
              <div className="af-dur-display">{fmtDur(duration)}</div>
            </div>
          </div>

          {/* Category */}
          <div className="form-group">
            <label>Category</label>
            <div className="af-cat-grid">
              {CATEGORIES.map(c => (
                <button key={c.value} type="button"
                  className={`af-cat-btn ${category===c.value?'active':''}`}
                  style={category===c.value?{borderColor:c.color,background:`${c.color}15`,color:c.color}:{}}
                  onClick={()=>setCategory(c.value)}>
                  <span className="af-cat-em">{c.emoji}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Location + Productive */}
          <div className="af-grid-2">
            <div className="form-group">
              <label>Location</label>
              <input value={location} onChange={e=>setLocation(e.target.value)}
                placeholder="Where were you?"/>
            </div>
            <div className="form-group">
              <label>Mark as productive</label>
              <button type="button"
                className={`af-prod-toggle ${productive?'on':''}`}
                onClick={()=>setProductive(v=>!v)}>
                <span>{productive?'⚡':'○'}</span>
                {productive ? 'Productive time' : 'Not marked productive'}
              </button>
            </div>
          </div>

          {/* Mood */}
          <div className="form-group">
            <label>Mood during activity</label>
            <div className="af-mood-row">
              {MOODS.map(m=>(
                <button key={m.value} type="button"
                  className={`af-mood-btn ${mood===m.value?'active':''}`}
                  style={mood===m.value?{borderColor:m.color,background:`${m.color}15`}:{}}
                  title={m.value}
                  onClick={()=>setMood(v=>v===m.value?'':m.value)}>
                  {m.emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label>Notes</label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)}
              placeholder="Any notes about this activity…" rows={2}/>
          </div>
        </div>

        <div className="af-footer">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : activity ? '✓ Update' : '✓ Log Activity'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Timeline ruler — 24 hours vertical ───────────────────────────────────
const PX_PER_MIN = 1.4;  // 1 min = 1.4px → 1 hr = 84px → 24 hr = 2016px

function TimelineView({ activities, onClickTime, onEdit, onDelete }) {
  const nowRef = useRef(null);

  useEffect(() => {
    // Scroll to current time (or 8am)
    const el = nowRef.current;
    if (el) el.scrollIntoView({ behavior:'smooth', block:'center' });
    else {
      const container = document.querySelector('.tl-scroll');
      if (container) container.scrollTop = 8 * 60 * PX_PER_MIN - 200;
    }
  }, [activities]);

  const now    = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  // Compute layout columns for overlapping activities
  const positioned = [];
  const sorted = [...activities].sort((a,b) => toMins(a.startTime)-toMins(b.startTime));

  sorted.forEach(act => {
    const s = toMins(act.startTime);
    const e = act.endTime ? toMins(act.endTime) : s + 30;
    // Find first column where no overlap
    let col = 0;
    while (positioned.filter(p=>p.col===col).some(p=>{
      const ps=toMins(p.startTime), pe=p.endTime?toMins(p.endTime):ps+30;
      return s<pe && e>ps;
    })) col++;
    positioned.push({ ...act, col, endMinCalc: e });
  });

  const maxCol = positioned.reduce((m,p)=>Math.max(m,p.col),0);

  const handleClickRuler = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relY  = e.clientY - rect.top;
    const mins  = Math.round(relY / PX_PER_MIN / 15) * 15;
    const h     = Math.floor(mins/60), m = mins%60;
    const t     = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    onClickTime(t);
  };

  return (
    <div className="tl-scroll">
      <div className="tl-canvas" style={{ height: 24*60*PX_PER_MIN }}
        onClick={handleClickRuler}>

        {/* Hour grid lines */}
        {Array.from({length:25},(_,h)=>(
          <div key={h} className="tl-hour-line" style={{top: h*60*PX_PER_MIN}}>
            <span className="tl-hour-label">{fmtHour(h%24)}</span>
            <div className="tl-h-line"/>
          </div>
        ))}

        {/* 30-min sub-lines */}
        {Array.from({length:24},(_,h)=>(
          <div key={h} className="tl-half-line" style={{top:(h*60+30)*PX_PER_MIN}}/>
        ))}

        {/* Now indicator */}
        <div ref={nowRef} className="tl-now" style={{top: nowMin*PX_PER_MIN}}>
          <div className="tl-now-dot"/>
          <div className="tl-now-line"/>
          <span className="tl-now-label">{format(now,'HH:mm')}</span>
        </div>

        {/* Activity blocks */}
        <div className="tl-activities-col" style={{left:72}}>
          {positioned.map(act => {
            const s     = toMins(act.startTime);
            const dur   = act.endTime ? durMins(act.startTime,act.endTime) : 30;
            const top   = s * PX_PER_MIN;
            const height= Math.max((dur||30) * PX_PER_MIN, 24);
            const c     = CAT[act.category] || CAT.other;
            const colW  = `calc((100% - ${(maxCol)*8}px) / ${maxCol+1})`;
            const left  = `calc(${act.col} * (${colW} + 8px))`;
            const isShort = height < 44;

            return (
              <div key={act._id}
                className={`tl-block ${isShort?'short':''} ${act.productive?'productive':''}`}
                style={{
                  top, height, left, width: colW,
                  '--block-color': c.color,
                  borderLeftColor: c.color,
                  background: `linear-gradient(135deg, ${c.color}18 0%, ${c.color}08 100%)`,
                }}
                onClick={e => { e.stopPropagation(); onEdit(act); }}>
                <div className="tl-block-inner">
                  <div className="tl-block-title">
                    <span className="tl-block-emoji">{c.emoji}</span>
                    <span className="tl-block-name">{act.name}</span>
                    {act.productive && <span className="tl-prod-dot" title="Productive">⚡</span>}
                    {act.mood && <span className="tl-mood">{MOODS.find(m=>m.value===act.mood)?.emoji}</span>}
                  </div>
                  {!isShort && (
                    <div className="tl-block-meta">
                      <span>{act.startTime}{act.endTime?` → ${act.endTime}`:''}</span>
                      {dur && <span> · {fmtDur(dur)}</span>}
                      {act.location && <span className="tl-block-loc">📍{act.location}</span>}
                    </div>
                  )}
                </div>
                <button className="tl-del-btn" title="Delete"
                  onClick={e=>{e.stopPropagation();onDelete(act._id);}}>✕</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Day summary strip ─────────────────────────────────────────────────────
function DaySummary({ activities }) {
  if (!activities.length) return null;
  const totalM = activities.reduce((s,a)=>s+(durMins(a.startTime,a.endTime)||0),0);
  const prodM  = activities.filter(a=>a.productive).reduce((s,a)=>s+(durMins(a.startTime,a.endTime)||0),0);
  const byC    = activities.reduce((acc,a)=>{ acc[a.category]=(acc[a.category]||0)+1; return acc; },{});
  const topCat = Object.entries(byC).sort((a,b)=>b[1]-a[1])[0];

  return (
    <div className="day-summary-strip">
      <div className="dss-item">
        <span className="dss-val">{activities.length}</span>
        <span className="dss-lbl">activities</span>
      </div>
      <div className="dss-sep"/>
      <div className="dss-item">
        <span className="dss-val">{fmtDur(totalM)}</span>
        <span className="dss-lbl">logged</span>
      </div>
      {prodM > 0 && <>
        <div className="dss-sep"/>
        <div className="dss-item">
          <span className="dss-val" style={{color:'var(--teal)'}}>{fmtDur(prodM)}</span>
          <span className="dss-lbl">productive</span>
        </div>
      </>}
      {topCat && <>
        <div className="dss-sep"/>
        <div className="dss-item">
          <span className="dss-val">{CAT[topCat[0]]?.emoji} {topCat[0]}</span>
          <span className="dss-lbl">top category</span>
        </div>
      </>}
    </div>
  );
}

// ─── Category donut (SVG) ──────────────────────────────────────────────────
function CategoryDonut({ byCat }) {
  const entries = Object.entries(byCat).filter(([,v])=>v.mins>0).sort((a,b)=>b[1].mins-a[1].mins);
  if (!entries.length) return <div className="chart-empty">No data yet.</div>;

  const total = entries.reduce((s,[,v])=>s+v.mins,0);
  const R=56, CX=68, CY=68, TWO_PI=Math.PI*2;
  let angle = -Math.PI/2;
  const slices = entries.map(([cat,v])=>{
    const pct   = v.mins/total;
    const start = angle;
    angle      += pct * TWO_PI;
    const large = pct > 0.5 ? 1 : 0;
    const x1    = CX + R*Math.cos(start);
    const y1    = CY + R*Math.sin(start);
    const x2    = CX + R*Math.cos(angle);
    const y2    = CY + R*Math.sin(angle);
    const c     = CAT[cat]?.color || '#6b7280';
    return { cat, pct, path:`M${CX},${CY} L${x1.toFixed(2)},${y1.toFixed(2)} A${R},${R} 0 ${large},1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`, color:c, mins:v.mins };
  });

  return (
    <div className="donut-wrap">
      <svg width="136" height="136" viewBox="0 0 136 136">
        <circle cx={CX} cy={CY} r={R} fill="var(--bg-elevated)"/>
        {slices.map(s=>(
          <path key={s.cat} d={s.path} fill={s.color} opacity="0.85"
            className="donut-slice"/>
        ))}
        <circle cx={CX} cy={CY} r={R*0.55} fill="var(--bg-card)"/>
        <text x={CX} y={CY-6} textAnchor="middle" fill="var(--text-1)"
          fontSize="12" fontWeight="700" fontFamily="Playfair Display, serif">
          {Math.round(total/60)}h
        </text>
        <text x={CX} y={CY+10} textAnchor="middle" fill="var(--text-3)" fontSize="8">
          logged
        </text>
      </svg>
      <div className="donut-legend">
        {slices.slice(0,6).map(s=>(
          <div key={s.cat} className="donut-leg-row">
            <span className="donut-dot" style={{background:s.color}}/>
            <span className="donut-cat">{CAT[s.cat]?.emoji} {s.cat}</span>
            <span className="donut-dur">{fmtDur(s.mins)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Hourly heatmap ────────────────────────────────────────────────────────
function HourlyHeatmap({ hourly = [] }) {
  const max = Math.max(...hourly, 1);
  return (
    <div className="hourly-heatmap">
      {hourly.map((v,h)=>(
        <div key={h} className="hh-col" title={`${fmtHour(h)}: ${v} activities`}>
          <div className="hh-bar" style={{
            height:`${(v/max)*64}px`,
            background:`rgba(212,168,83,${0.15+0.75*(v/max)})`,
            borderColor:`rgba(212,168,83,${0.3+0.5*(v/max)})`,
          }}/>
          {h%3===0&&<span className="hh-label">{fmtHour(h)}</span>}
        </div>
      ))}
    </div>
  );
}

// ─── Productivity bar ──────────────────────────────────────────────────────
function ProductivityBar({ prodMins, totalMins }) {
  const pct = totalMins > 0 ? Math.round(prodMins/totalMins*100) : 0;
  return (
    <div className="prod-bar-wrap">
      <div className="prod-bar-labels">
        <span style={{color:'var(--teal)'}}>⚡ {fmtDur(prodMins)} productive</span>
        <span style={{color:'var(--text-3)'}}>{pct}%</span>
      </div>
      <div className="prod-bar-track">
        <div className="prod-bar-fill" style={{width:`${pct}%`}}/>
      </div>
      <div className="prod-bar-labels" style={{marginTop:4}}>
        <span style={{color:'var(--text-3)'}}>Total logged: {fmtDur(totalMins)}</span>
      </div>
    </div>
  );
}

// ─── Daily activity list (compact) ────────────────────────────────────────
function ActivityList({ activities, onEdit, onDelete }) {
  const sorted = [...activities].sort((a,b)=>toMins(a.startTime)-toMins(b.startTime));
  return (
    <div className="act-list">
      {sorted.map((a,i) => {
        const c   = CAT[a.category] || CAT.other;
        const dur = durMins(a.startTime, a.endTime);
        return (
          <div key={a._id} className="act-row" style={{animationDelay:`${i*0.04}s`}}>
            <div className="act-time-col">
              <span className="act-start">{a.startTime}</span>
              {a.endTime && <span className="act-end">↓ {a.endTime}</span>}
            </div>
            <div className="act-dot-col">
              <div className="act-dot" style={{background:c.color, boxShadow:`0 0 6px ${c.color}60`}}/>
              {i < sorted.length-1 && <div className="act-spine"/>}
            </div>
            <div className="act-content">
              <div className="act-name-row">
                <span className="act-emoji">{c.emoji}</span>
                <span className="act-name">{a.name}</span>
                {a.productive && <span className="act-prod-badge">⚡</span>}
                {a.mood && <span>{MOODS.find(m=>m.value===a.mood)?.emoji}</span>}
              </div>
              <div className="act-meta">
                <span className="act-cat-pill" style={{color:c.color,background:`${c.color}15`}}>{c.label}</span>
                {dur && <span className="act-dur">{fmtDur(dur)}</span>}
                {a.location && <span className="act-loc">📍 {a.location}</span>}
                {a.notes && <span className="act-notes" title={a.notes}>📝</span>}
              </div>
            </div>
            <div className="act-actions">
              <button className="act-btn act-edit" onClick={()=>onEdit(a)}>✏</button>
              <button className="act-btn act-del"  onClick={()=>onDelete(a._id)}>🗑</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════
export default function Activity() {
  const [mainTab,    setMainTab]    = useState('timeline'); // timeline | analytics
  const [viewDate,   setViewDate]   = useState(todayStr());
  const [listView,   setListView]   = useState(false);      // toggle inside timeline tab
  const [activities, setActivities] = useState([]);
  const [analytics,  setAnalytics]  = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [editAct,    setEditAct]    = useState(null);
  const [defaultStart, setDefaultStart] = useState('');
  const [range,      setRange]      = useState(7);          // analytics range days
  const [search,     setSearch]     = useState('');
  const [dSearch,    setDSearch]    = useState('');
  const [filterCat,  setFilterCat]  = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDSearch(search), 280);
    return () => clearTimeout(t);
  }, [search]);

  const rangeFrom = format(subDays(new Date(), range), 'yyyy-MM-dd');

  const loadDay = useCallback(async () => {
    try {
      const params = { date: viewDate };
      if (filterCat) params.category = filterCat;
      if (dSearch)   params.search   = dSearch;
      const res = await activityApi.getAll(params);
      setActivities(res.data);
    } catch(e) { setActivities([]); }
  }, [viewDate, filterCat, dSearch]);

  const loadAnalytics = useCallback(async () => {
    try {
      const res = await activityApi.getAnalytics({ from: rangeFrom, to: todayStr() });
      setAnalytics(res.data);
    } catch(e) {}
  }, [rangeFrom]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadDay(), loadAnalytics()]).finally(()=>setLoading(false));
  }, [loadDay, loadAnalytics]);

  const afterSave = () => { setShowForm(false); setEditAct(null); setDefaultStart(''); loadDay(); loadAnalytics(); };
  const handleEdit   = a   => { setEditAct(a); setShowForm(true); };
  const handleDelete = async id => { try { await activityApi.delete(id); loadDay(); loadAnalytics(); } catch(e){} };
  const handleClickTime = t => { setDefaultStart(t); setEditAct(null); setShowForm(true); };

  const isToday = viewDate === todayStr();
  const prevDay = () => setViewDate(d => format(subDays(parseISO(d),1),'yyyy-MM-dd'));
  const nextDay = () => { const n=format(addDays(parseISO(viewDate),1),'yyyy-MM-dd'); if(n<=todayStr()) setViewDate(n); };

  return (
    <div className="activity-page">

      {/* ── Page Header ── */}
      <div className="act-page-header">
        <div className="act-page-title">
          <h1>Activity</h1>
          <p>Daily time tracker & productivity insights</p>
        </div>
        <div className="act-header-right">
          <button className="btn btn-primary act-add-btn"
            onClick={()=>{setEditAct(null);setDefaultStart('');setShowForm(true);}}>
            + Log Activity
          </button>
        </div>
      </div>

      {/* ── Main Tabs ── */}
      <div className="act-main-tabs">
        <button className={`act-mtab ${mainTab==='timeline'?'active':''}`} onClick={()=>setMainTab('timeline')}>
          ⏱ Timeline
        </button>
        <button className={`act-mtab ${mainTab==='analytics'?'active':''}`} onClick={()=>setMainTab('analytics')}>
          ◉ Analytics
        </button>
      </div>

      {loading ? <div className="act-loading"><div className="spinner"/></div> : (
      <>

      {/* ══ TIMELINE TAB ══════════════════════════════════════════════ */}
      {mainTab==='timeline' && (
        <div className="act-timeline-wrap">

          {/* Date navigation */}
          <div className="act-day-nav">
            <button className="adn-btn" onClick={prevDay}>‹</button>
            <div className="adn-center">
              <span className="adn-date">{format(parseISO(viewDate),'EEEE, MMMM d')}</span>
              <span className="adn-year">{format(parseISO(viewDate),'yyyy')}</span>
              {!isToday && <button className="btn btn-ghost btn-xs" onClick={()=>setViewDate(todayStr())}>Today</button>}
            </div>
            <button className="adn-btn" onClick={nextDay} disabled={isToday}>›</button>
            <button className={`adn-view-toggle ${listView?'list':'timeline'}`}
              onClick={()=>setListView(v=>!v)} title={listView?'Switch to timeline view':'Switch to list view'}>
              {listView ? '⊞' : '≡'}
            </button>
          </div>

          {/* Filters row */}
          <div className="act-filters">
            <div className="notes-search-wrap" style={{flex:1, maxWidth:280}}>
              <span className="notes-search-icon">🔍</span>
              <input className="notes-search" placeholder="Search activities…"
                value={search} onChange={e=>setSearch(e.target.value)}/>
              {search&&<button className="notes-search-clear" onClick={()=>setSearch('')}>✕</button>}
            </div>
            <select className="act-select" value={filterCat} onChange={e=>setFilterCat(e.target.value)}>
              <option value="">All categories</option>
              {CATEGORIES.map(c=><option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
            </select>
            {(filterCat||dSearch) && (
              <button className="btn btn-ghost btn-sm" onClick={()=>{setFilterCat('');setSearch('');}}>✕ Clear</button>
            )}
          </div>

          {/* Day summary */}
          <DaySummary activities={activities}/>

          {/* Timeline or list */}
          {activities.length === 0 ? (
            <div className="act-empty-state">
              <div className="act-empty-icon">⏱</div>
              <h3>{(filterCat||dSearch) ? 'No activities match' : `No activities logged for ${isToday?'today':format(parseISO(viewDate),'MMM d')}`}</h3>
              <p>{(filterCat||dSearch) ? 'Try clearing filters.' : 'Click anywhere on the timeline to log an activity, or use the button above.'}</p>
              {!(filterCat||dSearch) && (
                <button className="btn btn-primary" style={{marginTop:20}}
                  onClick={()=>{setEditAct(null);setDefaultStart(isToday?nowTimeStr():'09:00');setShowForm(true);}}>
                  + Log First Activity
                </button>
              )}
            </div>
          ) : listView ? (
            <ActivityList activities={activities} onEdit={handleEdit} onDelete={handleDelete}/>
          ) : (
            <TimelineView activities={activities} onClickTime={handleClickTime}
              onEdit={handleEdit} onDelete={handleDelete}/>
          )}

          {/* Click hint */}
          {!listView && activities.length > 0 && (
            <div className="tl-click-hint">💡 Click anywhere on the timeline to log a new activity at that time</div>
          )}
        </div>
      )}

      {/* ══ ANALYTICS TAB ══════════════════════════════════════════════ */}
      {mainTab==='analytics' && (
        <div className="act-analytics">

          {/* Range selector */}
          <div className="act-range-row">
            <span className="act-range-label">Last</span>
            {[7,14,30,60,90].map(d=>(
              <button key={d} className={`act-rng ${range===d?'active':''}`} onClick={()=>setRange(d)}>{d} days</button>
            ))}
          </div>

          {/* KPI cards */}
          {analytics && (
            <div className="an-kpi-row">
              {[
                {lab:'Total Logged',   val:fmtDur(analytics.totalMins),           col:'var(--gold)'},
                {lab:'Productive',     val:fmtDur(analytics.prodMins),            col:'var(--teal)'},
                {lab:'Activities',     val:analytics.totalActivities,             col:'var(--blue)'},
                {lab:'Avg / Day',      val:fmtDur(Math.round(analytics.totalMins/Math.max(Object.keys(analytics.byDay||{}).length,1))), col:'var(--violet)'},
              ].map(k=>(
                <div key={k.lab} className="kpi-card">
                  <div className="kpi-val" style={{color:k.col}}>{k.val}</div>
                  <div className="kpi-lab">{k.lab}</div>
                </div>
              ))}
            </div>
          )}

          <div className="an-charts-grid">

            {/* Category donut */}
            <div className="an-card">
              <div className="an-card-title">Time by Category</div>
              {analytics?.byCat
                ? <CategoryDonut byCat={analytics.byCat}/>
                : <div className="chart-empty">No data yet.</div>
              }
            </div>

            {/* Productivity */}
            <div className="an-card">
              <div className="an-card-title">Productivity</div>
              {analytics && (
                <ProductivityBar prodMins={analytics.prodMins} totalMins={analytics.totalMins}/>
              )}
              {/* Per-day bars */}
              {analytics?.byDay && (
                <div className="an-daily-bars">
                  <div className="an-card-title" style={{marginTop:20,marginBottom:10}}>Daily Logged Time</div>
                  {Object.entries(analytics.byDay).sort((a,b)=>a[0].localeCompare(b[0])).slice(-range).map(([d,v])=>{
                    const maxM = Math.max(...Object.values(analytics.byDay).map(x=>x.totalMins),1);
                    const pct  = v.totalMins/maxM*100;
                    const ppct = v.totalMins>0?v.prodMins/v.totalMins*100:0;
                    return (
                      <div key={d} className="adb-row">
                        <span className="adb-date">{format(parseISO(d),'MMM d')}</span>
                        <div className="adb-track">
                          <div className="adb-fill-total" style={{width:`${pct}%`}}/>
                          <div className="adb-fill-prod"  style={{width:`${pct*ppct/100}%`}}/>
                        </div>
                        <span className="adb-dur">{fmtDur(v.totalMins)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Hourly heatmap */}
            <div className="an-card an-card-full">
              <div className="an-card-title">Peak Activity Hours</div>
              <HourlyHeatmap hourly={analytics?.hourly||new Array(24).fill(0)}/>
              <div className="hh-hint">Activities logged per hour of the day</div>
            </div>

            {/* Top locations */}
            {analytics?.topLocations?.length > 0 && (
              <div className="an-card">
                <div className="an-card-title">Top Locations</div>
                {analytics.topLocations.map((l,i)=>(
                  <div key={l.loc} className="loc-row">
                    <span className="loc-rank" style={{color:i===0?'var(--gold)':i===1?'var(--text-2)':'var(--text-3)'}}>#{i+1}</span>
                    <span className="loc-name">📍 {l.loc}</span>
                    <span className="loc-cnt">{l.cnt}×</span>
                  </div>
                ))}
              </div>
            )}

            {/* Mood distribution */}
            {analytics?.moodDist && Object.keys(analytics.moodDist).length>0 && (
              <div className="an-card">
                <div className="an-card-title">Mood While Working</div>
                {MOODS.map(m=>{
                  const cnt = analytics.moodDist[m.value]||0;
                  const tot = Object.values(analytics.moodDist).reduce((s,v)=>s+v,0);
                  const pct = tot>0?cnt/tot*100:0;
                  return (
                    <div key={m.value} className="mood-an-row">
                      <span>{m.emoji}</span>
                      <span className="mood-an-lab">{m.value}</span>
                      <div className="mood-an-track">
                        <div style={{width:`${pct}%`,height:'100%',background:m.color,borderRadius:3,transition:'width 0.5s'}}/>
                      </div>
                      <span className="mood-an-cnt">{cnt}</span>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>
      )}
      </>
      )}

      {showForm && (
        <ActivityForm
          activity={editAct}
          defaultDate={viewDate}
          defaultStart={defaultStart}
          onSave={afterSave}
          onCancel={()=>{setShowForm(false);setEditAct(null);setDefaultStart('');}}
        />
      )}
    </div>
  );
}
