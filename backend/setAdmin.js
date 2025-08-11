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
  const uids = [
    'O2Dim0NphuR5vacnpj4YKZFfTBd2', // Joshua
    'bkNsCoQ4PAaqfkHvk371Foe4mAY2', // Marcus
    '5kHk8rATvHZnP2AnH0AWddzreaJ3', // Jordan
    'IHbdoSsvGiWDZ6iz5tWUwOXibWE2', // Matthew
    'g3DLFGODHTVGEFIzckdQ2Pi87n83', // Antonie
    'Z53R6llsyKfYoCogtUwuahmn8sJ2', // Leo
    'wQxRQM0KRFVw5lgJPEkZasKLEZ32', // Kayle
    'LiTo72DPI7gGYlj7quGAwOCRSux1', // Riccardo
    'PFELQVetbkayGtcQW1I5dxFp0mA2', // Miko
    'FyW01qVAZ2ecd7ZRbd1onGI46sw1'  // Crew
  ];

  try {
    for (const uid of uids) {
      await admin.auth().setCustomUserClaims(uid, { isAdmin: true });
      console.log(`Admin claims set for UID: ${uid}`);
    }
    console.log('All admin claims set successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error setting admin claims:', err);
    process.exit(1);
  }
}

setAdminClaims();