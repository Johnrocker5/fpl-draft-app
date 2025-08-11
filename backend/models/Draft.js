const mongoose = require('mongoose');

const DraftSchema = new mongoose.Schema({
  status: String,
  managerOrder: [String],
  currentTurn: Number,
  currentPlayer: String,
  currentBid: Number,
  highestBidder: String,
  timer: Number,
  totalPicks: Number,
  nominationTime: { type: Number, default: 30 }, // Time for nomination (seconds)
  auctionTime: { type: Number, default: 30 },  // Time for bidding (seconds)
  minRespondTime: { type: Number, default: 10 }, // Min time after bid (seconds)
  reliefTime: { type: Number, default: 0 }    // Time before next turn (seconds)
});

module.exports = mongoose.model('Draft', DraftSchema);