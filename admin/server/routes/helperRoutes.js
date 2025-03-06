// admin/server/routes/helperRoutes.js
const express = require('express');
const {
  getHelpers,
  getHelper,
  createHelper,
  updateHelper,
  deleteHelper
} = require('../controllers/helperController');

const router = express.Router();

router.route('/')
  .get(getHelpers);

router.route('/:path(*)')
  .get(getHelper)
  .post(createHelper)
  .put(updateHelper)
  .delete(deleteHelper);

module.exports = router;