const express = require('express');
const router = express.Router();
const { signup, login, profile, dashboard} = require('../controllers/userController');
const { jwtAuthMiddleware } = require('../config/jwt');

router.get("/profile", jwtAuthMiddleware, profile);
router.get("/dashboard", jwtAuthMiddleware, dashboard);
router.post("/signup", signup)
router.post("/login", login);


module.exports = router;