const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  artist: {
    type: String,
    required: true,
    trim: true
  },
  lyrics: {
    type: String,
    required: true
  },
  source: {
    type: String,
    default: 'AI Generated'
  },
  searchCount: {
    type: Number,
    default: 0
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

// Index for faster searching
songSchema.index({ title: 'text', artist: 'text' });

// Middleware to update updatedAt
songSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Song', songSchema);
