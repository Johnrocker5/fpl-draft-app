const admin = require('firebase-admin');
const mongoose = require('mongoose');
const axios = require('axios');
const Manager = require('../models/Manager');
const Player = require('../models/Players');
const Draft = require('../models/Draft');

function setupSockets(io) {
  let draftState = {
    status: 'pending',
    paused: false,
    managerOrder: [],
    currentTurn: 0,
    currentPlayer: null,
    currentBid: 0,
    highestBidder: null,
    timer: 30,
    totalPicks: 0
  };
  let timerInterval = null;

  // Load draft state from database on initialization
  async function loadDraftState() {
    try {
      const draft = await Draft.findOne().sort({ _id: -1 });
      if (draft) {
        draftState = {
          status: draft.status,
          paused: false,
          managerOrder: draft.managerOrder,
          currentTurn: draft.currentTurn,
          currentPlayer: null,
          currentBid: draft.currentBid,
          highestBidder: draft.highestBidder,
          timer: draft.timer,
          totalPicks: draft.totalPicks || 0
        };
        if (draft.currentPlayer) {
          draftState.currentPlayer = await Player.findById(draft.currentPlayer);
        }
        console.log('Draft state loaded from database:', draftState);
      } else {
        console.log('No draft state found in database, using default state');
      }
    } catch (err) {
      console.error('Error loading draft state:', err);
    }
  }

  // Save draft state to database
  async function saveDraftState() {
    try {
      await Draft.findOneAndUpdate(
        {},
        {
          status: draftState.status,
          managerOrder: draftState.managerOrder,
          currentTurn: draftState.currentTurn,
          currentPlayer: draftState.currentPlayer?._id,
          currentBid: draftState.currentBid,
          highestBidder: draftState.highestBidder,
          timer: draftState.timer,
          totalPicks: draftState.totalPicks
        },
        { upsert: true }
      );
      console.log('Draft state saved to database');
    } catch (err) {
      console.error('Error saving draft state:', err);
    }
  }

  // Reset draft state, managers, and players
  async function resetDraft() {
    try {
      // Reset Draft collection
      await Draft.deleteMany({});
      draftState = {
        status: 'pending',
        paused: false,
        managerOrder: [],
        currentTurn: 0,
        currentPlayer: null,
        currentBid: 0,
        highestBidder: null,
        timer: 30,
        totalPicks: 0
      };

      // Reset Managers
      await Manager.updateMany(
        {},
        {
          $set: {
            budget: 1000,
            playersOwned: [],
            playersRequired: 15,
            positionCounts: { GKP: 0, DEF: 0, MID: 0, FWD: 0 }
          }
        }
      );

      // Reset Players by re-importing from FPL API
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

      await Player.deleteMany({});
      await Player.insertMany(playerData);
      console.log('Draft, managers, and players reset successfully');
    } catch (err) {
      console.error('Error resetting draft:', err);
      throw err;
    }
  }

  // Initialize draft state from database
  loadDraftState().then(() => {
    console.log('Initial draft state:', draftState);

    io.on('connection', socket => {
      console.log('New socket connection:', socket.id);
      socket.emit('draftState', draftState);

      socket.on('startDraft', async ({ userId }) => {
        try {
          const user = await admin.auth().getUser(userId);
          if (!user.customClaims?.isAdmin) {
            socket.emit('error', { message: 'Unauthorized: Only admins can start the draft' });
            return;
          }
          const managers = await Manager.find();
          if (managers.length === 0) {
            socket.emit('error', { message: 'No managers found in database' });
            return;
          }
          draftState.managerOrder = shuffle(managers.map(m => m._id));
          draftState.status = 'active';
          draftState.paused = false;
          draftState.timer = 30;
          draftState.totalPicks = 0;
          draftState.currentTurn = 0;
          draftState.currentPlayer = null;
          draftState.currentBid = 0;
          draftState.highestBidder = null;
          console.log('Draft started by admin:', userId, 'Manager order:', draftState.managerOrder);
          await saveDraftState();
          startTimer(io);
          io.emit('draftState', draftState);
        } catch (err) {
          console.error('Start draft error:', err);
          socket.emit('error', { message: 'Failed to start draft: ' + err.message });
        }
      });

      socket.on('restartDraft', async ({ userId }) => {
        try {
          const user = await admin.auth().getUser(userId);
          if (!user.customClaims?.isAdmin) {
            socket.emit('error', { message: 'Unauthorized: Only admins can restart the draft' });
            return;
          }
          if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
            console.log('Timer stopped for draft reset');
          }
          await resetDraft();
          console.log('Draft restarted by admin:', userId);
          await saveDraftState();
          io.emit('draftState', draftState);
        } catch (err) {
          console.error('Restart draft error:', err);
          socket.emit('error', { message: 'Failed to restart draft: ' + err.message });
        }
      });

      socket.on('nominatePlayer', async ({ playerId, bid, userId }) => {
        try {
          if (draftState.paused) {
            socket.emit('error', { message: 'Draft is paused' });
            return;
          }
          if (draftState.managerOrder[draftState.currentTurn] !== userId || draftState.status !== 'active') {
            socket.emit('error', { message: 'Not your turn or draft not active' });
            return;
          }
          const validation = await validateBid(userId, playerId, bid);
          if (!validation.valid) {
            socket.emit('error', { message: validation.message });
            return;
          }
          const player = await Player.findById(playerId);
          draftState.currentPlayer = player;
          draftState.currentBid = bid;
          draftState.highestBidder = userId;
          draftState.timer = 30;
          console.log(`Player nominated: ${player.web_name} by ${userId} for ${bid}`);
          await saveDraftState();
          io.emit('draftState', draftState);
        } catch (err) {
          console.error('Nomination error:', err);
          socket.emit('error', { message: 'Nomination failed: ' + err.message });
        }
      });

      socket.on('placeBid', async ({ playerId, bid, userId }) => {
        try {
          if (draftState.paused) {
            socket.emit('error', { message: 'Draft is paused' });
            return;
          }
          if (draftState.currentPlayer?._id !== playerId || bid <= draftState.currentBid || draftState.status !== 'active') {
            socket.emit('error', { message: 'Invalid bid: Wrong player or insufficient amount' });
            return;
          }
          const validation = await validateBid(userId, playerId, bid);
          if (!validation.valid) {
            socket.emit('error', { message: validation.message });
            return;
          }
          draftState.currentBid = bid;
          draftState.highestBidder = userId;
          draftState.timer = Math.max(draftState.timer, 15);
          console.log(`Bid placed: ${bid} by ${userId} on ${draftState.currentPlayer.web_name}, Timer reset to: ${draftState.timer}`);
          await saveDraftState();
          io.emit('draftState', draftState);
        } catch (err) {
          console.error('Bid error:', err);
          socket.emit('error', { message: 'Bid failed: ' + err.message });
        }
      });

      socket.on('skipTurn', async ({ userId }) => {
        try {
          const user = await admin.auth().getUser(userId);
          if (!user.customClaims?.isAdmin) {
            socket.emit('error', { message: 'Unauthorized: Only admins can skip turns' });
            return;
          }
          if (draftState.status !== 'active' || draftState.currentPlayer) {
            socket.emit('error', { message: 'Cannot skip turn: Auction in progress or draft not active' });
            return;
          }
          draftState.currentTurn = (draftState.currentTurn + 1) % draftState.managerOrder.length;
          draftState.timer = 30;
          console.log(`Turn skipped by admin: ${userId}, New turn: ${draftState.managerOrder[draftState.currentTurn]}`);
          await saveDraftState();
          io.emit('draftState', draftState);
        } catch (err) {
          console.error('Skip turn error:', err);
          socket.emit('error', { message: 'Failed to skip turn: ' + err.message });
        }
      });

      socket.on('closeBid', async ({ userId }) => {
        try {
          const user = await admin.auth().getUser(userId);
          if (!user.customClaims?.isAdmin) {
            socket.emit('error', { message: 'Unauthorized: Only admins can close bids' });
            return;
          }
          if (draftState.status !== 'active' || !draftState.currentPlayer || !draftState.highestBidder) {
            socket.emit('error', { message: 'Cannot close bid: No active auction or no bidder' });
            return;
          }
          clearInterval(timerInterval);
          timerInterval = null;
          await allocatePlayer();
          draftState.totalPicks += 1;
          console.log(`Bid closed by admin: ${userId}, Player: ${draftState.currentPlayer.web_name}, Total picks: ${draftState.totalPicks}`);
          if (await checkDraftComplete()) {
            draftState.status = 'completed';
            draftState.paused = false;
            draftState.currentPlayer = null;
            draftState.currentBid = 0;
            draftState.highestBidder = null;
            draftState.timer = 0;
            await saveDraftState();
            io.emit('draftState', draftState);
            return;
          }
          await startNextTurn(io);
        } catch (err) {
          console.error('Close bid error:', err);
          socket.emit('error', { message: 'Failed to close bid: ' + err.message });
        }
      });

      socket.on('pauseTimer', async ({ userId }) => {
        try {
          const user = await admin.auth().getUser(userId);
          if (!user.customClaims?.isAdmin) {
            socket.emit('error', { message: 'Unauthorized: Only admins can pause the timer' });
            return;
          }
          if (draftState.status !== 'active' || draftState.paused) {
            socket.emit('error', { message: 'Cannot pause: Draft not active or already paused' });
            return;
          }
          clearInterval(timerInterval);
          timerInterval = null;
          draftState.paused = true;
          console.log(`Timer paused by admin: ${userId}`);
          await saveDraftState();
          io.emit('draftState', draftState);
        } catch (err) {
          console.error('Pause timer error:', err);
          socket.emit('error', { message: 'Failed to pause timer: ' + err.message });
        }
      });

      socket.on('resumeTimer', async ({ userId }) => {
        try {
          const user = await admin.auth().getUser(userId);
          if (!user.customClaims?.isAdmin) {
            socket.emit('error', { message: 'Unauthorized: Only admins can resume the timer' });
            return;
          }
          if (draftState.status !== 'active' || !draftState.paused) {
            socket.emit('error', { message: 'Cannot resume: Draft not active or not paused' });
            return;
          }
          draftState.paused = false;
          console.log(`Timer resumed by admin: ${userId}`);
          startTimer(io);
          await saveDraftState();
          io.emit('draftState', draftState);
        } catch (err) {
          console.error('Resume timer error:', err);
          socket.emit('error', { message: 'Failed to resume timer: ' + err.message });
        }
      });
    });

    function startTimer(io) {
      if (timerInterval) {
        clearInterval(timerInterval);
        console.log('Cleared previous timer interval');
      }
      timerInterval = setInterval(async () => {
        if (draftState.status !== 'active' || draftState.paused) {
          clearInterval(timerInterval);
          timerInterval = null;
          console.log('Timer stopped: Draft not active or paused');
          return;
        }
        if (draftState.timer <= 0) {
          await allocatePlayer();
          draftState.totalPicks += 1;
          console.log(`Total picks: ${draftState.totalPicks}`);
          if (await checkDraftComplete()) {
            draftState.status = 'completed';
            draftState.paused = false;
            draftState.currentPlayer = null;
            draftState.currentBid = 0;
            draftState.highestBidder = null;
            draftState.timer = 0;
            clearInterval(timerInterval);
            timerInterval = null;
            console.log('Draft completed: All managers have 15 players');
            await saveDraftState();
            io.emit('draftState', draftState);
            return;
          }
          await startNextTurn(io);
        } else {
          draftState.timer--;
          console.log(`Timer tick: ${draftState.timer} seconds remaining`);
          await saveDraftState();
          io.emit('draftState', draftState);
        }
      }, 1000);
    }

    async function checkDraftComplete() {
      try {
        const managers = await Manager.find();
        return managers.every(m => m.playersRequired === 0);
      } catch (err) {
        console.error('Error checking draft completion:', err);
        return false;
      }
    }

    async function validateBid(userId, playerId, bid) {
      try {
        const manager = await Manager.findById(userId);
        const player = await Player.findById(playerId);
        if (!manager || !player || player.isDrafted || manager.playersRequired <= 0) {
          return { valid: false, message: 'Invalid bid: Manager or player not found, player drafted, or no slots remaining' };
        }
        const positionCount = manager.positionCounts[player.position] || 0;
        const positionLimits = { GKP: 2, DEF: 5, MID: 5, FWD: 3 };
        if (positionCount >= positionLimits[player.position]) {
          return { valid: false, message: `Cannot bid: ${player.position} position limit (${positionLimits[player.position]}) reached` };
        }
        const maxBid = manager.budget - (manager.playersRequired - 1) * 10;
        if (bid % 10 !== 0 || bid <= 0 || bid > maxBid) {
          return { valid: false, message: `Invalid bid: Must be in increments of 10, greater than 0, and at most ${maxBid}` };
        }
        return { valid: true, message: '' };
      } catch (err) {
        console.error('Bid validation error:', err);
        return { valid: false, message: 'Bid validation failed: ' + err.message };
      }
    }

    async function allocatePlayer() {
      if (draftState.highestBidder && draftState.currentPlayer) {
        try {
          await Manager.updateOne(
            { _id: draftState.highestBidder },
            {
              $inc: {
                budget: -draftState.currentBid,
                playersRequired: -1,
                [`positionCounts.${draftState.currentPlayer.position}`]: 1
              },
              $push: { playersOwned: draftState.currentPlayer._id }
            }
          );
          await Player.updateOne(
            { _id: draftState.currentPlayer._id },
            { $set: { isDrafted: true, currentBid: draftState.currentBid, highestBidder: draftState.highestBidder } }
          );
          console.log(`Player ${draftState.currentPlayer.web_name} allocated to ${draftState.highestBidder}`);
        } catch (err) {
          console.error('Player allocation error:', err);
        }
      }
    }

    async function startNextTurn(io) {
      try {
        draftState.currentTurn = (draftState.currentTurn + 1) % draftState.managerOrder.length;
        draftState.currentPlayer = null;
        draftState.currentBid = 0;
        draftState.highestBidder = null;
        draftState.timer = 30;
        if (await checkDraftComplete()) {
          draftState.status = 'completed';
          draftState.paused = false;
          draftState.timer = 0;
          console.log('Draft completed: All managers have 15 players');
          clearInterval(timerInterval);
          timerInterval = null;
        }
        console.log(`Next turn: Manager ${draftState.managerOrder[draftState.currentTurn]}, Timer: ${draftState.timer}`);
        await saveDraftState();
        io.emit('draftState', draftState);
        if (draftState.status === 'active' && !draftState.paused) {
          startTimer(io);
        }
      } catch (err) {
        console.error('Start next turn error:', err);
      }
    }

    function shuffle(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    }
  });
}

module.exports = setupSockets;