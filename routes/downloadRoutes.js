const express = require('express');
const router = express.Router({mergeParams: true});
const {downloadLatestVersion,downloadSpecificVersion} = require('../controllers/downloadController');
const { jwtAuthMiddleware } = require('../config/jwt');

router.get("/", downloadLatestVersion);
router.get("/versions/:versionNumber", downloadSpecificVersion);

module.exports = router;