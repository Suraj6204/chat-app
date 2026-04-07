import http from "http";
import express from "express";
import {Server} from "socket.io";

//setup server
const app = express();
const server = http.createServer(app);

//create io instance and configure cors
const io = new Server(server , {
    cors: ["http://localhost:5173"],
});

//temporary map that stores online users
const userSocketMap = {}; // { userId: socketId }

export const getReceiverSocketId = (userId) => {
    return userSocketMap[userId];
}   

// jab bhi koi new user aayega tab io.on ka code run hoga
//when user comes , automatic connection starts
io.on("connection" , (socket) => {
    console.log("A user connected", socket.id);

    //userId(inside handshake) is send from the frontend to the backend when connection starts.
    const userId = socket.handshake.query.userId;

    //store userId in temporary map
    if(userId) userSocketMap[userId] = socket.id;

    // sends the array of online/connected users to frontend
    io.emit("getOnlineUsers" , Object.keys(userSocketMap)); // Output: ["user_id_123", "user_id_456"]

    //when call starts
    socket.on("callUser", ({ userToCall, signalData, from, name, type }) => {
        const receiverSocketId = getReceiverSocketId(userToCall);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("incomingCall", { 
                signal: signalData, 
                from, 
                name, 
                type // 'audio' ya 'video'
            });
        }
    });

    //when receiver picks call
    socket.on("answerCall", (data) => {
        const callerSocketId = getReceiverSocketId(data.to);
        if (callerSocketId) {
            io.to(callerSocketId).emit("callAccepted", data.signal);
        }
    });

    // 3. ICE Candidates exchange (Connection pakka karne ke liye)
    socket.on("iceCandidate", ({ to, candidate }) => {
        const targetSocketId = getReceiverSocketId(to);
        if (targetSocketId) {
            io.to(targetSocketId).emit("iceCandidate", candidate);
        }
    });

    //4.for ending call
    socket.on("endCall", ({ to }) => {
        const targetSocketId = getReceiverSocketId(to);
        if (targetSocketId) {
            io.to(targetSocketId).emit("callEnded");
        }
    });

    //disconnect
    socket.on("disconnect" , () => {
        console.log("A user disconnected", socket.id);
        delete userSocketMap[userId];
        //again gives updated users (removing disconnected users)
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
});

export { io, app, server };