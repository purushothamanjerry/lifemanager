const express   = require('express');
const router    = express.Router();
const HealthLog = require('../models/HealthLog');

// ── GET logs (range) ──────────────────────────────────────────────────────
router.get('/logs', async (req, res) => {
  try {
    const { from, to, limit } = req.query;
    const filter = {};
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to)   filter.date.$lte = to;
    }
    const q = HealthLog.find(filter).sort({ date: -1 });
    if (limit) q.limit(parseInt(limit));
    res.json(await q);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── GET single day (by date string) ──────────────────────────────────────
router.get('/logs/:date', async (req, res) => {
  try {
    const log = await HealthLog.findOne({ date: req.params.date });
    if (!log) return res.status(404).json({ error: 'No log for this date' });
    res.json(log);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── UPSERT log for a day ──────────────────────────────────────────────────
router.put('/logs/:date', async (req, res) => {
  try {
    const log = await HealthLog.findOneAndUpdate(
      { date: req.params.date },
      { ...req.body, date: req.params.date, updatedAt: new Date() },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(log);
  } catch(e) { res.status(400).json({ error: e.message }); }
});

// ── DELETE log ────────────────────────────────────────────────────────────
router.delete('/logs/:date', async (req, res) => {
  try {
    await HealthLog.findOneAndDelete({ date: req.params.date });
    res.json({ message: 'Deleted' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── ADD food entry to a day ───────────────────────────────────────────────
router.post('/logs/:date/food', async (req, res) => {
  try {
    const log = await HealthLog.findOneAndUpdate(
      { date: req.params.date },
      { $push: { food: req.body }, $set: { updatedAt: new Date() }, $setOnInsert: { date: req.params.date } },
      { new: true, upsert: true }
    );
    res.json(log);
  } catch(e) { res.status(400).json({ error: e.message }); }
});

// ── DELETE food entry ─────────────────────────────────────────────────────
router.delete('/logs/:date/food/:foodId', async (req, res) => {
  try {
    const log = await HealthLog.findOneAndUpdate(
      { date: req.params.date },
      { $pull: { food: { _id: req.params.foodId } }, $set: { updatedAt: new Date() } },
      { new: true }
    );
    if (!log) return res.status(404).json({ error: 'Not found' });
    res.json(log);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── ANALYTICS: weight trend, avg sleep, avg calories ─────────────────────
router.get('/analytics', async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = {};
    if (from || to) { filter.date = {}; if (from) filter.date.$gte = from; if (to) filter.date.$lte = to; }

    const logs = await HealthLog.find(filter).sort({ date: 1 });

    const weightData   = logs.filter(l=>l.weight).map(l=>({ date: l.date, value: l.weight }));
    const sleepData    = logs.filter(l=>l.sleepHours).map(l=>({ date: l.date, value: l.sleepHours }));
    const waterData    = logs.filter(l=>l.waterLiters).map(l=>({ date: l.date, value: l.waterLiters }));
    const calorieData  = logs.map(l=>({ date: l.date, value: l.food.reduce((s,f)=>s+(f.calories*f.quantity),0) })).filter(d=>d.value>0);
    const workoutDays  = logs.filter(l=>l.workout).length;

    const avg = arr => arr.length ? arr.reduce((s,v)=>s+v,0)/arr.length : 0;
    const avgSleep    = avg(sleepData.map(d=>d.value));
    const avgWater    = avg(waterData.map(d=>d.value));
    const avgCalories = avg(calorieData.map(d=>d.value));

    const latestWeight = weightData.length ? weightData[weightData.length-1].value : null;
    const firstWeight  = weightData.length ? weightData[0].value : null;
    const weightChange = latestWeight && firstWeight ? latestWeight - firstWeight : null;

    // Latest height for BMI
    const latestHeight = logs.reverse().find(l=>l.height)?.height || null;
    const bmi = latestWeight && latestHeight ? latestWeight / Math.pow(latestHeight/100, 2) : null;

    // Food breakdown by meal type
    const byMeal = {};
    logs.forEach(l => l.food.forEach(f => {
      if (!byMeal[f.mealType]) byMeal[f.mealType] = { calories: 0, count: 0 };
      byMeal[f.mealType].calories += f.calories * f.quantity;
      byMeal[f.mealType].count++;
    }));

    // Mood distribution
    const moodDist = {};
    logs.forEach(l => { if (l.mood) moodDist[l.mood] = (moodDist[l.mood]||0)+1; });

    res.json({
      weightData, sleepData, waterData, calorieData,
      workoutDays, totalDays: logs.length,
      avgSleep, avgWater, avgCalories,
      latestWeight, firstWeight, weightChange, latestHeight, bmi,
      byMeal, moodDist,
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Latest profile (most recent weight + height) ──────────────────────────
router.get('/profile', async (req, res) => {
  try {
    const wLog = await HealthLog.findOne({ weight: { $exists: true, $ne: null } }).sort({ date: -1 });
    const hLog = await HealthLog.findOne({ height: { $exists: true, $ne: null } }).sort({ date: -1 });
    res.json({ weight: wLog?.weight || null, height: hLog?.height || null, weightDate: wLog?.date, heightDate: hLog?.date });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
