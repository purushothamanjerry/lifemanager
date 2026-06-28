const express  = require('express');
const router   = express.Router();
const path     = require('path');
const fs       = require('fs');
const multer   = require('multer');
const Person   = require('../models/Person');

const ALLOWED = ['image/jpeg','image/jpg','image/png','image/webp','image/gif'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/people');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `person-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    ALLOWED.includes(file.mimetype) ? cb(null, true) : cb(new Error('Images only'));
  },
});

function buildBody(body) {
  const fields = [
    'name','gender','relationshipType','currentStatus','statusNote','isSpecial',
    'firstMeetingPlace','howWeMet','height','eyeColor','hairColor',
    'bodyType','styleNotes','appearanceNotes','favoriteColor','habits',
    'personalityNotes','communicationStyle','values','quirks','notes',
    'mobileNumber','instagramId','linkedinId','twitterId','snapchatId',
    'email','otherContact','loveLanguage',
    'height','hairLength','bodyType','look',
  ];
  const dateFields   = ['dateOfBirth','firstMeetingDate','lastConversationDate'];
  const numberFields = ['approximateAge'];

  const out = {};

  fields.forEach(f => { if (body[f] !== undefined) out[f] = body[f]; });

  dateFields.forEach(f => {
    if (body[f]) out[f] = new Date(body[f]);
    else if (body[f] === '') out[f] = null;
  });

  // Boolean fields
  if (body.isSpecial !== undefined) {
    out.isSpecial = body.isSpecial === 'true' || body.isSpecial === true;
  }

  numberFields.forEach(f => {
    if (body[f] !== undefined && body[f] !== '') out[f] = Number(body[f]);
    else if (body[f] === '') out[f] = null;
  });

  // ── Boolean: isSpecial (FormData sends strings) ──────────────────
  if (body.isSpecial !== undefined) {
    out.isSpecial = body.isSpecial === 'true' || body.isSpecial === true;
  }

  // hobbies
  if (body['hobbies[]']) {
    out.hobbies = Array.isArray(body['hobbies[]']) ? body['hobbies[]'] : [body['hobbies[]']];
  } else if (body.hobbies) {
    out.hobbies = body.hobbies.split(',').map(h=>h.trim()).filter(Boolean);
  }

  // characterTraits
  if (body['characterTraits[]']) {
    out.characterTraits = Array.isArray(body['characterTraits[]']) ? body['characterTraits[]'] : [body['characterTraits[]']];
  } else if (body.characterTraits) {
    out.characterTraits = body.characterTraits.split(',').map(t=>t.trim()).filter(Boolean);
  }

  // linkedPeople — sent as JSON string
  if (body.linkedPeople) {
    try { out.linkedPeople = JSON.parse(body.linkedPeople); } catch(_) {}
  }

  return out;
}

// GET all
router.get('/', async (req, res) => {
  try {
    const people = await Person.find()
      .populate('linkedPeople.person', 'name profilePhoto relationshipType currentStatus')
      .sort({ createdAt: -1 });
    res.json(people);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET by ID
router.get('/:id', async (req, res) => {
  try {
    if (!req.params.id || req.params.id === 'undefined')
      return res.status(400).json({ error: 'Invalid ID' });
    const person = await Person.findById(req.params.id)
      .populate('linkedPeople.person', 'name profilePhoto relationshipType currentStatus');
    if (!person) return res.status(404).json({ error: 'Person not found' });
    res.json(person);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST create
router.post('/', (req, res) => {
  upload.single('profilePhoto')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    try {
      const body = buildBody(req.body);
      if (req.file) body.profilePhoto = '/uploads/people/' + req.file.filename;
      if (body.currentStatus) {
        body.statusHistory = [{
          status: body.currentStatus,
          note: body.statusNote || 'Initial status',
          changedAt: new Date(),
        }];
      }
      delete body.statusNote;
      const person = await Person.create(body);
      res.status(201).json(person);
    } catch(e) { res.status(400).json({ error: e.message }); }
  });
});

// PUT update
router.put('/:id', (req, res) => {
  upload.single('profilePhoto')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    try {
      const body = buildBody(req.body);
      if (req.file) body.profilePhoto = '/uploads/people/' + req.file.filename;
      body.updatedAt = new Date();

      const existing = await Person.findById(req.params.id).select('currentStatus statusHistory');
      if (existing && body.currentStatus && body.currentStatus !== existing.currentStatus) {
        body.$push = {
          statusHistory: {
            status: body.currentStatus,
            note: body.statusNote || '',
            changedAt: new Date(),
          }
        };
      }
      delete body.statusNote;

      const { $push, ...setBody } = body;
      const updateOp = { $set: setBody };
      if ($push) updateOp.$push = $push;

      const person = await Person.findByIdAndUpdate(req.params.id, updateOp, { new: true, runValidators: true })
        .populate('linkedPeople.person', 'name profilePhoto relationshipType currentStatus');
      if (!person) return res.status(404).json({ error: 'Person not found' });
      res.json(person);
    } catch(e) { res.status(400).json({ error: e.message }); }
  });
});

// POST add gallery photo
router.post('/:id/photos', (req, res) => {
  upload.single('photo')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    try {
      if (!req.file) return res.status(400).json({ error: 'No file' });
      const photoPath = '/uploads/people/' + req.file.filename;
      const person = await Person.findByIdAndUpdate(
        req.params.id,
        { $push: { photos: photoPath } },
        { new: true }
      );
      res.json(person);
    } catch(e) { res.status(500).json({ error: e.message }); }
  });
});

// DELETE person
router.delete('/:id', async (req, res) => {
  try {
    await Person.findByIdAndDelete(req.params.id);
    await Person.updateMany(
      { 'linkedPeople.person': req.params.id },
      { $pull: { linkedPeople: { person: req.params.id } } }
    );
    res.json({ message: 'Deleted' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;