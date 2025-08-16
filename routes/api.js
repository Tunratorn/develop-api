// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');
const sendmailController = require('../controllers/sendmailController');

router.get('/get-datauser', contentController.getDataUser);
router.post('/send-email', sendmailController.sendmail);

module.exports = router;