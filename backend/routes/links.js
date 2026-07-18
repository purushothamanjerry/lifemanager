const express = require('express');
const router  = express.Router();
const Link    = require('../models/Link');

// GET all links
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    const filter = {};
    if (search) {
      filter.$or = [
        { name:         { $regex: search, $options: 'i' } },
        { source:       { $regex: search, $options: 'i' } },
        { customSource: { $regex: search, $options: 'i' } },
        { url:          { $regex: search, $options: 'i' } },
        { about:        { $regex: search, $options: 'i' } },
      ];
    }
    const links = await Link.find(filter).sort({ updatedAt: -1 });
    res.json(links);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single link
router.get('/:id', async (req, res) => {
  try {
    const link = await Link.findById(req.params.id);
    if (!link) return res.status(404).json({ error: 'Link not found' });
    res.json(link);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create link
router.post('/', async (req, res) => {
  try {
    const { name, source, customSource, url, about } = req.body;
    const link = new Link({ name, source, customSource, url, about });
    await link.save();
    res.status(201).json(link);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update link
router.put('/:id', async (req, res) => {
  try {
    const { name, source, customSource, url, about } = req.body;
    const update = {};
    if (name !== undefined)         update.name = name;
    if (source !== undefined)       update.source = source;
    if (customSource !== undefined) update.customSource = customSource;
    if (url !== undefined)          update.url = url;
    if (about !== undefined)        update.about = about;

    // Reset customSource if source changed and is not 'Other'
    if (source !== undefined && source !== 'Other') {
      update.customSource = '';
    }

    const link = await Link.findByIdAndUpdate(
      req.params.id,
      { $set: update, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!link) return res.status(404).json({ error: 'Link not found' });
    res.json(link);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE link
router.delete('/:id', async (req, res) => {
  try {
    const link = await Link.findByIdAndDelete(req.params.id);
    if (!link) return res.status(404).json({ error: 'Link not found' });
    res.json({ message: 'Link deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
