const express = require("express");
const router = express.Router();
const { register, login, googleAuth, getGoogleAuthUrl } = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.post("/google", googleAuth);
router.get("/google/url", getGoogleAuthUrl);

module.exports = router;