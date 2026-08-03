import Group from "../models/group.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import { io } from "../lib/socket.js";
import { createSystemMessage } from "../utils/createSystemMessage.helper.js";

// 1. Create Group
export const createGroup = async (req, res) => {
  try {
    const { name, description, memberIds, groupPic } = req.body;
    const myId = req.user._id;

    if (!name) {
      return res.status(400).json({ message: "Group name is required" });
    }

    // Ensure memberIds is an array and include the creator in members set
    const allMembers = [...new Set([...(memberIds || []), myId.toString()])];

    const newGroup = await Group.create({
      name,
      description,
      groupPic: groupPic || "",
      creator: myId,
      members: allMembers,
      admins: [myId], // By default creator admin hoga
    });

    // Populate members data
    const populatedGroup = await Group.findById(newGroup._id).populate(
      "members",
      "-password"
    );

    // Create system message for group creation
    const systemMsg = await createSystemMessage({
      senderId: myId,
      groupId: newGroup._id,
      text: `${req.user.fullName} created group "${name}"`,
      systemEvent: "group_created",
    });

    if (systemMsg) {
      io.to(`group:${newGroup._id}`).emit("newGroupMessage", {
        message: systemMsg,
        groupId: newGroup._id,
      });
    }

    res.status(201).json(populatedGroup);
  } catch (error) {
    console.error("Error in createGroup:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 2. Fetch my groups (for sidebar) - excluding hidden groups
export const getMyGroups = async (req, res) => {
  try {
    const myId = req.user._id;

    const groups = await Group.find({
      members: { $in: [myId] },
      hiddenForUsers: { $ne: myId },
    }).populate("members", "-password");

    res.status(200).json(groups);
  } catch (error) {
    console.error("Error in getMyGroups:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 3. Get Group Messages
export const getGroupMessages = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      receiverId: groupId,
      conversationType: "group",
    })
      .populate("senderId", "fullName profilePic")
      .populate({
        path: "replyTo",
        populate: { path: "senderId", select: "fullName" },
      });

    await User.updateOne(
      { _id: myId },
      { $set: { [`unreadCounts.${groupId}`]: 0 } }
    );

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getGroupMessages:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 4. Delete Group (Creator only)
export const deleteGroup = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const myId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Verify user is creator
    if (group.creator.toString() !== myId.toString()) {
      return res.status(403).json({ message: "Only the group creator can delete this group" });
    }

    // Mark group as deleted so it stays visible for other members for historical viewing
    group.isDeleted = true;

    // Automatically hide group for creator when creator deletes their group
    if (!group.hiddenForUsers.includes(myId)) {
      group.hiddenForUsers.push(myId);
    }

    await group.save();

    // Create system message
    const systemMsg = await createSystemMessage({
      senderId: myId,
      groupId,
      text: `${req.user.fullName} deleted the group. This group no longer exists.`,
      systemEvent: "group_deleted",
    });

    if (systemMsg) {
      io.to(`group:${groupId}`).emit("newGroupMessage", {
        message: systemMsg,
        groupId,
      });
    }

    // Emit groupDeleted socket event to the group room
    io.to(`group:${groupId}`).emit("groupDeleted", {
      groupId,
      systemMessage: systemMsg,
    });

    res.status(200).json({ message: "Group deleted successfully", groupId, systemMessage: systemMsg });
  } catch (error) {
    console.error("Error in deleteGroup controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 5. Leave Group
export const leaveGroup = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const myId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isMember = group.members.some(
      (memberId) => memberId.toString() === myId.toString()
    );
    if (!isMember) {
      return res.status(400).json({ message: "You are not a member of this group" });
    }

    // Create system message for member leaving
    const systemMsg = await createSystemMessage({
      senderId: myId,
      groupId,
      text: `${req.user.fullName} left the group`,
      systemEvent: "member_left",
    });

    if (systemMsg) {
      io.to(`group:${groupId}`).emit("newGroupMessage", {
        message: systemMsg,
        groupId,
      });
    }

    // Remove user from members and admins
    group.members = group.members.filter(
      (m) => m.toString() !== myId.toString()
    );
    group.admins = group.admins.filter(
      (a) => a.toString() !== myId.toString()
    );

    // If no members remain, mark group as deleted
    if (group.members.length === 0) {
      group.isDeleted = true;
      await group.save();
      io.to(`group:${groupId}`).emit("groupDeleted", { groupId, systemMessage: systemMsg });
      return res.status(200).json({ message: "Group left and deleted as no members remain", groupId });
    }

    // If leaving user was creator, reassign creator to first remaining admin or member
    if (group.creator.toString() === myId.toString()) {
      group.creator = group.admins[0] || group.members[0];
      if (!group.admins.includes(group.creator)) {
        group.admins.push(group.creator);
      }

      const newCreatorUser = await User.findById(group.creator).select("fullName");
      if (newCreatorUser) {
        const transferMsg = await createSystemMessage({
          senderId: myId,
          groupId,
          text: `${newCreatorUser.fullName} is now the group creator`,
          systemEvent: "creator_changed",
        });
        if (transferMsg) {
          io.to(`group:${groupId}`).emit("newGroupMessage", {
            message: transferMsg,
            groupId,
          });
        }
      }
    }

    await group.save();

    const updatedGroup = await Group.findById(groupId).populate(
      "members",
      "-password"
    );

    // Broadcast memberLeftGroup to the group room
    io.to(`group:${groupId}`).emit("memberLeftGroup", {
      groupId,
      leftUserId: myId,
      updatedGroup,
    });

    res.status(200).json({
      message: "Left group successfully",
      groupId,
      updatedGroup,
    });
  } catch (error) {
    console.error("Error in leaveGroup controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 6. Hide Group (per user)
export const hideGroup = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const myId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (!group.hiddenForUsers.includes(myId)) {
      group.hiddenForUsers.push(myId);
      await group.save();
    }

    res.status(200).json({ message: "Group hidden successfully", groupId });
  } catch (error) {
    console.error("Error in hideGroup controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
