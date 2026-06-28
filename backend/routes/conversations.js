const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Person = require('../models/Person');

// GET conversations for a person
router.get('/person/:personId', async (req, res) => {
  try {
    const conversations = await Conversation.find({ person: req.params.personId }).sort({ date: -1 });
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST log conversation
router.post('/', async (req, res) => {
  try {
    const conversation = new Conversation(req.body);
    await conversation.save();
    // Update lastConversationDate on person
    await Person.findByIdAndUpdate(req.body.person, { lastConversationDate: req.body.date || new Date() });
    res.status(201).json(conversation);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE conversation
router.delete('/:id', async (req, res) => {
  try {
    await Conversation.findByIdAndDelete(req.params.id);
    res.json({ message: 'Conversation deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
