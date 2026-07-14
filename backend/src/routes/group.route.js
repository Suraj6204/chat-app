import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js"; // Aapka auth middleware
import { createGroup, getMyGroups, getGroupMessages, deleteGroup } from "../controllers/group.controller.js";

const router = express.Router();

router.post("/create", protectRoute, createGroup);
router.get("/my-groups", protectRoute, getMyGroups);
router.get("/messages/:id", protectRoute, getGroupMessages);
router.delete("/:id", protectRoute, deleteGroup);

export default router;