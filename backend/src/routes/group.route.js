import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js"; // Auth middleware
import {
  createGroup,
  getMyGroups,
  getGroupMessages,
  deleteGroup,
  leaveGroup,
  addMembers,
  removeMember,
} from "../controllers/group.controller.js";

const router = express.Router();

router.post("/create", protectRoute, createGroup);
router.get("/my-groups", protectRoute, getMyGroups);
router.get("/messages/:id", protectRoute, getGroupMessages);
router.post("/leave/:id", protectRoute, leaveGroup);
router.post("/add-members/:id", protectRoute, addMembers);
router.post("/remove-member/:id", protectRoute, removeMember);
router.delete("/:id", protectRoute, deleteGroup);

export default router;