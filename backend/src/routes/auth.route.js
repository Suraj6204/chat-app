import express from "express";
import { checkAuth, login, logout, sendOTP, signup, updateProfile, verifyEmail } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { authLimiter, signupLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/signup", signupLimiter , signup);
router.post("/login", login);
router.post("/logout", logout);

router.post("/send-otp", authLimiter , sendOTP);
router.post("/verify-email", authLimiter , verifyEmail);

router.put("/update-profile", protectRoute, updateProfile);
router.get("/check", protectRoute, checkAuth); //user authenticated or not

export default router;