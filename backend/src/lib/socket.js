import http from "http";
import express from "express";
import { Server } from "socket.io";

//setup server
const app = express();
const server = http.createServer(app);

//create io instance and configure cors
const io = new Server(server, {
  cors: ["http://localhost:5173"],
});

//temporary map that stores online users
const userSocketMap = {}; // { userId: socketId }

export const getReceiverSocketId = (userId) => {
  return userSocketMap[userId];
};

// jab bhi koi new user aayega tab io.on ka code run hoga
//when user comes , automatic connection starts
io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  //userId(inside handshake) is send from the frontend to the backend when connection starts.
  const userId = socket.handshake.query.userId;

  //store userId in temporary map
  if (userId) userSocketMap[userId] = socket.id;

  // sends the array of online/connected users to frontend
  io.emit("getOnlineUsers", Object.keys(userSocketMap)); // Output: ["user_id_123", "user_id_456"]

  //when call starts
  socket.on("callUser", ({ userToCall, signalData, from, name, type }) => {
    const receiverSocketId = getReceiverSocketId(userToCall);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("incomingCall", {
        signal: signalData,
        from,
        name,
        type, // 'audio' ya 'video'
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
  // socket.on("iceCandidate", ({ to, candidate }) => {
  //     const targetSocketId = getReceiverSocketId(to);
  //     if (targetSocketId) {
  //         io.to(targetSocketId).emit("iceCandidate", candidate);
  //     }
  // });

  //4.for ending call
  socket.on("endCall", ({ to, endedBy }) => {
    const targetSocketId = getReceiverSocketId(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit("callEnded", { endedBy });
    }
  });

  //5.Typing feature
  //start typing

  //Jab User A connect hua, toh backend ne ek kamra banaya jahan userId = "UserA" save ho
  //gaya. Us kamre ke saare socket.on events usi userId ko yaad rakhte hain.
  socket.on("startTyping", ({ receiverId }) => {
    const receiverSocketId = getReceiverSocketId(receiverId);
    io.to(receiverSocketId).emit("displayTyping", {
      senderId: userId, //ye jo bheja hai uske according userId set hojayegi ,
    });
  });

  //stop typing
  socket.on("stopTyping", ({ receiverId }) => {
    const receiverSocketId = getReceiverSocketId(receiverId);
    io.to(receiverSocketId).emit("hideTyping", {
      senderId: userId,
    });
  });

  //disconnect
  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
    delete userSocketMap[userId];
    //again gives updated users (removing disconnected users)
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });

  //block
  socket.on("blockUserEvent", ({ blockedId }) => {
    const receiverSocketId = getReceiverSocketId(blockedId);
    if (receiverSocketId) {
      // Samne wale user ko instantly notify karo ki use kisne block kiya hai
      io.to(receiverSocketId).emit("userBlocked", { blockedById: userId });
    }
  });

  // unblock
  socket.on("unblockUserEvent", ({ unblockedId }) => {
    const receiverSocketId = getReceiverSocketId(unblockedId);
    if (receiverSocketId) {
      // Samne wale user ko instantly notify karo ki use kisne unblock kiya hai
      io.to(receiverSocketId).emit("userUnblocked", { unblockedById: userId });
    }
  });

  // use GROUP MANAGEMENT & ROOM BINDINGS

  // 1. Existing: Join all previous groups rooms on startup
  socket.on("joinGroupRooms", ({ groupIds }) => {
    groupIds.forEach((groupId) => {
      const roomName = `group:${groupId}`;
      socket.join(roomName);
      console.log(`Socket ${socket.id} securely joined: ${roomName}`);
    });
  });

  // 🔥Handle new group creation sync across online members
  socket.on("newGroupCreated", ({ memberIds, groupData }) => {
    if (!groupData || !groupData._id) return;

    const newRoomName = `group:${groupData._id}`;

    // Creator (current socket) ko instantly is naye room mein join karvao
    socket.join(newRoomName);
    console.log(`Creator socket ${socket.id} joined new room: ${newRoomName}`);

    // Baaki online members ke pass sidebar update aur automatic room join trigger bhejo
    memberIds.forEach((memberId) => {
      // Apne aap ko (creator) skip karo kyunki tumhara UI already updated hai
      if (memberId !== userId) {
        const memberSocketId = getReceiverSocketId(memberId);

        if (memberSocketId) {
          // Online member ko event bhejo taaki uske sidebar me group add ho jaye
          io.to(memberSocketId).emit("addNewGroupToSidebar", groupData);

          // Us online member ke socket instance ko backend par hi is naye room me force-join karvao
          const targetSocket = io.sockets.sockets.get(memberSocketId);
          if (targetSocket) {
            targetSocket.join(newRoomName);
            console.log(
              `Socket ${memberSocketId} auto-joined new group room: ${newRoomName}`,
            );
          }
        }
      }
    });
  });
});

export { io, app, server };
