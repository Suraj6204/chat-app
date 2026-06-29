import Group from "../models/group.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";

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

    // Populate members data instantly response sending ke liye
    const populatedGroup = await Group.findById(newGroup._id).populate(
      "members",
      "-password",
    );

    res.status(201).json(populatedGroup);
  } catch (error) {
    console.error("Error in createGroup:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

//Fetch my groups(for sidebar )
export const getMyGroups = async (req, res) => {
  try {
    const myId = req.user._id;

    const groups = await Group.find({ members: { $in: [myId] } }).populate(
      "members",
      "-password",
    );

    res.status(201).json(groups);
  } catch (error) {
    console.error("Error in getMyGroups:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 3. Get Group Messages (ChatContainer messages fetch) , groupid in params
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
      { $set: { [`unreadCounts.${groupId}`]: 0 } },
    );

    /*populated message example structure:
{
    text: "I agree",

    senderId: {
        _id: "u2",
        fullName: "Rahul",
        profilePic: "..."
    },

    replyTo: {
        _id: "m1",
        text: "Hello",

        senderId: {
            _id: "u1",
            fullName: "Suraj"
        }
    }
}
    */

    res.status(201).json(messages);
  } catch (error) {
    console.error("Error in getGroupMessages:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
