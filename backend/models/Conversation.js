const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  person: { type: mongoose.Schema.Types.ObjectId, ref: 'Person', required: true },
  date: { type: Date, required: true, default: Date.now },
  place: { type: String, trim: true },
  summary: { type: String, trim: true },
  mood: {
    type: String,
    enum: ['great', 'good', 'neutral', 'awkward', 'difficult'],
    default: 'good'
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Conversation', ConversationSchema);
