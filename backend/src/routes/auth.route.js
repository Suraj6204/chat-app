import express from "express";
import { checkAuth, login, logout, sendOTP, signup, updateProfile, verifyEmail } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

router.post("/send-otp", sendOTP);
router.post("/verify-email", verifyEmail);

router.put("/update-profile", protectRoute, updateProfile);
router.get("/check", protectRoute, checkAuth); //user authenticated or not

export default router;