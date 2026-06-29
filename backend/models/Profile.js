const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
  _id: { type: String, default: 'main' },

  // Personal Info
  fullName:     { type: String, default: '', trim: true },
  nickname:     { type: String, default: '', trim: true },
  birthday:     { type: String, default: '' },
  gender:       { type: String, default: '' },
  location:     { type: String, default: '', trim: true },
  occupation:   { type: String, default: '', trim: true },
  bio:          { type: String, default: '', trim: true },
  profilePhoto: { type: String, default: '' },

  // Traits
  hobbies:           { type: [String], default: [] },
  interests:         { type: [String], default: [] },
  favoriteColor:     { type: String, default: '' },
  favoriteFood:      { type: String, default: '', trim: true },
  personalityTraits: { type: [String], default: [] },
  habits:            { type: String, default: '', trim: true },
  lifeGoals:         { type: String, default: '', trim: true },

  // Safety Mode
  safetyModeEnabled:  { type: Boolean, default: false },
  safetyModePinHash:  { type: String,  default: '' },
  safetyModeAutoLock: { type: Boolean, default: false },
  safetyModeLockMins: { type: Number,  default: 5 },
  safetyShortcut:     { type: String,  default: 'Ctrl+Shift+S' },
  panicModeEnabled:   { type: Boolean, default: false },
  panicShortcut:      { type: String,  default: 'Ctrl+Alt+P' },

  // Privacy (what to hide in safety mode)
  hideRelationships: { type: Boolean, default: true },
  hideMemories:      { type: Boolean, default: true },
  hideNotes:         { type: Boolean, default: true },
  hideAnalytics:     { type: Boolean, default: false },
  hideFinance:       { type: Boolean, default: true },
  hideHealth:        { type: Boolean, default: false },

  // Preferences — no enum so stale values don't cause validation errors
  theme:           { type: String, default: 'dark' },
  defaultPage:     { type: String, default: '/' },
  currency:        { type: String, default: 'INR' },
  timeFormat:      { type: String, default: '12h' },
  dashboardLayout: { type: String, default: 'grid' },

  updatedAt: { type: Date, default: Date.now },
}, {
  // Disable strict mode so extra fields don't throw
  strict: false,
});

module.exports = mongoose.model('Profile', ProfileSchema);