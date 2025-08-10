require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');

// Load Player model
const Player = require('../models/Players');

async function importPlayers() {
  try {
    console.log('MONGO_URI:', process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI, { dbName: 'fpl_draft' });
    console.log('Connected to MongoDB');

    const response = await axios.get('https://fantasy.premierleague.com/api/bootstrap-static/');
    const players = response.data.elements;
    const teams = response.data.teams.reduce((acc, team) => ({ ...acc, [team.id]: team.short_name }), {});
    const positions = response.data.element_types.reduce((acc, pos) => ({ ...acc, [pos.id]: pos.singular_name_short }), {});

    const playerData = players.map(player => ({
      _id: player.id.toString(),
      first_name: player.first_name,
      second_name: player.second_name,
      web_name: player.web_name,
      position: positions[player.element_type],
      team: teams[player.team],
      now_cost: player.now_cost / 10,
      isDrafted: false,
      currentBid: 0,
      highestBidder: null,
    }));

    // Clear existing collection
    await Player.deleteMany({});

    // Insert into active players collection
    await Player.insertMany(playerData);

    console.log('Players imported successfully');
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Error importing players:', err);
    console.log('Error details:', err.response || err.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

importPlayers();