const express = require('express');
const { handleChat, resetChat, getUserHistory } = require('../controllers/chatController');

const router = express.Router();

router.post('/chat', handleChat);
router.post('/reset', resetChat);
router.get('/history/:uid', getUserHistory);

module.exports = router;
