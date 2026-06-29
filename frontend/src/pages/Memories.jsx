import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { memoriesApi, peopleApi } from '../utils/api.js';
import { link } from '../utils/links.js';
import { format, formatDistanceToNow } from 'date-fns';
import './Memories.css';

// ── Constants ─────────────────────────────────────────────────────────────
const EMOTIONS = [
  { value:'joyful',      emoji:'😄', label:'Joyful',      color:'#fbbf24' },
  { value:'grateful',    emoji:'🙏', label:'Grateful',    color:'#4ec9b0' },
  { value:'nostalgic',   emoji:'🌅', label:'Nostalgic',   color:'#a78bfa' },
  { value:'peaceful',    emoji:'🌿', label:'Peaceful',    color:'#6ee7b7' },
  { value:'excited',     emoji:'⚡', label:'Excited',     color:'#fb923c' },
  { value:'bittersweet', emoji:'🌧', label:'Bittersweet', color:'#818cf8' },
  { value:'sad',         emoji:'💧', label:'Sad',         color:'#60a5fa' },
  { value:'proud',       emoji:'🏆', label:'Proud',       color:'#d4a853' },
  { value:'loved',       emoji:'❤️', label:'Loved',       color:'#e8637a' },
  { value:'funny',       emoji:'😂', label:'Funny',       color:'#f472b6' },
  { value:'inspiring',   emoji:'✨', label:'Inspiring',   color:'#c4b5fd' },
  { value:'mixed',       emoji:'🌀', label:'Mixed',       color:'#9ca3af' },
];
const EMOTION_MAP = Object.fromEntries(EMOTIONS.map(e => [e.value, e]));
const TYPE_COLORS = {
  love:'#e8637a', crush:'#f472b6', attracted:'#fb923c', impressed:'#fbbf24',
  friend:'#60a5fa', family:'#4ec9b0', colleague:'#d4a853',
  acquaintance:'#a78bfa', 'one-time':'#6b7280',
};
function getInitials(n='') { return n.split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2); }

// ── @mention autocomplete ─────────────────────────────────────────────────
function useMentions(textareaRef, content, setContent, people) {
  const [suggestions, setSuggestions] = useState([]);
  const [mentionStart, setMentionStart] = useState(-1);
  const onKeyUp = useCallback(() => {
    const el = textareaRef.current; if (!el) return;
    const before = content.slice(0, el.selectionStart);
    const match = before.match(/@([A-Za-z][A-Za-z0-9 ]{0,38})$/);
    if (match) {
      setSuggestions(people.filter(p => p.name.toLowerCase().includes(match[1].toLowerCase())).slice(0,6));
      setMentionStart(el.selectionStart - match[0].length);
    } else { setSuggestions([]); setMentionStart(-1); }
  }, [content, people, textareaRef]);
  const pick = useCallback((person) => {
    const el = textareaRef.current; const pos = el.selectionStart;
    const newContent = content.slice(0, mentionStart) + `@${person.name} ` + content.slice(pos);
    setContent(newContent); setSuggestions([]); setMentionStart(-1);
    setTimeout(() => { el.focus(); const p = mentionStart+person.name.length+2; el.setSelectionRange(p,p); }, 0);
  }, [content, mentionStart, setContent, textareaRef]);
  return { suggestions, onKeyUp, pick };
}

// ── Render description with @mention links ────────────────────────────────
function renderDesc(text='', people=[]) {
  return text.split(/(@[A-Za-z][A-Za-z0-9 ]{1,39})/g).map((part, i) => {
    if (!part.startsWith('@')) return <span key={i}>{part}</span>;
    const name = part.slice(1).trim();
    const person = people.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (!person) return <span key={i} className="mem-mention-unknown">{part}</span>;
    const col = TYPE_COLORS[person.relationshipType] || '#888';
    return (
      <Link key={i} to={link.person(person._id)}
        className="mem-mention-link" style={{ color: col, background: `${col}18` }}
        onClick={e => e.stopPropagation()}>
        @{person.name}
      </Link>
    );
  });
}

// ══════════════════════════════════════════════════════════════════════════
//  MEMORY FORM
// ══════════════════════════════════════════════════════════════════════════
function MemoryForm({ memory, people, onSave, onCancel }) {
  const [title,       setTitle]       = useState(memory?.title       || '');
  const [description, setDescription] = useState(memory?.description || '');
  const [date,        setDate]        = useState(memory?.date ? memory.date.split('T')[0] : '');
  const [place,       setPlace]       = useState(memory?.place       || '');
  const [emotion,     setEmotion]     = useState(memory?.emotion     || 'joyful');
  const [tagInput,    setTagInput]    = useState('');
  const [tagList,     setTagList]     = useState(memory?.tags        || []);
  const [selPeople,   setSelPeople]   = useState(memory?.peopleInvolved?.map(p=>p._id||p) || []);
  const [isFavorite,  setFavorite]    = useState(memory?.isFavorite  || false);
  const [photos,      setPhotos]      = useState([]);
  const [previews,    setPreviews]    = useState(memory?.photos      || []);
  const [saving,      setSaving]      = useState(false);
  const [step,        setStep]        = useState(1);
  const [error,       setError]       = useState('');
  const descRef = useRef(null);
  const { suggestions, onKeyUp, pick } = useMentions(descRef, description, setDescription, people);

  useEffect(() => {
    const el = descRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }
  }, [description]);

  const addTag = (v) => {
    const t = (v||tagInput).trim().toLowerCase().replace(/\s+/g,'_');
    if (t && !tagList.includes(t)) setTagList(p=>[...p,t]);
    setTagInput('');
  };

  const handlePhotoAdd = e => {
    const files = [...e.target.files];
    setPhotos(p=>[...p,...files]);
    setPreviews(p=>[...p,...files.map(f=>URL.createObjectURL(f))]);
  };

  const removePreview = idx => {
    const existingCount = memory?.photos?.length || 0;
    if (idx < existingCount) return;
    const newIdx = idx - existingCount;
    setPhotos(p=>p.filter((_,i)=>i!==newIdx));
    setPreviews(p=>p.filter((_,i)=>i!==idx));
  };

  const togglePerson = id => setSelPeople(p => p.includes(id)?p.filter(x=>x!==id):[...p,id]);

  const mentionedPeople = [...new Set((description.match(/@([A-Za-z][A-Za-z0-9 ]{1,39})/g)||[]).map(m=>m.slice(1).trim()))]
    .map(n=>people.find(p=>p.name.toLowerCase()===n.toLowerCase())).filter(Boolean);

  const handleSubmit = async () => {
    if (!title.trim()) { setError('Title is required'); setStep(1); return; }
    if (!date)         { setError('Date is required');  setStep(1); return; }
    setSaving(true); setError('');
    try {
      const fd = new FormData();
      fd.append('title', title); fd.append('description', description);
      fd.append('date', date); fd.append('place', place);
      fd.append('emotion', emotion); fd.append('tags', tagList.join(','));
      fd.append('isFavorite', String(isFavorite));
      const allIds = [...new Set([...selPeople, ...mentionedPeople.map(p=>p._id)])];
      fd.append('peopleInvolved', JSON.stringify(allIds));
      photos.forEach(f => fd.append('photos', f));
      if (memory) await memoriesApi.update(memory._id, fd);
      else        await memoriesApi.create(fd);
      onSave();
    } catch(e) { setError(e.response?.data?.error || 'Something went wrong'); }
    finally { setSaving(false); }
  };

  return (
    <div className="mform-overlay">
      <div className="mform-modal">
        <div className="mform-header">
          <div className="mform-header-left">
            <span className="mform-header-icon">◈</span>
            <div>
              <h2>{memory ? 'Edit Memory' : 'Capture a Memory'}</h2>
              <div className="mform-steps">
                {['Details','People & Tags','Photos'].map((s,i)=>(
                  <React.Fragment key={s}>
                    <button className={`mfstep ${step===i+1?'active':step>i+1?'done':''}`}
                      onClick={()=>step>i+1&&setStep(i+1)}>{step>i+1?'✓':i+1}</button>
                    {i<2&&<div className={`mfstep-line ${step>i+1?'done':''}`}/>}
                    <span className={`mfstep-txt ${step===i+1?'show':''}`}>{s}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
          <button className="mform-close" onClick={onCancel}>✕</button>
        </div>

        {error && <div className="mform-error">{error}</div>}

        {step===1 && (
          <div className="mform-body">
            <div className="form-group">
              <label>Memory Title *</label>
              <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Give this memory a name…" autoFocus/>
            </div>
            <div className="form-grid">
              <div className="form-group"><label>Date *</label><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
              <div className="form-group"><label>Place</label><input value={place} onChange={e=>setPlace(e.target.value)} placeholder="Where was this?"/></div>
            </div>
            <div className="form-group">
              <label>How did this feel?</label>
              <div className="emotion-grid">
                {EMOTIONS.map(em=>(
                  <button type="button" key={em.value}
                    className={`emo-btn ${emotion===em.value?'active':''}`}
                    style={emotion===em.value?{borderColor:em.color,background:`${em.color}18`,color:em.color}:{}}
                    onClick={()=>setEmotion(em.value)}>
                    <span className="emo-icon">{em.emoji}</span>
                    <span className="emo-label">{em.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Tell the story</label>
              <div style={{position:'relative'}}>
                <textarea ref={descRef} className="mform-textarea" value={description}
                  onChange={e=>setDescription(e.target.value)} onKeyUp={onKeyUp}
                  placeholder="Describe this memory… use @Name to mention people." rows={4}/>
                {suggestions.length>0&&(
                  <div className="mention-dropdown">
                    {suggestions.map(p=>{
                      const col=TYPE_COLORS[p.relationshipType]||'#888';
                      return(
                        <button key={p._id} className="mention-option" onMouseDown={()=>pick(p)}>
                          <div className="mention-opt-avatar">{p.profilePhoto?<img src={p.profilePhoto} alt={p.name}/>:<div style={{background:`${col}22`,color:col}}>{getInitials(p.name)}</div>}</div>
                          <div className="mention-opt-info"><span className="mention-opt-name">{p.name}</span><span className="mention-opt-type" style={{color:col}}>{p.relationshipType}</span></div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="form-group" style={{flexDirection:'row',alignItems:'center',gap:10}}>
              <input type="checkbox" id="fav" checked={isFavorite} onChange={e=>setFavorite(e.target.checked)} style={{width:'auto',margin:0}}/>
              <label htmlFor="fav" style={{textTransform:'none',letterSpacing:'normal',fontSize:'0.875rem',color:'var(--text-2)',marginBottom:0,cursor:'pointer'}}>⭐ Mark as favourite memory</label>
            </div>
          </div>
        )}

        {step===2 && (
          <div className="mform-body">
            {mentionedPeople.length>0&&(
              <div className="mform-mentioned-banner">
                <span>✨ Auto-detected from your description:</span>
                {mentionedPeople.map(p=><span key={p._id} className="mform-auto-pill" style={{color:TYPE_COLORS[p.relationshipType]||'#888',background:`${TYPE_COLORS[p.relationshipType]||'#888'}18`}}>@{p.name}</span>)}
              </div>
            )}
            <div className="form-group">
              <label>Who was there?</label>
              <div className="people-picker">
                {people.map(p=>{
                  const col=TYPE_COLORS[p.relationshipType]||'#888';
                  const autoSel=mentionedPeople.find(mp=>mp._id===p._id);
                  const manSel=selPeople.includes(p._id);
                  const isSel=autoSel||manSel;
                  return(
                    <button key={p._id} type="button"
                      className={`person-picker-btn ${isSel?'active':''} ${autoSel?'auto':''}`}
                      style={isSel?{borderColor:col,background:`${col}18`}:{}}
                      onClick={()=>!autoSel&&togglePerson(p._id)}>
                      <div className="ppb-avatar">{p.profilePhoto?<img src={p.profilePhoto} alt={p.name}/>:<div style={{background:`${col}22`,color:col}}>{getInitials(p.name)}</div>}</div>
                      <span className="ppb-name">{p.name}</span>
                      {autoSel&&<span className="ppb-auto">@</span>}
                      {manSel&&!autoSel&&<span className="ppb-check">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="form-group">
              <label>Tags</label>
              <div className="editor-tags-row">
                {tagList.map(t=>(
                  <span key={t} className="editor-tag" style={{'--ea':'var(--violet)'}}>
                    #{t}<button onClick={()=>setTagList(p=>p.filter(x=>x!==t))}>✕</button>
                  </span>
                ))}
                <input className="editor-tag-input" placeholder="Add tag…" value={tagInput}
                  onChange={e=>setTagInput(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter'||e.key===','){e.preventDefault();addTag();}if(e.key==='Backspace'&&!tagInput&&tagList.length)setTagList(p=>p.slice(0,-1));}}
                  onBlur={()=>tagInput&&addTag()}/>
              </div>
            </div>
          </div>
        )}

        {step===3 && (
          <div className="mform-body">
            <div className="form-group">
              <label>Photos ({previews.length})</label>
              <label className="photo-drop-zone">
                <input type="file" accept="image/*" multiple onChange={handlePhotoAdd} style={{display:'none'}}/>
                <span className="pdz-icon">📷</span>
                <span className="pdz-text">Click to add photos</span>
                <span className="pdz-sub">JPG, PNG, WEBP · up to 8 MB each</span>
              </label>
            </div>
            {previews.length>0&&(
              <div className="photo-preview-grid">
                {previews.map((src,i)=>(
                  <div key={i} className="photo-preview-item">
                    <img src={src} alt={`photo ${i+1}`}/>
                    <button className="photo-remove-btn" onClick={()=>removePreview(i)}>✕</button>
                    {i===0&&<span className="photo-cover-badge">Cover</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mform-footer">
          {step>1&&<button className="btn btn-ghost" onClick={()=>setStep(s=>s-1)}>← Back</button>}
          <div style={{marginLeft:'auto',display:'flex',gap:10}}>
            {step<3
              ?<button className="btn btn-primary" onClick={()=>{if(!title.trim()){setError('Title required');return;}if(!date){setError('Date required');return;}setError('');setStep(s=>s+1);}}>Continue →</button>
              :<button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving?'Saving…':memory?'✓ Update':'✓ Save Memory'}</button>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  MEMORY CARD
// ══════════════════════════════════════════════════════════════════════════
function MemoryCard({ memory, onEdit, onDelete, onFav, onTagClick, onPersonFilter }) {
  const emo = EMOTION_MAP[memory.emotion] || EMOTION_MAP.joyful;
  const cover = memory.photos?.[memory.coverPhoto||0];
  const [confirmDel, setConfirmDel] = useState(false);

  return (
    <div className="mem-card" style={{'--ec':emo.color}} onClick={()=>onEdit(memory)}>
      {cover ? (
        <div className="mem-card-cover">
          <img src={cover} alt={memory.title}/>
          <div className="mem-card-cover-gradient"/>
          {memory.isFavorite&&<div className="mem-card-fav">⭐</div>}
          <div className="mem-card-emotion-badge" style={{background:`${emo.color}cc`}}>{emo.emoji}</div>
        </div>
      ) : (
        <div className="mem-card-no-cover" style={{background:`${emo.color}12`}}>
          <span className="mem-card-no-cover-icon">{emo.emoji}</span>
          {memory.isFavorite&&<div className="mem-card-fav">⭐</div>}
        </div>
      )}

      <div className="mem-card-body">
        <div className="mem-card-date-row">
          <span className="mem-card-date">{memory.date && !isNaN(new Date(memory.date)) ? format(new Date(memory.date),'MMM d, yyyy') : 'Unknown Date'}</span>
          {memory.place&&<span className="mem-card-place">📍 {memory.place}</span>}
        </div>
        <div className="mem-card-title">{memory.title}</div>
        {memory.description&&(
          <div className="mem-card-desc">
            {renderDesc(memory.description.slice(0,140)+(memory.description.length>140?'…':''), memory.peopleInvolved)}
          </div>
        )}

        {/* People — click goes to profile */}
        {memory.peopleInvolved?.length>0&&(
          <div className="mem-card-people" onClick={e=>e.stopPropagation()}>
            {memory.peopleInvolved.slice(0,4).map(p=>{
              const col=TYPE_COLORS[p.relationshipType]||'#888';
              return(
                <Link key={p._id} to={link.person(p._id)}
                  className="mem-person-chip" style={{color:col,background:`${col}15`,borderColor:`${col}30`}}>
                  {p.profilePhoto?<img src={p.profilePhoto} alt={p.name}/>:<div style={{background:`${col}22`,color:col}}>{getInitials(p.name)}</div>}
                  <span>{p.name}</span>
                </Link>
              );
            })}
            {memory.peopleInvolved.length>4&&<span className="mem-people-more">+{memory.peopleInvolved.length-4}</span>}
          </div>
        )}

        {/* Tags — click filters memories by that tag */}
        {memory.tags?.length>0&&(
          <div className="mem-card-tags" onClick={e=>e.stopPropagation()}>
            {memory.tags.slice(0,3).map(t=>(
              <button key={t} className="mem-card-tag mem-tag-btn" style={{'--ec':emo.color}}
                onClick={e=>{e.stopPropagation(); onTagClick(t);}}>#{t}</button>
            ))}
            {memory.tags.length>3&&<span className="mem-tag-more">+{memory.tags.length-3}</span>}
          </div>
        )}
      </div>

      <div className="mem-card-footer" onClick={e=>e.stopPropagation()}>
        <span className="mem-card-ago">{memory.date && !isNaN(new Date(memory.date)) ? formatDistanceToNow(new Date(memory.date),{addSuffix:true}) : ''}</span>
        <div className="mem-card-actions">
          <button className="mca-btn" onClick={e=>{e.stopPropagation();onFav(memory);}}>{memory.isFavorite?'⭐':'☆'}</button>
          {confirmDel
            ?<><button className="mca-btn mca-confirm" onClick={e=>{e.stopPropagation();onDelete(memory._id);}}>✓ Delete</button><button className="mca-btn" onClick={e=>{e.stopPropagation();setConfirmDel(false);}}>✕</button></>
            :<button className="mca-btn mca-del" onClick={e=>{e.stopPropagation();setConfirmDel(true);}}>🗑</button>
          }
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  TIMELINE VIEW
// ══════════════════════════════════════════════════════════════════════════
function TimelineView({ memories, onEdit, onTagClick }) {
  const grouped = {};
  memories.forEach(m => {
    const d = m.date && !isNaN(new Date(m.date)) ? new Date(m.date) : new Date();
    const year = d.getFullYear();
    const mon  = format(d, 'MMMM yyyy');
    if (!grouped[year]) grouped[year] = {};
    if (!grouped[year][mon]) grouped[year][mon] = [];
    grouped[year][mon].push(m);
  });

  return (
    <div className="timeline-view">
      {Object.entries(grouped).sort((a,b)=>b[0]-a[0]).map(([year,months])=>(
        <div key={year} className="tl-year-block">
          <div className="tl-year-label">{year}</div>
          {Object.entries(months).map(([month,mems])=>(
            <div key={month} className="tl-month-block">
              <div className="tl-month-label">{month}</div>
              <div className="tl-items">
                {mems.map((m,i)=>{
                  const emo=EMOTION_MAP[m.emotion]||EMOTION_MAP.joyful;
                  const cover=m.photos?.[m.coverPhoto||0];
                  return(
                    <div key={m._id} className="tl-item" onClick={()=>onEdit(m)}
                      style={{'--ec':emo.color,animationDelay:`${i*0.06}s`}}>
                      <div className="tl-node">
                        <div className="tl-dot" style={{background:emo.color,boxShadow:`0 0 0 4px ${emo.color}25`}}>{emo.emoji}</div>
                        <div className="tl-spine"/>
                      </div>
                      <div className="tl-card">
                        {cover&&<div className="tl-card-thumb"><img src={cover} alt={m.title}/></div>}
                        <div className="tl-card-content">
                          <div className="tl-card-top">
                            <span className="tl-card-date">{m.date && !isNaN(new Date(m.date)) ? format(new Date(m.date),'EEEE, d MMM') : 'Unknown Date'}</span>
                            {m.place&&<span className="tl-card-place">📍 {m.place}</span>}
                            {m.isFavorite&&<span style={{fontSize:'0.85rem'}}>⭐</span>}
                          </div>
                          <div className="tl-card-title">{m.title}</div>
                          {m.description&&<div className="tl-card-desc">{renderDesc(m.description.slice(0,120)+(m.description.length>120?'…':''),m.peopleInvolved)}</div>}

                          {/* People chips → profile links */}
                          {m.peopleInvolved?.length>0&&(
                            <div className="tl-people" onClick={e=>e.stopPropagation()}>
                              {m.peopleInvolved.slice(0,3).map(p=>{
                                const col=TYPE_COLORS[p.relationshipType]||'#888';
                                return(
                                  <Link key={p._id} to={link.person(p._id)}
                                    className="tl-person-chip" style={{color:col,background:`${col}15`}}>
                                    {p.profilePhoto?<img src={p.profilePhoto} alt={p.name}/>:<div style={{background:`${col}22`,color:col}}>{getInitials(p.name)}</div>}
                                    {p.name}
                                  </Link>
                                );
                              })}
                              {m.peopleInvolved.length>3&&<span style={{fontSize:'0.72rem',color:'var(--text-3)'}}>+{m.peopleInvolved.length-3}</span>}
                            </div>
                          )}

                          {/* Tags → click to filter */}
                          {m.tags?.length>0&&(
                            <div style={{display:'flex',gap:5,flexWrap:'wrap',marginTop:6}} onClick={e=>e.stopPropagation()}>
                              {m.tags.slice(0,3).map(t=>(
                                <button key={t} className="mem-card-tag mem-tag-btn" style={{'--ec':emo.color}}
                                  onClick={e=>{e.stopPropagation();onTagClick(t);}}>#{t}</button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════
export default function Memories() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [memories,  setMemories]  = useState([]);
  const [people,    setPeople]    = useState([]);
  const [meta,      setMeta]      = useState({ tags:[], years:[], emotions:[] });
  const [loading,   setLoading]   = useState(true);
  const [viewMode,  setViewMode]  = useState('grid');
  const [showForm,  setShowForm]  = useState(false);
  const [editMem,   setEditMem]   = useState(null);
  const [search,    setSearch]    = useState('');
  const [dSearch,   setDSearch]   = useState('');

  // ── All filters live in URL params ──────────────────────────────────────
  const activeTag    = searchParams.get('tag')     || '';
  const activeEmo    = searchParams.get('emotion') || '';
  const activeYear   = searchParams.get('year')    || '';
  const activePerson = searchParams.get('person')  || '';
  const showFavOnly  = searchParams.get('favorite') === 'true';

  const setFilter = useCallback((key, val) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (val) next.set(key, val); else next.delete(key);
      return next;
    });
  }, [setSearchParams]);

  const clearFilters = () => setSearchParams({});

  useEffect(() => {
    const t = setTimeout(()=>setDSearch(search), 300);
    return ()=>clearTimeout(t);
  }, [search]);

  // Person filter banner data
  const filteredPerson = activePerson ? people.find(p=>p._id===activePerson) : null;

  const load = useCallback(async () => {
    try {
      const params = {};
      if (dSearch)      params.search   = dSearch;
      if (activeTag)    params.tag      = activeTag;
      if (activeEmo)    params.emotion  = activeEmo;
      if (activeYear)   params.year     = activeYear;
      if (activePerson) params.person   = activePerson;
      if (showFavOnly)  params.favorite = true;
      const [mr, pr, metaR] = await Promise.all([memoriesApi.getAll(params), peopleApi.getAll(), memoriesApi.getMeta()]);
      setMemories(mr.data); setPeople(pr.data); setMeta(metaR.data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [dSearch, activeTag, activeEmo, activeYear, activePerson, showFavOnly]);

  useEffect(() => { load(); }, [load]);

  const handleSave   = () => { setShowForm(false); setEditMem(null); load(); };
  const handleEdit   = m  => { setEditMem(m); setShowForm(true); };
  const handleDelete = async id => { try { await memoriesApi.delete(id); load(); } catch(e){} };
  const handleFav    = async m => {
    const fd = new FormData(); fd.append('isFavorite', String(!m.isFavorite));
    try { await memoriesApi.update(m._id, fd); load(); } catch(e){}
  };
  const handleTagClick = tag => setFilter('tag', tag === activeTag ? '' : tag);

  const hasFilter = dSearch||activeTag||activeEmo||activeYear||activePerson||showFavOnly;
  const favCount  = meta.emotions ? memories.filter(m=>m.isFavorite).length : 0;

  return (
    <div className="memories-page">

      {/* Header */}
      <div className="mem-header">
        <div>
          <h1>Memories</h1>
          <p>{memories.length} {memories.length===1?'memory':'memories'}{hasFilter?' found':' captured'}</p>
        </div>
        <div className="mem-header-actions">
          <div className="view-btns">
            <button className={viewMode==='grid'?'active':''} onClick={()=>setViewMode('grid')} title="Grid">⊞</button>
            <button className={viewMode==='timeline'?'active':''} onClick={()=>setViewMode('timeline')} title="Timeline">⎘</button>
          </div>
          <button className="btn btn-primary" onClick={()=>{setEditMem(null);setShowForm(true);}}>+ Capture Memory</button>
        </div>
      </div>

      {/* Person filter banner — shows when coming from a profile */}
      {filteredPerson && (
        <div className="mem-person-banner">
          <Link to={link.person(filteredPerson._id)} className="mem-person-banner-avatar">
            {filteredPerson.profilePhoto
              ?<img src={filteredPerson.profilePhoto} alt={filteredPerson.name}/>
              :<div style={{background:'var(--bg-elevated)',color:'var(--gold)'}}>{getInitials(filteredPerson.name)}</div>
            }
          </Link>
          <div className="mem-person-banner-text">
            <span>Memories with</span>
            <Link to={link.person(filteredPerson._id)} className="mem-person-banner-name">
              {filteredPerson.name}
            </Link>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={()=>setFilter('person','')}>✕ Clear</button>
        </div>
      )}

      {/* Search + filter controls */}
      <div className="mem-controls">
        <div className="notes-search-wrap" style={{flex:1}}>
          <span className="notes-search-icon">🔍</span>
          <input className="notes-search" placeholder="Search memories, places, people…"
            value={search} onChange={e=>setSearch(e.target.value)}/>
          {search&&<button className="notes-search-clear" onClick={()=>setSearch('')}>✕</button>}
        </div>
        <select className="mem-select" value={activeYear} onChange={e=>setFilter('year',e.target.value)}>
          <option value="">All years</option>
          {meta.years.map(y=><option key={y} value={y}>{y}</option>)}
        </select>
        <select className="mem-select" value={activeEmo} onChange={e=>setFilter('emotion',e.target.value)}>
          <option value="">All emotions</option>
          {EMOTIONS.map(em=><option key={em.value} value={em.value}>{em.emoji} {em.label}</option>)}
        </select>
        <button className={`btn ${showFavOnly?'btn-primary':'btn-ghost'} btn-sm`}
          onClick={()=>setFilter('favorite',showFavOnly?'':'true')}>
          ⭐{favCount>0?` (${favCount})`:''}
        </button>
        {hasFilter&&(
          <button className="btn btn-ghost btn-sm" onClick={clearFilters} title="Clear all filters">✕ Clear</button>
        )}
      </div>

      {/* Tag pills */}
      {meta.tags.length>0&&(
        <div className="notes-tags-bar">
          <button className={`tag-pill ${!activeTag?'active':''}`} onClick={()=>setFilter('tag','')}>All</button>
          {meta.tags.map(t=>(
            <button key={t} className={`tag-pill ${activeTag===t?'active':''}`}
              onClick={()=>setFilter('tag', t===activeTag?'':t)}>#{t}</button>
          ))}
        </div>
      )}

      {/* Emotion quick-filter chips */}
      <div className="emo-filter-row">
        {EMOTIONS.map(em=>{
          const count=memories.filter(m=>m.emotion===em.value).length;
          if(!count&&!activeEmo) return null;
          return(
            <button key={em.value}
              className={`emo-filter-btn ${activeEmo===em.value?'active':''}`}
              style={activeEmo===em.value?{borderColor:em.color,background:`${em.color}18`,color:em.color}:{}}
              onClick={()=>setFilter('emotion',em.value===activeEmo?'':em.value)}>
              {em.emoji}<span>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="mem-loading"><div className="spinner"/></div>
      ) : memories.length===0 ? (
        <div className="mem-empty">
          <div className="mem-empty-icon">◈</div>
          <h3>{hasFilter?'No memories match':'No memories yet'}</h3>
          <p>{hasFilter?'Try removing some filters.':'Start capturing the moments that matter.'}</p>
          {!hasFilter&&<button className="btn btn-primary" style={{marginTop:24}} onClick={()=>{setEditMem(null);setShowForm(true);}}>+ Capture First Memory</button>}
        </div>
      ) : viewMode==='grid' ? (
        <div className="mem-grid">
          {memories.map(m=>(
            <MemoryCard key={m._id} memory={m} onEdit={handleEdit}
              onDelete={handleDelete} onFav={handleFav}
              onTagClick={handleTagClick}
              onPersonFilter={id=>setFilter('person',id)}/>
          ))}
        </div>
      ) : (
        <TimelineView memories={memories} onEdit={handleEdit} onTagClick={handleTagClick}/>
      )}

      {showForm&&<MemoryForm memory={editMem} people={people} onSave={handleSave} onCancel={()=>{setShowForm(false);setEditMem(null);}}/>}
    </div>
  );
}