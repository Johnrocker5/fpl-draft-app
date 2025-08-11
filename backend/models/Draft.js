const mongoose = require('mongoose');

const DraftSchema = new mongoose.Schema({
  status: { type: String, default: 'pending' },
  managerOrder: [String],
  currentTurn: { type: Number, default: 0 },
  currentPlayer: String,
  currentBid: { type: Number, default: 0 },
  highestBidder: String,
  timer: { type: Number, default: 30 }
});

module.exports = mongoose.model('Draft', DraftSchema);