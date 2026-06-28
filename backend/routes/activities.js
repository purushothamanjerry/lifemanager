const express  = require('express');
const router   = express.Router();
const Activity = require('../models/Activity');

// ── helpers ───────────────────────────────────────────────────────────────
const toMins = t => { const [h,m] = t.split(':').map(Number); return h*60+m; };
const durMins = (s, e) => {
  if (!s || !e) return null;
  let d = toMins(e) - toMins(s);
  if (d < 0) d += 1440;
  return d;
};

// ── GET activities (with filters) ─────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { date, from, to, category, search } = req.query;
    const filter = {};
    if (date) filter.date = date;
    else if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to)   filter.date.$lte = to;
    }
    if (category) filter.category = category;
    if (search)   filter.$or = [
      { name:     { $regex: search, $options: 'i' } },
      { location: { $regex: search, $options: 'i' } },
      { notes:    { $regex: search, $options: 'i' } },
    ];
    const activities = await Activity.find(filter).sort({ date: -1, startTime: 1 });
    res.json(activities);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── GET single ────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const a = await Activity.findById(req.params.id);
    if (!a) return res.status(404).json({ error: 'Not found' });
    res.json(a);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── POST create ───────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const a = await Activity.create(req.body);
    res.status(201).json(a);
  } catch(e) { res.status(400).json({ error: e.message }); }
});

// ── PUT update ────────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const a = await Activity.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!a) return res.status(404).json({ error: 'Not found' });
    res.json(a);
  } catch(e) { res.status(400).json({ error: e.message }); }
});

// ── DELETE ────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await Activity.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── ANALYTICS: day / range ────────────────────────────────────────────────
router.get('/meta/analytics', async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = {};
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to)   filter.date.$lte = to;
    }
    const acts = await Activity.find(filter);

    // Duration per category
    const byCat = {};
    acts.forEach(a => {
      const d = durMins(a.startTime, a.endTime);
      if (!byCat[a.category]) byCat[a.category] = { mins: 0, count: 0 };
      byCat[a.category].mins  += d || 0;
      byCat[a.category].count += 1;
    });

    // Productive vs non-productive
    const prodMins    = acts.filter(a=>a.productive).reduce((s,a)=>s+(durMins(a.startTime,a.endTime)||0),0);
    const nonProdMins = acts.filter(a=>!a.productive).reduce((s,a)=>s+(durMins(a.startTime,a.endTime)||0),0);

    // Total logged hours
    const totalMins = acts.reduce((s,a)=>s+(durMins(a.startTime,a.endTime)||0),0);

    // Daily breakdown  
    const byDay = {};
    acts.forEach(a => {
      if (!byDay[a.date]) byDay[a.date] = { totalMins: 0, prodMins: 0, count: 0 };
      const d = durMins(a.startTime, a.endTime) || 0;
      byDay[a.date].totalMins += d;
      if (a.productive) byDay[a.date].prodMins += d;
      byDay[a.date].count++;
    });

    // Most common locations
    const locCount = {};
    acts.forEach(a => { if (a.location) locCount[a.location] = (locCount[a.location]||0)+1; });
    const topLocations = Object.entries(locCount).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([loc,cnt])=>({loc,cnt}));

    // Mood distribution
    const moodDist = {};
    acts.forEach(a => { if (a.mood) moodDist[a.mood] = (moodDist[a.mood]||0)+1; });

    // Hourly heatmap: how many activities start in each hour 0-23
    const hourly = new Array(24).fill(0);
    acts.forEach(a => { if (a.startTime) hourly[parseInt(a.startTime.split(':')[0])]++; });

    res.json({
      totalMins, prodMins, nonProdMins,
      totalActivities: acts.length,
      byCat, byDay, topLocations, moodDist, hourly,
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
