const express = require('express');
const router  = express.Router();
const Note    = require('../models/Note');
const Person  = require('../models/Person');

// ── Helper: resolve @mentions in content to Person ObjectIds ──
async function resolveMentions(content) {
  const matches = [...new Set((content.match(/@([A-Za-z][A-Za-z0-9 ]{1,39})/g) || []).map(m => m.slice(1).trim()))];
  if (!matches.length) return [];
  const ids = [];
  for (const name of matches) {
    const person = await Person.findOne({ name: new RegExp(`^${name}$`, 'i') });
    if (person) ids.push(person._id);
  }
  return ids;
}

// GET all notes (with populated mentionedPeople)
router.get('/', async (req, res) => {
  try {
    const { tag, search, pin } = req.query;
    const filter = {};

    if (tag)    filter.tags = tag.toLowerCase();
    if (pin)    filter.isPinned = true;
    if (search) {
      filter.$or = [
        { title:       { $regex: search, $options: 'i' } },
        { contentText: { $regex: search, $options: 'i' } },
        { tags:        { $regex: search, $options: 'i' } },
      ];
    }

    const notes = await Note.find(filter)
      .populate('mentionedPeople', 'name profilePhoto relationshipType')
      .sort({ isPinned: -1, updatedAt: -1 });

    res.json(notes);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET single note
router.get('/:id', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id).populate('mentionedPeople', 'name profilePhoto relationshipType');
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json(note);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create note
router.post('/', async (req, res) => {
  try {
    const { title, content, tags, color, isPinned } = req.body;
    const mentionedPeople = await resolveMentions(content || '');
    const parsedTags = tags
      ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean))
      : [];
    const note = new Note({ title, content, tags: parsedTags, color, isPinned, mentionedPeople });
    await note.save();
    await note.populate('mentionedPeople', 'name profilePhoto relationshipType');
    res.status(201).json(note);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// PUT update note
router.put('/:id', async (req, res) => {
  try {
    const { title, content, tags, color, isPinned } = req.body;
    const mentionedPeople = content !== undefined ? await resolveMentions(content) : undefined;
    const parsedTags = tags !== undefined
      ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean))
      : undefined;

    const update = { updatedAt: new Date() };
    if (title   !== undefined) update.title   = title;
    if (content !== undefined) { update.content = content; update.contentText = content.replace(/@\w[\w\s]*/g,'').replace(/[#*_`]/g,'').trim(); }
    if (parsedTags !== undefined) update.tags = parsedTags;
    if (color   !== undefined) update.color   = color;
    if (isPinned!== undefined) update.isPinned= isPinned;
    if (mentionedPeople !== undefined) update.mentionedPeople = mentionedPeople;

    const note = await Note.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('mentionedPeople', 'name profilePhoto relationshipType');
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json(note);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// DELETE note
router.delete('/:id', async (req, res) => {
  try {
    await Note.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET all unique tags
router.get('/meta/tags', async (req, res) => {
  try {
    const tags = await Note.distinct('tags');
    res.json(tags.filter(Boolean).sort());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
