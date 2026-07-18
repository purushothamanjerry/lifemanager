const mongoose = require('mongoose');

const LinkSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Link name is required'],
    trim: true
  },
  source: {
    type: String,
    required: [true, 'Link source is required'],
    enum: {
      values: [
        'Website', 'LinkedIn', 'Instagram', 'YouTube', 'Facebook',
        'X (Twitter)', 'GitHub', 'GitLab', 'TikTok', 'Discord',
        'Telegram', 'WhatsApp', 'Medium', 'Behance', 'Dribbble',
        'Pinterest', 'Reddit', 'Email', 'Other'
      ],
      message: '{VALUE} is not a valid source option'
    }
  },
  customSource: {
    type: String,
    trim: true,
    required: [
      function() { return this.source === 'Other'; },
      'Custom source name is required when source is Other'
    ]
  },
  url: {
    type: String,
    required: [true, 'URL is required'],
    trim: true
  },
  about: {
    type: String,
    trim: true,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp on save
LinkSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Link', LinkSchema);
