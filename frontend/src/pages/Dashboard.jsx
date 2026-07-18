import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { peopleApi, getImageUrl } from '../utils/api.js';
import { differenceInDays, format, addYears, isBefore } from 'date-fns';
import './Dashboard.css';
import { link } from '../utils/links.js';

const MODULES = [
  { path:'/relationships', icon:'◎', label:'Relationships', color:'var(--rose)',   desc:'People & bonds'     },
  { path:'/notes',         icon:'✦', label:'Notes',         color:'var(--teal)',   desc:'Thoughts & ideas'   },
  { path:'/memories',      icon:'◈', label:'Memories',      color:'var(--violet)', desc:'Precious moments'   },
  { path:'/health',        icon:'♡', label:'Health',        color:'var(--rose)',   desc:'Body & wellness'    },
  { path:'/links',         icon:'🔗', label:'Links',         color:'var(--violet)', desc:'Bookmarks & links'  },
  { path:'/timeline',      icon:'⊞', label:'Timeline',      color:'var(--blue)',   desc:'Life events'        },
];

const REMINDER_DAYS = { love:3, crush:7, attracted:14, impressed:30, friend:14, family:7, colleague:30, acquaintance:90, 'one-time':999 };
const TYPE_COLORS = { love:'#e8637a', crush:'#f472b6', attracted:'#fb923c', impressed:'#fbbf24', friend:'#60a5fa', family:'#4ec9b0', colleague:'#d4a853', acquaintance:'#a78bfa', 'one-time':'#6b7280' };

const STATUS_META = {
  close:       { emoji:'💚', color:'#4ec9b0' },
  good:        { emoji:'🙂', color:'#60a5fa' },
  drifting:    { emoji:'🌊', color:'#fbbf24' },
  distant:     { emoji:'🌫', color:'#9ca3af' },
  'not-talking':{ emoji:'🔇', color:'#e8637a' },
  complicated: { emoji:'🌀', color:'#a78bfa' },
  rekindled:   { emoji:'🔥', color:'#fb923c' },
  'lost-touch':{ emoji:'👻', color:'#6b7280' },
  ended:       { emoji:'🚪', color:'#e8637a'  },
};

function getInitials(n) { return n.split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2); }

function getUpcomingBirthdays(people) {
  const today = new Date();
  const results = [];
  for (const p of people) {
    if (!p.dateOfBirth) continue;
    const dob = new Date(p.dateOfBirth);
    let next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
    if (isBefore(next, today)) next = addYears(next, 1);
    const daysUntil = differenceInDays(next, today);
    if (daysUntil <= 30) {
      results.push({ person: p, daysUntil, nextBirthday: next, turnsAge: today.getFullYear() + (isBefore(next, addYears(today,1)) && next.getFullYear() > today.getFullYear() ? 1 : 0) - dob.getFullYear() });
    }
  }
  return results.sort((a,b) => a.daysUntil - b.daysUntil);
}

export default function Dashboard() {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const hour = new Date().getHours();
  const greeting = hour<5?'Good night':hour<12?'Good morning':hour<17?'Good afternoon':'Good evening';
  const now = new Date();

  useEffect(() => {
    peopleApi.getAll().then(r=>setPeople(r.data)).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  const overdue = people.filter(p => {
    const d = p.lastConversationDate ? differenceInDays(now, new Date(p.lastConversationDate)) : null;
    return d !== null && d > (REMINDER_DAYS[p.relationshipType]||30) && p.relationshipType !== 'one-time';
  });

  const specialOnes = people.filter(p => ['love','crush','attracted','impressed'].includes(p.relationshipType));
  const recentPeople = [...people].filter(p=>p.lastConversationDate)
    .sort((a,b)=>new Date(b.lastConversationDate)-new Date(a.lastConversationDate)).slice(0,5);

  const upcomingBirthdays = getUpcomingBirthdays(people);
  const todayBirthdays    = upcomingBirthdays.filter(b => b.daysUntil === 0);
  const soonBirthdays     = upcomingBirthdays.filter(b => b.daysUntil > 0 && b.daysUntil <= 7);
  const laterBirthdays    = upcomingBirthdays.filter(b => b.daysUntil > 7);

  return (
    <div className="dashboard">
      {/* Hero */}
      <div className="dash-hero">
        <div className="dash-hero-text">
          <p className="dash-date">{format(now,'EEEE, MMMM d · yyyy')}</p>
          <h1>{greeting}<span className="dash-dot">.</span></h1>
          <p className="dash-sub">Here's what's happening in your life.</p>
        </div>
        <div className="dash-hero-orb"/>
      </div>

      {/* 🎂 Birthday today! */}
      {todayBirthdays.map(b => (
        <div key={b.person._id} className="dash-birthday-today">
          <span className="dash-alert-icon">🎂</span>
          <div className="dash-alert-content">
            <strong>Happy Birthday, {b.person.name}!</strong>
            <p>They turn {b.turnsAge} today — don't forget to wish them!</p>
          </div>
          <Link to={`/relationships/${b.person._id}`} className="btn btn-primary btn-sm">Open Profile →</Link>
        </div>
      ))}

      {/* Overdue alert */}
      {overdue.length > 0 && (
        <div className="dash-alert">
          <div className="dash-alert-icon">🔔</div>
          <div className="dash-alert-content">
            <strong>Time to reconnect</strong>
            <p>You haven't spoken with <span>{overdue.slice(0,3).map(p=>p.name).join(', ')}{overdue.length>3?` +${overdue.length-3} more`:''}</span> in a while.</p>
          </div>
          <Link to="/relationships" className="btn btn-ghost btn-sm">View →</Link>
        </div>
      )}

      <div className="dash-body">
        <div className="dash-main">

          {/* Modules */}
          <section className="dash-section">
            <h3 className="dash-section-title">Modules</h3>
            <div className="modules-grid">
              {MODULES.map((m,i) => (
                <Link key={m.path} to={m.path} className="module-card" style={{'--mc':m.color, animationDelay:`${i*0.05}s`}}>
                  <div className="module-card-icon" style={{color:m.color}}>{m.icon}</div>
                  <div className="module-card-body">
                    <div className="module-card-name">{m.label}</div>
                    <div className="module-card-desc">{m.desc}</div>
                  </div>
                  <div className="module-card-arrow">→</div>
                </Link>
              ))}
            </div>
          </section>

          {/* Recently contacted */}
          {recentPeople.length > 0 && (
            <section className="dash-section">
              <div className="dash-section-header">
                <h3 className="dash-section-title">Recently Contacted</h3>
                <Link to="/relationships" className="dash-section-link">See all →</Link>
              </div>
              <div className="recent-people">
                {recentPeople.map((p,i) => {
                  const col = TYPE_COLORS[p.relationshipType]||'#888';
                  const d = differenceInDays(now, new Date(p.lastConversationDate));
                  const lbl = d===0?'Today':d===1?'Yesterday':`${d}d ago`;
                  const sm = STATUS_META[p.currentStatus];
                  return (
                    <Link key={p._id} to={`/relationships/${p._id}`} className="recent-person-card" style={{animationDelay:`${i*0.04}s`}}>
                      <div className="recent-avatar-wrap">
                        {p.profilePhoto
                          ? <img src={getImageUrl(p.profilePhoto)} alt={p.name} className="recent-avatar"/>
                          : <div className="recent-avatar-ph" style={{background:`${col}22`,color:col}}>{getInitials(p.name)}</div>
                        }
                        <div className="recent-avatar-dot" style={{background:col}}/>
                      </div>
                      <div className="recent-info">
                        <div className="recent-name">{p.name}</div>
                        <div style={{display:'flex',alignItems:'center',gap:4}}>
                          <div className="recent-type" style={{color:col}}>{p.relationshipType}</div>
                          {sm && <span style={{fontSize:'0.7rem',color:sm.color}}>{sm.emoji} {p.currentStatus}</span>}
                        </div>
                      </div>
                      <div className="recent-time">{lbl}</div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        <div className="dash-side">
          {/* Life stats */}
          <div className="dash-widget">
            <h3 className="widget-title">Life Stats</h3>
            <div className="life-stats">
              <div className="life-stat"><div className="life-stat-val">{people.length}</div><div className="life-stat-label">People tracked</div></div>
              <div className="life-stat"><div className="life-stat-val">{overdue.length}</div><div className="life-stat-label">Need contact</div></div>
              <div className="life-stat"><div className="life-stat-val">{specialOnes.length}</div><div className="life-stat-label">Close hearts</div></div>
            </div>
          </div>

          {/* Upcoming birthdays */}
          {upcomingBirthdays.length > 0 && (
            <div className="dash-widget birthday-widget">
              <h3 className="widget-title">🎂 Upcoming Birthdays</h3>
              <div className="birthday-list">
                {soonBirthdays.map(b => (
                  <Link key={b.person._id} to={`/relationships/${b.person._id}`} className="birthday-item birthday-soon">
                    <div className="bday-avatar">
                      {b.person.profilePhoto
                        ? <img src={getImageUrl(b.person.profilePhoto)} alt={b.person.name}/>
                        : <div style={{background:'rgba(251,191,36,0.2)',color:'#fbbf24'}}>{getInitials(b.person.name)}</div>
                      }
                    </div>
                    <div className="bday-info">
                      <div className="bday-name">{b.person.name}</div>
                      <div className="bday-date">{format(b.nextBirthday,'MMM d')} · turns {b.turnsAge}</div>
                    </div>
                    <div className="bday-days">
                      <div className="bday-days-num">{b.daysUntil}</div>
                      <div className="bday-days-label">days</div>
                    </div>
                  </Link>
                ))}
                {laterBirthdays.map(b => (
                  <Link key={b.person._id} to={`/relationships/${b.person._id}`} className="birthday-item">
                    <div className="bday-avatar">
                      {b.person.profilePhoto
                        ? <img src={getImageUrl(b.person.profilePhoto)} alt={b.person.name}/>
                        : <div style={{background:'rgba(96,165,250,0.15)',color:'#60a5fa'}}>{getInitials(b.person.name)}</div>
                      }
                    </div>
                    <div className="bday-info">
                      <div className="bday-name">{b.person.name}</div>
                      <div className="bday-date">{format(b.nextBirthday,'MMM d')} · turns {b.turnsAge}</div>
                    </div>
                    <div className="bday-days">
                      <div className="bday-days-num" style={{color:'var(--text-2)'}}>{b.daysUntil}</div>
                      <div className="bday-days-label">days</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Special people */}
          {specialOnes.length > 0 && (
            <div className="dash-widget love-widget">
              <h3 className="widget-title">💖 Special People</h3>
              <div className="love-list">
                {specialOnes.map(p => {
                  const col = TYPE_COLORS[p.relationshipType]||'#e8637a';
                  const sm = STATUS_META[p.currentStatus];
                  return (
                    <Link key={p._id} to={`/relationships/${p._id}`} className="love-item">
                      <div className="love-item-avatar">
                        {p.profilePhoto
                          ? <img src={getImageUrl(p.profilePhoto)} alt={p.name}/>
                          : <div style={{background:`${col}22`,color:col}}>{getInitials(p.name)}</div>
                        }
                      </div>
                      <div className="love-item-info">
                        <div className="love-item-name">{p.name}</div>
                        <div style={{display:'flex',gap:6,alignItems:'center'}}>
                          <div className="love-item-type" style={{color:col}}>{p.relationshipType}</div>
                          {sm && <span style={{fontSize:'0.68rem',color:sm.color}}>{sm.emoji}</span>}
                        </div>
                      </div>
                      <span style={{color:col,fontSize:'1.1rem'}}>
                        {p.relationshipType==='love'?'❤️':p.relationshipType==='crush'?'🌸':p.relationshipType==='attracted'?'✨':'🌟'}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Relationship breakdown */}
          {people.length > 0 && (
            <div className="dash-widget">
              <h3 className="widget-title">Breakdown</h3>
              <div className="breakdown-list">
                {Object.entries(TYPE_COLORS).map(([type,col]) => {
                  const count = people.filter(p=>p.relationshipType===type).length;
                  if (!count) return null;
                  return (
                    <Link key={type} to={link.relationships(type)} className="breakdown-row">
                      <span className="breakdown-dot" style={{background:col}}/>
                      <span className="breakdown-type">{type}</span>
                      <div className="breakdown-bar-wrap">
                        <div className="breakdown-bar" style={{width:`${Math.round((count/people.length)*100)}%`,background:col}}/>
                      </div>
                      <span className="breakdown-count">{count}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}