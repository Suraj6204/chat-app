import Group from "../models/group.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import { io, getReceiverSocketId } from "../lib/socket.js";
import { createSystemMessage } from "../utils/createSystemMessage.helper.js";

// 1. Create Group
export const createGroup = async (req, res) => {
  try {
    const { name, description, memberIds, groupPic } = req.body;
    const myId = req.user._id;

    if (!name) {
      return res.status(400).json({ message: "Group name is required" });
    }

    // Ensure memberIds is an array and include creator in members set
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

// 2. Fetch my groups (for sidebar)
export const getMyGroups = async (req, res) => {
  try {
    const myId = req.user._id;

    const groups = await Group.find({
      members: { $in: [myId] },
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

    // Mark group as deleted so it stays visible for historical viewing but is blocked for new messages
    group.isDeleted = true;
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

// 6. Add Members to Group (anyone in group can add)
export const addMembers = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { memberIds } = req.body;
    const myId = req.user._id;

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ message: "No members specified to add" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if requester is a member of the group
    const isRequesterMember = group.members.some(
      (m) => m.toString() === myId.toString()
    );
    if (!isRequesterMember) {
      return res.status(403).json({ message: "You must be a group member to add new members" });
    }

    // Find users to add
    const usersToAdd = await User.find({ _id: { $in: memberIds } }).select("fullName");
    if (usersToAdd.length === 0) {
      return res.status(404).json({ message: "Users to add not found" });
    }

    // Append new member IDs to group members (avoiding duplicates)
    const addedMemberIds = [];
    usersToAdd.forEach((u) => {
      const uIdStr = u._id.toString();
      if (!group.members.some((m) => m.toString() === uIdStr)) {
        group.members.push(u._id);
        addedMemberIds.push(u._id);
      }
    });

    if (addedMemberIds.length === 0) {
      return res.status(400).json({ message: "Selected users are already members of this group" });
    }

    await group.save();

    const updatedGroup = await Group.findById(groupId).populate(
      "members",
      "-password"
    );

    // Create system message: "Suraj added Rahul, Priya"
    const addedNames = usersToAdd.map((u) => u.fullName).join(", ");
    const systemMsg = await createSystemMessage({
      senderId: myId,
      groupId,
      text: `${req.user.fullName} added ${addedNames}`,
      systemEvent: "member_added",
    });

    if (systemMsg) {
      io.to(`group:${groupId}`).emit("newGroupMessage", {
        message: systemMsg,
        groupId,
      });
    }

    // Notify newly added members so the group is added to their sidebar instantly!
    addedMemberIds.forEach((newMemberId) => {
      const socketId = getReceiverSocketId(newMemberId.toString());
      if (socketId) {
        io.to(socketId).emit("addNewGroupToSidebar", updatedGroup);
        const targetSocket = io.sockets.sockets.get(socketId);
        if (targetSocket) {
          targetSocket.join(`group:${groupId}`);
        }
      }
    });

    // Broadcast memberJoinedGroup to existing room members
    io.to(`group:${groupId}`).emit("memberJoinedGroup", {
      groupId,
      updatedGroup,
    });

    res.status(200).json(updatedGroup);
  } catch (error) {
    console.error("Error in addMembers controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 7. Remove Member from Group (creator only)
export const removeMember = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { memberId } = req.body;
    const myId = req.user._id;

    if (!memberId) {
      return res.status(400).json({ message: "Member ID is required" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Verify requester is creator
    if (group.creator.toString() !== myId.toString()) {
      return res.status(403).json({ message: "Only the group creator can remove members" });
    }

    // Cannot remove creator self
    if (memberId.toString() === myId.toString()) {
      return res.status(400).json({ message: "Group creator cannot be removed" });
    }

    const isMember = group.members.some(
      (m) => m.toString() === memberId.toString()
    );
    if (!isMember) {
      return res.status(400).json({ message: "User is not a member of this group" });
    }

    const removedUser = await User.findById(memberId).select("fullName");
    if (!removedUser) {
      return res.status(404).json({ message: "User to remove not found" });
    }

    // Remove user from members and admins
    group.members = group.members.filter(
      (m) => m.toString() !== memberId.toString()
    );
    group.admins = group.admins.filter(
      (a) => a.toString() !== memberId.toString()
    );

    await group.save();

    const updatedGroup = await Group.findById(groupId).populate(
      "members",
      "-password"
    );

    // Create system message: "Suraj removed Rahul from the group"
    const systemMsg = await createSystemMessage({
      senderId: myId,
      groupId,
      text: `${req.user.fullName} removed ${removedUser.fullName} from the group`,
      systemEvent: "member_removed",
    });

    if (systemMsg) {
      io.to(`group:${groupId}`).emit("newGroupMessage", {
        message: systemMsg,
        groupId,
      });
    }

    // Broadcast memberLeftGroup to the group room
    io.to(`group:${groupId}`).emit("memberLeftGroup", {
      groupId,
      leftUserId: memberId,
      updatedGroup,
    });

    res.status(200).json(updatedGroup);
  } catch (error) {
    console.error("Error in removeMember controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

