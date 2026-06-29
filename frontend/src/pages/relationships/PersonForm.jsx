import React, { useState, useEffect, useRef, useCallback } from 'react';
import { peopleApi } from '../../utils/api.js';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const INIT = {
  name:'', dateOfBirth:'', approximateAge:'', gender:'',
  relationshipType:'friend', currentStatus:'good', statusNote:'',
  firstMeetingPlace:'', firstMeetingDate:'', howWeMet:'',
  mobileNumber:'', instagramId:'',
  height:'', hairLength:'', bodyType:'',
  hobbies:'',
  notes:'', lastConversationDate:'',
  isSpecial: false,
};

const REL_TYPES = [
  { value:'love',         emoji:'❤️',  label:'Love',          desc:'Romantic partner'   },
  { value:'crush',        emoji:'🌸',  label:'Crush',         desc:'Have feelings for'  },
  { value:'attracted',    emoji:'✨',  label:'Attracted To',  desc:'Physically drawn to'},
  { value:'impressed',    emoji:'🌟',  label:'Impressed By',  desc:'Deeply admire'      },
  { value:'friend',       emoji:'👫',  label:'Friend',        desc:'Close friend'       },
  { value:'family',       emoji:'👨‍👩‍👧', label:'Family',        desc:'Family member'      },
  { value:'colleague',    emoji:'💼',  label:'Colleague',     desc:'Work relationship'  },
  { value:'classmate',    emoji:'🎒',  label:'Classmate',     desc:'School / college'   },
  { value:'teacher',      emoji:'🧑‍🏫', label:'Teacher',       desc:'Mentor / educator'  },
  { value:'acquaintance', emoji:'🤝',  label:'Acquaintance',  desc:'Know casually'      },
  { value:'one-time',     emoji:'🌠',  label:'One-time Met',  desc:'Train, event, trip' },
];

const CUR_STATUSES = [
  { value:'close',       emoji:'💚', label:'Close',        desc:'Talk regularly'        },
  { value:'good',        emoji:'🙂', label:'Good',         desc:'Occasional contact'    },
  { value:'drifting',    emoji:'🌊', label:'Drifting',     desc:'Slowly losing touch'   },
  { value:'distant',     emoji:'🌫', label:'Distant',      desc:'Rarely talk anymore'   },
  { value:'not-talking', emoji:'🔇', label:'Not Talking',  desc:'Not speaking now'      },
  { value:'complicated', emoji:'🌀', label:'Complicated',  desc:"It's complicated"      },
  { value:'rekindled',   emoji:'🔥', label:'Rekindled',    desc:'Recently reconnected'  },
  { value:'lost-touch',  emoji:'👻', label:'Lost Touch',   desc:'Completely lost touch' },
  { value:'ended',       emoji:'🚪', label:'Ended',        desc:'Relationship ended'    },
];

const HEIGHT_OPTIONS = ['Very Short','Short','Average','Tall','Very Tall'];

const HAIR_LENGTHS = ['Bald','Very Short','Short','Medium','Long','Very Long'];

const BODY_TYPES = ['Slim','Lean','Athletic','Average','Curvy','Heavyset'];

const LINK_TYPES = [
  'boyfriend','girlfriend','bestfriend','close friend','sibling',
  'cousin','ex','colleague','roommate','mentor','classmate','other'
];

const STEPS = [
  { n:1, label:'Identity'  },
  { n:2, label:'Bond'      },
  { n:3, label:'Contact'   },
  { n:4, label:'Character' },
  { n:5, label:'Done'      },
];

function calcAge(dob) {
  if (!dob) return null;
  const d = new Date(dob); const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

function getInitials(n) {
  return n.split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2);
}

function centerAspectCrop(w, h) {
  return centerCrop(makeAspectCrop({ unit: '%', width: 90 }, 1, w, h), w, h);
}

export default function PersonForm({ person, onClose, onSaved }) {
  const bodyRef   = useRef(null);
  const imgRef    = useRef(null);
  const canvasRef = useRef(null);

  const [form, setForm] = useState(person ? {
    name:               person.name               ?? '',
    dateOfBirth:        person.dateOfBirth ? person.dateOfBirth.split('T')[0] : '',
    approximateAge:     person.approximateAge     ?? '',
    gender:             person.gender             ?? '',
    relationshipType:   person.relationshipType   ?? 'friend',
    currentStatus:      person.currentStatus      ?? 'good',
    statusNote:         '',
    firstMeetingPlace:  person.firstMeetingPlace  ?? '',
    firstMeetingDate:   person.firstMeetingDate   ? person.firstMeetingDate.split('T')[0] : '',
    lastConversationDate: person.lastConversationDate ? person.lastConversationDate.split('T')[0] : '',
    howWeMet:           person.howWeMet           ?? '',
    mobileNumber:       person.mobileNumber       ?? '',
    instagramId:        person.instagramId        ?? '',
    height:             person.height             ?? '',
    hairLength:         person.hairLength         ?? '',
    bodyType:           person.bodyType           ?? '',
    hobbies:            person.hobbies?.join(', ') ?? '',
    notes:              person.notes              ?? '',
    isSpecial:          person.isSpecial          ?? false,
    favoriteColor:      person.favoriteColor      ?? '',
  } : INIT);

  const [linkedPeople, setLinkedPeople]     = useState(
    person?.linkedPeople?.map(lp => ({
      personId: lp.person?._id || lp.person || '',
      name:     lp.person?.name || '',
      linkType: lp.linkType || '',
      note:     lp.note || '',
    })) || []
  );
  const [allPeople, setAllPeople]           = useState([]);

  // Photo & crop state
  const [rawPhotoSrc, setRawPhotoSrc]       = useState(null);   // original file dataURL
  const [showCrop, setShowCrop]             = useState(false);
  const [crop, setCrop]                     = useState();
  const [completedCrop, setCompletedCrop]   = useState(null);
  const [croppedBlob, setCroppedBlob]       = useState(null);
  const [photoPreview, setPhotoPreview]     = useState(person?.profilePhoto || null);

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [step, setStep]     = useState(1);
  const [dobMode, setDobMode] = useState(person?.dateOfBirth ? 'dob' : 'approx');

  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = 0; }, [step]);

  useEffect(() => {
    peopleApi.getAll().then(r => {
      setAllPeople(r.data.filter(p => p._id !== person?._id));
    }).catch(() => {});
  }, []);

  const set    = f => e => setForm(p => ({...p, [f]: e.target.value}));
  const setVal = (f, v) => setForm(p => ({...p, [f]: v}));

  // ── Photo handling ──────────────────────────────────────────────
  const handlePhotoSelect = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setRawPhotoSrc(reader.result); setShowCrop(true); };
    reader.readAsDataURL(file);
  };

  const onImageLoad = e => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height));
  };

  const applyCrop = useCallback(async () => {
    if (!completedCrop || !imgRef.current) return;
    const image  = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth  / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width  = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(
      image,
      completedCrop.x * scaleX, completedCrop.y * scaleY,
      completedCrop.width * scaleX, completedCrop.height * scaleY,
      0, 0, completedCrop.width, completedCrop.height
    );
    canvas.toBlob(blob => {
      if (!blob) return;
      setCroppedBlob(blob);
      setPhotoPreview(URL.createObjectURL(blob));
      setShowCrop(false);
    }, 'image/jpeg', 0.92);
  }, [completedCrop]);

  // ── Navigation ──────────────────────────────────────────────────
  const goNext = () => {
    if (step === 1 && !form.name.trim()) { setError('Name required'); return; }
    setError('');
    setStep(s => Math.min(s + 1, STEPS.length));
  };
  const goBack = () => setStep(s => Math.max(s - 1, 1));

  // ── Submit ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    try {
      const fd = new FormData();
      const toSend = { ...form };
      if (dobMode === 'dob') delete toSend.approximateAge;
      else delete toSend.dateOfBirth;
      Object.entries(toSend).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          fd.append(k, typeof v === 'boolean' ? String(v) : v);
        }
      });
      if (croppedBlob) fd.append('profilePhoto', croppedBlob, 'photo.jpg');
      const validLinks = linkedPeople.filter(lp => lp.personId && lp.linkType);
      if (validLinks.length > 0) {
        fd.append('linkedPeople', JSON.stringify(
          validLinks.map(lp => ({ person: lp.personId, linkType: lp.linkType, note: lp.note }))
        ));
      }
      if (person) await peopleApi.update(person._id, fd);
      else        await peopleApi.create(fd);
      onSaved();
    } catch(err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally { setSaving(false); }
  };

  const addLink    = () => setLinkedPeople(p => [...p, { personId:'', name:'', linkType:'', note:'' }]);
  const removeLink = i => setLinkedPeople(p => p.filter((_, idx) => idx !== i));
  const updateLink = (i, field, val) =>
    setLinkedPeople(p => p.map((lp, idx) => idx === i ? {...lp, [field]: val} : lp));

  const computedAge = dobMode === 'dob' ? calcAge(form.dateOfBirth) : (form.approximateAge || null);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal pform-modal">

        {/* ── Crop Modal ── */}
        {showCrop && rawPhotoSrc && (
          <div className="pform-crop-overlay">
            <div className="pform-crop-box">
              <div className="pform-crop-header">
                <span style={{fontWeight:700, fontSize:'0.95rem'}}>✂️ Crop Photo</span>
                <button type="button" className="pform-close-btn" onClick={() => setShowCrop(false)}>✕</button>
              </div>
              <div className="pform-crop-area">
                <ReactCrop
                  crop={crop}
                  onChange={c => setCrop(c)}
                  onComplete={c => setCompletedCrop(c)}
                  aspect={1}
                  circularCrop>
                  <img ref={imgRef} src={rawPhotoSrc} onLoad={onImageLoad}
                    style={{maxHeight:'55vh', maxWidth:'100%'}}/>
                </ReactCrop>
              </div>
              <div className="pform-crop-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCrop(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={applyCrop}>✓ Apply Crop</button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="pform-header">
          <div>
            <h2 style={{fontSize:'1.2rem', margin:0}}>{person ? 'Edit Profile' : 'Add New Person'}</h2>
            <div className="pform-steps">
              {STEPS.map((s, i) => (
                <React.Fragment key={s.n}>
                  <div className={`pstep ${step===s.n?'active':step>s.n?'done':''}`}
                    onClick={() => step > s.n && setStep(s.n)} title={s.label}>
                    {step > s.n ? '✓' : s.n}
                  </div>
                  {i < STEPS.length - 1 && <div className={`pstep-line ${step > s.n ? 'done' : ''}`}/>}
                </React.Fragment>
              ))}
              <span className="pstep-label">{STEPS[step-1]?.label}</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="pform-close-btn">✕</button>
        </div>

        <div className="pform-body" ref={bodyRef}>

          {/* ── STEP 1: Identity ── */}
          {step === 1 && (
            <div>
              {error && <div className="pform-error">{error}</div>}

              {/* Photo */}
              <div className="pform-photo-row">
                <label className="pform-photo-wrap">
                  <input type="file" accept="image/*" onChange={handlePhotoSelect} style={{display:'none'}}/>
                  <div className="pform-photo-circle">
                    {photoPreview
                      ? <img src={photoPreview} alt="preview"/>
                      : <div className="pform-photo-ph">{form.name ? getInitials(form.name) : '📷'}</div>}
                    <div className="pform-photo-hover">📷 Upload</div>
                  </div>
                </label>
                <div className="pform-photo-info">
                  <div className="pform-photo-title">Profile Photo</div>
                  <div className="pform-photo-sub">Click to upload · auto crop to circle</div>
                  {photoPreview && (
                    <button type="button" className="pform-recrop-btn"
                      onClick={() => rawPhotoSrc && setShowCrop(true)}>
                      ✂️ Re-crop
                    </button>
                  )}
                  {computedAge !== null && <div className="pform-age-badge">Age: <strong>{computedAge}</strong></div>}
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group full">
                  <label>Full Name *</label>
                  <input value={form.name} onChange={set('name')} placeholder="Jane Doe"/>
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <select value={form.gender} onChange={set('gender')}>
                    <option value="">Select...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="non-binary">Non-binary</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Age / Date of Birth</label>
                  <div className="dob-toggle">
                    <button type="button" className={dobMode==='dob'?'active':''} onClick={() => setDobMode('dob')}>🎂 DOB</button>
                    <button type="button" className={dobMode==='approx'?'active':''} onClick={() => setDobMode('approx')}>~ Approx</button>
                  </div>
                  {dobMode === 'dob'
                    ? <input type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')}/>
                    : <input type="number" value={form.approximateAge} onChange={set('approximateAge')} placeholder="e.g. 28" min="0" max="120"/>}
                  {dobMode === 'dob' && form.dateOfBirth && computedAge !== null && (
                    <div style={{fontSize:'0.73rem', color:'var(--gold)', marginTop:4}}>→ Age: <strong>{computedAge}</strong></div>
                  )}
                </div>
              </div>

              {/* Relationship type */}
              <div className="form-group" style={{marginTop:8}}>
                <label>How do you see them?</label>
                <div className="rel-type-grid">
                  {REL_TYPES.map(t => (
                    <button type="button" key={t.value}
                      className={`rtb ${form.relationshipType===t.value?'active':''}`}
                      onClick={() => setVal('relationshipType', t.value)}>
                      <span className="rtb-emoji">{t.emoji}</span>
                      <span className="rtb-label">{t.label}</span>
                      <span className="rtb-desc">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Bond ── */}
          {step === 2 && (
            <div>
              <div className="form-group" style={{marginBottom:18}}>
                <label>Current Relationship Status</label>
                <p className="pform-hint">How would you describe this right now?</p>
                <div className="status-grid">
                  {CUR_STATUSES.map(s => (
                    <button type="button" key={s.value}
                      className={`stb ${form.currentStatus===s.value?'active':''}`}
                      onClick={() => setVal('currentStatus', s.value)}>
                      <span className="stb-emoji">{s.emoji}</span>
                      <span className="stb-label">{s.label}</span>
                      <span className="stb-desc">{s.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {person && (
                <div className="form-group">
                  <label>Note about status change</label>
                  <input value={form.statusNote} onChange={set('statusNote')} placeholder="Why did it change? (optional)"/>
                </div>
              )}

              <div className="pform-divider"/>
              <div className="form-grid">
                <div className="form-group">
                  <label>Where You Met</label>
                  <input value={form.firstMeetingPlace} onChange={set('firstMeetingPlace')} placeholder="Coffee shop, college..."/>
                </div>
                <div className="form-group">
                  <label>Date First Met</label>
                  <input type="date" value={form.firstMeetingDate} onChange={set('firstMeetingDate')}/>
                </div>
                <div className="form-group full">
                  <label>Story of How You Met</label>
                  <textarea value={form.howWeMet} onChange={set('howWeMet')} placeholder="The full story..." rows={3}/>
                </div>
                <div className="form-group">
                  <label>Last Conversation Date</label>
                  <input type="date" value={form.lastConversationDate} onChange={set('lastConversationDate')}/>
                </div>
                <div className="form-group">
                  <label>Favorite Color</label>
                  <input value={form.favoriteColor} onChange={set('favoriteColor')} placeholder="Deep blue..."/>
                </div>
              </div>

              <div className="pform-divider"/>
              <div className="form-group">
                <label>🔗 Linked People</label>
                <p className="pform-hint">Connect to others — partner, sibling, best friend etc.</p>
                {linkedPeople.map((lp, i) => (
                  <div key={i} className="pform-link-row">
                    <select value={lp.personId}
                      onChange={e => {
                        const sel = allPeople.find(p => p._id === e.target.value);
                        updateLink(i, 'personId', e.target.value);
                        updateLink(i, 'name', sel?.name || '');
                      }} style={{flex:2}}>
                      <option value="">Select person...</option>
                      {allPeople.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                    </select>
                    <select value={lp.linkType} onChange={e => updateLink(i, 'linkType', e.target.value)} style={{flex:1}}>
                      <option value="">Type...</option>
                      {LINK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input value={lp.note} onChange={e => updateLink(i, 'note', e.target.value)}
                      placeholder="Note" style={{flex:2}}/>
                    <button type="button" className="pform-link-remove" onClick={() => removeLink(i)}>✕</button>
                  </div>
                ))}
                <button type="button" className="pform-link-add" onClick={addLink}>+ Add Link</button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Contact ── */}
          {step === 3 && (
            <div>
              <p className="pform-hint" style={{marginBottom:16}}>Add their contact info.</p>
              <div className="form-grid">
                <div className="form-group">
                  <label>📱 Mobile Number</label>
                  <input value={form.mobileNumber} onChange={set('mobileNumber')} placeholder="+91 9876543210"/>
                </div>
                <div className="form-group">
                  <label>📸 Instagram</label>
                  <div className="pform-social-input">
                    <span>@</span>
                    <input value={form.instagramId} onChange={set('instagramId')} placeholder="username"/>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 4: Appearance ── */}
          {step === 4 && (
            <div>
              <div className="pform-section-title">🪞 Appearance</div>

              {/* Height — everyone */}
              <div className="pform-appear-block">
                <div className="pform-appear-label">📏 Height</div>
                <div className="pform-option-row">
                  {HEIGHT_OPTIONS.map(h => (
                    <button type="button" key={h}
                      className={`pform-option-chip ${form.height===h?'active':''}`}
                      onClick={() => setVal('height', form.height===h?'':h)}>{h}</button>
                  ))}
                </div>
              </div>

              {/* Body Type — everyone */}
              <div className="pform-appear-block">
                <div className="pform-appear-label">🏃 Body Type</div>
                <div className="pform-option-row">
                  {BODY_TYPES.map(b => (
                    <button type="button" key={b}
                      className={`pform-option-chip ${form.bodyType===b?'active':''}`}
                      onClick={() => setVal('bodyType', form.bodyType===b?'':b)}>{b}</button>
                  ))}
                </div>
              </div>

              {/* Hair Length — female / non-binary / other / not set */}
              {form.gender !== 'male' && (
                <div className="pform-appear-block">
                  <div className="pform-appear-label">💇 Hair Length</div>
                  <div className="pform-option-row">
                    {HAIR_LENGTHS.map(h => (
                      <button type="button" key={h}
                        className={`pform-option-chip ${form.hairLength===h?'active':''}`}
                        onClick={() => setVal('hairLength', form.hairLength===h?'':h)}>{h}</button>
                    ))}
                  </div>
                </div>
              )}


            </div>
          )}

          {/* ── STEP 5: Done ── */}
          {step === 5 && (
            <div>
              {error && <div className="pform-error">{error}</div>}

              {/* Mark as Special */}
              <button type="button"
                className={`pform-special-toggle ${form.isSpecial ? 'active' : ''}`}
                onClick={() => setVal('isSpecial', !form.isSpecial)}>
                <span className="pform-special-star">{form.isSpecial ? '⭐' : '☆'}</span>
                <div>
                  <div className="pform-special-title">Mark as Special</div>
                  <div className="pform-special-sub">Shows in the Special strip on the Relationships page</div>
                </div>
              </button>

              {/* Private notes */}
              <div className="form-group" style={{marginTop:16}}>
                <label>🔒 Private Notes</label>
                <textarea value={form.notes} onChange={set('notes')} rows={3}
                  placeholder="Anything you want to remember privately — only you see this..."/>
              </div>

              {/* Summary */}
              <div className="pform-summary">
                <div className="pform-summary-row">
                  <span>Name</span><strong>{form.name || '—'}</strong>
                </div>
                <div className="pform-summary-row">
                  <span>Type</span>
                  <strong>{REL_TYPES.find(t => t.value===form.relationshipType)?.emoji} {form.relationshipType}</strong>
                </div>
                <div className="pform-summary-row">
                  <span>Status</span>
                  <strong>{CUR_STATUSES.find(s => s.value===form.currentStatus)?.emoji} {form.currentStatus}</strong>
                </div>
                {form.mobileNumber && <div className="pform-summary-row"><span>Mobile</span><strong>{form.mobileNumber}</strong></div>}
                {form.instagramId  && <div className="pform-summary-row"><span>Instagram</span><strong>@{form.instagramId}</strong></div>}
              </div>
            </div>
          )}

        </div>{/* end pform-body */}

        {/* Footer */}
        <div className="pform-footer">
          {step > 1 && (
            <button type="button" className="btn btn-ghost" onClick={goBack}>← Back</button>
          )}
          <div style={{marginLeft:'auto', display:'flex', gap:10}}>
            {step < 5 && (
              <button type="button" className="btn btn-primary" onClick={goNext}>
                Continue →
              </button>
            )}
            {step === 5 && (
              <button type="button" className="btn btn-primary" disabled={saving} onClick={handleSubmit}>
                {saving ? 'Saving...' : person ? '✓ Save Changes' : '✓ Add Person'}
              </button>
            )}
          </div>
        </div>

      </div>

      <style>{`
        .pform-modal{max-width:640px;max-height:94vh;display:flex;flex-direction:column;}
        .pform-header{padding:20px 24px 0;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-shrink:0;}
        .pform-steps{display:flex;align-items:center;gap:5px;margin-top:10px;}
        .pstep{width:26px;height:26px;border-radius:50%;background:var(--bg-elevated);border:1px solid var(--border);color:var(--text-3);display:flex;align-items:center;justify-content:center;font-size:0.68rem;font-weight:700;cursor:pointer;transition:all 0.2s;flex-shrink:0;}
        .pstep.active{background:var(--gold-dim);color:var(--gold);border-color:var(--gold);}
        .pstep.done{background:var(--teal-dim);color:var(--teal);border-color:var(--teal);}
        .pstep-line{width:18px;height:1px;background:var(--border);}
        .pstep-line.done{background:var(--teal);}
        .pstep-label{font-size:0.7rem;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:0.08em;margin-left:6px;}
        .pform-close-btn{background:transparent;border:1px solid var(--border);color:var(--text-3);width:32px;height:32px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.2s;}
        .pform-close-btn:hover{background:var(--rose-dim);color:var(--rose);border-color:var(--rose);}
        .pform-body{padding:16px 24px;overflow-y:auto;flex:1;}
        .pform-footer{padding:12px 24px 20px;display:flex;align-items:center;gap:10px;border-top:1px solid var(--border);flex-shrink:0;}
        .pform-error{padding:10px 14px;border-radius:var(--radius-sm);background:var(--rose-dim);color:var(--rose);font-size:0.85rem;margin-bottom:14px;}
        .pform-hint{font-size:0.76rem;color:var(--text-3);margin-bottom:8px;margin-top:-2px;}
        .pform-divider{height:1px;background:var(--border);margin:16px 0;}
        .pform-section-title{font-size:0.78rem;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px;}

        /* Photo */
        .pform-photo-row{display:flex;align-items:center;gap:18px;margin-bottom:16px;padding:14px;background:var(--bg-elevated);border-radius:var(--radius);border:1px solid var(--border-dim);}
        .pform-photo-wrap{cursor:pointer;flex-shrink:0;}
        .pform-photo-circle{width:76px;height:76px;border-radius:50%;overflow:hidden;border:3px solid var(--border);position:relative;}
        .pform-photo-circle img{width:100%;height:100%;object-fit:cover;}
        .pform-photo-ph{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--bg-card);color:var(--text-2);font-family:var(--font-display);font-size:1.4rem;}
        .pform-photo-hover{position:absolute;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;opacity:0;transition:0.2s;font-size:0.68rem;color:white;}
        .pform-photo-circle:hover .pform-photo-hover{opacity:1;}
        .pform-photo-title{font-weight:600;color:var(--text-1);font-size:0.87rem;}
        .pform-photo-sub{font-size:0.71rem;color:var(--text-3);margin-top:2px;}
        .pform-recrop-btn{margin-top:6px;padding:3px 10px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text-3);font-size:0.72rem;cursor:pointer;font-family:var(--font-body);}
        .pform-recrop-btn:hover{border-color:var(--gold);color:var(--gold);}
        .pform-age-badge{display:inline-block;margin-top:6px;padding:3px 10px;border-radius:10px;background:var(--gold-dim);color:var(--gold);font-size:0.72rem;}

        /* Crop overlay */
        .pform-crop-overlay{position:absolute;inset:0;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:100;border-radius:inherit;}
        .pform-crop-box{background:var(--bg-card);border-radius:var(--radius);width:90%;max-width:480px;overflow:hidden;}
        .pform-crop-header{padding:14px 18px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border);}
        .pform-crop-area{padding:16px;display:flex;justify-content:center;background:var(--bg-elevated);}
        .pform-crop-footer{padding:12px 18px;display:flex;justify-content:flex-end;gap:10px;border-top:1px solid var(--border);}

        /* DOB */
        .dob-toggle{display:flex;margin-bottom:8px;border:1px solid var(--border);border-radius:8px;overflow:hidden;}
        .dob-toggle button{flex:1;padding:6px 8px;background:transparent;border:none;color:var(--text-3);font-family:var(--font-body);font-size:0.75rem;cursor:pointer;transition:all 0.2s;}
        .dob-toggle button.active{background:var(--gold-dim);color:var(--gold);}

        /* Rel type */
        .rel-type-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;}
        .rtb{padding:8px 4px;border-radius:9px;background:var(--bg-elevated);border:1px solid var(--border);cursor:pointer;transition:all 0.2s;display:flex;flex-direction:column;align-items:center;gap:3px;text-align:center;font-family:var(--font-body);}
        .rtb:hover{border-color:var(--border-bright);}
        .rtb.active{background:var(--gold-dim);border-color:var(--gold);}
        .rtb-emoji{font-size:1rem;}
        .rtb-label{font-size:0.67rem;font-weight:700;color:var(--text-1);}
        .rtb-desc{font-size:0.55rem;color:var(--text-3);}

        /* Status */
        .status-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;}
        .stb{padding:8px 4px;border-radius:9px;background:var(--bg-elevated);border:1px solid var(--border);cursor:pointer;transition:all 0.2s;display:flex;flex-direction:column;align-items:center;gap:3px;text-align:center;font-family:var(--font-body);}
        .stb:hover{border-color:var(--border-bright);}
        .stb.active{background:var(--teal-dim);border-color:var(--teal);}
        .stb-emoji{font-size:1rem;}
        .stb-label{font-size:0.68rem;font-weight:700;color:var(--text-1);}
        .stb-desc{font-size:0.55rem;color:var(--text-3);}

        /* Social */
        .pform-social-input{display:flex;align-items:center;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-elevated);overflow:hidden;}
        .pform-social-input span{padding:0 9px;color:var(--text-3);font-size:0.78rem;border-right:1px solid var(--border);white-space:nowrap;background:var(--bg-card);}
        .pform-social-input input{flex:1;border:none;background:transparent;padding:8px 10px;color:var(--text-1);font-family:var(--font-body);font-size:0.875rem;outline:none;}

        /* Option chips (hair, body) */
        .pform-option-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;}
        .pform-option-chip{padding:5px 12px;border-radius:20px;border:1px solid var(--border);background:var(--bg-elevated);color:var(--text-3);font-size:0.74rem;font-family:var(--font-body);cursor:pointer;transition:all 0.2s;}
        .pform-option-chip:hover{border-color:var(--border-bright);}
        .pform-option-chip.active{background:rgba(96,165,250,0.12);border-color:#60a5fa;color:#60a5fa;}

        /* Trait chips */
        .pform-trait-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:4px;}
        .pform-trait-chip{padding:5px 11px;border-radius:20px;border:1px solid var(--border);background:var(--bg-elevated);color:var(--text-3);font-size:0.74rem;font-family:var(--font-body);cursor:pointer;transition:all 0.2s;}
        .pform-trait-chip:hover{border-color:var(--border-bright);}
        .pform-trait-chip.active{background:rgba(167,139,250,0.12);border-color:#a78bfa;color:#a78bfa;}

        /* Love language */
        .pform-ll-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;}
        .pform-ll-btn{padding:8px 3px;border-radius:9px;background:var(--bg-elevated);border:1px solid var(--border);cursor:pointer;transition:all 0.2s;display:flex;flex-direction:column;align-items:center;gap:4px;font-size:0.6rem;color:var(--text-3);font-family:var(--font-body);text-align:center;line-height:1.3;}
        .pform-ll-btn:hover{border-color:var(--border-bright);}
        .pform-ll-btn.active{background:rgba(232,99,122,0.12);border-color:#e8637a;color:#e8637a;}
        .pform-ll-btn span:first-child{font-size:1.1rem;}

        /* Linked people */
        .pform-link-row{display:flex;gap:7px;align-items:center;margin-bottom:7px;flex-wrap:wrap;}
        .pform-link-row select,.pform-link-row input{padding:6px 9px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--bg-elevated);color:var(--text-1);font-family:var(--font-body);font-size:0.79rem;min-width:0;}
        .pform-link-remove{background:transparent;border:1px solid var(--border);color:var(--text-3);width:27px;height:27px;border-radius:6px;cursor:pointer;flex-shrink:0;font-size:0.68rem;display:flex;align-items:center;justify-content:center;}
        .pform-link-remove:hover{background:var(--rose-dim);color:var(--rose);border-color:var(--rose);}
        .pform-link-add{padding:7px 14px;border-radius:var(--radius-sm);border:1px dashed var(--border);background:transparent;color:var(--text-3);font-family:var(--font-body);font-size:0.79rem;cursor:pointer;transition:all 0.2s;width:100%;margin-top:2px;}
        .pform-link-add:hover{border-color:var(--gold);color:var(--gold);}

        /* Special toggle */
        .pform-special-toggle{width:100%;display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:var(--radius);border:1px solid var(--border);background:var(--bg-elevated);cursor:pointer;transition:all 0.2s;text-align:left;font-family:var(--font-body);}
        .pform-special-toggle:hover{border-color:var(--gold);}
        .pform-special-toggle.active{border-color:#fbbf24;background:rgba(251,191,36,0.08);}
        .pform-special-star{font-size:1.6rem;flex-shrink:0;transition:transform 0.2s;}
        .pform-special-toggle.active .pform-special-star{transform:scale(1.2);}
        .pform-special-title{font-size:0.88rem;font-weight:700;color:var(--text-1);}
        .pform-special-sub{font-size:0.72rem;color:var(--text-3);margin-top:2px;}
        .pform-special-toggle.active .pform-special-title{color:#fbbf24;}

        /* Summary */
        .pform-summary{margin-top:20px;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;}
        .pform-summary-row{display:flex;justify-content:space-between;align-items:center;padding:8px 14px;border-bottom:1px solid var(--border);font-size:0.82rem;}
        .pform-summary-row:last-child{border-bottom:none;}
        .pform-summary-row span{color:var(--text-3);}
        .pform-summary-row strong{color:var(--text-1);}

        /* Appearance blocks */
        .pform-appear-block{margin-bottom:20px;}
        .pform-appear-label{font-size:0.74rem;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;display:flex;align-items:center;gap:6px;}

        /* Look grid */
        .pform-look-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:4px;}
        .pform-look-btn{padding:12px 8px;border-radius:10px;background:var(--bg-elevated);border:1px solid var(--border);cursor:pointer;transition:all 0.2s;display:flex;flex-direction:column;align-items:center;gap:5px;font-family:var(--font-body);}
        .pform-look-btn:hover{border-color:var(--border-bright);}
        .pform-look-btn.active{background:rgba(244,114,182,0.12);border-color:#f472b6;}
        .pform-look-emoji{font-size:1.4rem;}
        .pform-look-label{font-size:0.74rem;font-weight:700;color:var(--text-1);}
        .pform-look-btn.active .pform-look-label{color:#f472b6;}
      `}</style>
    </div>
  );
}