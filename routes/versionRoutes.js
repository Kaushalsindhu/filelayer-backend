const express = require('express');
const router = express.Router({mergeParams: true});
const {uploadFileVersion, getFileVersions, restoreFileVersion} = require('../controllers/versionController');
const upload = require('../config/multer');
const { jwtAuthMiddleware } = require('../config/jwt');

router.post("/", jwtAuthMiddleware, upload.single("file"), uploadFileVersion);
router.get("/", jwtAuthMiddleware, getFileVersions);
router.post("/:versionNumber/restore", jwtAuthMiddleware, restoreFileVersion);

module.exports = router;