import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId , io } from "../lib/socket.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";

export const getUsersForSidebar = async(req , res) =>{
    try{
        const loggedInUserId = req.user._id;
        //sare user ko lao bs khud ko chork(ne - not equal) and password field ko exclude kro (- sign lgakr)
        const filteredUsers  = await User.find({_id : {$ne : loggedInUserId}}).select("-password");
        res.status(200).json(filteredUsers);
    }
    catch(error){
        console.error("Error in getUsersForSidebar: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
}

export const getMessages = async (req, res) => {
    try {
        const userToChatId = req.params.id;
        const myId = req.user._id;

        const messages = await Message.find({
            $or: [
                { senderId: myId , receiverId: userToChatId },
                { senderId: userToChatId, receiverId: myId },
            ],
            deletedBy: {$ne: myId}   //this helps to not show the msg deleted by you
        });

        res.status(200).json(messages);

    }
    catch (error) {
        console.error("Error in getMessages: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
}

export const sendMessage = async (req , res) => { // :/receiverId
    try{
        const {text , image , video} = req.body;
        const senderId = req.user._id;
        const {id : receiverId} = req.params;

        let imageUrl;
        if(image){
            const uploadResponse = await cloudinary.uploader.upload(image , {
                resource_type : "image",
            });
            imageUrl = uploadResponse.secure_url;
        }

        let videoUrl = ""
        if(video){
            const uploadResponse = await cloudinary.uploader.upload(video , {
                resource_type : "video",
                chunk_size: 6000000, // 6MB chunks (badi files ke liye helpful hai)
                folder: "chat_videos"
            });
            videoUrl = uploadResponse.secure_url;
        }
        
        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image: imageUrl,
            video: videoUrl,
        })
        await newMessage.save();

        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", newMessage);
        }

        res.status(201).json(newMessage);
    }
    catch (error) {
        console.error("Error in sendMessages: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
}

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
        { $addToSet: { deletedBy: userId } }
      );
      return res.status(200).json({ message: "Messages deleted for you" });
    } 
    
    if (deleteType === "everyone") {
      // 2. DELETE FOR EVERYONE: DB se completely delete karo (Only if you are the sender)
      await Message.deleteMany({
        _id: { $in: messageIds },
        senderId: userId // Security check: Sirf apna bheja hua message delete for everyone hoga
      });

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