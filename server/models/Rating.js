const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  songKey: { type: String, required: true, index: true }, // prefer spotify_id; else title::artist
  userId: { type: String, required: true, index: true },  // anonymous client id
  rating: { type: Number, required: true, min: 0, max: 10 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ratingSchema.index({ songKey: 1, userId: 1 }, { unique: true });

ratingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Rating', ratingSchema);
