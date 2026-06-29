import React, { useState, useEffect, useCallback } from 'react';
import { format, subDays, parseISO, differenceInDays } from 'date-fns';
import { healthApi } from '../utils/api.js';
import './Health.css';

// ─── Constants ─────────────────────────────────────────────────────────────
const MOODS = [
  { value:'terrible', emoji:'😞', color:'#e8637a' },
  { value:'bad',      emoji:'😕', color:'#fb923c' },
  { value:'okay',     emoji:'😐', color:'#fbbf24' },
  { value:'good',     emoji:'🙂', color:'#4ec9b0' },
  { value:'great',    emoji:'😄', color:'#34d399' },
];
const SLEEP_Q = [
  { value:'poor',  label:'Poor',  color:'#e8637a' },
  { value:'fair',  label:'Fair',  color:'#fb923c' },
  { value:'good',  label:'Good',  color:'#4ec9b0' },
  { value:'great', label:'Great', color:'#34d399' },
];
const ENERGY = [
  { value:'low',    label:'Low',    color:'#e8637a' },
  { value:'medium', label:'Medium', color:'#fbbf24' },
  { value:'high',   label:'High',   color:'#34d399' },
];

function todayStr() { return format(new Date(), 'yyyy-MM-dd'); }
function calcBmi(w, h) { return (w && h) ? w / Math.pow(h / 100, 2) : null; }
function bmiCat(bmi) {
  if (!bmi) return null;
  if (bmi < 18.5) return { label:'Underweight', color:'#60a5fa' };
  if (bmi < 25)   return { label:'Normal',      color:'#34d399' };
  if (bmi < 30)   return { label:'Overweight',  color:'#fbbf24' };
  return                 { label:'Obese',        color:'#e8637a' };
}

// ─── Weight Line Chart (SVG) ───────────────────────────────────────────────
function WeightChart({ data = [], height: profileHeight }) {
  if (data.length < 2) return (
    <div className="hchart-empty">Log weight on 2+ days to see the trend chart.</div>
  );

  const W = 420, H = 150;
  const vals  = data.map(d => d.value);
  const minV  = Math.min(...vals) - 1;
  const maxV  = Math.max(...vals) + 1;
  const rng   = maxV - minV || 1;
  const toX   = i => (i / (data.length - 1)) * W;
  const toY   = v => H - ((v - minV) / rng) * (H - 24) - 12;
  const pts   = data.map((d, i) => `${toX(i).toFixed(1)},${toY(d.value).toFixed(1)}`).join(' ');
  const area  = `M0,${H} L${data.map((d,i)=>`${toX(i).toFixed(1)},${toY(d.value).toFixed(1)}`).join(' L')} L${W},${H} Z`;
  const diff  = data[data.length-1].value - data[0].value;
  const days  = differenceInDays(parseISO(data[data.length-1].date), parseISO(data[0].date));

  // BMI zone lines
  const bmiLines = profileHeight ? [
    { bmi: 18.5, label: '18.5', color: '#60a5fa' },
    { bmi: 25,   label: '25',   color: '#fbbf24' },
    { bmi: 30,   label: '30',   color: '#e8637a' },
  ].map(b => {
    const kgAtBmi = b.bmi * Math.pow(profileHeight / 100, 2);
    return { ...b, kg: kgAtBmi, y: toY(kgAtBmi) };
  }).filter(b => b.kg > minV && b.kg < maxV) : [];

  return (
    <div className="hchart-wrap">
      <div className="hchart-header">
        <div className="hchart-trend-badge" style={{color: diff <= 0 ? 'var(--teal)' : 'var(--rose)'}}>
          {diff <= 0 ? '▼' : '▲'} {Math.abs(diff).toFixed(1)} kg
          <span className="hchart-trend-days"> over {days}d</span>
        </div>
        <div className="hchart-range-info">
          {data[0].value.toFixed(1)} → {data[data.length-1].value.toFixed(1)} kg
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="hchart-svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--rose)" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="var(--rose)" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {/* BMI zone lines */}
        {bmiLines.map(b => (
          <g key={b.bmi}>
            <line x1="0" y1={b.y} x2={W} y2={b.y}
              stroke={b.color} strokeWidth="0.8" strokeDasharray="4 3" opacity="0.5"/>
            <text x="4" y={b.y - 3} fill={b.color} fontSize="8" opacity="0.7">
              BMI {b.label} ({b.kg.toFixed(0)}kg)
            </text>
          </g>
        ))}
        <path d={area} fill="url(#wg)"/>
        <polyline points={pts} fill="none" stroke="var(--rose)" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"/>
        {/* Dots for each data point */}
        {data.map((d, i) => (
          <circle key={d.date} cx={toX(i)} cy={toY(d.value)} r="3"
            fill="var(--rose)" stroke="var(--surface-2)" strokeWidth="1.5">
            <title>{format(parseISO(d.date), 'MMM d')}: {d.value} kg</title>
          </circle>
        ))}
      </svg>
      <div className="hchart-dates">
        <span>{format(parseISO(data[0].date), 'MMM d')}</span>
        <span>{format(parseISO(data[data.length-1].date), 'MMM d')}</span>
      </div>
    </div>
  );
}

// ─── Mini bar chart ────────────────────────────────────────────────────────
function MiniBarChart({ data = [], color = 'var(--teal)', unit = '', height = 90 }) {
  if (!data.length) return <div className="hchart-empty">No data yet.</div>;
  const slice = data.slice(-14);
  const max   = Math.max(...slice.map(d => d.value), 1);
  return (
    <div className="mini-bar-chart" style={{ height }}>
      {slice.map(d => (
        <div key={d.date} className="mbc-col"
          title={`${format(parseISO(d.date), 'MMM d')}: ${d.value}${unit}`}>
          <div className="mbc-bar" style={{ height: `${(d.value / max) * 88}%`, background: color }}/>
          <div className="mbc-label">{format(parseISO(d.date), 'd')}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Quick Weight Log (minimal form for weight-only) ───────────────────────
function QuickWeightLog({ date, existing, profileHeight, onSaved, onCancel }) {
  const [weight, setWeight] = useState(existing?.weight || '');
  const [busy,   setBusy]   = useState(false);

  const bmi = calcBmi(parseFloat(weight), profileHeight);
  const cat = bmiCat(bmi);

  const save = async () => {
    if (!weight) return;
    setBusy(true);
    try {
      // Merge with existing log to avoid wiping other fields
      const b = { ...(existing || {}), weight: parseFloat(weight) };
      await healthApi.saveLog(date, b);
      onSaved();
    } catch(e) { console.error(e); }
    finally { setBusy(false); }
  };

  return (
    <div className="quick-weight-log">
      <div className="qwl-title">⚖️ Log Weight for {format(parseISO(date), 'EEEE, MMM d')}</div>
      <div className="qwl-row">
        <div className="qwl-input-wrap">
          <input
            type="number" step="0.1" min="0" placeholder="e.g. 70.5"
            value={weight} onChange={e => setWeight(e.target.value)}
            className="qwl-input" autoFocus
          />
          <span className="qwl-unit">kg</span>
        </div>
        {bmi && (
          <div className="qwl-bmi">
            <span className="qwl-bmi-val">{bmi.toFixed(1)}</span>
            <span className="qwl-bmi-label" style={{ color: cat?.color }}>{cat?.label}</span>
          </div>
        )}
      </div>
      <div className="qwl-btns">
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={busy || !weight}>
          {busy ? 'Saving…' : '✓ Save Weight'}
        </button>
      </div>
    </div>
  );
}

// ─── Full Day Log Form ─────────────────────────────────────────────────────
function DayLogForm({ date, existing, profileHeight, onSaved, onCancel }) {
  const s = existing || {};
  const [weight,  setWeight]  = useState(s.weight       || '');
  const [sleep,   setSleep]   = useState(s.sleepHours   || '');
  const [sleepQ,  setSleepQ]  = useState(s.sleepQuality || '');
  const [bed,     setBed]     = useState(s.bedTime      || '');
  const [wake,    setWake]    = useState(s.wakeTime     || '');
  const [workout, setWorkout] = useState(s.workout      || false);
  const [wType,   setWType]   = useState(s.workoutType  || '');
  const [wMins,   setWMins]   = useState(s.workoutMins  || '');
  const [steps,   setSteps]   = useState(s.steps        || '');
  const [water,   setWater]   = useState(s.waterLiters  || '');
  const [mood,    setMood]    = useState(s.mood         || '');
  const [energy,  setEnergy]  = useState(s.energy       || '');
  const [notes,   setNotes]   = useState(s.notes        || '');
  const [busy,    setBusy]    = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const b = {};
      if (weight)  b.weight       = parseFloat(weight);
      if (sleep)   b.sleepHours   = parseFloat(sleep);
      if (sleepQ)  b.sleepQuality = sleepQ;
      if (bed)     b.bedTime      = bed;
      if (wake)    b.wakeTime     = wake;
      b.workout = workout;
      if (wType)   b.workoutType  = wType;
      if (wMins)   b.workoutMins  = parseFloat(wMins);
      if (steps)   b.steps        = parseInt(steps);
      if (water)   b.waterLiters  = parseFloat(water);
      if (mood)    b.mood         = mood;
      if (energy)  b.energy       = energy;
      if (notes)   b.notes        = notes;
      await healthApi.saveLog(date, b);
      onSaved();
    } catch(e) { console.error(e); }
    finally { setBusy(false); }
  };

  const bmi = calcBmi(parseFloat(weight), profileHeight);
  const cat = bmiCat(bmi);

  return (
    <div className="daylog-form">

      {/* Weight — always first, always prominent */}
      <div className="dlf-sec dlf-sec-weight">
        <div className="dlf-sec-title">⚖️ Weight</div>
        <div className="dlf-weight-row">
          <div className="form-group">
            <label>Weight (kg)</label>
            <input type="number" step="0.1" min="0" placeholder="70.5"
              value={weight} onChange={e => setWeight(e.target.value)}/>
          </div>
          {profileHeight && (
            <div className="form-group">
              <label>Height</label>
              <div className="dlf-height-display">{profileHeight} cm</div>
            </div>
          )}
          {bmi && (
            <div className="form-group">
              <label>BMI</label>
              <div className="dlf-bmi-display">
                <span className="dlf-bmi-val">{bmi.toFixed(1)}</span>
                <span className="dlf-bmi-cat" style={{ color: cat?.color }}>{cat?.label}</span>
              </div>
            </div>
          )}
        </div>
        {!profileHeight && (
          <div className="dlf-height-hint">
            💡 Set your height in Profile settings to auto-calculate BMI
          </div>
        )}
      </div>

      {/* Sleep */}
      <div className="dlf-sec">
        <div className="dlf-sec-title">😴 Sleep</div>
        <div className="dlf-g4">
          <div className="form-group">
            <label>Hours slept</label>
            <input type="number" step="0.5" min="0" max="24" placeholder="7.5"
              value={sleep} onChange={e => setSleep(e.target.value)}/>
          </div>
          <div className="form-group">
            <label>Bed time</label>
            <input type="time" value={bed} onChange={e => setBed(e.target.value)}/>
          </div>
          <div className="form-group">
            <label>Wake time</label>
            <input type="time" value={wake} onChange={e => setWake(e.target.value)}/>
          </div>
        </div>
        <div className="form-group" style={{ marginTop: 6 }}>
          <label>Sleep quality</label>
          <div className="chip-row">
            {SLEEP_Q.map(q => (
              <button key={q.value} className={`chip ${sleepQ === q.value ? 'active' : ''}`}
                style={sleepQ === q.value ? { borderColor: q.color, background: `${q.color}15`, color: q.color } : {}}
                onClick={() => setSleepQ(v => v === q.value ? '' : q.value)}>{q.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Activity */}
      <div className="dlf-sec">
        <div className="dlf-sec-title">🏃 Activity</div>
        <button className={`workout-toggle ${workout ? 'on' : ''}`} onClick={() => setWorkout(v => !v)}>
          <span className="wt-dot">{workout ? '●' : '○'}</span>
          {workout ? 'Worked out ✓' : 'No workout'}
        </button>
        {workout && (
          <div className="dlf-g3" style={{ marginTop: 10 }}>
            <div className="form-group">
              <label>Type</label>
              <input placeholder="Running, Gym, Yoga…" value={wType} onChange={e => setWType(e.target.value)}/>
            </div>
            <div className="form-group">
              <label>Duration (mins)</label>
              <input type="number" min="0" placeholder="45" value={wMins} onChange={e => setWMins(e.target.value)}/>
            </div>
          </div>
        )}
        <div className="form-group" style={{ maxWidth: 180, marginTop: 10 }}>
          <label>Steps</label>
          <input type="number" min="0" placeholder="8000" value={steps} onChange={e => setSteps(e.target.value)}/>
        </div>
      </div>

      {/* Water */}
      <div className="dlf-sec">
        <div className="dlf-sec-title">💧 Water</div>
        <div className="form-group" style={{ maxWidth: 180 }}>
          <label>Litres</label>
          <input type="number" step="0.25" min="0" max="10" placeholder="2.0"
            value={water} onChange={e => setWater(e.target.value)}/>
        </div>
        <div className="water-quick">
          {[0.5, 1, 1.5, 2, 2.5, 3].map(v => (
            <button key={v} className={`water-chip ${parseFloat(water) >= v ? 'lit' : ''}`}
              onClick={() => setWater(v.toString())}>💧{v}L</button>
          ))}
        </div>
      </div>

      {/* Wellbeing */}
      <div className="dlf-sec">
        <div className="dlf-sec-title">✨ Wellbeing</div>
        <div className="form-group">
          <label>Mood</label>
          <div className="mood-picker">
            {MOODS.map(m => (
              <button key={m.value} className={`mood-btn ${mood === m.value ? 'active' : ''}`}
                style={mood === m.value ? { borderColor: m.color, background: `${m.color}18` } : {}}
                title={m.value}
                onClick={() => setMood(v => v === m.value ? '' : m.value)}>
                {m.emoji}
              </button>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label>Energy</label>
          <div className="chip-row">
            {ENERGY.map(e => (
              <button key={e.value} className={`chip ${energy === e.value ? 'active' : ''}`}
                style={energy === e.value ? { borderColor: e.color, background: `${e.color}15`, color: e.color } : {}}
                onClick={() => setEnergy(v => v === e.value ? '' : e.value)}>{e.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="dlf-sec">
        <div className="form-group">
          <label>Notes</label>
          <input placeholder="How are you feeling today?" value={notes} onChange={e => setNotes(e.target.value)}/>
        </div>
      </div>

      <div className="dlf-footer">
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>
          {busy ? 'Saving…' : '✓ Save Log'}
        </button>
      </div>
    </div>
  );
}

// ─── Weight Stats Cards ────────────────────────────────────────────────────
function WeightStats({ analytics, profile, range }) {
  const profileHeight = profile?.height;
  const latestW = analytics?.latestWeight;
  const bmi = calcBmi(latestW, profileHeight);
  const cat = bmiCat(bmi);

  // Ideal weight range from BMI 18.5–25
  const idealLow  = profileHeight ? (18.5 * Math.pow(profileHeight / 100, 2)).toFixed(1) : null;
  const idealHigh = profileHeight ? (25   * Math.pow(profileHeight / 100, 2)).toFixed(1) : null;

  return (
    <div className="w-stat-row">
      {[
        {
          lab: 'Current Weight',
          val: latestW ? `${latestW} kg` : '—',
          col: 'var(--rose)',
        },
        {
          lab: 'BMI',
          val: bmi ? bmi.toFixed(1) : '—',
          col: cat?.color || 'var(--text-1)',
          sub: cat?.label,
        },
        {
          lab: `Change (${range}d)`,
          val: analytics?.weightChange != null
            ? `${analytics.weightChange > 0 ? '+' : ''}${analytics.weightChange.toFixed(1)} kg`
            : '—',
          col: analytics?.weightChange < 0 ? 'var(--teal)'
             : analytics?.weightChange > 0 ? 'var(--rose)'
             : 'var(--text-2)',
        },
        {
          lab: 'Ideal Range',
          val: idealLow ? `${idealLow}–${idealHigh} kg` : '—',
          col: 'var(--teal)',
          sub: profileHeight ? `for ${profileHeight} cm` : 'Set height in profile',
        },
      ].map(s => (
        <div key={s.lab} className="wsc">
          <div className="wsc-lab">{s.lab}</div>
          <div className="wsc-val" style={{ color: s.col }}>{s.val}</div>
          {s.sub && <div className="wsc-sub" style={{ color: s.col }}>{s.sub}</div>}
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════
export default function Health() {
  const [tab,        setTab]        = useState('weight');
  const [viewDate,   setViewDate]   = useState(todayStr());
  const [dayLog,     setDayLog]     = useState(null);
  const [analytics,  setAnalytics]  = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [profile,    setProfile]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [editMode,   setEditMode]   = useState(false);
  const [quickLog,   setQuickLog]   = useState(false);   // weight-only quick add
  const [range,      setRange]      = useState(30);

  const rangeFrom = format(subDays(new Date(), range), 'yyyy-MM-dd');
  const profileHeight = profile?.height || null;

  const loadDay = useCallback(async () => {
    try { setDayLog((await healthApi.getLog(viewDate)).data); }
    catch(e) { setDayLog(null); }
  }, [viewDate]);

  const loadAnalytics = useCallback(async () => {
    try {
      const [anR, logR, profR] = await Promise.all([
        healthApi.getAnalytics({ from: rangeFrom, to: todayStr() }),
        healthApi.getLogs({ from: rangeFrom, to: todayStr() }),
        healthApi.getProfile(),
      ]);
      setAnalytics(anR.data);
      setRecentLogs(logR.data);
      setProfile(profR.data);
    } catch(e) {}
  }, [rangeFrom]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadDay(), loadAnalytics()]).finally(() => setLoading(false));
  }, [loadDay, loadAnalytics]);

  const afterSave = () => {
    setEditMode(false);
    setQuickLog(false);
    loadDay();
    loadAnalytics();
  };

  const isToday = viewDate === todayStr();

  // ─── Weight tab: all logs with weight, sorted desc ─────────────────────
  const weightLogs = recentLogs
    .filter(l => l.weight)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="health-page">

      <div className="health-header">
        <div>
          <h1>Health</h1>
          <p>Weight · Sleep · Activity · Wellbeing</p>
        </div>
        {/* Quick weight log button always visible */}
        {!editMode && !quickLog && (
          <div className="health-header-btns">
            <button className="btn btn-ghost" onClick={() => { setQuickLog(true); setEditMode(false); }}>
              ⚖️ Log Weight
            </button>
            {tab === 'log' && (
              <button className="btn btn-primary" onClick={() => { setEditMode(true); setQuickLog(false); }}>
                {dayLog ? '✏ Edit Log' : '+ Full Log'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Quick weight log — floats above tabs */}
      {quickLog && (
        <QuickWeightLog
          date={viewDate}
          existing={dayLog}
          profileHeight={profileHeight}
          onSaved={afterSave}
          onCancel={() => setQuickLog(false)}
        />
      )}

      <div className="health-tabs">
        {[
          { key: 'weight',    label: '⚖️ Weight' },
          { key: 'log',       label: '📋 Daily Log' },
          { key: 'analytics', label: '📊 Analytics' },
        ].map(t => (
          <button key={t.key} className={`health-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => { setTab(t.key); setEditMode(false); setQuickLog(false); }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <div className="health-loading"><div className="spinner"/></div> : (
      <>

      {/* ══ WEIGHT TAB ══════════════════════════════════════════════════ */}
      {tab === 'weight' && (
        <div className="health-weight">

          <WeightStats analytics={analytics} profile={profile} range={range} />

          <div className="range-row">
            {[7, 14, 30, 60, 90].map(d => (
              <button key={d} className={`rng-btn ${range === d ? 'active' : ''}`}
                onClick={() => setRange(d)}>{d}d</button>
            ))}
          </div>

          <div className="health-card">
            <div className="hcard-title">Weight Trend</div>
            <WeightChart data={analytics?.weightData || []} height={profileHeight} />
          </div>

          {/* Weight log table */}
          <div className="health-card" style={{ marginTop: 12 }}>
            <div className="hcard-title-row">
              <span className="hcard-title">Weight History</span>
              {/* Log for any past date */}
              <div className="wlog-date-nav">
                <input type="date" max={todayStr()} value={viewDate}
                  onChange={e => setViewDate(e.target.value)}
                  className="wlog-date-pick"/>
                <button className="btn btn-primary btn-sm"
                  onClick={() => setQuickLog(true)}>
                  + Log
                </button>
              </div>
            </div>
            <div className="wlog">
              <div className="wlog-hdr">
                <span>Date</span><span>Weight</span><span>BMI</span><span>Change</span>
              </div>
              {weightLogs.length === 0 && (
                <div className="health-empty-sm">No weight data yet. Use "⚖️ Log Weight" to start.</div>
              )}
              {weightLogs.map((log, i) => {
                // Find previous weight entry (next in sorted-desc array)
                const prev = weightLogs[i + 1];
                const diff = prev?.weight != null ? log.weight - prev.weight : null;
                const b    = calcBmi(log.weight, log.height || profileHeight);
                const bc   = bmiCat(b);
                const daysSince = prev ? differenceInDays(parseISO(log.date), parseISO(prev.date)) : null;
                return (
                  <div key={log.date} className="wlog-row"
                    onClick={() => { setViewDate(log.date); setTab('log'); }}
                    style={{ cursor: 'pointer' }}
                    title="View full day log">
                    <span>
                      {format(parseISO(log.date), 'MMM d, yyyy')}
                      {log.date === todayStr() && <span className="wlog-today-tag">today</span>}
                      {daysSince && daysSince > 1 && (
                        <span className="wlog-gap-tag">+{daysSince}d gap</span>
                      )}
                    </span>
                    <span style={{ color: 'var(--rose)', fontWeight: 700 }}>{log.weight} kg</span>
                    <span style={{ color: bc?.color }}>{b ? b.toFixed(1) : '—'}</span>
                    <span style={{ color: diff == null ? 'var(--text-3)' : diff < 0 ? 'var(--teal)' : 'var(--rose)' }}>
                      {diff == null ? '—' : `${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weight velocity — avg loss/gain per week */}
          {weightLogs.length >= 2 && (() => {
            const first = weightLogs[weightLogs.length - 1];
            const last  = weightLogs[0];
            const totalDiff = last.weight - first.weight;
            const totalDays = differenceInDays(parseISO(last.date), parseISO(first.date));
            const perWeek = totalDays > 0 ? (totalDiff / totalDays) * 7 : 0;
            return (
              <div className="health-card wv-card" style={{ marginTop: 12 }}>
                <div className="hcard-title">Rate of Change</div>
                <div className="wv-row">
                  <div className="wv-stat">
                    <div className="wv-val" style={{ color: perWeek <= 0 ? 'var(--teal)' : 'var(--rose)' }}>
                      {perWeek > 0 ? '+' : ''}{perWeek.toFixed(2)} kg/week
                    </div>
                    <div className="wv-lab">Average weekly change</div>
                  </div>
                  <div className="wv-stat">
                    <div className="wv-val">{weightLogs.length} entries</div>
                    <div className="wv-lab">Total logged days</div>
                  </div>
                  <div className="wv-stat">
                    <div className="wv-val">{totalDays} days</div>
                    <div className="wv-lab">Tracking span</div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ══ DAILY LOG TAB ═══════════════════════════════════════════════ */}
      {tab === 'log' && (
        <div className="health-today">
          {/* Date nav */}
          <div className="day-nav">
            <button className="dn-btn"
              onClick={() => setViewDate(d => format(subDays(parseISO(d), 1), 'yyyy-MM-dd'))}>‹</button>
            <div className="dn-mid">
              <span className="dn-label">{format(parseISO(viewDate), 'EEEE, MMMM d')}</span>
              {!isToday && (
                <button className="btn btn-ghost btn-xs" onClick={() => setViewDate(todayStr())}>Today</button>
              )}
            </div>
            <button className="dn-btn" disabled={isToday}
              onClick={() => setViewDate(d => {
                const n = format(subDays(parseISO(d), -1), 'yyyy-MM-dd');
                return n <= todayStr() ? n : d;
              })}>›</button>
          </div>

          {editMode ? (
            <DayLogForm
              date={viewDate}
              existing={dayLog}
              profileHeight={profileHeight}
              onSaved={afterSave}
              onCancel={() => setEditMode(false)}
            />
          ) : dayLog ? (
            <div className="day-view">
              <div className="dv-stats">
                {[
                  dayLog.weight      && { icon: '⚖️', lab: 'Weight',  val: `${dayLog.weight} kg`,                  col: 'var(--rose)' },
                  dayLog.sleepHours  && { icon: '😴', lab: 'Sleep',   val: `${dayLog.sleepHours} hrs`,              col: 'var(--violet)' },
                  dayLog.waterLiters && { icon: '💧', lab: 'Water',   val: `${dayLog.waterLiters} L`,               col: 'var(--blue)' },
                  dayLog.workout     && { icon: '🏃', lab: 'Workout', val: dayLog.workoutType || 'Active',          col: 'var(--teal)' },
                  dayLog.steps       && { icon: '👣', lab: 'Steps',   val: Number(dayLog.steps).toLocaleString(),   col: 'var(--gold)' },
                ].filter(Boolean).map((s, i) => (
                  <div key={i} className="dv-stat">
                    <span className="dv-si">{s.icon}</span>
                    <div>
                      <div className="dv-sv" style={{ color: s.col }}>{s.val}</div>
                      <div className="dv-sl">{s.lab}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* BMI display if weight logged */}
              {dayLog.weight && profileHeight && (() => {
                const b = calcBmi(dayLog.weight, profileHeight);
                const bc = bmiCat(b);
                return (
                  <div className="dv-bmi-row">
                    <span>BMI:</span>
                    <strong style={{ color: bc?.color }}>{b.toFixed(1)}</strong>
                    <span className="dv-bmi-cat" style={{ color: bc?.color }}>{bc?.label}</span>
                  </div>
                );
              })()}

              {(dayLog.mood || dayLog.energy || dayLog.sleepQuality) && (
                <div className="dv-badges">
                  {dayLog.mood && <span className="dv-badge">{MOODS.find(m => m.value === dayLog.mood)?.emoji} {dayLog.mood}</span>}
                  {dayLog.energy && <span className="dv-badge" style={{ color: ENERGY.find(e => e.value === dayLog.energy)?.color }}>⚡ {dayLog.energy}</span>}
                  {dayLog.sleepQuality && <span className="dv-badge">🌙 {dayLog.sleepQuality} sleep</span>}
                </div>
              )}

              {dayLog.notes && <div className="dv-notes">{dayLog.notes}</div>}

              <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }}
                onClick={() => setEditMode(true)}>✏ Edit Log</button>
            </div>
          ) : (
            <div className="no-log">
              <div className="no-log-icon">♡</div>
              <h3>No log for {isToday ? 'today' : format(parseISO(viewDate), 'MMMM d')}</h3>
              <p>{isToday ? 'Start tracking your health today.' : 'No data for this day.'}</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'center' }}>
                <button className="btn btn-ghost" onClick={() => setQuickLog(true)}>⚖️ Log Weight Only</button>
                <button className="btn btn-primary" onClick={() => setEditMode(true)}>+ Full Log</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ ANALYTICS TAB ═══════════════════════════════════════════════ */}
      {tab === 'analytics' && (
        <div className="health-analytics">
          <div className="range-row" style={{ marginBottom: 16 }}>
            {[7, 14, 30, 60, 90].map(d => (
              <button key={d} className={`rng-btn ${range === d ? 'active' : ''}`}
                onClick={() => setRange(d)}>{d}d</button>
            ))}
          </div>

          <div className="an-stats">
            {[
              { lab: 'Avg Sleep',    val: analytics?.avgSleep    ? `${analytics.avgSleep.toFixed(1)} hrs` : '—', col: 'var(--violet)' },
              { lab: 'Avg Water',    val: analytics?.avgWater    ? `${analytics.avgWater.toFixed(1)} L`   : '—', col: 'var(--blue)' },
              { lab: 'Workout Days', val: `${analytics?.workoutDays || 0} / ${analytics?.totalDays || 0}`,        col: 'var(--teal)' },
              { lab: 'Weight Entries', val: weightLogs.length.toString(),                                         col: 'var(--rose)' },
            ].map(s => (
              <div key={s.lab} className="an-stat">
                <div className="an-sv" style={{ color: s.col }}>{s.val}</div>
                <div className="an-sl">{s.lab}</div>
              </div>
            ))}
          </div>

          <div className="an-grid">
            <div className="health-card" style={{ gridColumn: '1 / -1' }}>
              <div className="hcard-title">Weight Trend</div>
              <WeightChart data={analytics?.weightData || []} height={profileHeight} />
            </div>
            <div className="health-card">
              <div className="hcard-title">Sleep Hours</div>
              <MiniBarChart data={analytics?.sleepData || []} color="var(--violet)" unit=" hrs" height={90}/>
              <div className="hchart-avg">Avg {analytics?.avgSleep?.toFixed(1) || '—'} hrs</div>
            </div>
            <div className="health-card">
              <div className="hcard-title">Water Intake</div>
              <MiniBarChart data={analytics?.waterData || []} color="var(--blue)" unit=" L" height={90}/>
              <div className="hchart-avg">Avg {analytics?.avgWater?.toFixed(1) || '—'} L</div>
            </div>

            {analytics?.moodDist && Object.keys(analytics.moodDist).length > 0 && (
              <div className="health-card">
                <div className="hcard-title">Mood Distribution</div>
                <div className="mood-dist">
                  {MOODS.map(m => {
                    const cnt = analytics.moodDist[m.value] || 0;
                    const tot = Object.values(analytics.moodDist).reduce((s, v) => s + v, 0);
                    const pct = tot > 0 ? cnt / tot * 100 : 0;
                    return (
                      <div key={m.value} className="md-row">
                        <span>{m.emoji}</span>
                        <span className="md-lab">{m.value}</span>
                        <div className="md-track">
                          <div style={{ width: `${pct}%`, background: m.color, height: '100%', borderRadius: 3 }}/>
                        </div>
                        <span className="md-cnt">{cnt}d</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="health-card">
              <div className="hcard-title">Workout Activity</div>
              <div className="wo-heatmap">
                {recentLogs.slice(0, range).reverse().map(log => (
                  <div key={log.date}
                    className={`wo-dot ${log.workout ? 'on' : ''}`}
                    title={`${format(parseISO(log.date), 'MMM d')}${log.workout ? ' · ' + (log.workoutType || 'Workout') : ''}`}/>
                ))}
              </div>
              <div className="wo-stat">
                {analytics?.workoutDays || 0} active out of {analytics?.totalDays || 0} logged days
                {analytics?.totalDays > 0 && (
                  <span style={{ color: 'var(--teal)', marginLeft: 8 }}>
                    ({Math.round((analytics.workoutDays / analytics.totalDays) * 100)}%)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      </>)}
    </div>
  );
}