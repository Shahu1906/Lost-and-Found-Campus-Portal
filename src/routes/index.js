const express = require('express');
const router = express.Router();
const studentRoutes = require('./studentRoutes');
const adminRoutes = require('./adminRoutes');

router.use('/student', studentRoutes);
router.use('/admin', adminRoutes);

module.exports = router;