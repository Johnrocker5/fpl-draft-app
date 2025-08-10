const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const admin = require('firebase-admin');
const path = require('path');
const setupSockets = require('./sockets/draft');
const apiRoutes = require('./routes/api');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3001',
    methods: ['GET', 'POST']
  }
});

// Initialize Firebase Admin
let firebaseConfig;
try {
  firebaseConfig = process.env.FIREBASE_CONFIG
    ? JSON.parse(process.env.FIREBASE_CONFIG.replace(/\n/g, '\\n'))
    : require('./config/firebase.json');
} catch (err) {
  console.error('Error parsing FIREBASE_CONFIG:', err);
  process.exit(1);
}
admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig)
});

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3001' }));
app.use(express.json());
app.use('/api', apiRoutes);

// Serve React frontend static files
app.use(express.static(path.join(__dirname, '../client/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Setup Socket.IO
setupSockets(io);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));