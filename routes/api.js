// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');

router.get('/get-datauser', contentController.getDataUser);

module.exports = router;