const express = require('express');
const router  = express.Router();
const Plan    = require('../models/Plan');

// ── Helper: detect time conflicts on a date ───────────────────────────────
function toMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
async function getConflicts(date, startTime, endTime, excludeId = null) {
  if (!startTime || !endTime) return [];
  const plans = await Plan.find({ date, _id: { $ne: excludeId }, status: { $nin: ['done','skipped'] } });
  const newStart = toMinutes(startTime);
  const newEnd   = toMinutes(endTime);
  return plans.filter(p => {
    if (!p.startTime || !p.endTime) return false;
    const s = toMinutes(p.startTime);
    const e = toMinutes(p.endTime);
    return newStart < e && newEnd > s;
  });
}

// ── GET plans (by date or range) ──────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { date, from, to, status, category, priority } = req.query;
    const filter = {};

    if (date)           filter.date = date;
    else if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to)   filter.date.$lte = to;
    }
    if (status)   filter.status   = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;

    const plans = await Plan.find(filter).sort({ date: 1, startTime: 1 });
    res.json(plans);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ── GET single plan ───────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Not found' });
    res.json(plan);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ── POST create plan ──────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { title, category, date, startTime, endTime, priority, status, notes, isAllDay } = req.body;
    const conflicts = await getConflicts(date, startTime, endTime);
    const plan = await Plan.create({ title, category, date, startTime, endTime, priority, status, notes, isAllDay });
    res.status(201).json({ plan, conflicts });
  } catch(err) { res.status(400).json({ error: err.message }); }
});

// ── PUT update plan ───────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const updates = { ...req.body, updatedAt: new Date() };
    if (updates.status === 'done' && !updates.completedAt) updates.completedAt = new Date();
    const plan = await Plan.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!plan) return res.status(404).json({ error: 'Not found' });
    const conflicts = await getConflicts(plan.date, plan.startTime, plan.endTime, plan._id);
    res.json({ plan, conflicts });
  } catch(err) { res.status(400).json({ error: err.message }); }
});

// ── PATCH mark complete / status shortcut ─────────────────────────────────
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const upd = { status, updatedAt: new Date() };
    if (status === 'done') upd.completedAt = new Date();
    const plan = await Plan.findByIdAndUpdate(req.params.id, upd, { new: true });
    res.json(plan);
  } catch(err) { res.status(400).json({ error: err.message }); }
});

// ── PATCH reschedule ──────────────────────────────────────────────────────
router.patch('/:id/reschedule', async (req, res) => {
  try {
    const { newDate, startTime, endTime } = req.body;
    const existing = await Plan.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const conflicts = await getConflicts(newDate, startTime || existing.startTime, endTime || existing.endTime, req.params.id);
    const plan = await Plan.findByIdAndUpdate(req.params.id, {
      date: newDate,
      startTime: startTime || existing.startTime,
      endTime: endTime || existing.endTime,
      status: 'rescheduled',
      rescheduledFrom: existing.rescheduledFrom || existing.date,
      updatedAt: new Date(),
    }, { new: true });
    res.json({ plan, conflicts });
  } catch(err) { res.status(400).json({ error: err.message }); }
});

// ── DELETE plan ───────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await Plan.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ── GET stats (for dashboard / month summary) ─────────────────────────────
router.get('/meta/stats', async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = {};
    if (from || to) { filter.date = {}; if (from) filter.date.$gte = from; if (to) filter.date.$lte = to; }
    const [total, done, pending, inProgress, skipped] = await Promise.all([
      Plan.countDocuments(filter),
      Plan.countDocuments({ ...filter, status: 'done' }),
      Plan.countDocuments({ ...filter, status: 'pending' }),
      Plan.countDocuments({ ...filter, status: 'in-progress' }),
      Plan.countDocuments({ ...filter, status: 'skipped' }),
    ]);
    const byCategory = await Plan.aggregate([
      { $match: filter },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    res.json({ total, done, pending, inProgress, skipped, byCategory });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ── GET conflicts check ───────────────────────────────────────────────────
router.post('/check-conflicts', async (req, res) => {
  try {
    const { date, startTime, endTime, excludeId } = req.body;
    const conflicts = await getConflicts(date, startTime, endTime, excludeId);
    res.json({ conflicts });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;