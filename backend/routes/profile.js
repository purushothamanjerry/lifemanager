const express  = require('express');
const router   = express.Router();
const path     = require('path');
const fs       = require('fs');
const multer   = require('multer');
const Profile  = require('../models/Profile');

// ── Multer for profile photo ──────────────────────────────────────
const ALLOWED_TYPES = ['image/jpeg','image/jpg','image/png','image/webp','image/gif'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/profile');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  // Timestamped filename avoids Windows file-lock conflicts on overwrite
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `profile-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpg, png, webp, gif)'));
    }
  },
});

// ── Helper: safe model load ───────────────────────────────────────
const safeLoad = (modelPath) => {
  try { return require(modelPath); } catch(e) { return null; }
};

// ── GET profile (upsert default) ──────────────────────────────────
router.get('/', async (req, res) => {
  try {
    let profile = await Profile.findById('main');
    if (!profile) {
      profile = new Profile({ _id: 'main' });
      await profile.save();
    }
    res.json(profile);
  } catch(e) {
    console.error('GET /profile error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── PUT update profile ────────────────────────────────────────────
router.put('/', async (req, res) => {
  try {
    // Strip read-only fields before update
    const { safetyModePinHash, _id, __v, ...body } = req.body;
    const profile = await Profile.findByIdAndUpdate(
      'main',
      { $set: { ...body, updatedAt: new Date() } },
      { new: true, upsert: true }
    );
    res.json(profile);
  } catch(e) {
    console.error('PUT /profile error:', e.message);
    res.status(400).json({ error: e.message });
  }
});

// ── POST profile photo ────────────────────────────────────────────
router.post('/photo', (req, res) => {
  upload.single('photo')(req, res, async (err) => {
    // Multer errors (file type, size) come through here
    if (err) {
      console.error('Upload error:', err.message);
      return res.status(400).json({ error: err.message });
    }
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      // Delete previous profile photo(s) to avoid accumulation
      const uploadDir = path.join(__dirname, '../uploads/profile');
      if (fs.existsSync(uploadDir)) {
        const files = fs.readdirSync(uploadDir);
        files.forEach(f => {
          // Delete old files but not the one we just saved
          if (f !== req.file.filename) {
            try { fs.unlinkSync(path.join(uploadDir, f)); } catch(_) {}
          }
        });
      }

      const photoPath = '/uploads/profile/' + req.file.filename;
      const profile = await Profile.findByIdAndUpdate(
        'main',
        { profilePhoto: photoPath, updatedAt: new Date() },
        { new: true, upsert: true }
      );
      res.json({ profilePhoto: profile.profilePhoto });
    } catch(e) {
      console.error('POST /profile/photo error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });
});

// ── POST set safety PIN ───────────────────────────────────────────
router.post('/safety/set-pin', async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin || String(pin).length < 4)
      return res.status(400).json({ error: 'PIN must be at least 4 digits' });
    await Profile.findByIdAndUpdate(
      'main',
      { safetyModePinHash: String(pin), updatedAt: new Date() },
      { upsert: true }
    );
    res.json({ message: 'PIN set successfully' });
  } catch(e) {
    console.error('POST /profile/safety/set-pin error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── POST verify safety PIN ────────────────────────────────────────
router.post('/safety/verify-pin', async (req, res) => {
  try {
    const { pin } = req.body;
    const profile = await Profile.findById('main');
    if (!profile || !profile.safetyModePinHash) return res.json({ valid: true });
    res.json({ valid: profile.safetyModePinHash === String(pin) });
  } catch(e) {
    console.error('POST /profile/safety/verify-pin error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── GET life statistics ───────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const Memory      = safeLoad('../models/Memory');
    const Note        = safeLoad('../models/Note');
    const Person      = safeLoad('../models/Person');
    const Plan        = safeLoad('../models/Plan');
    const Transaction = safeLoad('../models/Transaction');
    const Activity    = safeLoad('../models/Activity');
    const HealthLog   = safeLoad('../models/HealthLog');

    const results = await Promise.allSettled([
      Memory      ? Memory.countDocuments()                                                                     : Promise.resolve(0),
      Note        ? Note.countDocuments()                                                                       : Promise.resolve(0),
      Person      ? Person.countDocuments()                                                                     : Promise.resolve(0),
      Plan        ? Plan.countDocuments({ status: 'done' })                                                    : Promise.resolve(0),
      Transaction ? Transaction.find({ type: 'expense', isTransfer: { $ne: true } }).select('amount quantity') : Promise.resolve([]),
      Activity    ? Activity.find({ endTime: { $exists: true, $ne: '' } }).select('startTime endTime productive') : Promise.resolve([]),
      HealthLog   ? HealthLog.countDocuments()                                                                  : Promise.resolve(0),
    ]);

    const val = (r, fallback) => r.status === 'fulfilled' ? r.value : fallback;

    const transactions = val(results[4], []);
    const activities   = val(results[5], []);

    const totalExpenses = Array.isArray(transactions)
      ? transactions.reduce((s, t) => s + (Number(t.amount) || 0) * (Number(t.quantity) || 1), 0)
      : 0;

    const toMins = (s, e) => {
      if (!s || !e) return 0;
      try {
        const [sh, sm] = s.split(':').map(Number);
        const [eh, em] = e.split(':').map(Number);
        let d = (eh * 60 + em) - (sh * 60 + sm);
        if (d < 0) d += 1440;
        return d;
      } catch { return 0; }
    };

    const prodMins = Array.isArray(activities)
      ? activities.filter(a => a.productive).reduce((s, a) => s + toMins(a.startTime, a.endTime), 0)
      : 0;

    res.json({
      memories:          val(results[0], 0),
      notes:             val(results[1], 0),
      people:            val(results[2], 0),
      plansCompleted:    val(results[3], 0),
      totalExpenses,
      productivityHours: Math.round(prodMins / 60 * 10) / 10,
      healthLogs:        val(results[6], 0),
      totalActivities:   Array.isArray(activities) ? activities.length : 0,
    });
  } catch(e) {
    console.error('GET /profile/stats error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── GET recent activity feed ──────────────────────────────────────
// NOTE: Conversation model uses field `person` (not `personId`)
router.get('/recent', async (req, res) => {
  try {
    const Memory      = safeLoad('../models/Memory');
    const Note        = safeLoad('../models/Note');
    const Plan        = safeLoad('../models/Plan');
    const Transaction = safeLoad('../models/Transaction');
    const Convo       = safeLoad('../models/Conversation');

    const results = await Promise.allSettled([
      Memory      ? Memory.find().sort({ createdAt: -1 }).limit(5).select('title emotion createdAt')                                       : Promise.resolve([]),
      Note        ? Note.find().sort({ createdAt: -1 }).limit(5).select('title createdAt')                                                 : Promise.resolve([]),
      Plan        ? Plan.find({ status: 'done' }).sort({ completedAt: -1 }).limit(5).select('title completedAt createdAt')                 : Promise.resolve([]),
      Transaction ? Transaction.find({ type: 'expense', isTransfer: { $ne: true } }).sort({ createdAt: -1 }).limit(5).select('itemName amount category createdAt') : Promise.resolve([]),
      Convo       ? Convo.find().sort({ createdAt: -1 }).limit(5).select('summary createdAt person').populate('person', 'name')            : Promise.resolve([]),
    ]);

    const arr = (r) => (r.status === 'fulfilled' && Array.isArray(r.value)) ? r.value : [];

    const feed = [
      ...arr(results[0]).map(m => ({ type: 'memory',  icon: '◈', color: 'var(--violet)', label: m.title || 'Memory',           sub: m.emotion || 'memory',                   ts: m.createdAt })),
      ...arr(results[1]).map(n => ({ type: 'note',    icon: '✦', color: 'var(--teal)',   label: n.title || 'Untitled note',    sub: 'Note',                                  ts: n.createdAt })),
      ...arr(results[2]).map(p => ({ type: 'plan',    icon: '◇', color: 'var(--gold)',   label: p.title || 'Plan',             sub: 'Plan completed',                         ts: p.completedAt || p.createdAt })),
      ...arr(results[3]).map(t => ({ type: 'expense', icon: '₹', color: 'var(--rose)',   label: t.itemName || 'Expense',       sub: '₹' + t.amount + ' · ' + (t.category||''), ts: t.createdAt })),
      ...arr(results[4]).map(c => ({ type: 'convo',   icon: '◎', color: 'var(--blue)',   label: c.person?.name || 'Someone',   sub: c.summary || 'Conversation logged',       ts: c.createdAt })),
    ]
      .filter(item => item.ts)
      .sort((a, b) => new Date(b.ts) - new Date(a.ts))
      .slice(0, 20);

    res.json(feed);
  } catch(e) {
    console.error('GET /profile/recent error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;