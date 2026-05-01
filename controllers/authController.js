const { admin, db } = require('../config/firebaseAdmin');

const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Create user in Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    const uid = userRecord.uid;

    // Save user profile in Firestore collection 'users'
    await db.collection('users').doc(uid).set({
      uid,
      name,
      email,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({
      success: true,
      uid
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email } = req.body;

    // Find the user in Firestore 'users' collection by email
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();

    if (snapshot.empty) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Assuming first match is the desired user
    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    // Return requested format
    res.json({
      success: true,
      uid: userData.uid,
      name: userData.name,
      email: userData.email
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  signup,
  login
};
