// admin/server/routes/flowRoutes.js
const express = require('express');
const {
  getFlows,
  getFlow,
  createFlow,
  updateFlow,
  deleteFlow
} = require('../controllers/flowController');

const router = express.Router();

router.route('/')
  .get(getFlows);

router.route('/:id')
  .get(getFlow)
  .post(createFlow)
  .put(updateFlow)
  .delete(deleteFlow);

module.exports = router;