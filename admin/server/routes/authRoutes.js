// admin/server/routes/authRoutes.js
const express = require('express');
const {
  login,
  getMe,
  changePassword
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/changepassword', protect, changePassword);

module.exports = router;