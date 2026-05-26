import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { deleteMessages, getMessages, getUsersForSidebar, sendMessage, clearChat, togglePinChat } from "../controllers/message.controller.js";

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/:id", protectRoute, getMessages);

router.post("/send/:id", protectRoute, sendMessage);

router.post("/delete", protectRoute, deleteMessages);

router.patch("/clear/:id", protectRoute, clearChat);

router.patch("/pin/:id", protectRoute, togglePinChat);


export default router;