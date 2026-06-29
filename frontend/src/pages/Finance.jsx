import React, { useState, useEffect, useCallback, useRef } from 'react';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import { financeApi } from '../utils/api.js';
import './Finance.css';

// ── Constants ──────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value:'food',          label:'Food & Drink',  emoji:'🍜', color:'#fb923c',
    subs: ['Breakfast','Lunch','Dinner','Snacks','Tea/Coffee','Sweets'] },
  { value:'transport',     label:'Transport',      emoji:'🚗', color:'#60a5fa',
    subs: ['Auto/Cab','Bus','Train','Flight','Fuel','Advance Booking','Parking'] },
  { value:'shopping',      label:'Shopping',       emoji:'🛍', color:'#f472b6',
    subs: ['Groceries','Clothing','Electronics','Home','Personal Care','Stationery'] },
  { value:'health',        label:'Health',         emoji:'❤️', color:'#e8637a',
    subs: ['Medicine','Doctor','Lab Test','Hospital','Supplements'] },
  { value:'entertainment', label:'Entertainment',  emoji:'🎬', color:'#a78bfa',
    subs: ['Movies','OTT','Games','Events','Eating Out'] },
  { value:'utilities',     label:'Utilities',      emoji:'💡', color:'#fbbf24',
    subs: ['Electricity','Water','Internet','Mobile','Rent','Gas'] },
  { value:'education',     label:'Education',      emoji:'📚', color:'#4ec9b0',
    subs: ['Books','Course','Fees','Stationery'] },
  { value:'personal',      label:'Personal',       emoji:'🌿', color:'#6ee7b7',
    subs: ['Haircut','Skincare','Gym','Salon'] },
  { value:'savings',       label:'Savings',        emoji:'🏦', color:'#34d399',
    subs: [] },
  { value:'income',        label:'Income',         emoji:'💰', color:'#d4a853',
    subs: ['Salary','Freelance','Gift','Cashback','Other'] },
  { value:'other',         label:'Other',          emoji:'◦',  color:'#9ca3af',
    subs: [] },
];
const CAT = Object.fromEntries(CATEGORIES.map(c => [c.value, c]));

const PAYMENT_METHODS = [
  { value:'cash', label:'Cash', emoji:'💵', color:'#34d399' },
  { value:'upi',  label:'UPI',  emoji:'📱', color:'#60a5fa' },
  { value:'bank', label:'Bank', emoji:'🏦', color:'#a78bfa' },
];
const PM = Object.fromEntries(PAYMENT_METHODS.map(m => [m.value, m]));

function fmtCurrency(n) {
  const abs = Math.abs(n || 0);
  if (abs >= 100000) return `₹${(n/100000).toFixed(1)}L`;
  if (abs >= 1000)   return `₹${(n/1000).toFixed(1)}K`;
  return `₹${Number(n||0).toFixed(0)}`;
}
function fmtFull(n) {
  return '₹' + Number(n||0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function todayStr() { return format(new Date(), 'yyyy-MM-dd'); }
function monthRange(d = new Date()) {
  return { from: format(startOfMonth(d),'yyyy-MM-dd'), to: format(endOfMonth(d),'yyyy-MM-dd') };
}

// ── Sparkline ──────────────────────────────────────────────────────────────
function Sparkline({ data=[], color='#d4a853', height=36 }) {
  if (data.length < 2) return null;
  const vals = data.map(d => d.v);
  const max  = Math.max(...vals, 1);
  const w=120, h=height;
  const pts = vals.map((v,i) => {
    const x = (i/(vals.length-1))*w;
    const y = h - (v/max)*(h-4) - 2;
    return `${x},${y}`;
  }).join(' ');
  const first = pts.split(' ')[0];
  const last  = pts.split(' ')[pts.split(' ').length-1];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{overflow:'visible',display:'block'}}>
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={`M${first.split(',')[0]},${h} L${pts.split(' ').join(' L')} L${last.split(',')[0]},${h} Z`}
        fill="url(#spark-grad)"/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Category bars ──────────────────────────────────────────────────────────
function CategoryBars({ byCategory, total }) {
  if (!byCategory || !total) return <div className="fin-empty-small">No expense data yet.</div>;
  const sorted = Object.entries(byCategory).sort((a,b)=>b[1]-a[1]).slice(0,8);
  return (
    <div className="cat-bars">
      {sorted.map(([cat,amt]) => {
        const c = CAT[cat] || CAT.other;
        const pct = (amt/total)*100;
        return (
          <div key={cat} className="cat-bar-row">
            <span className="cat-bar-emoji">{c.emoji}</span>
            <span className="cat-bar-label">{c.label}</span>
            <div className="cat-bar-track">
              <div className="cat-bar-fill" style={{width:`${pct}%`,background:c.color}}/>
            </div>
            <span className="cat-bar-pct">{pct.toFixed(0)}%</span>
            <span className="cat-bar-amt">{fmtCurrency(amt)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Monthly chart ──────────────────────────────────────────────────────────
function MonthlyChart({ months=[] }) {
  if (!months.length) return null;
  const maxVal = Math.max(...months.map(m=>Math.max(m.expense,m.income)),1);
  return (
    <div className="monthly-chart">
      <div className="mc-bars-wrap">
        {months.map((m,i) => (
          <div key={m.label} className="mc-col" style={{animationDelay:`${i*0.07}s`}}>
            <div className="mc-bars">
              <div className="mc-bar mc-income"  title={`Income: ${fmtFull(m.income)}`}
                style={{height:`${(m.income/maxVal)*100}%`}}/>
              <div className="mc-bar mc-expense" title={`Expense: ${fmtFull(m.expense)}`}
                style={{height:`${(m.expense/maxVal)*100}%`}}/>
            </div>
            <div className="mc-label">{m.label.split(' ')[0]}</div>
          </div>
        ))}
      </div>
      <div className="mc-legend">
        <span><span className="mc-dot teal"/>Income</span>
        <span><span className="mc-dot rose"/>Expense</span>
      </div>
    </div>
  );
}

// ── Item Tracker Panel ─────────────────────────────────────────────────────
function ItemTracker({ allTransactions, viewMonth }) {
  const [search, setSearch]       = useState('');
  const [selected, setSelected]   = useState(null);
  const [suggestions, setSugg]    = useState([]);
  const inputRef = useRef();

  // Build item index from all transactions
  const itemIndex = {};
  allTransactions.filter(t => t.type === 'expense').forEach(t => {
    const key = t.itemName.trim().toLowerCase();
    if (!itemIndex[key]) itemIndex[key] = { name: t.itemName, txns: [] };
    itemIndex[key].txns.push(t);
  });

  const handleSearch = (v) => {
    setSearch(v);
    setSelected(null);
    if (!v.trim()) { setSugg([]); return; }
    const q = v.toLowerCase();
    const matches = Object.entries(itemIndex)
      .filter(([k]) => k.includes(q))
      .sort((a,b) => b[1].txns.length - a[1].txns.length)
      .slice(0, 8)
      .map(([, v]) => v);
    setSugg(matches);
  };

  const selectItem = (item) => {
    setSelected(item);
    setSearch(item.name);
    setSugg([]);
  };

  // Stats for selected item
  let stats = null;
  if (selected) {
    const key = selected.name.trim().toLowerCase();
    const data = itemIndex[key];
    if (data) {
      const sorted = [...data.txns].sort((a,b) => b.date.localeCompare(a.date));
      const { from, to } = monthRange(viewMonth);
      const thisMonth = sorted.filter(t => t.date >= from && t.date <= to);
      const totals    = sorted.reduce((s,t) => s + t.amount * (t.quantity||1), 0);
      const avgPrice  = totals / sorted.length;
      const lastBuy   = sorted[0];
      stats = { sorted, thisMonth, totals, avgPrice, lastBuy };
    }
  }

  // Top items for display when nothing searched
  const topItems = Object.values(itemIndex)
    .sort((a,b) => b.txns.length - a.txns.length)
    .slice(0, 12);

  return (
    <div className="item-tracker">
      {/* Search box */}
      <div className="it-search-wrap">
        <span className="it-search-icon">🔍</span>
        <input ref={inputRef} className="it-search" value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search any item… soap, rice, bus ticket…"/>
        {search && <button className="it-clear" onClick={() => { setSearch(''); setSelected(null); setSugg([]); }}>✕</button>}
      </div>

      {/* Suggestions dropdown */}
      {suggestions.length > 0 && (
        <div className="it-suggestions">
          {suggestions.map(item => (
            <button key={item.name} className="it-sugg-row" onClick={() => selectItem(item)}>
              <span className="it-sugg-name">{item.name}</span>
              <span className="it-sugg-count">{item.txns.length}×</span>
              <span className="it-sugg-total">{fmtCurrency(item.txns.reduce((s,t)=>s+t.amount*(t.quantity||1),0))}</span>
            </button>
          ))}
        </div>
      )}

      {/* Item detail */}
      {selected && stats && (
        <div className="it-detail">
          <div className="it-detail-header">
            <div className="it-detail-name">{selected.name}</div>
            <div className="it-detail-stats">
              <div className="it-stat">
                <div className="it-stat-val" style={{color:'var(--rose)'}}>{fmtFull(stats.lastBuy.amount)}</div>
                <div className="it-stat-lab">Last Price</div>
              </div>
              <div className="it-stat">
                <div className="it-stat-val">{format(parseISO(stats.lastBuy.date),'MMM d, yyyy')}</div>
                <div className="it-stat-lab">Last Bought</div>
              </div>
              <div className="it-stat">
                <div className="it-stat-val">{fmtCurrency(stats.avgPrice)}</div>
                <div className="it-stat-lab">Avg Price</div>
              </div>
              <div className="it-stat">
                <div className="it-stat-val">{stats.sorted.length}×</div>
                <div className="it-stat-lab">Total Bought</div>
              </div>
              <div className="it-stat">
                <div className="it-stat-val" style={{color:'var(--amber)'}}>{fmtCurrency(stats.totals)}</div>
                <div className="it-stat-lab">Total Spent</div>
              </div>
              {stats.thisMonth.length > 0 && (
                <div className="it-stat">
                  <div className="it-stat-val" style={{color:'var(--violet)'}}>
                    {fmtCurrency(stats.thisMonth.reduce((s,t)=>s+t.amount*(t.quantity||1),0))}
                  </div>
                  <div className="it-stat-lab">This Month</div>
                </div>
              )}
            </div>
          </div>

          {/* Price trend */}
          {stats.sorted.length >= 2 && (
            <div className="it-price-trend">
              <div className="it-section-title">Price History</div>
              <div className="it-trend-chart">
                {stats.sorted.slice(0,10).reverse().map((t,i) => {
                  const maxAmt = Math.max(...stats.sorted.map(x=>x.amount));
                  const pct = (t.amount/maxAmt)*100;
                  return (
                    <div key={t._id} className="it-trend-col"
                      title={`${format(parseISO(t.date),'MMM d, yyyy')}: ${fmtFull(t.amount)}`}>
                      <div className="it-trend-bar" style={{height:`${pct}%`}}/>
                      <div className="it-trend-price">₹{t.amount}</div>
                      <div className="it-trend-date">{format(parseISO(t.date),'MMM d')}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Full history */}
          <div className="it-section-title" style={{marginTop:16}}>All Purchases</div>
          <div className="it-history">
            {stats.sorted.map((t,i) => {
              const catD = CAT[t.category] || CAT.other;
              const pmD  = PM[t.paymentMethod] || PM.upi;
              return (
                <div key={t._id} className={`it-hist-row ${i===0?'it-hist-latest':''}`}>
                  <span className="it-hist-idx">#{stats.sorted.length - i}</span>
                  <div className="it-hist-main">
                    <span className="it-hist-date">{format(parseISO(t.date),'EEE, MMM d yyyy')}</span>
                    <span className="it-hist-meta">
                      <span style={{color:catD.color}}>{catD.emoji} {t.notes||catD.label}</span>
                      <span style={{color:pmD.color}}>{pmD.emoji} {pmD.label}</span>
                    </span>
                  </div>
                  <div className="it-hist-right">
                    <span className="it-hist-amt">{fmtFull(t.amount)}</span>
                    {i===0 && <span className="it-hist-tag">Latest</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No search: show top items grid */}
      {!search && (
        <div className="it-top-grid">
          <div className="it-grid-title">Frequently Bought Items</div>
          {topItems.length === 0 && (
            <div className="fin-empty-small">Add transactions to see item history here.</div>
          )}
          <div className="it-grid">
            {topItems.map(item => {
              const sorted  = [...item.txns].sort((a,b)=>b.date.localeCompare(a.date));
              const lastBuy = sorted[0];
              const total   = sorted.reduce((s,t)=>s+t.amount*(t.quantity||1),0);
              const catD    = CAT[lastBuy.category] || CAT.other;
              return (
                <button key={item.name} className="it-grid-card" onClick={() => selectItem(item)}>
                  <div className="it-gc-top">
                    <span className="it-gc-emoji">{catD.emoji}</span>
                    <span className="it-gc-count">{item.txns.length}×</span>
                  </div>
                  <div className="it-gc-name">{item.name}</div>
                  <div className="it-gc-last">Last: {format(parseISO(lastBuy.date),'MMM d')}</div>
                  <div className="it-gc-price">{fmtCurrency(lastBuy.amount)}</div>
                  <div className="it-gc-total">Total: {fmtCurrency(total)}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  TRANSACTION FORM
// ══════════════════════════════════════════════════════════════════════════
function TransactionForm({ transaction, onSave, onCancel }) {
  const [date,   setDate]   = useState(transaction?.date          || todayStr());
  const [name,   setName]   = useState(transaction?.itemName      || '');
  const [cat,    setCat]    = useState(transaction?.category      || 'food');
  const [sub,    setSub]    = useState(transaction?.subCategory   || '');
  const [amount, setAmount] = useState(transaction?.amount        || '');
  const [qty,    setQty]    = useState(transaction?.quantity      || 1);
  const [pm,     setPm]     = useState(transaction?.paymentMethod || 'upi');
  const [type,   setType]   = useState(transaction?.type          || 'expense');
  const [notes,  setNotes]  = useState(transaction?.notes         || '');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const total   = (parseFloat(amount)||0) * (parseFloat(qty)||1);
  const catData = CAT[cat];
  const subs    = catData?.subs || [];

  // When category changes, reset sub if not in new list
  useEffect(() => {
    if (subs.length && !subs.includes(sub)) setSub(subs[0]);
    if (!subs.length) setSub('');
  }, [cat]);

  const handleSubmit = async () => {
    if (!name.trim())           { setError('Item name is required'); return; }
    if (!amount || amount <= 0) { setError('Valid amount is required'); return; }
    setSaving(true); setError('');
    try {
      const body = { date, itemName: name, category: cat, subCategory: sub,
                     amount: parseFloat(amount), quantity: parseFloat(qty)||1,
                     paymentMethod: pm, type, notes };
      if (transaction) await financeApi.update(transaction._id, body);
      else             await financeApi.create(body);
      onSave();
    } catch(e) { setError(e.response?.data?.error || 'Something went wrong'); }
    finally { setSaving(false); }
  };

  return (
    <div className="tform-overlay">
      <div className="tform-modal">
        <div className="tform-header">
          <div className="tform-header-left">
            <span className="tform-icon" style={{color:catData?.color}}>{catData?.emoji}</span>
            <div>
              <h2>{transaction ? 'Edit Transaction' : 'Add Transaction'}</h2>
              <div className="tform-type-tabs">
                {['expense','income'].map(t => (
                  <button key={t} className={`ttype-tab ${type===t?'active':''}`}
                    style={type===t?{
                      color: t==='expense'?'var(--rose)':'var(--teal)',
                      borderColor: t==='expense'?'var(--rose)':'var(--teal)',
                      background: t==='expense'?'var(--rose-dim)':'rgba(78,201,176,0.12)'
                    }:{}}
                    onClick={() => setType(t)}>
                    {t==='expense'?'↑ Expense':'↓ Income'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button className="tform-close" onClick={onCancel}>✕</button>
        </div>

        {error && <div className="tform-error">{error}</div>}

        <div className="tform-body">
          <div className="form-grid-2">
            <div className="form-group">
              <label>Item / Description *</label>
              <input value={name} onChange={e=>setName(e.target.value)}
                placeholder="What did you buy?" autoFocus/>
            </div>
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)}/>
            </div>
          </div>

          <div className="form-grid-3">
            <div className="form-group">
              <label>Amount (₹) *</label>
              <div style={{position:'relative'}}>
                <span className="rupee-prefix">₹</span>
                <input type="number" min="0" step="0.01" value={amount}
                  onChange={e=>setAmount(e.target.value)} placeholder="0.00"
                  style={{paddingLeft:28}}/>
              </div>
            </div>
            <div className="form-group">
              <label>Quantity</label>
              <input type="number" min="0.01" step="1" value={qty}
                onChange={e=>setQty(e.target.value)}/>
            </div>
            <div className="form-group">
              <label>Total</label>
              <div className="total-display"
                style={{color:type==='income'?'var(--teal)':'var(--rose)'}}>
                {fmtFull(total)}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Payment Method</label>
            <div className="pm-selector">
              {PAYMENT_METHODS.map(m => (
                <button key={m.value} type="button"
                  className={`pm-btn ${pm===m.value?'active':''}`}
                  style={pm===m.value?{borderColor:m.color,background:`${m.color}18`,color:m.color}:{}}
                  onClick={() => setPm(m.value)}>
                  <span>{m.emoji}</span><span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div className="form-group">
            <label>Category</label>
            <div className="fin-cat-grid">
              {CATEGORIES
                .filter(c => type==='income'
                  ? ['income','savings','other'].includes(c.value)
                  : c.value !== 'income')
                .map(c => (
                  <button key={c.value} type="button"
                    className={`fin-cat-btn ${cat===c.value?'active':''}`}
                    style={cat===c.value?{borderColor:c.color,background:`${c.color}18`,color:c.color}:{}}
                    onClick={() => setCat(c.value)}>
                    <span>{c.emoji}</span><span>{c.label}</span>
                  </button>
              ))}
            </div>
          </div>

          {/* Sub-category chips */}
          {subs.length > 0 && (
            <div className="form-group">
              <label>Sub-category <span style={{color:'var(--text-3)',fontWeight:400}}>(optional)</span></label>
              <div className="sub-cat-chips">
                {subs.map(s => (
                  <button key={s} type="button"
                    className={`sub-chip ${sub===s?'active':''}`}
                    style={sub===s?{borderColor:catData.color,background:`${catData.color}18`,color:catData.color}:{}}
                    onClick={() => setSub(v => v===s?'':s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Notes</label>
            <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Optional notes…"/>
          </div>
        </div>

        <div className="tform-footer">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving?'Saving…':transaction?'✓ Update':'✓ Add Transaction'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Transaction Row ────────────────────────────────────────────────────────
function TxnRow({ t, onEdit, onDelete }) {
  const [confirmDel, setConfirmDel] = useState(false);
  const catD = CAT[t.category] || CAT.other;
  const pmD  = PM[t.paymentMethod]  || PM.upi;
  const isIn = t.type === 'income';
  const total= t.amount * (t.quantity||1);

  return (
    <div className="txn-row">
      <div className="txn-cat-icon" style={{background:`${catD.color}18`,color:catD.color}}>
        {catD.emoji}
      </div>
      <div className="txn-main">
        <div className="txn-name">
          {t.itemName}
          {t.subCategory && <span className="txn-sub-tag">{t.subCategory}</span>}
        </div>
        <div className="txn-meta">
          <span className="txn-date">{format(parseISO(t.date),'MMM d')}</span>
          <span className="txn-pm" style={{color:pmD.color}}>{pmD.emoji} {pmD.label}</span>
          {t.quantity > 1 && <span className="txn-qty">× {t.quantity}</span>}
          <span className="txn-cat-pill" style={{color:catD.color,background:`${catD.color}15`}}>{catD.label}</span>
          {t.notes && <span className="txn-notes" title={t.notes}>📝</span>}
        </div>
      </div>
      <div className={`txn-amount ${isIn?'income-amt':'expense-amt'}`}>
        <span>{isIn?'+':'−'}{fmtFull(total)}</span>
        {t.quantity > 1 && <span className="txn-unit">₹{t.amount}/ea</span>}
      </div>
      <div className="txn-actions">
        {confirmDel ? (
          <>
            <button className="ta-btn ta-confirm" onClick={() => onDelete(t._id)}>✓</button>
            <button className="ta-btn" onClick={() => setConfirmDel(false)}>✕</button>
          </>
        ) : (
          <>
            <button className="ta-btn ta-edit" onClick={() => onEdit(t)}>✏</button>
            <button className="ta-btn ta-del" onClick={() => setConfirmDel(true)}>🗑</button>
          </>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════
export default function Finance() {
  const [activeTab,    setActiveTab]    = useState('overview');
  const [transactions, setTransactions] = useState([]);
  const [allTxns,      setAllTxns]      = useState([]); // unfiltered, for item tracker
  const [analytics,    setAnalytics]    = useState(null);
  const [monthlyData,  setMonthlyData]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [editTxn,      setEditTxn]      = useState(null);
  const [viewMonth,    setViewMonth]    = useState(new Date());
  const [search,       setSearch]       = useState('');
  const [dSearch,      setDSearch]      = useState('');
  const [filterCat,    setFilterCat]    = useState('');
  const [filterPM,     setFilterPM]     = useState('');
  const [filterType,   setFilterType]   = useState('');

  const { from, to } = monthRange(viewMonth);

  useEffect(() => {
    const t = setTimeout(() => setDSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = { from, to };
      if (filterCat)  params.category      = filterCat;
      if (filterPM)   params.paymentMethod = filterPM;
      if (filterType) params.type          = filterType;
      if (dSearch)    params.search        = dSearch;

      const [txR, anR, moR, allR] = await Promise.all([
        financeApi.getTransactions(params),
        financeApi.getAnalytics({ from, to }),
        financeApi.getMonthlyOverview({ months: 6 }),
        // Load all transactions (no date filter) for item tracker
        financeApi.getTransactions({}),
      ]);
      setTransactions(txR.data);
      setAnalytics(anR.data);
      setMonthlyData(moR.data);
      setAllTxns(allR.data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [from, to, filterCat, filterPM, filterType, dSearch]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleSave   = () => { setShowForm(false); setEditTxn(null); loadAll(); };
  const handleEdit   = t  => { setEditTxn(t); setShowForm(true); };
  const handleDelete = async id => { try { await financeApi.delete(id); loadAll(); } catch(e){} };

  const isCurrentMonth = viewMonth.getMonth()===new Date().getMonth()
    && viewMonth.getFullYear()===new Date().getFullYear();
  const hasFilter = filterCat||filterPM||filterType||dSearch;

  const sparkData = analytics?.byDay
    ? Object.entries(analytics.byDay).sort((a,b)=>a[0].localeCompare(b[0])).map(([d,v])=>({d,v}))
    : [];

  // Summary numbers (no balance cards — just spending summary)
  const totalExp = analytics?.totalExpense || 0;
  const totalInc = analytics?.totalIncome  || 0;
  const net      = totalInc - totalExp;

  const grouped = transactions.reduce((acc,t) => {
    if (!acc[t.date]) acc[t.date] = [];
    acc[t.date].push(t);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a,b)=>b.localeCompare(a));

  return (
    <div className="finance-page">

      {/* Header */}
      <div className="fin-header">
        <div>
          <h1>Finance</h1>
          <p>{format(viewMonth,'MMMM yyyy')} · Expense Tracker</p>
        </div>
        <button className="btn btn-primary"
          onClick={() => { setEditTxn(null); setShowForm(true); }}>
          + Add Transaction
        </button>
      </div>

      {/* Summary strip — no balance cards, just key numbers */}
      <div className="fin-summary-strip">
        <div className="fss-card fss-expense">
          <div className="fss-label">Spent</div>
          <div className="fss-val">{fmtFull(totalExp)}</div>
          <div className="fss-spark"><Sparkline data={sparkData} color="#e8637a" height={32}/></div>
        </div>
        {totalInc > 0 && (
          <div className="fss-card fss-income">
            <div className="fss-label">Income</div>
            <div className="fss-val" style={{color:'var(--teal)'}}>{fmtFull(totalInc)}</div>
          </div>
        )}
        <div className="fss-card fss-net">
          <div className="fss-label">Net</div>
          <div className="fss-val" style={{color:net>=0?'var(--teal)':'var(--rose)'}}>{fmtFull(Math.abs(net))}</div>
          <div className="fss-sub" style={{color:net>=0?'var(--teal)':'var(--rose)'}}>{net>=0?'surplus':'deficit'}</div>
        </div>
        <div className="fss-card fss-avg">
          <div className="fss-label">Daily Avg</div>
          <div className="fss-val">{fmtCurrency(totalExp / Math.max(new Date().getDate(), 1))}</div>
        </div>
        <div className="fss-card fss-count">
          <div className="fss-label">Transactions</div>
          <div className="fss-val">{transactions.length}</div>
        </div>

        {/* Payment method breakdown inline */}
        <div className="fss-pm-row">
          {PAYMENT_METHODS.map(m => {
            const spent = analytics?.totals?.[m.value] || 0;
            if (!spent) return null;
            return (
              <div key={m.value} className="fss-pm">
                <span>{m.emoji}</span>
                <span className="fss-pm-label">{m.label}</span>
                <span className="fss-pm-amt" style={{color:m.color}}>{fmtCurrency(spent)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Month Navigator */}
      <div className="month-nav">
        <button className="mn-btn" onClick={() => setViewMonth(m => subMonths(m,1))}>‹</button>
        <span className="mn-label">{format(viewMonth,'MMMM yyyy')}</span>
        <button className="mn-btn" disabled={isCurrentMonth}
          onClick={() => setViewMonth(m => {
            const next = new Date(m.getFullYear(), m.getMonth()+1, 1);
            return next > new Date() ? m : next;
          })}>›</button>
        {!isCurrentMonth && (
          <button className="btn btn-ghost btn-sm" onClick={() => setViewMonth(new Date())}>This Month</button>
        )}
      </div>

      {/* Tabs */}
      <div className="fin-tabs">
        {[
          { key:'overview',     label:'Overview' },
          { key:'transactions', label:`Transactions${transactions.length?` (${transactions.length})`:''}`},
          { key:'analytics',    label:'Analytics' },
          { key:'items',        label:'🔍 Item Tracker' },
        ].map(tab => (
          <button key={tab.key} className={`fin-tab ${activeTab===tab.key?'active':''}`}
            onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? <div className="fin-loading"><div className="spinner"/></div> : (<>

      {/* ── OVERVIEW ── */}
      {activeTab==='overview' && (
        <div className="fin-overview">
          <div className="overview-grid">
            <div className="fin-card">
              <div className="fin-card-title">Spending by Category</div>
              <CategoryBars byCategory={analytics?.byCategory} total={analytics?.totalExpense}/>
            </div>
            <div className="fin-card">
              <div className="fin-card-title">6-Month Trend</div>
              <MonthlyChart months={monthlyData}/>
            </div>
          </div>

          <div className="fin-card" style={{marginTop:16}}>
            <div className="fin-card-title-row">
              <div className="fin-card-title">Recent Transactions</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('transactions')}>See all →</button>
            </div>
            {transactions.length===0
              ? <div className="fin-empty">No transactions yet. <button className="fin-link" onClick={() => { setEditTxn(null); setShowForm(true); }}>Add one →</button></div>
              : transactions.slice(0,6).map(t => <TxnRow key={t._id} t={t} onEdit={handleEdit} onDelete={handleDelete}/>)
            }
          </div>

          {/* Top items this month */}
          {analytics?.topItems?.length > 0 && (
            <div className="fin-card" style={{marginTop:16}}>
              <div className="fin-card-title-row">
                <div className="fin-card-title">Top Purchases This Month</div>
                <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('items')}>Item tracker →</button>
              </div>
              <div className="items-list">
                <div className="items-header"><span>#</span><span>Item</span><span>Times</span><span>Total</span></div>
                {analytics.topItems.slice(0,5).map((item,i) => (
                  <div key={item.name} className="item-row">
                    <span className="item-rank" style={{color:i<3?'var(--gold)':'var(--text-3)'}}>#{i+1}</span>
                    <span className="item-name">{item.name}</span>
                    <span className="item-count">× {item.count}</span>
                    <span className="item-total">{fmtFull(item.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TRANSACTIONS ── */}
      {activeTab==='transactions' && (
        <div className="fin-transactions">
          <div className="txn-filters">
            <div className="notes-search-wrap" style={{flex:1}}>
              <span className="notes-search-icon">🔍</span>
              <input className="notes-search" placeholder="Search items, notes…"
                value={search} onChange={e => setSearch(e.target.value)}/>
              {search && <button className="notes-search-clear" onClick={() => setSearch('')}>✕</button>}
            </div>
            <select className="fin-select" value={filterPM} onChange={e => setFilterPM(e.target.value)}>
              <option value="">All methods</option>
              {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.emoji} {m.label}</option>)}
            </select>
            <select className="fin-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option value="">All categories</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
            </select>
            <select className="fin-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">All types</option>
              <option value="expense">↑ Expense</option>
              <option value="income">↓ Income</option>
            </select>
            {hasFilter && (
              <button className="btn btn-ghost btn-sm"
                onClick={() => { setFilterCat(''); setFilterPM(''); setFilterType(''); setSearch(''); }}>
                ✕ Clear
              </button>
            )}
          </div>

          {sortedDates.length===0 ? (
            <div className="fin-empty-state">
              <div className="fin-empty-icon">₹</div>
              <h3>{hasFilter?'No transactions match':'No transactions this month'}</h3>
              <p>{hasFilter?'Try clearing filters.':'Start by adding your first transaction.'}</p>
              {!hasFilter && (
                <button className="btn btn-primary" style={{marginTop:20}}
                  onClick={() => { setEditTxn(null); setShowForm(true); }}>+ Add Transaction</button>
              )}
            </div>
          ) : sortedDates.map(date => {
            const dayTxns = grouped[date];
            const dayExp  = dayTxns.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount*(t.quantity||1),0);
            const dayInc  = dayTxns.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount*(t.quantity||1),0);
            return (
              <div key={date} className="txn-day-group">
                <div className="txn-day-header">
                  <span className="txn-day-label">{format(parseISO(date),'EEEE, MMMM d')}</span>
                  <span className="txn-day-totals">
                    {dayExp>0 && <span style={{color:'var(--rose)'}}>−{fmtCurrency(dayExp)}</span>}
                    {dayInc>0 && <span style={{color:'var(--teal)',marginLeft:8}}>+{fmtCurrency(dayInc)}</span>}
                  </span>
                </div>
                {dayTxns.map(t => <TxnRow key={t._id} t={t} onEdit={handleEdit} onDelete={handleDelete}/>)}
              </div>
            );
          })}
        </div>
      )}

      {/* ── ANALYTICS ── */}
      {activeTab==='analytics' && (
        <div className="fin-analytics">
          <div className="analytics-grid">
            <div className="fin-card">
              <div className="fin-card-title">By Payment Method</div>
              <div className="pm-breakdown">
                {PAYMENT_METHODS.map(m => {
                  const spent = analytics?.totals?.[m.value]||0;
                  const pct   = analytics?.totalExpense>0?spent/analytics.totalExpense*100:0;
                  return (
                    <div key={m.value} className="pmb-row">
                      <span className="pmb-icon">{m.emoji}</span>
                      <span className="pmb-label">{m.label}</span>
                      <div className="pmb-track"><div className="pmb-fill" style={{width:`${pct}%`,background:m.color}}/></div>
                      <span className="pmb-pct" style={{color:m.color}}>{pct.toFixed(0)}%</span>
                      <span className="pmb-amt">{fmtCurrency(spent)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="fin-card">
              <div className="fin-card-title">By Category</div>
              <CategoryBars byCategory={analytics?.byCategory} total={analytics?.totalExpense}/>
            </div>

            <div className="fin-card fin-card-full">
              <div className="fin-card-title">6-Month Income vs Expense</div>
              <MonthlyChart months={monthlyData}/>
              <div className="monthly-table">
                <div className="mt-header"><span>Month</span><span>Income</span><span>Expense</span><span>Net</span></div>
                {monthlyData.map(m => (
                  <div key={m.label} className="mt-row">
                    <span>{m.label}</span>
                    <span style={{color:'var(--teal)'}}>{fmtCurrency(m.income)}</span>
                    <span style={{color:'var(--rose)'}}>{fmtCurrency(m.expense)}</span>
                    <span style={{color:(m.income-m.expense)>=0?'var(--teal)':'var(--rose)'}}>
                      {fmtCurrency(m.income-m.expense)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ITEM TRACKER ── */}
      {activeTab==='items' && (
        <div className="fin-items">
          <ItemTracker allTransactions={allTxns} viewMonth={viewMonth}/>
        </div>
      )}

      </>)}

      {showForm && (
        <TransactionForm transaction={editTxn} onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditTxn(null); }}/>
      )}
    </div>
  );
}