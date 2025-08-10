require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Manager = require('../models/Manager');

async function initManagers() {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    const managers = [
      { _id: 'O2Dim0NphuR5vacnpj4YKZFfTBd2', email: 'joshhjohnstone@gmail.com', name: 'Joshua', isAdmin: true, budget: 1000, playersRequired: 15, positionCounts: { GKP: 0, DEF: 0, MID: 0, FWD: 0 }, playersOwned: [] },
      { _id: 'bkNsCoQ4PAaqfkHvk371Foe4mAY2', email: 'marcusnnel@gmail.com', name: 'Marcus', isAdmin: false, budget: 1000, playersRequired: 15, positionCounts: { GKP: 0, DEF: 0, MID: 0, FWD: 0 }, playersOwned: [] },
      { _id: '5kHk8rATvHZnP2AnH0AWddzreaJ3', email: 'jordanhaantjes@gmail.com', name: 'Jordan', isAdmin: false, budget: 1000, playersRequired: 15, positionCounts: { GKP: 0, DEF: 0, MID: 0, FWD: 0 }, playersOwned: [] },
      { _id: 'IHbdoSsvGiWDZ6iz5tWUwOXibWE2', email: 'matthewcoltman13@gmail.com', name: 'Matthew', isAdmin: false, budget: 1000, playersRequired: 15, positionCounts: { GKP: 0, DEF: 0, MID: 0, FWD: 0 }, playersOwned: [] },
      { _id: 'g3DLFGODHTVGEFIzckdQ2Pi87n83', email: 'antoniesmallsmith@gmail.com', name: 'Antonie', isAdmin: false, budget: 1000, playersRequired: 15, positionCounts: { GKP: 0, DEF: 0, MID: 0, FWD: 0 }, playersOwned: [] },
      { _id: 'Z53R6llsyKfYoCogtUwuahmn8sJ2', email: 'leohenman2@gmail.com', name: 'Leo', isAdmin: false, budget: 1000, playersRequired: 15, positionCounts: { GKP: 0, DEF: 0, MID: 0, FWD: 0 }, playersOwned: [] },
      { _id: 'wQxRQM0KRFVw5lgJPEkZasKLEZ32', email: 'kayle.tessendorf@gmail.com', name: 'Kayle', isAdmin: false, budget: 1000, playersRequired: 15, positionCounts: { GKP: 0, DEF: 0, MID: 0, FWD: 0 }, playersOwned: [] },
      { _id: 'LiTo72DPI7gGYlj7quGAwOCRSux1', email: 'riccardovicente10@gmail.com', name: 'Riccardo', isAdmin: false, budget: 1000, playersRequired: 15, positionCounts: { GKP: 0, DEF: 0, MID: 0, FWD: 0 }, playersOwned: [] },
      { _id: 'PFELQVetbkayGtcQW1I5dxFp0mA2', email: 'miko.smuts12@gmail.com', name: 'Miko', isAdmin: false, budget: 1000, playersRequired: 15, positionCounts: { GKP: 0, DEF: 0, MID: 0, FWD: 0 }, playersOwned: [] },
      { _id: 'FyW01qVAZ2ecd7ZRbd1onGI46sw1', email: 'crew99free@gmail.com', name: 'Crew', isAdmin: false, budget: 1000, playersRequired: 15, positionCounts: { GKP: 0, DEF: 0, MID: 0, FWD: 0 }, playersOwned: [] }
    ];

    await Manager.deleteMany({});
    await Manager.insertMany(managers);
    console.log('Managers initialized successfully');
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Error initializing managers:', err);
    await mongoose.connection.close();
    process.exit(1);
  }
}

initManagers();