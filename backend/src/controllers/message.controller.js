import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import Group from "../models/group.model.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const myId = req.user._id;
    // const loggedInUserId = req.user._id;
    //sare user ko lao bs khud ko chork(ne - not equal) and password field ko exclude kro (- sign lgakr)

    // const filteredUsers = await User.find({
    //   _id: { $ne: loggedInUserId },
    // }).select("-password");

    const messages = await Message.find({
      $or: [{ senderId: myId }, { receiverId: myId }],
    }).sort({ createdAt: -1 });

    //from message senderID , get user id and insert into a set
    const userIds = new Set();
    messages.forEach((msg) => {
      if (msg.senderId.toString() === myId.toString()) {
        // hm jisko message kiye hai , wo dikhega
        userIds.add(msg.receiverId.toString());
      } else { 
        userIds.add(msg.senderId.toString());
      }
    });

    //fetch users from User model (include set wala ids and exclude hidden chats ids)
    const hiddenChats = req.user.hiddenChats || [];
    const filteredUsers = await User.find({
      _id: { $in: [...userIds], $nin: hiddenChats },
    }).select("-password");

    const userMap = new Map(filteredUsers.map((user) => [user._id.toString(), user]));

    const orderedUsers = [...userIds]
      .map((id) => userMap.get(id))
      .filter(Boolean);

    res.status(200).json(orderedUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/*postgress-
  const filteredUsers = await sql`
    SELECT id, name, email
    FROM users
    WHERE id != ${loggedInUserId};
  `;
 */

export const getMessages = async (req, res) => {
  try {
    const userToChatId = req.params.id;
    const myId = req.user._id;

    //check if block by them
    const user = await User.findById(userToChatId);
    const isBlockedByThem = user.blockedUsers.includes(myId);

    //both users
    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
      deletedBy: { $ne: myId }, //this helps to not show the msg deleted by you
    }).populate("replyTo", "text image video senderId");

    await User.updateOne(
      { _id: myId },
      { $pull: { hiddenChats: userToChatId } },
    );
    //populate to give proper structure=> {text :"" , replyTo: {text : "" , image: "" , video: "" , senderId: ""}}

    await clearUnreadCount(myId, userToChatId);

    res.status(200).json({ messages, isBlockedByThem });
  } catch (error) {
    console.error("Error in getMessages: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/*postgress-
const messages = await sql`
  SELECT
    m.*,
    r.text     AS reply_text,
    r.image    AS reply_image,
    r.video    AS reply_video,
    r.sender_id AS reply_sender_id
  FROM messages m
  LEFT JOIN messages r
  ON m.reply_to = r.id
  WHERE (
      (m.sender_id = ${myId} AND m.receiver_id = ${userToChatId})
      OR
      (m.sender_id = ${userToChatId} AND m.receiver_id = ${myId})
  )
  AND NOT (${myId} = ANY(m.deleted_by))   // to exclude any thing inside array
  ORDER BY m.created_at;
`;   
*/

export const sendMessage = async (req, res) => {
  // :/receiverId
  try {
    const { text, image, video, replyTo, conversationType } = req.body;
    const senderId = req.user._id;
    const { id: receiverId } = req.params;

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image, {
        resource_type: "image",
      });
      imageUrl = uploadResponse.secure_url;
    }

    let videoUrl = "";
    if (video) {
      const uploadResponse = await cloudinary.uploader.upload(video, {
        resource_type: "video",
        chunk_size: 6000000, // 6MB chunks (badi files ke liye helpful hai)
        folder: "chat_videos",
      });
      videoUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      conversationType: conversationType || "peer",
      text,
      image: imageUrl,
      video: videoUrl,
      replyTo: replyTo || null,
    });
    await newMessage.save();

    const populatedMessage = await Message.findById(newMessage._id).populate(
      "replyTo",
      "text image video senderId",
    );

    if (conversationType === "group") {
      const group = await Group.findById(receiverId).select("members");
      const recipientIds = (group?.members || []).filter(
        (memberId) => memberId.toString() !== senderId.toString(),
      );

      if (recipientIds.length > 0) {
        await incrementUnreadCount(recipientIds, receiverId);
      }

      io.to(`group:${receiverId}`).emit("newGroupMessage", {
        message: populatedMessage,
        groupId: receiverId,
      });
    } else {
      await User.updateOne(
        { _id: senderId },
        { $pull: { hiddenChats: receiverId } },
      );
      await User.updateOne(
        { _id: receiverId },
        { $pull: { hiddenChats: senderId } },
      );

      await incrementUnreadCount([receiverId], senderId);

      const receiverSocketId = getReceiverSocketId(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("newMessage", populatedMessage);
      }
    }

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Error in sendMessages: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteMessages = async (req, res) => {
  try {
    const { messageIds, deleteType, receiverId } = req.body; // deleteType: 'me' ya 'everyone'
    const userId = req.user._id;

    if (!messageIds || messageIds.length === 0) {
      return res.status(400).json({ message: "No message IDs provided" });
    }

    if (deleteType === "me") {
      // 1. DELETE FOR ME: Bas user ID ko deletedBy array mein push kar do
      await Message.updateMany(
        { _id: { $in: messageIds } },
        { $addToSet: { deletedBy: userId } },
      );
      return res.status(200).json({ message: "Messages deleted for you" });
    }

    if (deleteType === "everyone") {
      // 2. DELETE FOR EVERYONE: DB se completely delete karo (Only if you are the sender)
      await Message.updateMany(
        {
          _id: { $in: messageIds },
          senderId: userId,
        },
        {
          $set: {
            text: "This message was deleted",
            image: null,
            video: null,
            isDeletedEveryone: true,
          },
        },
      );

      //is event se frontend me real time data hat jayega bina reload kiye
      const receiverSocketId = getReceiverSocketId(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messagesDeletedEveryone", messageIds);
      }

      return res.status(200).json({ message: "Messages deleted for everyone" });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const clearChat = async (req, res) => {
  try {
    const { id: targetUserId } = req.params; // Jiske saath chat clear karni hai
    const myId = req.user._id; // Aapki apni ID

    // Dono users ke beech ke saare messages dhoondho aur deletedBy array mein apni ID push kar do
    await Message.updateMany(
      {
        $or: [
          { senderId: myId, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: myId },
        ],
      },
      {
        // $addToSet duplicate IDs push nahi hone deta
        $addToSet: { deletedBy: myId },
      },
    );

    res
      .status(200)
      .json({ success: true, message: "Chat cleared successfully" });
  } catch (error) {
    console.error("Error in clearChat controller:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

export const hideChat = async (req, res) => {
  try {
    const { id: targetUserId } = req.params;
    const myId = req.user._id;

    const updatedUser = await User.findByIdAndUpdate(
      myId,
      { $addToSet: { hiddenChats: targetUserId } },
      { new: true },
    ).select("-password");

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error in hideChat controller:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const togglePinChat = async (req, res) => {
  try {
    const { id: targetUserId } = req.params;
    const myId = req.user._id;

    const user = await User.findById(myId);
    const isPinned = user.pinnedChats.includes(targetUserId);

    let updatedUser;
    if (isPinned) {
      // Agar pehle se pinned hai toh unpin karo ($pull)
      updatedUser = await User.findByIdAndUpdate(
        myId,
        { $pull: { pinnedChats: targetUserId } },
        { new: true },
      );
    } else {
      // Agar pinned nahi hai toh pin karo ($addToSet)
      updatedUser = await User.findByIdAndUpdate(
        myId,
        { $addToSet: { pinnedChats: targetUserId } },
        { new: true },
      );
    }
    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const clearUnreadForConversation = async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const { conversationType } = req.body;
    const myId = req.user._id;

    if (!conversationId || !conversationType) {
      return res
        .status(400)
        .json({ message: "Conversation id and type are required" });
    }

    await clearUnreadCount(myId, conversationId);

    res.status(200).json({ success: true, message: "Unread count cleared" });
  } catch (error) {
    console.error("Error clearing unread count:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const incrementUnreadCount = async (userIds, conversationId) => {
  if (!conversationId || !userIds || userIds.length === 0) return;

  await User.updateMany(
    { _id: { $in: userIds } },
    { $inc: { [`unreadCounts.${conversationId}`]: 1 } },
  );
};

const clearUnreadCount = async (userId, conversationId) => {
  if (!userId || !conversationId) return;

  await User.updateOne(
    { _id: userId },
    { $set: { [`unreadCounts.${conversationId}`]: 0 } },
  );
};
