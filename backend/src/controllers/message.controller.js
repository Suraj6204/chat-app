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
            ]
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
 