const mongoose = require('mongoose');

const PlanSchema = new mongoose.Schema({
  title:    { type: String, required: true, trim: true },

  category: {
    type: String,
    enum: ['work','personal','health','social','learning','errand','creative','finance','other'],
    default: 'personal'
  },

  date:      { type: String, required: true }, // 'YYYY-MM-DD'
  startTime: { type: String, default: '' },    // 'HH:MM' 24h
  endTime:   { type: String, default: '' },    // 'HH:MM' 24h

  priority: { type: String, enum: ['low','medium','high','critical'], default: 'medium' },

  status: {
    type: String,
    enum: ['pending','in-progress','done','skipped','rescheduled'],
    default: 'pending'
  },

  notes:       { type: String, default: '' },
  isAllDay:    { type: Boolean, default: false },
  rescheduledFrom: { type: String, default: '' }, // original date if rescheduled
  completedAt: { type: Date },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

PlanSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });

// Index for fast date queries
PlanSchema.index({ date: 1 });
PlanSchema.index({ status: 1 });

module.exports = mongoose.model('Plan', PlanSchema);