const { getAIResponse } = require('../services/aiService');
const { loadChat, saveChat } = require('../lib/firestore');
const { db } = require('../config/firebaseAdmin');
const { formatChatResponse } = require('../utils/chatFormatter');

const handleChat = async (req, res) => {
  try {
    const { crop, stage, query, chatId, isTemporary, audioContext, image_data, language } = req.body;
    
    // Requirement 10: Use req.user.uid, fallback to req.body.uid
    const uid = req.user ? req.user.uid : req.body.uid;

    if (!query && !audioContext && !image_data) {
      return res.status(400).json({ error: 'Query, audio, or image is required' });
    }

    let currentMessages = [];
    let chatDoc = null;

    // Requirement 7: Load the current chat document for that user only
    if (!isTemporary && uid && chatId) {
      chatDoc = await loadChat(uid, chatId);
      if (chatDoc && chatDoc.messages) {
        currentMessages = chatDoc.messages;
      }
    }

    // Prepare current user message
    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query || "[Image/Voice Attached]",
      image: image_data ? `data:image/jpeg;base64,${image_data.substring(0, 50)}...` : null, // Store truncated or reference for history
      timestamp: new Date()
    };

    // Include current message in the history passed to AI service
    const messagesForAI = [...currentMessages, userMessage];

    // Get AI response using loaded history PLUS current message
    const aiResult = await getAIResponse(crop, stage, messagesForAI, audioContext || null, image_data || null, language || 'en');
    const aiResponse = aiResult.response;
    const transcript = aiResult.transcript;

    const assistantMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date()
    };

    // Requirement 7: Append messages and keep latest 10
    let updatedMessages = [...currentMessages, userMessage, assistantMessage];
    if (updatedMessages.length > 20) { // Increased history slightly for better context
      updatedMessages = updatedMessages.slice(-20);
    }

    // Requirement 7 & 11: Save updated chat if not temporary
    if (!isTemporary && uid && chatId) {
      await saveChat(uid, {
        id: chatId,
        title: (transcript || userMessage.content).substring(0, 30) + ((transcript || userMessage.content).length > 30 ? "..." : ""),
        crop,
        growthStage: stage,
        messages: updatedMessages
      });
    }

    // Parse the textual AI response into structured sections if they exist
    const formattedResponse = formatChatResponse(aiResponse);

    res.json({ 
      response: formattedResponse, // sending structured JSON here
      transcript: transcript, 
      raw_content: aiResponse 
    });
  } catch (error) {
    console.error('Chat error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to process chat' });
  }
};

const resetChat = (req, res) => {
  res.json({ message: 'Session reset. Logic is now per-chat document.' });
};

const getUserHistory = async (req, res) => {
  try {
    const uid = req.user ? req.user.uid : (req.params.uid || req.body.uid);
    if (!uid) {
      return res.status(400).json({ error: 'User UID is required' });
    }

    // Retrieve all chats for this user from the specified subcollection
    const snapshot = await db.collection('users').doc(uid).collection('chats').orderBy('updatedAt', 'desc').get();
    
    const history = [];
    snapshot.forEach(doc => {
      history.push({ id: doc.id, ...doc.data() });
    });

    res.json({ success: true, history });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user history' });
  }
};

module.exports = {
  handleChat,
  resetChat,
  getUserHistory
};
