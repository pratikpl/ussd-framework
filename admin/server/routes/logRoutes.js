// admin/server/routes/logRoutes.js
const express = require('express');
const {
  getLogs,
  getSessionLogs
} = require('../controllers/logController');

const router = express.Router();

router.route('/')
  .get(getLogs);

router.route('/session/:id')
  .get(getSessionLogs);

module.exports = router;