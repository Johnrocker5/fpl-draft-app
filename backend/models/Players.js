const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema({
  _id: String,
  first_name: String,
  second_name: String,
  web_name: String,
  position: String,
  team: String,
  now_cost: Number,
  isDrafted: { type: Boolean, default: false },
  currentBid: { type: Number, default: 0 },
  highestBidder: String
});


module.exports = mongoose.model('Player', PlayerSchema);