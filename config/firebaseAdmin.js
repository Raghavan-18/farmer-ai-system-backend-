const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  console.log('Firebase Admin initialization error:', error.message);
  // It may fail if serviceAccountKey.json is empty, but we allow it for structural setup
}

const db = admin.firestore();

module.exports = {
  admin,
  db
};
