import React, { useState, useEffect, useCallback, useRef } from 'react';
import { format, addDays, subDays, startOfMonth, endOfMonth, eachDayOfInterval,
         isSameDay, isToday, parseISO, isBefore, startOfWeek, addMonths, subMonths,
         getDay, differenceInMinutes, parse } from 'date-fns';
import { plansApi } from '../utils/api.js';
import './Plans.css';

// ── Constants ──────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value:'work',     label:'Work',     emoji:'💼', color:'#60a5fa' },
  { value:'personal', label:'Personal', emoji:'🌿', color:'#4ec9b0' },
  { value:'health',   label:'Health',   emoji:'❤️', color:'#e8637a' },
  { value:'social',   label:'Social',   emoji:'👥', color:'#f472b6' },
  { value:'learning', label:'Learning', emoji:'📚', color:'#a78bfa' },
  { value:'errand',   label:'Errand',   emoji:'🛒', color:'#fb923c' },
  { value:'creative', label:'Creative', emoji:'🎨', color:'#fbbf24' },
  { value:'finance',  label:'Finance',  emoji:'💰', color:'#34d399' },
  { value:'other',    label:'Other',    emoji:'◦',  color:'#9ca3af' },
];
const PRIORITIES = [
  { value:'low',      label:'Low',      color:'#6b7280', dot:'○' },
  { value:'medium',   label:'Medium',   color:'#60a5fa', dot:'◉' },
  { value:'high',     label:'High',     color:'#fb923c', dot:'◉' },
  { value:'critical', label:'Critical', color:'#e8637a', dot:'⬤' },
];
const STATUSES = [
  { value:'pending',     label:'Pending',     icon:'○', color:'#9ca3af' },
  { value:'in-progress', label:'In Progress', icon:'◑', color:'#60a5fa' },
  { value:'done',        label:'Done',        icon:'✓', color:'#4ec9b0' },
  { value:'skipped',     label:'Skipped',     icon:'⊘', color:'#6b7280' },
  { value:'rescheduled', label:'Rescheduled', icon:'↻', color:'#a78bfa' },
];

const CAT  = Object.fromEntries(CATEGORIES.map(c=>[c.value,c]));
const PRI  = Object.fromEntries(PRIORITIES.map(p=>[p.value,p]));
const STAT = Object.fromEntries(STATUSES.map(s=>[s.value,s]));

function toFmtDate(d) { return format(d, 'yyyy-MM-dd'); }
function parseTime(t) {
  if (!t) return null;
  const [h,m] = t.split(':').map(Number); return h*60+m;
}
function fmtTime(t) {
  if (!t) return '';
  const [h,m] = t.split(':').map(Number);
  const ampm = h>=12?'PM':'AM'; const hh = h%12||12;
  return `${hh}:${m.toString().padStart(2,'0')} ${ampm}`;
}
function durationLabel(s, e) {
  if (!s||!e) return '';
  const mins = parseTime(e)-parseTime(s); if(mins<=0) return '';
  if(mins<60) return `${mins}m`;
  const h=Math.floor(mins/60); const m=mins%60;
  return m?`${h}h ${m}m`:`${h}h`;
}

// ══════════════════════════════════════════════════════════════════════════
//  PLAN FORM MODAL
// ══════════════════════════════════════════════════════════════════════════
function PlanForm({ plan, defaultDate, defaultStart, onSave, onCancel }) {
  const [title,     setTitle]     = useState(plan?.title     || '');
  const [category,  setCategory]  = useState(plan?.category  || 'personal');
  const [date,      setDate]      = useState(plan?.date      || defaultDate || toFmtDate(new Date()));
  const [startTime, setStartTime] = useState(plan?.startTime || defaultStart || '');
  const [endTime,   setEndTime]   = useState(plan?.endTime   || '');
  const [priority,  setPriority]  = useState(plan?.priority  || 'medium');
  const [status,    setStatus]    = useState(plan?.status    || 'pending');
  const [notes,     setNotes]     = useState(plan?.notes     || '');
  const [isAllDay,  setAllDay]    = useState(plan?.isAllDay  || false);
  const [conflicts, setConflicts] = useState([]);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  // Live conflict check when date/time changes
  useEffect(() => {
    if (!date || !startTime || !endTime || isAllDay) { setConflicts([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await plansApi.checkConflicts({ date, startTime, endTime, excludeId: plan?._id });
        setConflicts(r.data.conflicts || []);
      } catch(e) {}
    }, 400);
    return () => clearTimeout(t);
  }, [date, startTime, endTime, isAllDay, plan?._id]);

  const handleSubmit = async () => {
    if (!title.trim()) { setError('Title is required'); return; }
    if (!date)         { setError('Date is required');  return; }
    if (startTime && endTime && parseTime(startTime) >= parseTime(endTime)) {
      setError('End time must be after start time'); return;
    }
    setSaving(true); setError('');
    try {
      const body = { title, category, date, startTime, endTime, priority, status, notes, isAllDay };
      if (plan) await plansApi.update(plan._id, body);
      else      await plansApi.create(body);
      onSave();
    } catch(e) { setError(e.response?.data?.error || 'Something went wrong'); }
    finally { setSaving(false); }
  };

  const cat = CAT[category];

  return (
    <div className="pform-overlay">
      <div className="pform-modal">
        <div className="pform-header">
          <div className="pform-header-left">
            <span className="pform-icon" style={{color:cat.color}}>{cat.emoji}</span>
            <h2>{plan ? 'Edit Plan' : 'New Plan'}</h2>
          </div>
          <button className="pform-close" onClick={onCancel}>✕</button>
        </div>

        {error && <div className="pform-error">{error}</div>}

        {conflicts.length > 0 && (
          <div className="pform-conflict-warn">
            <span className="pform-conflict-icon">⚠</span>
            <div>
              <div className="pform-conflict-title">Time Conflict Detected</div>
              {conflicts.map(c => (
                <div key={c._id} className="pform-conflict-item">
                  {CAT[c.category]?.emoji} {c.title} · {fmtTime(c.startTime)}–{fmtTime(c.endTime)}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pform-body">
          {/* Title */}
          <div className="form-group">
            <label>Title *</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="What's the plan?" autoFocus/>
          </div>

          {/* Category */}
          <div className="form-group">
            <label>Category</label>
            <div className="cat-grid">
              {CATEGORIES.map(c => (
                <button key={c.value} type="button"
                  className={`cat-btn ${category===c.value?'active':''}`}
                  style={category===c.value?{borderColor:c.color,background:`${c.color}18`,color:c.color}:{}}
                  onClick={()=>setCategory(c.value)}>
                  <span>{c.emoji}</span><span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div className="form-grid-3">
            <div className="form-group">
              <label>Date *</label>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)}/>
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select value={priority} onChange={e=>setPriority(e.target.value)} className="pform-select">
                {PRIORITIES.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={status} onChange={e=>setStatus(e.target.value)} className="pform-select">
                {STATUSES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Time */}
          <div className="form-group">
            <div className="pform-allday-row">
              <label>Time</label>
              <label className="pform-allday-toggle">
                <input type="checkbox" checked={isAllDay} onChange={e=>setAllDay(e.target.checked)}/>
                <span>All day</span>
              </label>
            </div>
            {!isAllDay && (
              <div className="time-grid">
                <div>
                  <div className="time-label">Start</div>
                  <input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)} className="time-input"/>
                </div>
                <div className="time-arrow">→</div>
                <div>
                  <div className="time-label">End</div>
                  <input type="time" value={endTime} onChange={e=>setEndTime(e.target.value)} className="time-input"/>
                </div>
                {startTime && endTime && parseTime(startTime)<parseTime(endTime) && (
                  <div className="time-duration">{durationLabel(startTime,endTime)}</div>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="form-group">
            <label>Notes</label>
            <textarea className="pform-textarea" value={notes} onChange={e=>setNotes(e.target.value)}
              placeholder="Additional notes…" rows={3}/>
          </div>
        </div>

        <div className="pform-footer">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : plan ? '✓ Update Plan' : '✓ Create Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  RESCHEDULE MODAL
// ══════════════════════════════════════════════════════════════════════════
function RescheduleModal({ plan, onSave, onCancel }) {
  const [newDate,   setNewDate]   = useState(plan.date);
  const [startTime, setStartTime] = useState(plan.startTime || '');
  const [endTime,   setEndTime]   = useState(plan.endTime   || '');
  const [conflicts, setConflicts] = useState([]);
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    if (!newDate || !startTime || !endTime) { setConflicts([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await plansApi.checkConflicts({ date:newDate, startTime, endTime, excludeId:plan._id });
        setConflicts(r.data.conflicts||[]);
      } catch(e) {}
    }, 300);
    return ()=>clearTimeout(t);
  }, [newDate, startTime, endTime, plan._id]);

  const handleSave = async () => {
    setSaving(true);
    try { await plansApi.reschedule(plan._id, { newDate, startTime, endTime }); onSave(); }
    catch(e) {} finally { setSaving(false); }
  };

  return (
    <div className="pform-overlay">
      <div className="pform-modal" style={{maxWidth:420}}>
        <div className="pform-header">
          <div className="pform-header-left">
            <span className="pform-icon">↻</span>
            <h2>Reschedule</h2>
          </div>
          <button className="pform-close" onClick={onCancel}>✕</button>
        </div>

        <div className="pform-body">
          <div className="reschedule-plan-preview">
            <span style={{color:CAT[plan.category]?.color}}>{CAT[plan.category]?.emoji}</span>
            <strong>{plan.title}</strong>
            <span className="rsp-from">from {plan.rescheduledFrom||plan.date}</span>
          </div>

          {conflicts.length>0 && (
            <div className="pform-conflict-warn">
              <span className="pform-conflict-icon">⚠</span>
              <div>
                <div className="pform-conflict-title">Time Conflict</div>
                {conflicts.map(c=><div key={c._id} className="pform-conflict-item">{CAT[c.category]?.emoji} {c.title}</div>)}
              </div>
            </div>
          )}

          <div className="form-group"><label>New Date</label><input type="date" value={newDate} onChange={e=>setNewDate(e.target.value)}/></div>
          <div className="time-grid">
            <div><div className="time-label">Start</div><input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)} className="time-input"/></div>
            <div className="time-arrow">→</div>
            <div><div className="time-label">End</div><input type="time" value={endTime} onChange={e=>setEndTime(e.target.value)} className="time-input"/></div>
          </div>
        </div>

        <div className="pform-footer">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : '↻ Reschedule'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  PLAN ITEM (used in daily + list views)
// ══════════════════════════════════════════════════════════════════════════
function PlanItem({ plan, onEdit, onDelete, onStatusChange, onReschedule, compact=false }) {
  const [menuOpen, setMenuOpen]   = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const cat  = CAT[plan.category]  || CAT.other;
  const pri  = PRI[plan.priority]  || PRI.medium;
  const stat = STAT[plan.status]   || STAT.pending;
  const isDone = plan.status === 'done';

  const cycleStatus = async () => {
    const order = ['pending','in-progress','done'];
    const idx = order.indexOf(plan.status);
    const next = order[(idx+1) % order.length];
    await onStatusChange(plan._id, next);
  };

  return (
    <div className={`plan-item ${plan.status} ${compact?'compact':''}`}
      style={{'--cc':cat.color, '--pc':pri.color}}>

      {/* Left: status toggle */}
      <button className="plan-status-btn" onClick={cycleStatus} title={`Status: ${stat.label}`}>
        <span style={{color:stat.color}}>{stat.icon}</span>
      </button>

      {/* Priority bar */}
      <div className="plan-pri-bar" style={{background:pri.color}}/>

      {/* Main content */}
      <div className="plan-main" onClick={()=>onEdit(plan)}>
        <div className="plan-top-row">
          <span className="plan-cat-badge" style={{color:cat.color, background:`${cat.color}18`}}>
            {cat.emoji} {!compact&&cat.label}
          </span>
          {plan.priority==='critical'&&<span className="plan-critical-badge">!</span>}
          {plan.rescheduledFrom && <span className="plan-reschedule-badge">↻</span>}
        </div>
        <div className={`plan-title ${isDone?'done':''}`}>{plan.title}</div>
        <div className="plan-meta-row">
          {plan.isAllDay ? (
            <span className="plan-time">All day</span>
          ) : plan.startTime ? (
            <span className="plan-time">{fmtTime(plan.startTime)}{plan.endTime?` → ${fmtTime(plan.endTime)}`:''} {plan.startTime&&plan.endTime&&<span className="plan-dur">· {durationLabel(plan.startTime,plan.endTime)}</span>}</span>
          ) : null}
          {plan.notes && <span className="plan-has-notes" title={plan.notes}>📝</span>}
        </div>
      </div>

      {/* Actions */}
      <div className="plan-actions" onClick={e=>e.stopPropagation()}>
        {confirmDel ? (
          <>
            <button className="pa-btn pa-confirm" onClick={()=>onDelete(plan._id)}>✓</button>
            <button className="pa-btn" onClick={()=>setConfirmDel(false)}>✕</button>
          </>
        ) : (
          <>
            <button className="pa-btn pa-reschedule" onClick={()=>onReschedule(plan)} title="Reschedule">↻</button>
            <button className="pa-btn pa-del" onClick={()=>setConfirmDel(true)} title="Delete">🗑</button>
          </>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  DAILY VIEW
// ══════════════════════════════════════════════════════════════════════════
const HOURS = Array.from({length:24},(_,i)=>i);

function DailyView({ date, plans, onEdit, onDelete, onStatusChange, onReschedule, onNewAt }) {
  const timelinePlans = plans.filter(p => p.startTime && !p.isAllDay);
  const allDayPlans   = plans.filter(p => p.isAllDay || !p.startTime);
  const nowRef        = useRef(null);

  // Scroll to current time on load
  useEffect(() => {
    if (isToday(parseISO(date)) && nowRef.current) {
      nowRef.current.scrollIntoView({ behavior:'smooth', block:'center' });
    }
  }, [date]);

  const nowH = new Date().getHours();
  const nowM = new Date().getMinutes();

  // Detect conflicts
  const conflictIds = new Set();
  timelinePlans.forEach((a,i) => {
    timelinePlans.slice(i+1).forEach(b => {
      const aS=parseTime(a.startTime), aE=parseTime(a.endTime||a.startTime);
      const bS=parseTime(b.startTime), bE=parseTime(b.endTime||b.startTime);
      if (aS<bE && aE>bS) { conflictIds.add(a._id); conflictIds.add(b._id); }
    });
  });

  // Position plans on timeline (px per minute = 1.2)
  const PX_MIN = 1.2;
  const HOUR_H = PX_MIN * 60; // 72px per hour

  function planStyle(plan) {
    const start = parseTime(plan.startTime) || 0;
    const end   = parseTime(plan.endTime)   || start + 60;
    const top   = start * PX_MIN;
    const height= Math.max((end - start) * PX_MIN, 28);
    return { top, height };
  }

  // Group overlapping plans into columns
  function layoutPlans(plans) {
    const sorted = [...plans].sort((a,b)=>parseTime(a.startTime)-parseTime(b.startTime));
    const columns = [];
    sorted.forEach(plan => {
      const pS=parseTime(plan.startTime), pE=parseTime(plan.endTime||plan.startTime)+1;
      let col = columns.findIndex(c => {
        const last = c[c.length-1];
        return parseTime(last.endTime||last.startTime) <= pS;
      });
      if (col===-1) { columns.push([plan]); col=columns.length-1; }
      else columns[col].push(plan);
    });
    const result = [];
    columns.forEach((col, ci) => {
      col.forEach(plan => {
        result.push({ plan, col:ci, totalCols:columns.length });
      });
    });
    return result;
  }

  const laid = layoutPlans(timelinePlans);

  return (
    <div className="daily-view">
      {/* All-day strip */}
      {allDayPlans.length > 0 && (
        <div className="daily-allday">
          <div className="daily-allday-label">All day</div>
          <div className="daily-allday-items">
            {allDayPlans.map(p => (
              <PlanItem key={p._id} plan={p} onEdit={onEdit} onDelete={onDelete}
                onStatusChange={onStatusChange} onReschedule={onReschedule} compact/>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="daily-timeline">
        {/* Hour slots */}
        <div className="daily-hours">
          {HOURS.map(h => (
            <div key={h} className="daily-hour" style={{height:HOUR_H}}>
              <span className="hour-label">{h===0?'12 AM':h<12?`${h} AM`:h===12?'12 PM':`${h-12} PM`}</span>
              <div className="hour-line"/>
            </div>
          ))}
        </div>

        {/* Click to add */}
        <div className="daily-click-zone" onClick={e => {
          const rect = e.currentTarget.getBoundingClientRect();
          const y    = e.clientY - rect.top;
          const mins = Math.round(y / PX_MIN / 15) * 15;
          const h    = Math.floor(mins/60).toString().padStart(2,'0');
          const m    = (mins%60).toString().padStart(2,'0');
          onNewAt(`${h}:${m}`);
        }}/>

        {/* Current time indicator */}
        {isToday(parseISO(date)) && (
          <div ref={nowRef} className="now-line" style={{top:(nowH*60+nowM)*PX_MIN}}>
            <div className="now-dot"/><div className="now-rule"/>
          </div>
        )}

        {/* Planned events */}
        <div className="daily-events">
          {laid.map(({plan, col, totalCols}) => {
            const {top,height} = planStyle(plan);
            const cat  = CAT[plan.category]||CAT.other;
            const stat = STAT[plan.status]||STAT.pending;
            const isConflict = conflictIds.has(plan._id);
            const width = `calc(${100/totalCols}% - 4px)`;
            const left  = `calc(${(col/totalCols)*100}% + 2px)`;
            return (
              <div key={plan._id}
                className={`daily-event ${plan.status} ${isConflict?'conflict':''}`}
                style={{top, height, width, left, '--cc':cat.color, '--pc':PRI[plan.priority]?.color||'#888'}}
                onClick={()=>onEdit(plan)}>
                {isConflict && <div className="event-conflict-stripe"/>}
                <div className="event-inner">
                  <div className="event-title">{plan.title}</div>
                  {height > 40 && <div className="event-time">{fmtTime(plan.startTime)}{plan.endTime?`–${fmtTime(plan.endTime)}`:''}</div>}
                  {height > 60 && plan.notes && <div className="event-notes">{plan.notes.slice(0,60)}</div>}
                </div>
                <div className="event-status-dot" style={{background:stat.color}} title={stat.label}/>
                <button className="event-done-btn" onClick={e=>{e.stopPropagation(); onStatusChange(plan._id, plan.status==='done'?'pending':'done');}}
                  title={plan.status==='done'?'Mark pending':'Mark done'}>
                  {plan.status==='done'?'✓':'○'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  CALENDAR VIEW
// ══════════════════════════════════════════════════════════════════════════
function CalendarView({ plans, currentMonth, onSelectDay, onMonthChange }) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd   = endOfMonth(currentMonth);
  const calStart   = startOfWeek(monthStart, {weekStartsOn:1}); // Monday
  const days       = eachDayOfInterval({ start: calStart, end: addDays(calStart, 41) });

  // Index plans by date
  const byDate = {};
  plans.forEach(p => {
    if (!byDate[p.date]) byDate[p.date] = [];
    byDate[p.date].push(p);
  });

  const WEEKDAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  return (
    <div className="cal-view">
      {/* Month nav */}
      <div className="cal-nav">
        <button className="cal-nav-btn" onClick={()=>onMonthChange(-1)}>‹</button>
        <span className="cal-month-label">{format(currentMonth,'MMMM yyyy')}</span>
        <button className="cal-nav-btn" onClick={()=>onMonthChange(1)}>›</button>
      </div>

      {/* Weekday headers */}
      <div className="cal-grid">
        {WEEKDAYS.map(d => <div key={d} className="cal-weekday">{d}</div>)}

        {days.map(day => {
          const key      = toFmtDate(day);
          const dayPlans = byDate[key] || [];
          const isCurrentMonth = day >= monthStart && day <= monthEnd;
          const todayFlag = isToday(day);
          const doneCount = dayPlans.filter(p=>p.status==='done').length;
          const hasConflict = (() => {
            const tp = dayPlans.filter(p=>p.startTime&&p.endTime&&!p.isAllDay);
            for(let i=0;i<tp.length;i++) for(let j=i+1;j<tp.length;j++) {
              if(parseTime(tp[i].startTime)<parseTime(tp[j].endTime)&&parseTime(tp[i].endTime)>parseTime(tp[j].startTime)) return true;
            } return false;
          })();

          return (
            <div key={key}
              className={`cal-day ${!isCurrentMonth?'other-month':''} ${todayFlag?'today':''}`}
              onClick={()=>onSelectDay(day)}>
              <div className="cal-day-num">
                {todayFlag ? <span className="today-badge">{format(day,'d')}</span> : format(day,'d')}
                {hasConflict && <span className="cal-conflict-dot" title="Time conflict">⚠</span>}
              </div>
              <div className="cal-day-plans">
                {dayPlans.slice(0,3).map(p => {
                  const cat = CAT[p.category]||CAT.other;
                  return (
                    <div key={p._id} className={`cal-plan-pill ${p.status}`}
                      style={{background:`${cat.color}20`, color:cat.color, borderColor:`${cat.color}40`}}>
                      {p.status==='done'&&<span>✓ </span>}{p.title.slice(0,18)}{p.title.length>18?'…':''}
                    </div>
                  );
                })}
                {dayPlans.length>3 && <div className="cal-more">+{dayPlans.length-3} more</div>}
              </div>
              {dayPlans.length>0 && (
                <div className="cal-day-bar">
                  <div className="cal-day-bar-fill" style={{width:`${Math.round(doneCount/dayPlans.length*100)}%`}}/>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  MAIN PLANS PAGE
// ══════════════════════════════════════════════════════════════════════════
export default function Plans() {
  const [viewMode,    setViewMode]    = useState('day');   // 'day' | 'calendar'
  const [activeDate,  setActiveDate]  = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [plans,       setPlans]       = useState([]);
  const [monthPlans,  setMonthPlans]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [editPlan,    setEditPlan]    = useState(null);
  const [reschedulePlan, setReschedulePlan] = useState(null);
  const [defaultStart, setDefaultStart] = useState('');
  const [stats,       setStats]       = useState(null);

  const dateStr = toFmtDate(activeDate);

  // Load plans for active date (day view)
  const loadDay = useCallback(async () => {
    setLoading(true);
    try {
      const r = await plansApi.getAll({ date: dateStr });
      setPlans(r.data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [dateStr]);

  // Load plans for current month (calendar view)
  const loadMonth = useCallback(async () => {
    try {
      const from = toFmtDate(startOfMonth(currentMonth));
      const to   = toFmtDate(endOfMonth(currentMonth));
      const [r, s] = await Promise.all([
        plansApi.getAll({ from, to }),
        plansApi.getStats({ from, to }),
      ]);
      setMonthPlans(r.data);
      setStats(s.data);
    } catch(e) {}
  }, [currentMonth]);

  useEffect(() => { loadDay(); }, [loadDay]);
  useEffect(() => { loadMonth(); }, [loadMonth]);

  const handleSave = () => {
    setShowForm(false); setEditPlan(null); setDefaultStart('');
    loadDay(); loadMonth();
  };

  const handleEdit   = (plan) => { setEditPlan(plan); setShowForm(true); };
  const handleNew    = ()     => { setEditPlan(null); setDefaultStart(''); setShowForm(true); };
  const handleNewAt  = (time) => { setEditPlan(null); setDefaultStart(time); setShowForm(true); };

  const handleDelete = async id => {
    try { await plansApi.delete(id); loadDay(); loadMonth(); } catch(e) {}
  };
  const handleStatus = async (id, status) => {
    try { await plansApi.setStatus(id, status); loadDay(); loadMonth(); } catch(e) {}
  };
  const handleRescheduleSave = () => {
    setReschedulePlan(null); loadDay(); loadMonth();
  };

  const goDay   = d => { setActiveDate(d); setViewMode('day'); };
  const prevDay = () => setActiveDate(d => subDays(d,1));
  const nextDay = () => setActiveDate(d => addDays(d,1));
  const goToday = () => { setActiveDate(new Date()); setCurrentMonth(new Date()); };

  // Day stats
  const donePct  = plans.length ? Math.round(plans.filter(p=>p.status==='done').length/plans.length*100) : 0;
  const conflicts = (() => {
    const tp = plans.filter(p=>p.startTime&&p.endTime&&!p.isAllDay&&p.status!=='done'&&p.status!=='skipped');
    const ids = new Set();
    tp.forEach((a,i)=>tp.slice(i+1).forEach(b=>{
      if(parseTime(a.startTime)<parseTime(b.endTime)&&parseTime(a.endTime)>parseTime(b.startTime)){ids.add(a._id);ids.add(b._id);}
    }));
    return ids.size;
  })();

  return (
    <div className="plans-page">

      {/* ── Header ── */}
      <div className="plans-header">
        <div className="plans-header-left">
          <h1>Plans</h1>
          <p>Task Manager</p>
        </div>
        <div className="plans-header-right">
          <div className="view-toggle-btns">
            <button className={viewMode==='day'?'active':''} onClick={()=>setViewMode('day')}>⊟ Day</button>
            <button className={viewMode==='calendar'?'active':''} onClick={()=>setViewMode('calendar')}>⊞ Calendar</button>
          </div>
          <button className="btn btn-primary" onClick={handleNew}>+ New Plan</button>
        </div>
      </div>

      {/* ── Day navigator ── */}
      <div className="day-nav">
        <button className="day-nav-btn" onClick={prevDay}>‹</button>
        <div className="day-nav-center">
          <div className="day-nav-date">
            {isToday(activeDate) ? 'Today' : format(activeDate,'EEEE')}
            <span className="day-nav-full">{format(activeDate,'MMMM d, yyyy')}</span>
          </div>
          {plans.length > 0 && (
            <div className="day-nav-stats">
              <div className="day-progress-bar">
                <div className="day-progress-fill" style={{width:`${donePct}%`}}/>
              </div>
              <span>{donePct}% done · {plans.length} {plans.length===1?'task':'tasks'}</span>
              {conflicts>0 && <span className="day-conflict-pill">⚠ {conflicts} conflict{conflicts>1?'s':''}</span>}
            </div>
          )}
        </div>
        <div className="day-nav-right">
          {!isToday(activeDate) && <button className="btn btn-ghost btn-sm" onClick={goToday}>Today</button>}
          <button className="day-nav-btn" onClick={nextDay}>›</button>
        </div>
      </div>

      {/* ── Month stats (shown in calendar view) ── */}
      {viewMode==='calendar' && stats && (
        <div className="month-stats-bar">
          <div className="msb-item"><span className="msb-num">{stats.total}</span><span className="msb-label">Total</span></div>
          <div className="msb-divider"/>
          <div className="msb-item"><span className="msb-num" style={{color:'var(--teal)'}}>{stats.done}</span><span className="msb-label">Done</span></div>
          <div className="msb-item"><span className="msb-num" style={{color:'var(--blue)'}}>{stats.inProgress}</span><span className="msb-label">In Progress</span></div>
          <div className="msb-item"><span className="msb-num" style={{color:'var(--text-3)'}}>{stats.pending}</span><span className="msb-label">Pending</span></div>
          <div className="msb-item"><span className="msb-num" style={{color:'var(--text-3)'}}>{stats.skipped}</span><span className="msb-label">Skipped</span></div>
          {stats.total>0 && (
            <div className="msb-item msb-progress">
              <div className="msb-bar"><div className="msb-bar-fill" style={{width:`${Math.round(stats.done/stats.total*100)}%`}}/></div>
              <span>{Math.round(stats.done/stats.total*100)}%</span>
            </div>
          )}
        </div>
      )}

      {/* ── Content ── */}
      <div className="plans-content">
        {viewMode === 'day' ? (
          loading ? (
            <div className="plans-loading"><div className="spinner"/></div>
          ) : (
            <DailyView
              date={dateStr} plans={plans}
              onEdit={handleEdit} onDelete={handleDelete}
              onStatusChange={handleStatus} onReschedule={setReschedulePlan}
              onNewAt={handleNewAt}
            />
          )
        ) : (
          <CalendarView
            plans={monthPlans} currentMonth={currentMonth}
            onSelectDay={goDay}
            onMonthChange={d => setCurrentMonth(m => d>0 ? addMonths(m,1) : subMonths(m,1))}
          />
        )}
      </div>

      {/* ── Modals ── */}
      {showForm && (
        <PlanForm
          plan={editPlan}
          defaultDate={dateStr}
          defaultStart={defaultStart}
          onSave={handleSave}
          onCancel={()=>{setShowForm(false);setEditPlan(null);setDefaultStart('');}}
        />
      )}
      {reschedulePlan && (
        <RescheduleModal
          plan={reschedulePlan}
          onSave={handleRescheduleSave}
          onCancel={()=>setReschedulePlan(null)}
        />
      )}
    </div>
  );
}
