const admin = require('firebase-admin');

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

async function setAdminClaims() {
  try {
    const uid = 'O2Dim0NphuR5vacnpj4YKZFfTBd2';
    await admin.auth().setCustomUserClaims(uid, { isAdmin: true });
    console.log(`Admin claims set for UID: ${uid}`);
    process.exit(0);
  } catch (err) {
    console.error('Error setting admin claims:', err);
    process.exit(1);
  }
}

setAdminClaims();