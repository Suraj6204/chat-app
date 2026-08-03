import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        conversationType: {
            type: String,
            enum: ["peer", "group"],
            default: "peer",
            required: true
        },
        receiverId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            // Agar conversationType 'peer' hai toh 'User' model ref hoga, agar 'group' hai toh 'Group' model ref hoga
            refPath: "conversationType" 
        },
        text: {
            type: String
        },
        image: {
            type: String
        },
        video: {
            type: String
        },
        deletedBy: [{ 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "User"
        }],
        isDeletedEveryone: {
            type: Boolean,
            default: false
        },
        replyTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
            default: null
        },
        isSystemMessage: {
            type: Boolean,
            default: false
        },
        systemEvent: {
            type: String,
            default: null
        },
    },
    { timestamps: true }
);

mongoose.model("peer", mongoose.model("User").schema); 
// (Ensure karna ki Group model isse pehle compile/import ho chuka ho server initialization pipeline mein)

const Message = mongoose.model("Message", messageSchema);
export default Message;