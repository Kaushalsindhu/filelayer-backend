const express = require('express');
const router = express.Router();
const { uploadFile, 
    softDeleteFile, 
    restoreFile, 
    getActivityLog, 
    createFolder, 
    fetchFiles, 
    getBreadcrumb,
    getFileUrl,
    renameFolder,
    getDeletedFiles,
    permanentDeleteFile,
    getSharedFiles,
    moveFile,
    searchFiles
} = require('../controllers/fileController');

const {fileLock, fileUnlock} = require('../controllers/fileLockController');
const { jwtAuthMiddleware } = require('../config/jwt');
const upload = require('../config/multer');

router.post("/", jwtAuthMiddleware, upload.single("file"), uploadFile);
router.post("/folder", jwtAuthMiddleware, createFolder);
router.get("/breadcrumb/:folderId", getBreadcrumb);
router.delete("/:fileId", jwtAuthMiddleware, softDeleteFile);
router.post("/:fileId/restore", jwtAuthMiddleware, restoreFile);
router.post("/:fileId/lock", jwtAuthMiddleware, fileLock);
router.post("/:fileId/unlock", jwtAuthMiddleware, fileUnlock);
router.get("/:fileId/activity", jwtAuthMiddleware, getActivityLog);
router.put("/:fileId/rename", jwtAuthMiddleware, renameFolder);
router.get("/:fileId/url", jwtAuthMiddleware, getFileUrl);
router.get("/", jwtAuthMiddleware, fetchFiles);
router.get("/deleted", jwtAuthMiddleware, getDeletedFiles);
router.delete("/:fileId/deleteForever", jwtAuthMiddleware, permanentDeleteFile);
router.get("/shared", jwtAuthMiddleware, getSharedFiles);
router.put("/:fileId/move", jwtAuthMiddleware, moveFile);
router.get("/search", jwtAuthMiddleware, searchFiles);

module.exports = router;