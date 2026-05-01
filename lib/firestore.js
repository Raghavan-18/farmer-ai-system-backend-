const { db, admin } = require('../config/firebaseAdmin');

/**
 * Loads a specific chat document for a user.
 */
const loadChat = async (uid, chatId) => {
  if (!uid || !chatId) return null;
  const chatRef = db.collection('users').doc(uid).collection('chats').doc(chatId);
  const doc = await chatRef.get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
};

/**
 * Saves or updates a chat document for a user.
 * Messages are capped at the latest 10.
 */
const saveChat = async (uid, chat) => {
  if (!uid || !chat.id) return;
  
  const chatRef = db.collection('users').doc(uid).collection('chats').doc(chat.id);
  
  // Enforce the 10-message limit
  if (chat.messages && chat.messages.length > 10) {
    chat.messages = chat.messages.slice(-10);
  }

  await chatRef.set({
    ...chat,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
};

module.exports = {
  loadChat,
  saveChat
};
