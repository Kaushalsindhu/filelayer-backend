const express = require('express');
const router = express.Router({mergeParams: true});
const {addCollaborator, updateCollaborator, removeCollaborator, getCollaborators} = require('../controllers/collabController');
const { jwtAuthMiddleware } = require('../config/jwt');

router.post("/", jwtAuthMiddleware, addCollaborator);
router.patch("/:collaboratorId", jwtAuthMiddleware, updateCollaborator);
router.delete("/:collaboratorId", jwtAuthMiddleware, removeCollaborator);
router.get("/", jwtAuthMiddleware, getCollaborators);

module.exports = router;