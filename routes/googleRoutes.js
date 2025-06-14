const express = require('express');
const { getUser, login, logout } = require('../controller/auth');
const router = express.Router();

router.post('/google/login' , login);
router.get('/get-user' , getUser);
router.post('/logout' , logout);

module.exports = router;