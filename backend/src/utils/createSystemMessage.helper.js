import Message from "../models/message.model.js";

export const createSystemMessage = async ({ senderId, groupId, text, systemEvent }) => {
  try {
    const message = await Message.create({
      senderId,
      receiverId: groupId,
      conversationType: "group",
      text,
      isSystemMessage: true,
      systemEvent: systemEvent || "system_event",
    });

    const populatedMessage = await Message.findById(message._id).populate(
      "senderId",
      "fullName profilePic"
    );

    return populatedMessage;
  } catch (error) {
    console.error("Error creating system message:", error);
    return null;
  }
};
