const mongoose = require('mongoose');

const AccountSchema = new mongoose.Schema({
  method:         { type: String, enum: ['cash','upi','bank'], unique: true, required: true },
  startingBalance:{ type: Number, default: 0 },
  updatedAt:      { type: Date, default: Date.now },
});

module.exports = mongoose.model('Account', AccountSchema);
