const mongoose = require('mongoose');

const ManagerSchema = new mongoose.Schema({
  _id: String, // Firebase UID
  email: String,
  name: String,
  isAdmin: Boolean,
  budget: { type: Number, default: 1000 },
  playersOwned: [{ type: String }],
  positionCounts: {
    GKP: { type: Number, default: 0 },
    DEF: { type: Number, default: 0 },
    MID: { type: Number, default: 0 },
    FWD: { type: Number, default: 0 }
  },
  playersRequired: { type: Number, default: 15 }
});

module.exports = mongoose.model('Manager', ManagerSchema);