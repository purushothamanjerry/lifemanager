const express  = require('express');
const router   = express.Router();
const path     = require('path');
const fs       = require('fs');
const multer   = require('multer');
const Profile  = require('../models/Profile');

const { cloudinary, CloudinaryStorage } = require('../config/cloudinary');

// ── Multer for profile photo ──────────────────────────────────────
const ALLOWED_TYPES = ['image/jpeg','image/jpg','image/png','image/webp','image/gif'];

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'life-manager/profile',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'gif'],
    public_id: (req, file) => `profile-${Date.now()}`
  }
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

      const photoPath = req.file.path;
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
    
    const crypto = require('crypto');
    const pinHash = crypto.createHash('sha256').update(String(pin)).digest('hex');

    await Profile.findByIdAndUpdate(
      'main',
      { safetyModePinHash: pinHash, updatedAt: new Date() },
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

    const crypto = require('crypto');
    const inputHash = crypto.createHash('sha256').update(String(pin)).digest('hex');

    // Support legacy plaintext PINs during migration transition
    const isValid = (profile.safetyModePinHash === inputHash) || (profile.safetyModePinHash === String(pin));
    res.json({ valid: isValid });
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
    const Link        = safeLoad('../models/Link');
    const HealthLog   = safeLoad('../models/HealthLog');

    const results = await Promise.allSettled([
      Memory    ? Memory.countDocuments()    : Promise.resolve(0),
      Note      ? Note.countDocuments()      : Promise.resolve(0),
      Person    ? Person.countDocuments()    : Promise.resolve(0),
      Link      ? Link.countDocuments()      : Promise.resolve(0),
      HealthLog ? HealthLog.countDocuments() : Promise.resolve(0),
    ]);

    const val = (r, fallback) => r.status === 'fulfilled' ? r.value : fallback;

    res.json({
      memories:   val(results[0], 0),
      notes:      val(results[1], 0),
      people:     val(results[2], 0),
      links:      val(results[3], 0),
      healthLogs: val(results[4], 0),
    });
  } catch(e) {
    console.error('GET /profile/stats error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── GET recent activity feed ──────────────────────────────────────
router.get('/recent', async (req, res) => {
  try {
    const Memory = safeLoad('../models/Memory');
    const Note   = safeLoad('../models/Note');
    const Convo  = safeLoad('../models/Conversation');
    const Link   = safeLoad('../models/Link');

    const results = await Promise.allSettled([
      Memory ? Memory.find().sort({ createdAt: -1 }).limit(5).select('title emotion createdAt') : Promise.resolve([]),
      Note   ? Note.find().sort({ createdAt: -1 }).limit(5).select('title createdAt')           : Promise.resolve([]),
      Convo  ? Convo.find().sort({ createdAt: -1 }).limit(5).select('summary createdAt person').populate('person', 'name') : Promise.resolve([]),
      Link   ? Link.find().sort({ createdAt: -1 }).limit(5).select('name source customSource url createdAt') : Promise.resolve([]),
    ]);

    const arr = (r) => (r.status === 'fulfilled' && Array.isArray(r.value)) ? r.value : [];

    const feed = [
      ...arr(results[0]).map(m => ({ type: 'memory', icon: '◈', color: 'var(--violet)', label: m.title || 'Memory', sub: m.emotion || 'memory', ts: m.createdAt })),
      ...arr(results[1]).map(n => ({ type: 'note',   icon: '✦', color: 'var(--teal)',   label: n.title || 'Untitled note', sub: 'Note', ts: n.createdAt })),
      ...arr(results[2]).map(c => ({ type: 'convo',  icon: '◎', color: 'var(--blue)',   label: c.person?.name || 'Someone', sub: c.summary || 'Conversation logged', ts: c.createdAt })),
      ...arr(results[3]).map(l => ({ type: 'link',   icon: '🔗', color: 'var(--violet)', label: l.name || 'Link', sub: l.source === 'Other' ? (l.customSource || 'Custom source') : l.source, ts: l.createdAt })),
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