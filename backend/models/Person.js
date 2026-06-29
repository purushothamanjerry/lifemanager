const mongoose = require('mongoose');

const RelationshipStatusHistorySchema = new mongoose.Schema({
  status:    { type: String, required: true },
  note:      { type: String },
  changedAt: { type: Date, default: Date.now }
});

const PersonSchema = new mongoose.Schema({
  profilePhoto: { type: String, default: '' },
  name:         { type: String, required: true, trim: true },

  dateOfBirth:    { type: Date },
  approximateAge: { type: Number },

  gender: {
    type: String,
    enum: ['male','female','non-binary','other',''],
    default: ''
  },

  relationshipType: {
    type: String,
    enum: ['love','crush','attracted','impressed','friend','family','colleague','classmate','teacher','acquaintance','one-time'],
    required: true,
    default: 'friend'
  },

  currentStatus: {
    type: String,
    enum: ['close','good','drifting','distant','not-talking','complicated','rekindled','lost-touch','ended'],
    default: 'good'
  },
  statusHistory: [RelationshipStatusHistorySchema],

  // ── How we met ────────────────────────────────────────────────────
  firstMeetingPlace: { type: String, trim: true },
  firstMeetingDate:  { type: Date },
  howWeMet:          { type: String, trim: true },

  // ── Contact details ───────────────────────────────────────────────
  mobileNumber:  { type: String, trim: true },
  instagramId:   { type: String, trim: true },
  linkedinId:    { type: String, trim: true },
  twitterId:     { type: String, trim: true },
  snapchatId:    { type: String, trim: true },
  email:         { type: String, trim: true },
  otherContact:  { type: String, trim: true },

  // ── Physical appearance ───────────────────────────────────────────
  height:          { type: String, trim: true },
  eyeColor:        { type: String, trim: true },
  hairColor:       { type: String, trim: true },
  hairLength:      { type: String, trim: true },
  bodyType:        { type: String, trim: true },
  styleNotes:      { type: String, trim: true },
  appearanceNotes: { type: String, trim: true },

  // ── Character / Personality ───────────────────────────────────────
  hobbies:            [{ type: String }],
  favoriteColor:      { type: String },
  habits:             { type: String },
  personalityNotes:   { type: String },
  characterTraits:    [{ type: String }],
  loveLanguage:       {
    type: String,
    enum: ['words','acts','gifts','time','touch',''],
    default: ''
  },
  communicationStyle: { type: String, trim: true },
  values:             { type: String, trim: true },
  quirks:             { type: String, trim: true },

  // ── Linked people ─────────────────────────────────────────────────
  linkedPeople: [{
    person:   { type: mongoose.Schema.Types.ObjectId, ref: 'Person' },
    linkType: { type: String, trim: true },
    note:     { type: String, trim: true },
  }],

  // ── Flags ─────────────────────────────────────────────────────────
  isSpecial: { type: Boolean, default: false },  // manually marked special

  // ── Private ───────────────────────────────────────────────────────
  notes:                { type: String },
  lastConversationDate: { type: Date },
  photos:               [{ type: String }],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

PersonSchema.virtual('age').get(function () {
  if (this.dateOfBirth) {
    const today = new Date();
    const dob   = new Date(this.dateOfBirth);
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
  }
  return this.approximateAge || null;
});

PersonSchema.set('toJSON',   { virtuals: true });
PersonSchema.set('toObject', { virtuals: true });

PersonSchema.pre('save', function (next) { this.updatedAt = new Date(); next(); });

module.exports = mongoose.model('Person', PersonSchema);