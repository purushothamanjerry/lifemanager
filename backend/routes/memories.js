const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const Memory  = require('../models/Memory');
const Person  = require('../models/Person');

// ── Multer setup ──────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `mem-${Date.now()}-${file.originalname.replace(/\s/g, '_')}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });

// ── Helper: resolve @mentions to Person IDs ───────────────────────────────
async function resolveMentions(text = '') {
  const names = [...new Set(
    (text.match(/@([A-Za-z][A-Za-z0-9 ]{1,39})/g) || []).map(m => m.slice(1).trim())
  )];
  const ids = [];
  for (const name of names) {
    const person = await Person.findOne({ name: new RegExp(`^${name}$`, 'i') });
    if (person) ids.push(person._id.toString());
  }
  return ids;
}

// ── GET all memories ──────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { search, tag, emotion, person, year, favorite } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { title:       { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { place:       { $regex: search, $options: 'i' } },
        { tags:        { $regex: search, $options: 'i' } },
      ];
    }
    if (tag)      filter.tags        = tag.toLowerCase();
    if (emotion)  filter.emotion     = emotion;
    if (person)   filter.peopleInvolved = person;
    if (favorite) filter.isFavorite  = true;
    if (year)     filter.date = {
      $gte: new Date(`${year}-01-01`),
      $lte: new Date(`${year}-12-31`),
    };

    const memories = await Memory.find(filter)
      .populate('peopleInvolved', 'name profilePhoto relationshipType')
      .sort({ date: -1 });

    res.json(memories);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET single memory ─────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const memory = await Memory.findById(req.params.id)
      .populate('peopleInvolved', 'name profilePhoto relationshipType dateOfBirth');
    if (!memory) return res.status(404).json({ error: 'Memory not found' });
    res.json(memory);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST create memory ────────────────────────────────────────────────────
router.post('/', upload.array('photos', 20), async (req, res) => {
  try {
    const { title, description, date, place, emotion, tags, isFavorite, peopleInvolved } = req.body;

    // Resolve @mentions from description
    const mentionIds  = await resolveMentions(description || '');

    // Explicit people selections (sent as JSON array or comma-separated IDs)
    let explicitIds = [];
    if (peopleInvolved) {
      try { explicitIds = JSON.parse(peopleInvolved); }
      catch { explicitIds = peopleInvolved.split(',').filter(Boolean); }
    }

    // Merge & deduplicate
    const allPeople = [...new Set([...mentionIds, ...explicitIds])];

    const parsedTags = tags
      ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean))
      : [];

    const photos = (req.files || []).map(f => `/uploads/${f.filename}`);

    const memory = new Memory({
      title, description, date, place, emotion,
      tags: parsedTags,
      peopleInvolved: allPeople,
      photos,
      isFavorite: isFavorite === 'true',
    });

    await memory.save();
    await memory.populate('peopleInvolved', 'name profilePhoto relationshipType');
    res.status(201).json(memory);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ── PUT update memory ─────────────────────────────────────────────────────
router.put('/:id', upload.array('photos', 20), async (req, res) => {
  try {
    const { title, description, date, place, emotion, tags, isFavorite, peopleInvolved, coverPhoto } = req.body;
    const existing = await Memory.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const update = { updatedAt: new Date() };
    if (title       !== undefined) update.title       = title;
    if (description !== undefined) update.description = description;
    if (date        !== undefined) update.date        = date;
    if (place       !== undefined) update.place       = place;
    if (emotion     !== undefined) update.emotion     = emotion;
    if (isFavorite  !== undefined) update.isFavorite  = isFavorite === 'true' || isFavorite === true;
    if (coverPhoto  !== undefined) update.coverPhoto  = Number(coverPhoto);

    if (tags !== undefined) {
      update.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    }

    // Re-resolve people
    const mentionIds = description !== undefined ? await resolveMentions(description) : [];
    let explicitIds  = [];
    if (peopleInvolved) {
      try { explicitIds = JSON.parse(peopleInvolved); }
      catch { explicitIds = peopleInvolved.split(',').filter(Boolean); }
    }
    if (description !== undefined || peopleInvolved !== undefined) {
      update.peopleInvolved = [...new Set([...mentionIds, ...explicitIds])];
    }

    // Append new photos
    if (req.files?.length) {
      update.$push = { photos: { $each: req.files.map(f => `/uploads/${f.filename}`) } };
    }

    const { $push, ...rest } = update;
    const ops = { ...rest };
    if ($push) ops.$push = $push;

    const memory = await Memory.findByIdAndUpdate(req.params.id, ops, { new: true })
      .populate('peopleInvolved', 'name profilePhoto relationshipType');
    res.json(memory);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ── DELETE memory ─────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await Memory.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DELETE single photo from memory ──────────────────────────────────────
router.delete('/:id/photos/:photoIndex', async (req, res) => {
  try {
    const memory = await Memory.findById(req.params.id);
    if (!memory) return res.status(404).json({ error: 'Not found' });
    const idx = parseInt(req.params.photoIndex, 10);
    memory.photos.splice(idx, 1);
    if (memory.coverPhoto >= memory.photos.length) memory.coverPhoto = 0;
    await memory.save();
    res.json(memory);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET metadata (tags + years + emotions) ────────────────────────────────
router.get('/meta/all', async (req, res) => {
  try {
    const [tags, rawDates, emotions] = await Promise.all([
      Memory.distinct('tags'),
      Memory.find({}, 'date').lean(),
      Memory.aggregate([{ $group: { _id: '$emotion', count: { $sum: 1 } } }]),
    ]);
    const years = [...new Set(rawDates.map(m => new Date(m.date).getFullYear()))].sort((a,b) => b-a);
    res.json({ tags: tags.filter(Boolean).sort(), years, emotions });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET memories for a specific person ───────────────────────────────────
router.get('/person/:personId', async (req, res) => {
  try {
    const memories = await Memory.find({ peopleInvolved: req.params.personId })
      .populate('peopleInvolved', 'name profilePhoto relationshipType')
      .sort({ date: -1 });
    res.json(memories);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
