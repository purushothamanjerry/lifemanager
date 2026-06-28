const express     = require('express');
const router      = express.Router();
const Transaction = require('../models/Transaction');
const Account     = require('../models/Account');

// ── GET transactions (with filters) ──────────────────────────────────────
router.get('/transactions', async (req, res) => {
  try {
    const { from, to, category, paymentMethod, type, search, limit } = req.query;
    const filter = {};
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to)   filter.date.$lte = to;
    }
    if (category)      filter.category      = category;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (type)          filter.type          = type;
    if (search)        filter.$or = [
      { itemName: { $regex: search, $options: 'i' } },
      { notes:    { $regex: search, $options: 'i' } },
    ];

    const q = Transaction.find(filter).sort({ date: -1, createdAt: -1 });
    if (limit) q.limit(parseInt(limit));
    const transactions = await q;
    res.json(transactions);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET single transaction ────────────────────────────────────────────────
router.get('/transactions/:id', async (req, res) => {
  try {
    const t = await Transaction.findById(req.params.id);
    if (!t) return res.status(404).json({ error: 'Not found' });
    res.json(t);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST create transaction ───────────────────────────────────────────────
router.post('/transactions', async (req, res) => {
  try {
    const t = await Transaction.create(req.body);
    res.status(201).json(t);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ── PUT update transaction ────────────────────────────────────────────────
router.put('/transactions/:id', async (req, res) => {
  try {
    const t = await Transaction.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!t) return res.status(404).json({ error: 'Not found' });
    res.json(t);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ── DELETE transaction ────────────────────────────────────────────────────
router.delete('/transactions/:id', async (req, res) => {
  try {
    await Transaction.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET analytics for a month/range ──────────────────────────────────────
router.get('/analytics', async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = {};
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to)   filter.date.$lte = to;
    }

    filter.isTransfer = { $ne: true };  // exclude internal transfers
    const transactions = await Transaction.find(filter);

    // Totals by payment method
    const totals = { cash: 0, upi: 0, bank: 0 };
    const income = { cash: 0, upi: 0, bank: 0 };
    transactions.forEach(t => {
      if (t.type === 'income') income[t.paymentMethod]  += t.amount;
      else                     totals[t.paymentMethod] += t.amount;
    });

    // By category
    const byCategory = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
    });

    // Daily spending (for sparkline)
    const byDay = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      byDay[t.date] = (byDay[t.date] || 0) + t.amount;
    });

    // Top items
    const byItem = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      if (!byItem[t.itemName]) byItem[t.itemName] = { total: 0, count: 0 };
      byItem[t.itemName].total += t.amount;
      byItem[t.itemName].count += t.quantity || 1;
    });
    const topItems = Object.entries(byItem)
      .sort((a,b) => b[1].total - a[1].total)
      .slice(0, 10)
      .map(([name, d]) => ({ name, ...d }));

    res.json({
      totals, income,
      totalExpense: Object.values(totals).reduce((a,b) => a+b, 0),
      totalIncome:  Object.values(income).reduce((a,b) => a+b, 0),
      byCategory, byDay, topItems,
      count: transactions.length,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET monthly overview (last N months) ─────────────────────────────────
router.get('/monthly-overview', async (req, res) => {
  try {
    const months = parseInt(req.query.months || 6);
    const rows = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const d    = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const from = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
      const last = new Date(d.getFullYear(), d.getMonth()+1, 0).getDate();
      const to   = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${last}`;
      const label= `${d.toLocaleString('default',{month:'short'})} ${d.getFullYear()}`;

      const txns = await Transaction.find({ date: { $gte: from, $lte: to } });
      const expense = txns.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount, 0);
      const income  = txns.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount, 0);
      rows.push({ label, from, to, expense, income, count: txns.length });
    }
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET / SET account balances ────────────────────────────────────────────
router.get('/accounts', async (req, res) => {
  try {
    const accounts = await Account.find();
    // Compute current balance = starting + income - expense per method
    const methods = ['cash', 'upi', 'bank'];
    const result  = {};
    for (const m of methods) {
      const acc = accounts.find(a => a.method === m);
      const start = acc?.startingBalance || 0;
      const txns  = await Transaction.find({ paymentMethod: m });
      const spent = txns.filter(t=>t.type==='expense'&&!t.isTransfer).reduce((s,t)=>s+t.amount,0);
      const earned= txns.filter(t=>t.type==='income'&&!t.isTransfer).reduce((s,t)=>s+t.amount,0);
      const tOut  = txns.filter(t=>t.type==='expense'&&t.isTransfer).reduce((s,t)=>s+t.amount,0);
      const tIn   = txns.filter(t=>t.type==='income'&&t.isTransfer).reduce((s,t)=>s+t.amount,0);
      result[m] = { startingBalance: start, current: start + earned - spent + tIn - tOut, spent, earned, transferIn: tIn, transferOut: tOut };
    }
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/accounts/:method', async (req, res) => {
  try {
    const { startingBalance } = req.body;
    const acc = await Account.findOneAndUpdate(
      { method: req.params.method },
      { startingBalance, updatedAt: new Date() },
      { new: true, upsert: true }
    );
    res.json(acc);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;