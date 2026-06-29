const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
  title:   { type: String, trim: true, default: '' },
  content: { type: String, required: true, trim: true },
  // plain-text version for search (stripped of markdown/symbols)
  contentText: { type: String, default: '' },

  tags: [{ type: String, trim: true, lowercase: true }],

  // @mentioned people — stored as ObjectId refs
  mentionedPeople: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Person' }],

  // colour label for visual variety
  color: {
    type: String,
    enum: ['default','rose','teal','violet','gold','blue'],
    default: 'default'
  },

  isPinned: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

NoteSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  // strip @mentions and markdown for plain-text search
  this.contentText = this.content.replace(/@\w[\w\s]*/g, '').replace(/[#*_`]/g, '').trim();
  next();
});

NoteSchema.index({ title: 'text', contentText: 'text', tags: 'text' });

module.exports = mongoose.model('Note', NoteSchema);
