import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { link } from '../utils/links.js';
import { notesApi, peopleApi, getImageUrl } from '../utils/api.js';
import { format, formatDistanceToNow } from 'date-fns';
import './Notes.css';

// ── Constants ──────────────────────────────────────────────────────────────
const COLOR_OPTIONS = [
  { value: 'default', label: 'Default', hex: '#111520' },
  { value: 'rose',    label: 'Rose',    hex: '#1a0f10' },
  { value: 'teal',    label: 'Teal',    hex: '#0a1614' },
  { value: 'violet',  label: 'Violet',  hex: '#110f1a' },
  { value: 'gold',    label: 'Gold',    hex: '#131009' },
  { value: 'blue',    label: 'Blue',    hex: '#0a1018' },
];
const COLOR_ACCENT = {
  default: '#60a5fa', rose: '#e8637a', teal: '#4ec9b0',
  violet: '#a78bfa', gold: '#d4a853', blue: '#38bdf8',
};
const TYPE_COLORS = {
  love:'#e8637a', crush:'#f472b6', attracted:'#fb923c', impressed:'#fbbf24',
  friend:'#60a5fa', family:'#4ec9b0', colleague:'#d4a853',
  acquaintance:'#a78bfa', 'one-time':'#6b7280',
};

function getInitials(n='') { return n.split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2); }

// ── @mention tokenizer for rendering content ──────────────────────────────
function renderContent(content, mentionedPeople=[]) {
  if (!content) return null;
  const parts = content.split(/(@[A-Za-z][A-Za-z0-9 ]{1,39})/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      const name = part.slice(1).trim();
      const person = mentionedPeople.find(p => p.name.toLowerCase() === name.toLowerCase());
      if (person) {
        const col = TYPE_COLORS[person.relationshipType] || '#60a5fa';
        return (
          <Link key={i} to={`/relationships/${person._id}`}
            className="note-mention-link" style={{ color: col, background: `${col}18` }}
            onClick={e => e.stopPropagation()}>
            @{person.name}
          </Link>
        );
      }
      return <span key={i} className="note-mention-unresolved">{part}</span>;
    }
    return <span key={i}>{part}</span>;
  });
}

// ── Mention autocomplete hook ────────────────────────────────────────────
function useMentionAutocomplete(textareaRef, content, setContent, people) {
  const [suggestions, setSuggestions] = useState([]);
  const [mentionStart, setMentionStart] = useState(-1);

  const handleKeyUp = useCallback((e) => {
    const el = textareaRef.current;
    if (!el) return;
    const pos = el.selectionStart;
    const before = content.slice(0, pos);
    const match = before.match(/@([A-Za-z][A-Za-z0-9 ]{0,38})$/);
    if (match) {
      const query = match[1].toLowerCase();
      const filtered = people.filter(p => p.name.toLowerCase().includes(query)).slice(0, 6);
      setSuggestions(filtered);
      setMentionStart(pos - match[0].length);
    } else {
      setSuggestions([]);
      setMentionStart(-1);
    }
  }, [content, people, textareaRef]);

  const selectSuggestion = useCallback((person) => {
    const el = textareaRef.current;
    const pos = el.selectionStart;
    const before = content.slice(0, mentionStart);
    const after  = content.slice(pos);
    const newContent = `${before}@${person.name} ${after}`;
    setContent(newContent);
    setSuggestions([]);
    setMentionStart(-1);
    setTimeout(() => {
      el.focus();
      const newPos = before.length + person.name.length + 2;
      el.setSelectionRange(newPos, newPos);
    }, 0);
  }, [content, mentionStart, setContent, textareaRef]);

  return { suggestions, handleKeyUp, selectSuggestion, setSuggestions };
}

// ══════════════════════════════════════════════════════════════════════════
//  NOTE EDITOR (create / edit)
// ══════════════════════════════════════════════════════════════════════════
function NoteEditor({ note, people, onSave, onCancel }) {
  const [title,    setTitle]   = useState(note?.title   || '');
  const [content,  setContent] = useState(note?.content || '');
  const [tags,     setTags]    = useState(note?.tags?.join(', ') || '');
  const [color,    setColor]   = useState(note?.color   || 'default');
  const [isPinned, setPinned]  = useState(note?.isPinned || false);
  const [saving,   setSaving]  = useState(false);
  const [tagInput, setTagInput]= useState('');
  const [tagList,  setTagList] = useState(note?.tags || []);
  const textareaRef = useRef(null);

  const { suggestions, handleKeyUp, selectSuggestion, setSuggestions } =
    useMentionAutocomplete(textareaRef, content, setContent, people);

  const addTag = (val) => {
    const t = (val || tagInput).trim().toLowerCase().replace(/\s+/g,'_');
    if (t && !tagList.includes(t)) setTagList(prev => [...prev, t]);
    setTagInput('');
  };

  const removeTag = (t) => setTagList(prev => prev.filter(x => x !== t));

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); }
    if (e.key === 'Backspace' && !tagInput && tagList.length) {
      setTagList(prev => prev.slice(0,-1));
    }
  };

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const payload = { title, content, tags: tagList.join(','), color, isPinned };
      if (note) await notesApi.update(note._id, payload);
      else      await notesApi.create(payload);
      onSave();
    } catch(err) { console.error(err); }
    finally { setSaving(false); }
  };

  const accent = COLOR_ACCENT[color] || COLOR_ACCENT.default;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }
  }, [content]);

  return (
    <div className="editor-pane" style={{ '--ea': accent }}>
      {/* Toolbar */}
      <div className="editor-toolbar">
        <div className="editor-toolbar-left">
          <button className="editor-back-btn" onClick={onCancel}>← Back</button>
          <div className="editor-toolbar-divider"/>
          {/* Color picker */}
          <div className="color-picker">
            {COLOR_OPTIONS.map(c => (
              <button key={c.value} title={c.label}
                className={`color-dot ${color===c.value?'active':''}`}
                style={{ background: COLOR_ACCENT[c.value] }}
                onClick={() => setColor(c.value)}/>
            ))}
          </div>
          {/* Pin */}
          <button className={`editor-pin-btn ${isPinned?'pinned':''}`} onClick={()=>setPinned(p=>!p)} title="Pin note">
            📌
          </button>
        </div>
        <div className="editor-toolbar-right">
          <span className="editor-wordcount">{wordCount} words · {charCount} chars</span>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Discard</button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving||!content.trim()}>
            {saving ? 'Saving…' : note ? '✓ Update' : '✓ Save Note'}
          </button>
        </div>
      </div>

      <div className="editor-body">
        {/* Title */}
        <input
          className="editor-title-input"
          placeholder="Note title…"
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{ '--ea': accent }}
        />

        {/* @mention hint */}
        <div className="editor-hint">
          Use <kbd>@Name</kbd> to mention a person · They will auto-link to their profile
        </div>

        {/* Content textarea */}
        <div className="editor-content-wrap" style={{ position:'relative' }}>
          <textarea
            ref={textareaRef}
            className="editor-textarea"
            placeholder="Start writing your note…&#10;&#10;Use @PersonName to mention someone."
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyUp={handleKeyUp}
            style={{ '--ea': accent }}
          />

          {/* Mention suggestions dropdown */}
          {suggestions.length > 0 && (
            <div className="mention-dropdown">
              {suggestions.map(p => {
                const col = TYPE_COLORS[p.relationshipType] || '#888';
                return (
                  <button key={p._id} className="mention-option" onMouseDown={()=>selectSuggestion(p)}>
                    <div className="mention-opt-avatar">
                      {p.profilePhoto
                        ? <img src={getImageUrl(p.profilePhoto)} alt={p.name}/>
                        : <div style={{background:`${col}22`,color:col}}>{getInitials(p.name)}</div>
                      }
                    </div>
                    <div className="mention-opt-info">
                      <span className="mention-opt-name">{p.name}</span>
                      <span className="mention-opt-type" style={{color:col}}>{p.relationshipType}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Tags input */}
        <div className="editor-tags-section">
          <div className="editor-tags-label">Tags</div>
          <div className="editor-tags-row">
            {tagList.map(t => (
              <span key={t} className="editor-tag" style={{'--ea':accent}}>
                #{t} <button onClick={()=>removeTag(t)}>✕</button>
              </span>
            ))}
            <input
              className="editor-tag-input"
              placeholder="Add tag…"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={() => tagInput && addTag()}
            />
          </div>
        </div>

        {/* Mention preview */}
        {content.includes('@') && (
          <div className="editor-mention-preview">
            <div className="editor-tags-label">Mentioned People</div>
            <div className="editor-mention-pills">
              {[...new Set((content.match(/@([A-Za-z][A-Za-z0-9 ]{1,39})/g)||[]).map(m=>m.slice(1).trim()))].map(name => {
                const person = people.find(p => p.name.toLowerCase() === name.toLowerCase());
                const col = person ? TYPE_COLORS[person.relationshipType]||'#60a5fa' : '#555';
                return (
                  <span key={name} className="editor-mention-pill" style={{color:col,background:`${col}18`,borderColor:`${col}30`}}>
                    @{name} {person ? '✓' : '?'}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  NOTE CARD
// ══════════════════════════════════════════════════════════════════════════
function NoteCard({ note, onEdit, onDelete, onPin, onTagClick }) {
  const [confirmDel, setConfirmDel] = useState(false);
  const accent = COLOR_ACCENT[note.color] || COLOR_ACCENT.default;
  const preview = note.content.slice(0, 220) + (note.content.length > 220 ? '…' : '');
  const ago = formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true });

  return (
    <div className={`note-card note-card-${note.color||'default'}`} style={{'--na':accent}}
      onClick={() => onEdit(note)}>

      {/* Pin indicator */}
      {note.isPinned && <div className="note-pin-badge">📌</div>}

      {/* Accent bar */}
      <div className="note-card-bar" style={{background:accent}}/>

      <div className="note-card-body">
        {note.title && <div className="note-card-title">{note.title}</div>}
        <div className="note-card-preview">
          {renderContent(preview, note.mentionedPeople)}
        </div>
      </div>

      {/* Tags */}
      {note.tags?.length > 0 && (
        <div className="note-card-tags" onClick={e=>e.stopPropagation()}>
          {note.tags.slice(0,4).map(t => (
            <button key={t} className="note-card-tag note-tag-btn" style={{'--na':accent}}
              onClick={e=>{e.stopPropagation();onTagClick(t);}}>#{t}</button>
          ))}
          {note.tags.length > 4 && <span className="note-card-tag-more">+{note.tags.length-4}</span>}
        </div>
      )}

      {/* Mentioned people */}
      {note.mentionedPeople?.length > 0 && (
        <div className="note-card-mentions" onClick={e=>e.stopPropagation()}>
          {note.mentionedPeople.slice(0,4).map(p => {
            const col = TYPE_COLORS[p.relationshipType]||'#888';
            return (
              <Link key={p._id} to={`/relationships/${p._id}`}
                className="note-card-person" style={{background:`${col}15`,borderColor:`${col}30`}}
                title={p.name}>
                {p.profilePhoto
                  ? <img src={getImageUrl(p.profilePhoto)} alt={p.name}/>
                  : <div style={{background:`${col}25`,color:col}}>{getInitials(p.name)}</div>
                }
                <span style={{color:col}}>@{p.name}</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="note-card-footer" onClick={e=>e.stopPropagation()}>
        <span className="note-card-time">{ago}</span>
        <div className="note-card-actions">
          <button className="nca-btn" onClick={e=>{e.stopPropagation();onPin(note);}} title="Toggle pin">
            {note.isPinned ? '📌' : '📍'}
          </button>
          {confirmDel
            ? <>
                <button className="nca-btn nca-confirm" onClick={e=>{e.stopPropagation();onDelete(note._id);}}>✓ Delete</button>
                <button className="nca-btn" onClick={e=>{e.stopPropagation();setConfirmDel(false);}}>✕</button>
              </>
            : <button className="nca-btn nca-del" onClick={e=>{e.stopPropagation();setConfirmDel(true);}} title="Delete">🗑</button>
          }
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  MAIN NOTES PAGE
// ══════════════════════════════════════════════════════════════════════════
export default function Notes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [notes,       setNotes]      = useState([]);
  const [people,      setPeople]     = useState([]);
  const [allTags,     setAllTags]    = useState([]);
  const [loading,     setLoading]    = useState(true);
  const [view,        setView]       = useState('list'); // 'list' | 'editor'
  const [editingNote, setEditingNote]= useState(null);
  const [search,      setSearch]     = useState('');
  const activeTag = searchParams.get('tag') || '';
  const setActiveTag = (val) => setSearchParams(prev => { const n=new URLSearchParams(prev); if(val) n.set('tag',val); else n.delete('tag'); return n; });
  const [sortBy,      setSortBy]     = useState('updated'); // 'updated' | 'created' | 'title'
  const [layout,      setLayout]     = useState('masonry'); // 'masonry' | 'list'
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadNotes = useCallback(async () => {
    try {
      const params = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (activeTag)       params.tag    = activeTag;
      const [nr, pr, tr] = await Promise.all([
        notesApi.getAll(params),
        peopleApi.getAll(),
        notesApi.getTags(),
      ]);
      let sorted = nr.data;
      if (sortBy === 'created') sorted = [...sorted].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
      else if (sortBy === 'title') sorted = [...sorted].sort((a,b)=>(a.title||'').localeCompare(b.title||''));
      setNotes(sorted);
      setPeople(pr.data);
      setAllTags(tr.data);
    } catch(err) { console.error(err); }
    finally { setLoading(false); }
  }, [debouncedSearch, activeTag, sortBy]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const handleSave = () => { setView('list'); setEditingNote(null); loadNotes(); };
  const handleEdit = (note) => { setEditingNote(note); setView('editor'); };
  const handleNew  = () => { setEditingNote(null); setView('editor'); };

  const handleDelete = async (id) => {
    try { await notesApi.delete(id); loadNotes(); } catch(err) { console.error(err); }
  };

  const handlePin = async (note) => {
    try { await notesApi.update(note._id, { isPinned: !note.isPinned }); loadNotes(); }
    catch(err) { console.error(err); }
  };

  // ── Editor view ──
  if (view === 'editor') {
    return (
      <NoteEditor
        note={editingNote}
        people={people}
        onSave={handleSave}
        onCancel={() => { setView('list'); setEditingNote(null); }}
      />
    );
  }

  // ── List view ──
  const pinned   = notes.filter(n => n.isPinned);
  const unpinned = notes.filter(n => !n.isPinned);

  return (
    <div className="notes-page">

      {/* Header */}
      <div className="notes-header">
        <div>
          <h1>Notes</h1>
          <p>{notes.length} note{notes.length!==1?'s':''}{activeTag ? ` tagged #${activeTag}` : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={handleNew}>+ New Note</button>
      </div>

      {/* Search + filters bar */}
      <div className="notes-controls">
        <div className="notes-search-wrap">
          <span className="notes-search-icon">🔍</span>
          <input
            className="notes-search"
            placeholder="Search notes, content, tags…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="notes-search-clear" onClick={()=>setSearch('')}>✕</button>}
        </div>

        <div className="notes-filter-right">
          {/* Sort */}
          <select className="notes-sort-select" value={sortBy} onChange={e=>setSortBy(e.target.value)}>
            <option value="updated">Last updated</option>
            <option value="created">Date created</option>
            <option value="title">Title A–Z</option>
          </select>

          {/* Layout toggle */}
          <div className="layout-btns">
            <button className={layout==='masonry'?'active':''} onClick={()=>setLayout('masonry')} title="Grid">⊞</button>
            <button className={layout==='list'?'active':''} onClick={()=>setLayout('list')} title="List">☰</button>
          </div>
        </div>
      </div>

      {/* Tag pills */}
      {allTags.length > 0 && (
        <div className="notes-tags-bar">
          <button className={`tag-pill ${!activeTag?'active':''}`} onClick={()=>setActiveTag('')}>All</button>
          {allTags.map(t => (
            <button key={t} className={`tag-pill ${activeTag===t?'active':''}`} onClick={()=>setActiveTag(t===activeTag?'':t)}>
              #{t}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="notes-loading"><div className="spinner"/></div>
      ) : notes.length === 0 ? (
        <div className="notes-empty">
          <div className="notes-empty-icon">✦</div>
          <h3>{search||activeTag ? 'No notes match' : 'No notes yet'}</h3>
          <p>{search||activeTag ? 'Try a different search or tag.' : 'Start writing to capture your thoughts.'}</p>
          {!search && !activeTag && (
            <button className="btn btn-primary" style={{marginTop:20}} onClick={handleNew}>+ Write First Note</button>
          )}
        </div>
      ) : (
        <>
          {/* Pinned section */}
          {pinned.length > 0 && (
            <section className="notes-section">
              <div className="notes-section-label">📌 Pinned</div>
              <div className={layout==='masonry'?'notes-masonry':'notes-listview'}>
                {pinned.map(n => <NoteCard key={n._id} note={n} onEdit={handleEdit} onDelete={handleDelete} onPin={handlePin} onTagClick={t=>setActiveTag(t===activeTag?'':t)}/>)}
              </div>
            </section>
          )}

          {/* All notes */}
          {unpinned.length > 0 && (
            <section className="notes-section">
              {pinned.length > 0 && <div className="notes-section-label">All Notes</div>}
              <div className={layout==='masonry'?'notes-masonry':'notes-listview'}>
                {unpinned.map(n => <NoteCard key={n._id} note={n} onEdit={handleEdit} onDelete={handleDelete} onPin={handlePin} onTagClick={t=>setActiveTag(t===activeTag?'':t)}/>)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}