const mongoose = require('mongoose');

const FoodEntrySchema = new mongoose.Schema({
  mealType:  { type: String, enum: ['breakfast','lunch','dinner','snack','drink'], default: 'snack' },
  foodName:  { type: String, required: true, trim: true },
  calories:  { type: Number, default: 0 },
  quantity:  { type: Number, default: 1 },
  unit:      { type: String, default: '' },
}, { _id: true });

const HealthLogSchema = new mongoose.Schema({
  date:         { type: String, required: true, unique: true },

  // Body
  weight:       { type: Number },
  height:       { type: Number },

  // Sleep
  sleepHours:   { type: Number },
  sleepQuality: { type: String, enum: ['','poor','fair','good','great'], default: '' },
  bedTime:      { type: String },
  wakeTime:     { type: String },

  // Activity
  workout:      { type: Boolean, default: false },
  workoutType:  { type: String, default: '' },
  workoutMins:  { type: Number },
  steps:        { type: Number },

  // Hydration
  waterLiters:  { type: Number },

  // Mood
  mood:         { type: String, enum: ['','terrible','bad','okay','good','great'], default: '' },
  energy:       { type: String, enum: ['','low','medium','high'], default: '' },

  // Food log
  food:         { type: [FoodEntrySchema], default: [] },

  notes:        { type: String, default: '' },
  createdAt:    { type: Date, default: Date.now },
  updatedAt:    { type: Date, default: Date.now },
});

HealthLogSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });
HealthLogSchema.index({ date: 1 });

module.exports = mongoose.model('HealthLog', HealthLogSchema);