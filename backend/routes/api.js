const express = require('express');
const router = express.Router();
const Manager = require('../models/Manager'); // Explicitly import Manager model
const Player = require('../models/Players'); // Explicitly import Player model (note the 's' in Players)A


router.get('/managers', async (req, res) => {
  try {
    const managers = await Manager.find();
    res.json(managers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/managers/:uid', async (req, res) => {
  try {
    const manager = await Manager.findById(req.params.uid);
    if (!manager) {
      return res.status(404).json({ error: 'Manager not found' });
    }
    res.json(manager);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/players', async (req, res) => {
  try {
    const players = await Player.find({ isDrafted: false });
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/players/multiple', async (req, res) => {
  try {
    const { ids } = req.body;
    const players = await Player.find({ _id: { $in: ids } });
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;