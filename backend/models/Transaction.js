const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  date:          { type: String, required: true },
  itemName:      { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ['food','transport','shopping','health','entertainment','utilities','education','personal','savings','income','other'],
    default: 'other'
  },
  subCategory:   { type: String, default: '', trim: true },   // Breakfast, Lunch, Auto/Cab, etc.
  amount:        { type: Number, required: true },
  quantity:      { type: Number, default: 1, min: 0 },
  paymentMethod: { type: String, enum: ['cash','upi','bank'], default: 'upi' },
  type:          { type: String, enum: ['expense','income'], default: 'expense' },
  isTransfer:    { type: Boolean, default: false },
  notes:         { type: String, default: '', trim: true },
  createdAt:     { type: Date, default: Date.now },
  updatedAt:     { type: Date, default: Date.now },
});

TransactionSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });
TransactionSchema.index({ date: 1 });
TransactionSchema.index({ paymentMethod: 1 });
TransactionSchema.index({ category: 1 });
TransactionSchema.index({ itemName: 'text', notes: 'text' });

module.exports = mongoose.model('Transaction', TransactionSchema);