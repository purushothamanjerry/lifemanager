const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
  date:        { type: String, required: true },   // 'YYYY-MM-DD'
  name:        { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ['work','study','exercise','meals','personal','social','entertainment','sleep','travel','errands','creative','health','other'],
    default: 'other'
  },
  startTime:   { type: String, required: true },   // 'HH:MM' 24-hr
  endTime:     { type: String },                   // 'HH:MM' 24-hr, optional
  location:    { type: String, default: '', trim: true },
  notes:       { type: String, default: '', trim: true },
  mood:        { type: String, enum: ['','great','good','okay','bad','terrible'], default: '' },
  energy:      { type: String, enum: ['','high','medium','low'], default: '' },
  productive:  { type: Boolean, default: false },  // user marks as productive
  color:       { type: String, default: '' },      // optional override color
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now },
});

// Virtual: duration in minutes
ActivitySchema.virtual('durationMins').get(function() {
  if (!this.startTime || !this.endTime) return null;
  const [sh, sm] = this.startTime.split(':').map(Number);
  const [eh, em] = this.endTime.split(':').map(Number);
  const start = sh * 60 + sm;
  let   end   = eh * 60 + em;
  if (end < start) end += 24 * 60; // crosses midnight
  return end - start;
});

ActivitySchema.set('toJSON', { virtuals: true });
ActivitySchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });
ActivitySchema.index({ date: 1 });
ActivitySchema.index({ category: 1 });
ActivitySchema.index({ name: 'text', notes: 'text', location: 'text' });

module.exports = mongoose.model('Activity', ActivitySchema);
