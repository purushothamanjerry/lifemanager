import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { link } from '../../utils/links.js';
import { peopleApi, getImageUrl } from '../../utils/api.js';
import PersonForm from './PersonForm.jsx';
import { differenceInDays } from 'date-fns';
import './Relationships.css';

const TYPE_META = {
  love:         { color:'#e8637a', bg:'rgba(232,99,122,0.12)',   emoji:'❤️',  label:'Love'         },
  crush:        { color:'#f472b6', bg:'rgba(244,114,182,0.12)',  emoji:'🌸',  label:'Crush'        },
  attracted:    { color:'#fb923c', bg:'rgba(251,146,60,0.12)',   emoji:'✨',  label:'Attracted To' },
  impressed:    { color:'#fbbf24', bg:'rgba(251,191,36,0.12)',   emoji:'🌟',  label:'Impressed By' },
  friend:       { color:'#60a5fa', bg:'rgba(96,165,250,0.12)',   emoji:'👫',  label:'Friend'       },
  family:       { color:'#4ec9b0', bg:'rgba(78,201,176,0.12)',   emoji:'👨‍👩‍👧', label:'Family'       },
  colleague:    { color:'#d4a853', bg:'rgba(212,168,83,0.12)',   emoji:'💼',  label:'Colleague'    },
  acquaintance: { color:'#a78bfa', bg:'rgba(167,139,250,0.12)', emoji:'🤝',  label:'Acquaintance' },
  'one-time':   { color:'#6b7280', bg:'rgba(107,114,128,0.12)', emoji:'🌠',  label:'One-time'     },
};

const REMINDER_DAYS = { love:3, crush:7, attracted:14, impressed:30, friend:14, family:7, colleague:30, acquaintance:90, 'one-time':999 };

const FILTERS = [
  { key:'all',       emoji:'◎',  label:'Everyone' },
  { key:'love',      emoji:'❤️',  label:'Love'    },
  { key:'crush',     emoji:'🌸',  label:'Crush'   },
  { key:'attracted', emoji:'✨',  label:'Attracted'},
  { key:'impressed', emoji:'🌟',  label:'Impressed'},
  { key:'friend',    emoji:'👫',  label:'Friends' },
  { key:'family',    emoji:'👨‍👩‍👧', label:'Family'  },
  { key:'colleague', emoji:'💼',  label:'Work'    },
  { key:'acquaintance',emoji:'🤝',label:'Known'   },
  { key:'one-time',  emoji:'🌠',  label:'One-time'},
];

function getInitials(n) { return n.split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2); }
function getDaysSince(d) { return d ? differenceInDays(new Date(), new Date(d)) : null; }

function contactLabel(d) {
  if (d === null) return null;
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7)  return `${d} days ago`;
  if (d < 30) return `${Math.floor(d/7)}w ago`;
  if (d < 365) return `${Math.floor(d/30)}mo ago`;
  return `${Math.floor(d/365)}y ago`;
}

export default function Relationships() {
  const [people, setPeople]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = searchParams.get('type') || 'all';
  const setFilter = (val) => setSearchParams(prev => {
    const n = new URLSearchParams(prev);
    if (val && val !== 'all') n.set('type', val); else n.delete('type');
    return n;
  });
  const [search, setSearch] = useState('');
  const [view, setView]     = useState('grid');
  const [imgErrors, setImgErrors] = useState(new Set());

  const handleImgError = (id) => setImgErrors(prev => new Set(prev).add(id));

  const load = async () => {
    try { const r = await peopleApi.getAll(); setPeople(r.data); }
    catch(e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = people
    .filter(p => (filter==='all' || p.relationshipType===filter) && p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => {
      const order = ['love','crush','attracted','impressed','friend','family','colleague','acquaintance','one-time'];
      const ai = order.indexOf(a.relationshipType); const bi = order.indexOf(b.relationshipType);
      if (ai !== bi) return ai - bi;
      return (getDaysSince(a.lastConversationDate)??9999) - (getDaysSince(b.lastConversationDate)??9999);
    });

  const overdue = people.filter(p => {
    const d = getDaysSince(p.lastConversationDate);
    return d !== null && d > (REMINDER_DAYS[p.relationshipType]||30) && p.relationshipType !== 'one-time';
  });

  // ── Special = only manually marked ──
  const special = people.filter(p => p.isSpecial);

  return (
    <div className="rel-page">

      {/* Special people spotlight — only shows if someone is manually starred */}
      {special.length > 0 && (
        <div className="special-strip">
          <div className="special-strip-label">⭐ Special</div>
          <div className="special-strip-people">
            {special.map(p => {
              const m = TYPE_META[p.relationshipType] || TYPE_META.friend;
              return (
                <Link key={p._id} to={link.person(p._id)} className="special-pill"
                  style={{ '--sc': m.color, '--sb': m.bg }}>
                  <div className="special-pill-avatar">
                    {p.profilePhoto && !imgErrors.has(p._id)
                      ? <img src={getImageUrl(p.profilePhoto)} alt={p.name} onError={() => handleImgError(p._id)} />
                      : <span style={{color:m.color}}>{getInitials(p.name)}</span>}
                  </div>
                  <span className="special-pill-name">{p.name}</span>
                  <span className="special-pill-emoji">⭐</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="rel-header">
        <div>
          <h1>Relationships</h1>
          <p>{people.length} {people.length===1?'person':'people'} in your life</p>
        </div>
        <div className="rel-header-actions">
          <div className="view-btns">
            <button className={view==='grid'?'active':''} onClick={()=>setView('grid')}>⊞</button>
            <button className={view==='list'?'active':''} onClick={()=>setView('list')}>☰</button>
          </div>
          <button className="btn btn-primary" onClick={()=>setShowForm(true)}>+ Add Person</button>
        </div>
      </div>

      {/* Overdue banner */}
      {overdue.length > 0 && (
        <div className="overdue-banner">
          <span>🔔</span>
          <span>Reach out to <strong>{overdue.slice(0,2).map(p=>p.name).join(', ')}{overdue.length>2?` +${overdue.length-2} more`:''}</strong></span>
        </div>
      )}

      {/* Filter bar */}
      <div className="rel-filter-bar">
        <div className="filter-scroll">
          {FILTERS.map(f => (
            <button key={f.key} className={`fchip ${filter===f.key?'active':''}`} onClick={()=>setFilter(f.key)}>
              {f.emoji} {f.label}
              {f.key !== 'all' && people.filter(p=>p.relationshipType===f.key).length > 0 && (
                <span className="fchip-count">{people.filter(p=>p.relationshipType===f.key).length}</span>
              )}
            </button>
          ))}
        </div>
        <div className="rel-search">
          <span>🔍</span>
          <input placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{display:'flex',justifyContent:'center',padding:'80px'}}><div className="spinner"/></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="icon">◎</div>
          <h3>{search||filter!=='all'?'No matches':'No people yet'}</h3>
          <p>{search||filter!=='all'?'Try another filter.':'Add the people in your life.'}</p>
          {!search && filter==='all' && <button className="btn btn-primary" style={{marginTop:20}} onClick={()=>setShowForm(true)}>+ Add First Person</button>}
        </div>
      ) : view === 'grid' ? (
        <div className="people-grid">
          {filtered.map((p, i) => {
            const m    = TYPE_META[p.relationshipType] || TYPE_META.acquaintance;
            const days = getDaysSince(p.lastConversationDate);
            const lim  = REMINDER_DAYS[p.relationshipType] || 30;
            const over = days !== null && days > lim && p.relationshipType !== 'one-time';
            const lbl  = contactLabel(days);
            const spec = ['love','crush','attracted','impressed'].includes(p.relationshipType);

            return (
              <Link key={p._id} to={link.person(p._id)}
                className={`pcard ${spec?'pcard-special':''}`}
                style={{ '--pc': m.color, '--pb': m.bg, animationDelay:`${i*0.04}s` }}>
                {spec && <div className="pcard-glow" />}
                {/* Star badge for manually special */}
                {p.isSpecial && (
                  <div style={{position:'absolute',top:8,left:8,fontSize:'0.75rem',lineHeight:1}}>⭐</div>
                )}
                <div className="pcard-photo-wrap">
                  {p.profilePhoto && !imgErrors.has(p._id)
                    ? <img src={getImageUrl(p.profilePhoto)} alt={p.name} className="pcard-photo" onError={() => handleImgError(p._id)} />
                    : <div className="pcard-photo-ph" style={{background:m.bg, color:m.color}}>{getInitials(p.name)}</div>}
                  {over && <div className="pcard-overdue-ring" />}
                  <div className="pcard-type-dot" style={{background:m.color}} title={m.label}>{m.emoji}</div>
                </div>
                <div className="pcard-info">
                  <div className="pcard-name">{p.name}</div>
                  {p.age && <div className="pcard-age">{p.age} yrs</div>}
                  <div className="pcard-badge" style={{background:m.bg, color:m.color}}>{m.label}</div>
                </div>
                <div className="pcard-footer">
                  {lbl
                    ? <span className={over?'c-over':'c-ok'}>{over?'⚠ ':''}{lbl}</span>
                    : <span className="c-none">Never contacted</span>}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="people-list-view">
          {filtered.map((p,i) => {
            const m    = TYPE_META[p.relationshipType] || TYPE_META.acquaintance;
            const days = getDaysSince(p.lastConversationDate);
            const lim  = REMINDER_DAYS[p.relationshipType]||30;
            const over = days!==null && days>lim && p.relationshipType!=='one-time';
            const lbl  = contactLabel(days);
            return (
              <Link key={p._id} to={link.person(p._id)}
                className="plist-item" style={{ animationDelay:`${i*0.03}s` }}>
                <div style={{position:'relative',flexShrink:0}}>
                  {p.profilePhoto && !imgErrors.has(p._id)
                    ? <img src={getImageUrl(p.profilePhoto)} alt={p.name} className="plist-avatar" onError={() => handleImgError(p._id)} />
                    : <div className="plist-avatar-ph" style={{background:m.bg,color:m.color}}>{getInitials(p.name)}</div>}
                  {over && <div className="plist-overdue" />}
                </div>
                <div className="plist-info">
                  <span className="plist-name">{p.name}</span>
                  {p.age && <span className="plist-age">{p.age}</span>}
                  {p.isSpecial && <span style={{fontSize:'0.72rem'}}>⭐</span>}
                </div>
                <span className="plist-badge" style={{background:m.bg,color:m.color}}>{m.emoji} {m.label}</span>
                <span className={`plist-time ${over?'c-over':lbl?'c-ok':'c-none'}`}>{lbl||'Never'}</span>
                <span className="plist-arrow">›</span>
              </Link>
            );
          })}
        </div>
      )}

      {showForm && <PersonForm onClose={()=>setShowForm(false)} onSaved={()=>{setShowForm(false);load();}} />}
    </div>
  );
}