import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { peopleApi, conversationsApi, memoriesApi, getImageUrl } from '../../utils/api.js';
import PersonForm from './PersonForm.jsx';
import { differenceInDays, differenceInYears, format, addYears, isBefore } from 'date-fns';
import './PersonProfile.css';
import { link } from '../../utils/links.js';

const TYPE_META = {
  love:         { color:'#e8637a', bg:'rgba(232,99,122,0.12)', emoji:'❤️' },
  crush:        { color:'#f472b6', bg:'rgba(244,114,182,0.12)',emoji:'🌸' },
  attracted:    { color:'#fb923c', bg:'rgba(251,146,60,0.12)', emoji:'✨' },
  impressed:    { color:'#fbbf24', bg:'rgba(251,191,36,0.12)', emoji:'🌟' },
  friend:       { color:'#60a5fa', bg:'rgba(96,165,250,0.12)', emoji:'👫' },
  family:       { color:'#4ec9b0', bg:'rgba(78,201,176,0.12)', emoji:'👨‍👩‍👧'},
  colleague:    { color:'#d4a853', bg:'rgba(212,168,83,0.12)', emoji:'💼' },
  classmate:    { color:'#f59e0b', bg:'rgba(245,158,11,0.12)', emoji:'🎒' },
  acquaintance: { color:'#a78bfa', bg:'rgba(167,139,250,0.12)',emoji:'🤝' },
  'one-time':   { color:'#6b7280', bg:'rgba(107,114,128,0.12)',emoji:'🌠' },
};

const STATUS_META = {
  close:        { emoji:'💚', color:'#4ec9b0', label:'Close'        },
  good:         { emoji:'🙂', color:'#60a5fa', label:'Good'         },
  drifting:     { emoji:'🌊', color:'#fbbf24', label:'Drifting'     },
  distant:      { emoji:'🌫', color:'#9ca3af', label:'Distant'      },
  'not-talking':{ emoji:'🔇', color:'#e8637a', label:'Not Talking'  },
  complicated:  { emoji:'🌀', color:'#a78bfa', label:'Complicated'  },
  rekindled:    { emoji:'🔥', color:'#fb923c', label:'Rekindled'    },
  'lost-touch': { emoji:'👻', color:'#6b7280', label:'Lost Touch'   },
  ended:        { emoji:'🚪', color:'#e8637a', label:'Ended'        },
};

const MOOD_META = {
  great:    { color:'#4ec9b0', label:'Great'    },
  good:     { color:'#60a5fa', label:'Good'     },
  neutral:  { color:'#9ca3af', label:'Neutral'  },
  awkward:  { color:'#fbbf24', label:'Awkward'  },
  difficult:{ color:'#e8637a', label:'Difficult'},
};

const LOVE_LANGUAGE_LABEL = {
  words:'💬 Words of Affirmation',
  acts: '🤝 Acts of Service',
  gifts:'🎁 Giving Gifts',
  time: '⏳ Quality Time',
  touch:'🤗 Physical Touch',
};

function getInitials(n) { return n.split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2); }

function contactLabel(d) {
  if (d===null) return 'Never';
  if (d===0) return 'Today'; if (d===1) return 'Yesterday';
  if (d<7)  return `${d} days ago`;
  if (d<30) return `${Math.floor(d/7)} weeks ago`;
  if (d<365)return `${Math.floor(d/30)} months ago`;
  return `${Math.floor(d/365)} years ago`;
}

function getNextBirthday(dob) {
  const today = new Date(); const d = new Date(dob);
  let next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
  if (isBefore(next, today)) next = addYears(next, 1);
  return { next, daysUntil: differenceInDays(next, today) };
}

export default function PersonProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [person, setPerson]       = useState(null);
  const [convos, setConvos]       = useState([]);
  const [memories, setMemories]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState('overview');
  const [showEdit, setShowEdit]   = useState(false);
  const [showConvo, setShowConvo] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newConvo, setNewConvo]   = useState({ date:'', place:'', summary:'', mood:'good' });
  const [isFav, setIsFav]         = useState(false);
  const [showPhoto, setShowPhoto] = useState(false); // ← lightbox state
  const [imgError, setImgError]   = useState(false);
  const now = new Date();

  const load = async () => {
    try {
      const [pr, cr, mr] = await Promise.all([
        peopleApi.getById(id),
        conversationsApi.getByPerson(id),
        memoriesApi.getByPerson(id),
      ]);
      setPerson(pr.data); setConvos(cr.data); setMemories(mr.data);
    } catch(e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id]);
  useEffect(() => { if (id) setIsFav(localStorage.getItem(`fav_${id}`) === '1'); }, [id]);

  const toggleFav = () => { const v = !isFav; setIsFav(v); localStorage.setItem(`fav_${id}`, v?'1':'0'); };

  const handleAddConvo = async e => {
    e.preventDefault();
    try {
      await conversationsApi.create({ ...newConvo, person: id });
      setShowConvo(false); setNewConvo({ date:'', place:'', summary:'', mood:'good' }); load();
    } catch(e) { console.error(e); }
  };

  const handlePhotoUpload = async e => {
    const file = e.target.files[0]; if (!file) return;
    const fd = new FormData(); fd.append('profilePhoto', file);
    try { await peopleApi.update(id, fd); load(); } catch(e) { console.error(e); }
  };

  const handleDelete = async () => {
    try { await peopleApi.delete(id); navigate('/relationships'); }
    catch(e) { console.error(e); }
  };

  if (loading) return <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh'}}><div className="spinner"/></div>;
  if (!person) return <div className="pp-empty">Person not found. <Link to="/relationships">Go back</Link></div>;

  const tm = TYPE_META[person.relationshipType] || TYPE_META.acquaintance;
  const sm = STATUS_META[person.currentStatus]  || STATUS_META.good;
  const isSpecial = ['love','crush','attracted','impressed'].includes(person.relationshipType);
  const daysSince = person.lastConversationDate ? differenceInDays(now, new Date(person.lastConversationDate)) : null;
  const displayAge = person.age;
  const hasDOB = !!person.dateOfBirth;
  const bdayInfo = hasDOB ? getNextBirthday(person.dateOfBirth) : null;
  const isBirthdayToday = bdayInfo?.daysUntil === 0;
  const knownSince = person.firstMeetingDate
    ? `${differenceInYears(now, new Date(person.firstMeetingDate))}y ${Math.floor((differenceInDays(now, new Date(person.firstMeetingDate)) % 365)/30)}m`
    : null;
  const moodCounts = convos.reduce((acc, c) => { acc[c.mood] = (acc[c.mood]||0)+1; return acc; }, {});
  const totalConvos = convos.length;

  const hasContact    = person.mobileNumber || person.email || person.instagramId || person.linkedinId || person.twitterId || person.snapchatId || person.otherContact;
  const hasAppearance = person.height || person.hairLength || person.bodyType;
  const hasCharacter  = person.characterTraits?.length || person.loveLanguage || person.communicationStyle || person.values || person.quirks;
  const hasLinked     = person.linkedPeople?.length > 0;

  return (
    <div className="pp-page">
      <Link to="/relationships" className="pp-back">← Relationships</Link>

      {/* Hero */}
      <div className={`pp-hero ${isSpecial?'pp-hero-special':''}`} style={{'--tc':tm.color}}>
        <div className="pp-hero-bg" style={{background:`radial-gradient(ellipse at 60% 50%, ${tm.color}18, transparent 70%)`}}/>
        <div className="pp-hero-left">

          {/* ── Avatar ── */}
          <div className="pp-avatar-wrap" onClick={(e) => { if(!e.target.closest('button')) document.getElementById('avatar-upload').click(); }} style={{cursor: 'pointer'}}>
            {person.profilePhoto && !imgError ? (
              <img
                src={getImageUrl(person.profilePhoto)}
                alt={person.name}
                className="pp-avatar"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="pp-avatar-ph" style={{background:tm.bg,color:tm.color}}>
                {getInitials(person.name)}
              </div>
            )}
            
            <div className="pp-avatar-overlay">
              {person.profilePhoto && !imgError && (
                <button 
                  className="pp-avatar-action" 
                  onClick={(e) => { e.stopPropagation(); setShowPhoto(true); }}
                  title="View Photo"
                >
                  👁️
                </button>
              )}
              <label className="pp-avatar-action" title="Upload Photo" onClick={(e) => e.stopPropagation()}>
                <input 
                  id="avatar-upload"
                  type="file" 
                  accept="image/*" 
                  style={{display:'none'}} 
                  onChange={handlePhotoUpload} 
                />
                📷
              </label>
            </div>

            {isSpecial && <div className="pp-avatar-ring" style={{borderColor:tm.color}}/>}
            {isBirthdayToday && <div className="pp-bday-badge">🎂</div>}
          </div>

          <div className="pp-hero-info">
            <div className="pp-hero-top">
              <h1 className="pp-name">{person.name}</h1>
              <button className={`pp-fav-btn ${isFav?'active':''}`} onClick={toggleFav} title="Favourite">
                {isFav ? '★' : '☆'}
              </button>
            </div>
            <div className="pp-badges">
              <span className="pp-badge" style={{background:tm.bg,color:tm.color}}>{tm.emoji} {person.relationshipType}</span>
              <span className="pp-status-badge" style={{background:`${sm.color}18`,color:sm.color,borderColor:`${sm.color}40`}}>
                {sm.emoji} {sm.label}
              </span>
              {person.gender && <span className="pp-badge pp-badge-dim">{person.gender}</span>}
            </div>
            <div className="pp-meta-row">
              {displayAge !== null && (
                <span className="pp-meta-chip">
                  🎂 {hasDOB
                    ? <>Age {displayAge} · <span style={{color:'var(--gold)'}}>{format(new Date(person.dateOfBirth),'MMM d')}</span></>
                    : <>~{displayAge} yrs (approx)</>}
                </span>
              )}
              {bdayInfo && bdayInfo.daysUntil > 0 && bdayInfo.daysUntil <= 30 && (
                <span className="pp-meta-chip pp-bday-chip">🎉 Birthday in {bdayInfo.daysUntil} days!</span>
              )}
              {knownSince && <span className="pp-meta-chip">⏳ Known {knownSince}</span>}
              {person.favoriteColor && <span className="pp-meta-chip">🎨 {person.favoriteColor}</span>}
              {person.loveLanguage && <span className="pp-meta-chip">{LOVE_LANGUAGE_LABEL[person.loveLanguage]}</span>}
            </div>
            <div className="pp-hero-actions">
              <button className="btn btn-primary btn-sm" onClick={()=>setShowConvo(true)}>+ Log Conversation</button>
              <button className="btn btn-ghost btn-sm" onClick={()=>setShowStatusModal(true)}>⟳ Update Status</button>
              <button className="btn btn-ghost btn-sm" onClick={()=>setShowEdit(true)}>✎ Edit</button>
              <button className="btn btn-danger btn-sm" onClick={()=>setShowDeleteConfirm(true)}>🗑</button>
            </div>
          </div>
        </div>
        <div className="pp-quick-stats">
          <div className="pp-qstat">
            <div className="pp-qstat-val">{convos.length}</div>
            <div className="pp-qstat-label">Conversations</div>
          </div>
          <div className="pp-qstat">
            <div className="pp-qstat-val" style={{color:daysSince!==null&&daysSince>14?'var(--rose)':'inherit'}}>
              {daysSince!==null ? `${daysSince}d` : '—'}
            </div>
            <div className="pp-qstat-label">Since last talk</div>
          </div>
          <div className="pp-qstat">
            <div className="pp-qstat-val">{knownSince || '—'}</div>
            <div className="pp-qstat-label">Known for</div>
          </div>
        </div>
      </div>

      {/* Cross-app quick links */}
      <div className="pp-crosslinks">
        <Link to={link.memories({person:person._id})} className="pp-crosslink-btn">
          <span>◈</span> {memories.length > 0 ? `${memories.length} Memories` : 'Memories'}
        </Link>
      </div>

      {/* Tabs */}
      <div className="pp-tabs">
        {['overview','conversations','memories','status','gallery'].map(t => (
          <button key={t} className={`pp-tab ${tab===t?'active':''}`} onClick={()=>setTab(t)}>
            {t==='overview'?'Overview'
              :t==='conversations'?`Conversations (${convos.length})`
              :t==='memories'?`Memories (${memories.length})`
              :t==='status'?'Status History':'Gallery'}
          </button>
        ))}
      </div>

      <div className="pp-content">

        {/* ── OVERVIEW ── */}
        {tab==='overview' && (
          <div className="pp-two-col">
            <div className="pp-col-main">

              {/* About */}
              {(person.howWeMet||person.firstMeetingPlace||person.hobbies?.length||person.personalityNotes||person.habits||person.notes) && (
                <div className="pp-card">
                  <h3 className="pp-card-title">About</h3>
                  {person.howWeMet && (
                    <div className="pp-field">
                      <div className="pp-field-label">How we met</div>
                      <div className="pp-field-val">{person.howWeMet}</div>
                    </div>
                  )}
                  {person.firstMeetingPlace && (
                    <div className="pp-field">
                      <div className="pp-field-label">First met at</div>
                      <div className="pp-field-val">{person.firstMeetingPlace}{person.firstMeetingDate ? ` · ${format(new Date(person.firstMeetingDate),'MMM d, yyyy')}` : ''}</div>
                    </div>
                  )}
                  {person.hobbies?.length > 0 && (
                    <div className="pp-field">
                      <div className="pp-field-label">Hobbies</div>
                      <div className="pp-hobbies">{person.hobbies.map(h=><span key={h} className="pp-hobby-chip">{h}</span>)}</div>
                    </div>
                  )}
                  {person.personalityNotes && (
                    <div className="pp-field">
                      <div className="pp-field-label">Personality</div>
                      <div className="pp-field-val">{person.personalityNotes}</div>
                    </div>
                  )}
                  {person.habits && (
                    <div className="pp-field">
                      <div className="pp-field-label">Habits</div>
                      <div className="pp-field-val">{person.habits}</div>
                    </div>
                  )}
                  {person.notes && (
                    <div className="pp-field">
                      <div className="pp-field-label">Private Notes</div>
                      <div className="pp-field-val" style={{fontStyle:'italic',color:'var(--text-2)'}}>{person.notes}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Character */}
              {hasCharacter && (
                <div className="pp-card">
                  <h3 className="pp-card-title">✨ Character</h3>
                  {person.characterTraits?.length > 0 && (
                    <div className="pp-field">
                      <div className="pp-field-label">Traits</div>
                      <div className="pp-hobbies">
                        {person.characterTraits.map(t => (
                          <span key={t} className="pp-hobby-chip" style={{background:'rgba(167,139,250,0.1)',color:'#a78bfa',borderColor:'rgba(167,139,250,0.25)'}}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {person.loveLanguage && (
                    <div className="pp-field">
                      <div className="pp-field-label">Love Language</div>
                      <div className="pp-field-val">{LOVE_LANGUAGE_LABEL[person.loveLanguage] || person.loveLanguage}</div>
                    </div>
                  )}
                  {person.communicationStyle && (
                    <div className="pp-field">
                      <div className="pp-field-label">Communication</div>
                      <div className="pp-field-val">{person.communicationStyle}</div>
                    </div>
                  )}
                  {person.values && (
                    <div className="pp-field">
                      <div className="pp-field-label">Values</div>
                      <div className="pp-field-val">{person.values}</div>
                    </div>
                  )}
                  {person.quirks && (
                    <div className="pp-field">
                      <div className="pp-field-label">Quirks</div>
                      <div className="pp-field-val">{person.quirks}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Appearance */}
              {hasAppearance && (
                <div className="pp-card">
                  <h3 className="pp-card-title">🪞 Appearance</h3>
                  <div style={{display:'flex',flexWrap:'wrap',gap:'8px 20px'}}>
                    {person.height && (
                      <div className="pp-field">
                        <div className="pp-field-label">📏 Height</div>
                        <div className="pp-field-val">{person.height}</div>
                      </div>
                    )}
                    {person.hairLength && (
                      <div className="pp-field">
                        <div className="pp-field-label">💇 Hair</div>
                        <div className="pp-field-val">{person.hairLength}</div>
                      </div>
                    )}
                    {person.bodyType && (
                      <div className="pp-field">
                        <div className="pp-field-label">🏃 Body Type</div>
                        <div className="pp-field-val">{person.bodyType}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Linked People */}
              {hasLinked && (
                <div className="pp-card">
                  <h3 className="pp-card-title">🔗 Linked People</h3>
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    {person.linkedPeople.map((lp, i) => {
                      const lp_person = lp.person;
                      if (!lp_person) return null;
                      const lm = TYPE_META[lp_person.relationshipType] || TYPE_META.acquaintance;
                      const ls = STATUS_META[lp_person.currentStatus]  || STATUS_META.good;
                      return (
                        <Link key={i} to={link.person(lp_person._id)}
                          style={{display:'flex',alignItems:'center',gap:12,padding:'10px 12px',borderRadius:10,background:'var(--bg-elevated)',border:'1px solid var(--border-dim)',textDecoration:'none',transition:'all 0.2s'}}
                          onMouseEnter={e=>e.currentTarget.style.borderColor=lm.color}
                          onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border-dim)'}>
                          <div style={{width:36,height:36,borderRadius:'50%',background:lm.bg,color:lm.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.85rem',fontWeight:700,flexShrink:0,overflow:'hidden'}}>
                            {lp_person.profilePhoto
                              ? <img src={getImageUrl(lp_person.profilePhoto)} alt={lp_person.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                              : getInitials(lp_person.name)}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontWeight:600,color:'var(--text-1)',fontSize:'0.9rem'}}>{lp_person.name}</div>
                            <div style={{fontSize:'0.72rem',color:'var(--text-3)',marginTop:1}}>{ls.emoji} {ls.label}</div>
                          </div>
                          <span style={{padding:'3px 10px',borderRadius:12,background:lm.bg,color:lm.color,fontSize:'0.72rem',fontWeight:600,flexShrink:0}}>
                            {lp.linkType}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent convos */}
              {convos.length > 0 && (
                <div className="pp-card">
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                    <h3 className="pp-card-title" style={{marginBottom:0}}>Recent Conversations</h3>
                    <button className="btn btn-ghost btn-sm" onClick={()=>setTab('conversations')}>See all</button>
                  </div>
                  <div className="pp-convo-list">
                    {convos.slice(0,3).map(c => {
                      const mm = MOOD_META[c.mood]||MOOD_META.neutral;
                      return (
                        <div key={c._id} className="pp-convo-item">
                          <div className="pp-convo-dot" style={{background:mm.color}}/>
                          <div className="pp-convo-body">
                            <div className="pp-convo-top">
                              <span className="pp-convo-date">{format(new Date(c.date),'MMM d, yyyy')}</span>
                              {c.place && <span className="pp-convo-place">📍 {c.place}</span>}
                              <span className="pp-convo-mood" style={{color:mm.color}}>{mm.label}</span>
                            </div>
                            {c.summary && <div className="pp-convo-summary">{c.summary}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="pp-col-side">
              <div className="pp-card pp-status-card" style={{borderColor:`${sm.color}30`}}>
                <h3 className="pp-card-title">Current Status</h3>
                <div className="pp-current-status-display">
                  <span className="pp-cs-emoji">{sm.emoji}</span>
                  <div>
                    <div className="pp-cs-label" style={{color:sm.color}}>{sm.label}</div>
                    <div className="pp-cs-sub">as of {person.updatedAt ? format(new Date(person.updatedAt),'MMM d, yyyy') : 'unknown'}</div>
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" style={{width:'100%',marginTop:12}} onClick={()=>setShowStatusModal(true)}>
                  ⟳ Update Status
                </button>
              </div>

              <div className="pp-card">
                <h3 className="pp-card-title">Last Contact</h3>
                <div style={{textAlign:'center',padding:'12px 0'}}>
                  <div style={{fontSize:'2rem',fontFamily:'var(--font-display)',fontWeight:700,color:daysSince!==null&&daysSince>14?'var(--rose)':'var(--gold)'}}>
                    {daysSince !== null ? `${daysSince}d` : '—'}
                  </div>
                  <div style={{fontSize:'0.78rem',color:'var(--text-3)',marginTop:4}}>{contactLabel(daysSince)}</div>
                  {person.lastConversationDate && <div style={{fontSize:'0.72rem',color:'var(--text-3)',marginTop:6}}>{format(new Date(person.lastConversationDate),'MMMM d, yyyy')}</div>}
                </div>
              </div>

              {hasContact && (
                <div className="pp-card">
                  <h3 className="pp-card-title">📞 Contact</h3>
                  {person.mobileNumber && (
                    <div className="pp-contact-row">
                      <span className="pp-contact-icon">📱</span>
                      <a href={`tel:${person.mobileNumber}`} className="pp-contact-val">{person.mobileNumber}</a>
                    </div>
                  )}
                  {person.email && (
                    <div className="pp-contact-row">
                      <span className="pp-contact-icon">📧</span>
                      <a href={`mailto:${person.email}`} className="pp-contact-val">{person.email}</a>
                    </div>
                  )}
                  {person.instagramId && (
                    <div className="pp-contact-row">
                      <span className="pp-contact-icon">📸</span>
                      <a href={`https://instagram.com/${person.instagramId}`} target="_blank" rel="noreferrer" className="pp-contact-val">@{person.instagramId}</a>
                    </div>
                  )}
                  {person.linkedinId && (
                    <div className="pp-contact-row">
                      <span className="pp-contact-icon">💼</span>
                      <a href={`https://linkedin.com/in/${person.linkedinId}`} target="_blank" rel="noreferrer" className="pp-contact-val">in/{person.linkedinId}</a>
                    </div>
                  )}
                  {person.twitterId && (
                    <div className="pp-contact-row">
                      <span className="pp-contact-icon">🐦</span>
                      <a href={`https://twitter.com/${person.twitterId}`} target="_blank" rel="noreferrer" className="pp-contact-val">@{person.twitterId}</a>
                    </div>
                  )}
                  {person.snapchatId && (
                    <div className="pp-contact-row">
                      <span className="pp-contact-icon">👻</span>
                      <span className="pp-contact-val">{person.snapchatId}</span>
                    </div>
                  )}
                  {person.otherContact && (
                    <div className="pp-contact-row">
                      <span className="pp-contact-icon">🔗</span>
                      <span className="pp-contact-val">{person.otherContact}</span>
                    </div>
                  )}
                </div>
              )}

              {totalConvos > 0 && (
                <div className="pp-card">
                  <h3 className="pp-card-title">Mood Breakdown</h3>
                  <div className="pp-mood-bars">
                    {Object.entries(MOOD_META).map(([key,m]) => {
                      const c = moodCounts[key]||0;
                      if (!c) return null;
                      return (
                        <div key={key} className="pp-mood-row">
                          <span className="pp-mood-label">{m.label}</span>
                          <div className="pp-mood-bar-wrap">
                            <div className="pp-mood-bar" style={{width:`${(c/totalConvos)*100}%`,background:m.color}}/>
                          </div>
                          <span className="pp-mood-count">{c}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CONVERSATIONS ── */}
        {tab==='conversations' && (
          <div>
            <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
              <button className="btn btn-primary" onClick={()=>setShowConvo(true)}>+ Log Conversation</button>
            </div>
            {convos.length === 0 ? (
              <div className="empty-state"><div className="icon">💬</div><h3>No conversations logged</h3><p>Record your interactions to track this relationship over time.</p></div>
            ) : (
              <div className="pp-timeline">
                {convos.map((c,i) => {
                  const mm = MOOD_META[c.mood]||MOOD_META.neutral;
                  return (
                    <div key={c._id} className="pp-tl-item">
                      <div className="pp-tl-line"/>
                      <div className="pp-tl-dot" style={{background:mm.color, boxShadow:`0 0 0 4px ${mm.color}20`}}/>
                      <div className="pp-tl-card">
                        <div className="pp-tl-header">
                          <span className="pp-tl-date">{format(new Date(c.date),'EEEE, MMMM d yyyy')}</span>
                          {c.place && <span className="pp-tl-place">📍 {c.place}</span>}
                          <span className="pp-tl-mood" style={{background:`${mm.color}18`,color:mm.color}}>{mm.label}</span>
                        </div>
                        {c.summary && <p className="pp-tl-summary">{c.summary}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── STATUS HISTORY ── */}
        {tab==='status' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div>
                <h2 style={{marginBottom:4}}>Status History</h2>
                <p style={{fontSize:'0.85rem'}}>Track how this relationship has evolved over time.</p>
              </div>
              <button className="btn btn-primary" onClick={()=>setShowStatusModal(true)}>⟳ Update Status</button>
            </div>
            <div className="pp-card" style={{marginBottom:24,borderColor:`${sm.color}30`,background:`linear-gradient(135deg,var(--bg-card),${sm.color}06)`}}>
              <div style={{display:'flex',alignItems:'center',gap:16}}>
                <span style={{fontSize:'2.5rem'}}>{sm.emoji}</span>
                <div>
                  <div style={{fontSize:'0.72rem',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--text-3)',marginBottom:4}}>Current Status</div>
                  <div style={{fontSize:'1.4rem',fontFamily:'var(--font-display)',color:sm.color,fontWeight:600}}>{sm.label}</div>
                </div>
              </div>
            </div>
            {!person.statusHistory?.length ? (
              <div className="empty-state"><div className="icon">📊</div><h3>No history yet</h3><p>Status changes will appear here.</p></div>
            ) : (
              <div className="pp-status-timeline">
                {[...person.statusHistory].reverse().map((h,i) => {
                  const hm = STATUS_META[h.status] || STATUS_META.good;
                  const isLatest = i===0;
                  return (
                    <div key={i} className={`pp-st-item ${isLatest?'pp-st-latest':''}`}>
                      <div className="pp-st-icon" style={{background:`${hm.color}20`,color:hm.color,borderColor:`${hm.color}40`}}>{hm.emoji}</div>
                      <div className="pp-st-body">
                        <div className="pp-st-top">
                          <span className="pp-st-label" style={{color:hm.color}}>{hm.label}</span>
                          {isLatest && <span className="pp-st-current-tag">Current</span>}
                          <span className="pp-st-date">{format(new Date(h.changedAt),'MMM d, yyyy')}</span>
                        </div>
                        {h.note && <div className="pp-st-note">{h.note}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── MEMORIES ── */}
        {tab==='memories' && (
          <div>
            {memories.length === 0 ? (
              <div className="empty-state">
                <div className="icon">◈</div>
                <h3>No memories yet</h3>
                <p>Memories that mention <strong>{person.name}</strong> will appear here automatically.</p>
                <div style={{display:'flex',gap:10,marginTop:14,flexWrap:'wrap',justifyContent:'center'}}>
                  <Link to={link.memories({person:person._id})} className="btn btn-ghost btn-sm">Browse All Memories</Link>
                </div>
              </div>
            ) : (
              <div className="pp-memories-list">
                {memories.map((m, i) => {
                  const EMO = {
                    joyful:{emoji:'😄',color:'#fbbf24'}, grateful:{emoji:'🙏',color:'#4ec9b0'},
                    nostalgic:{emoji:'🌅',color:'#a78bfa'}, peaceful:{emoji:'🌿',color:'#6ee7b7'},
                    excited:{emoji:'⚡',color:'#fb923c'}, bittersweet:{emoji:'🌧',color:'#818cf8'},
                    sad:{emoji:'💧',color:'#60a5fa'}, proud:{emoji:'🏆',color:'#d4a853'},
                    loved:{emoji:'❤️',color:'#e8637a'}, funny:{emoji:'😂',color:'#f472b6'},
                    inspiring:{emoji:'✨',color:'#c4b5fd'}, mixed:{emoji:'🌀',color:'#9ca3af'},
                  };
                  const emo = EMO[m.emotion] || EMO.joyful;
                  const cover = m.photos?.[m.coverPhoto || 0];
                  return (
                    <div key={m._id} className="pp-mem-item" style={{'--mc': emo.color, animationDelay:`${i*0.05}s`}}>
                      {cover && <div className="pp-mem-thumb"><img src={getImageUrl(cover)} alt={m.title}/></div>}
                      <div className="pp-mem-body">
                        <div className="pp-mem-top">
                          <span className="pp-mem-emoji">{emo.emoji}</span>
                          <span className="pp-mem-date" style={{color:emo.color}}>{format(new Date(m.date), 'MMMM d, yyyy')}</span>
                          {m.place && <span className="pp-mem-place">📍 {m.place}</span>}
                          {m.isFavorite && <span>⭐</span>}
                        </div>
                        <div className="pp-mem-title">{m.title}</div>
                        {m.description && (
                          <div className="pp-mem-desc">{m.description.slice(0,160)}{m.description.length>160?'…':''}</div>
                        )}
                        {m.tags?.length > 0 && (
                          <div className="pp-mem-tags" onClick={e=>e.stopPropagation()}>
                            {m.tags.map(t => (
                              <Link key={t} to={link.memoryTag(t)} className="pp-mem-tag pp-mem-tag-link"
                                style={{color:emo.color, background:`${emo.color}15`}} onClick={e=>e.stopPropagation()}>#{t}</Link>
                            ))}
                          </div>
                        )}
                        {m.photos?.length > 1 && <div className="pp-mem-photo-count">📷 {m.photos.length} photos</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── GALLERY ── */}
        {tab==='gallery' && (
          <div>
            <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
              <label className="btn btn-primary" style={{cursor:'pointer'}}>
                + Add Photo
                <input type="file" accept="image/*" style={{display:'none'}} onChange={handlePhotoUpload}/>
              </label>
            </div>
            {!person.photos?.length ? (
              <div className="empty-state"><div className="icon">📷</div><h3>No photos yet</h3></div>
            ) : (
              <div className="pp-gallery">
                {person.photos.map((ph,i) => (
                  <div key={i} className="pp-gallery-item"><img src={getImageUrl(ph)} alt={`Photo ${i+1}`}/></div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showConvo && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowConvo(false)}>
          <div className="modal">
            <div className="modal-header"><h2>Log Conversation</h2><button className="pform-close-btn" onClick={()=>setShowConvo(false)}>✕</button></div>
            <form onSubmit={handleAddConvo}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group"><label>Date *</label><input type="date" value={newConvo.date} onChange={e=>setNewConvo(p=>({...p,date:e.target.value}))} required/></div>
                  <div className="form-group"><label>Place</label><input value={newConvo.place} onChange={e=>setNewConvo(p=>({...p,place:e.target.value}))} placeholder="Coffee shop, call..."/></div>
                  <div className="form-group full"><label>Mood</label>
                    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                      {Object.entries(MOOD_META).map(([k,m])=>(
                        <button type="button" key={k}
                          style={{padding:'7px 14px',borderRadius:20,border:`1px solid ${newConvo.mood===k?m.color:'var(--border)'}`,background:newConvo.mood===k?`${m.color}20`:'transparent',color:newConvo.mood===k?m.color:'var(--text-3)',cursor:'pointer',fontSize:'0.8rem',fontFamily:'var(--font-body)',transition:'all 0.2s'}}
                          onClick={()=>setNewConvo(p=>({...p,mood:k}))}>{m.label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group full"><label>Summary</label><textarea value={newConvo.summary} onChange={e=>setNewConvo(p=>({...p,summary:e.target.value}))} placeholder="What did you talk about?" rows={3}/></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={()=>setShowConvo(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showStatusModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowStatusModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>Update Relationship Status</h2>
              <button className="pform-close-btn" onClick={()=>setShowStatusModal(false)}>✕</button>
            </div>
            <StatusUpdateModal person={person} onClose={()=>setShowStatusModal(false)} onSaved={()=>{setShowStatusModal(false);load();}}/>
          </div>
        </div>
      )}

      {showEdit && <PersonForm person={person} onClose={()=>setShowEdit(false)} onSaved={()=>{setShowEdit(false);load();}}/>}

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowDeleteConfirm(false)}>
          <div className="modal" style={{maxWidth:400}}>
            <div className="modal-header"><h2>Delete {person.name}?</h2></div>
            <div className="modal-body"><p>This will permanently delete this person and all their conversations. This cannot be undone.</p></div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setShowDeleteConfirm(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete Forever</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Photo Lightbox ── */}
      {showPhoto && person.profilePhoto && (
        <div
          onClick={() => setShowPhoto(false)}
          style={{
            position:'fixed', inset:0,
            background:'rgba(0,0,0,0.92)',
            display:'flex', alignItems:'center', justifyContent:'center',
            zIndex:9999, cursor:'zoom-out', padding:20,
          }}>
          <div style={{position:'relative'}}>
            <img
              src={getImageUrl(person.profilePhoto)}
              alt={person.name}
              onClick={e => e.stopPropagation()}
              style={{
                maxWidth:'88vw', maxHeight:'88vh',
                borderRadius:16, objectFit:'contain',
                boxShadow:'0 0 80px rgba(0,0,0,0.9)',
                cursor:'default',
              }}
            />
            {/* Close button */}
            <button
              onClick={() => setShowPhoto(false)}
              style={{
                position:'absolute', top:-14, right:-14,
                width:36, height:36, borderRadius:'50%',
                background:'rgba(255,255,255,0.15)',
                border:'1px solid rgba(255,255,255,0.3)',
                color:'white', fontSize:'1rem', cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center',
                backdropFilter:'blur(8px)',
              }}>✕</button>
            {/* Name label */}
            <div style={{
              position:'absolute', bottom:-32, left:0, right:0,
              textAlign:'center', color:'rgba(255,255,255,0.75)',
              fontSize:'0.85rem', fontWeight:600,
            }}>{person.name}</div>
          </div>
        </div>
      )}

      <style>{`
        .pp-contact-row{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border-dim);}
        .pp-contact-row:last-child{border-bottom:none;}
        .pp-contact-icon{font-size:0.95rem;flex-shrink:0;}
        .pp-contact-val{font-size:0.83rem;color:var(--text-2);text-decoration:none;transition:color 0.2s;}
        a.pp-contact-val:hover{color:var(--gold);}
      `}</style>
    </div>
  );
}

function StatusUpdateModal({ person, onClose, onSaved }) {
  const sm = STATUS_META;
  const [status, setStatus] = useState(person.currentStatus || 'good');
  const [note, setNote]     = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('currentStatus', status);
      fd.append('statusNote', note);
      await peopleApi.update(person._id, fd);
      onSaved();
    } catch(e) { console.error(e); } finally { setSaving(false); }
  };

  return (
    <>
      <div className="modal-body">
        <p style={{fontSize:'0.82rem',color:'var(--text-2)',marginBottom:16}}>
          How would you describe your relationship with <strong style={{color:'var(--text-1)'}}>{person.name}</strong> right now?
        </p>
        <div className="status-grid-modal">
          {Object.entries(sm).map(([key, m]) => (
            <button type="button" key={key}
              className={`stb-modal ${status===key?'active':''}`}
              style={status===key?{borderColor:m.color,background:`${m.color}15`,color:m.color}:{}}
              onClick={()=>setStatus(key)}>
              <span style={{fontSize:'1.3rem'}}>{m.emoji}</span>
              <span style={{fontSize:'0.78rem',fontWeight:700}}>{m.label}</span>
            </button>
          ))}
        </div>
        <div className="form-group" style={{marginTop:16}}>
          <label>Note (optional)</label>
          <input value={note} onChange={e=>setNote(e.target.value)} placeholder="What changed? Why?"/>
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving...':'Save Status'}</button>
      </div>
      <style>{`
        .status-grid-modal{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
        .stb-modal{padding:12px 8px;border-radius:10px;background:var(--bg-elevated);border:1px solid var(--border);cursor:pointer;transition:all 0.2s;display:flex;flex-direction:column;align-items:center;gap:5px;font-family:var(--font-body);}
        .stb-modal:hover{border-color:var(--border-bright);}
      `}</style>
    </>
  );
}