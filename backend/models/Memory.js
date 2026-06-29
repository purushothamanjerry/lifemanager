const mongoose = require('mongoose');

const MemorySchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  date:        { type: Date, required: true },
  place:       { type: String, trim: true, default: '' },

  emotion: {
    type: String,
    enum: ['joyful','grateful','nostalgic','peaceful','excited','bittersweet','sad','proud','loved','funny','inspiring','mixed'],
    default: 'joyful'
  },

  tags: [{ type: String, trim: true, lowercase: true }],

  // People involved — resolved from @mentions + explicit selection
  peopleInvolved: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Person' }],

  // Attached photo paths
  photos: [{ type: String }],

  // Cover photo (index into photos array)
  coverPhoto: { type: Number, default: 0 },

  isFavorite: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

MemorySchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

MemorySchema.index({ title: 'text', description: 'text', place: 'text', tags: 'text' });

module.exports = mongoose.model('Memory', MemorySchema);
