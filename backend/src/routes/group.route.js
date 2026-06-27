import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js"; // Aapka auth middleware
import { createGroup, getMyGroups, getGroupMessages } from "../controllers/group.controller.js";

const router = express.Router();

router.post("/create", protectRoute, createGroup);
router.get("/my-groups", protectRoute, getMyGroups);
router.get("/messages/:id", protectRoute, getGroupMessages);

export default router;