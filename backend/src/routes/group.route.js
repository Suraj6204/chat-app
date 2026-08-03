import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js"; // Aapka auth middleware
import { createGroup, getMyGroups, getGroupMessages, deleteGroup, leaveGroup, hideGroup } from "../controllers/group.controller.js";

const router = express.Router();

router.post("/create", protectRoute, createGroup);
router.get("/my-groups", protectRoute, getMyGroups);
router.get("/messages/:id", protectRoute, getGroupMessages);
router.post("/leave/:id", protectRoute, leaveGroup);
router.patch("/hide/:id", protectRoute, hideGroup);
router.delete("/:id", protectRoute, deleteGroup);

export default router;