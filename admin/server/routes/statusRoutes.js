// admin/server/routes/statusRoutes.js
const express = require('express');
const { getStatus } = require('../controllers/statusController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, getStatus);

module.exports = router;