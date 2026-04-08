import { create } from "zustand";
import Peer from "simple-peer/simplepeer.min.js";
import { useAuthStore } from "./useAuthStore";
import { useChatStore } from "./useChatStore";
import toast from "react-hot-toast";

export const useCallStore = create((set, get) => ({
  call: {},            // Incoming call info {isReceivingCall, from, name, signal}
  callAccepted: false, 
  callEnded: false,
  stream: null,        // Local Camera/Mic stream
  userStream: null,    // Remote person's stream
  callType: null,      // 'audio' or 'video'

  // 1. Camera aur Mic ka access lena (With Super Debugging)
  getMediaStream: async (type) => {
    try {
      console.log("1. Requesting Camera/Mic permission..."); // Debug 1
      
      const currentStream = await navigator.mediaDevices.getUserMedia({
        video: type === "video",
        audio: true,
      });
      
      console.log("2. Permission Granted! Stream:", currentStream); // Debug 2
      set({ stream: currentStream, callType: type });
      return currentStream;

    } catch (err) {
      console.error("🚨 CAMERA ACCESS FAILED 🚨:", err); // Asli error yahan aayega
      toast.error(`Mic/Camera Error: ${err.message}`);
      return null;
    }
  },

  // 2. Call Start Karna (Outgoing)
  callUser: async (userToCall, type, callerName) => {
    const stream = await get().getMediaStream(type);
    if (!stream) return;
    const socket = useAuthStore.getState().socket;
    if (!socket) return toast.error("Socket not connected!");
    const authUser = useAuthStore.getState().authUser;

    const peer = new Peer({ initiator: true, trickle: false, stream });

    peer.on("signal", (data) => {
      socket.emit("callUser", {
        userToCall,
        signalData: data,
        from: authUser._id,
        name: callerName,
        type,
      });
    });

    socket.on("callAccepted", (signal) => {
      set({ callAccepted: true });
      peer.signal(signal);
    });

    peer.on("stream", (remoteStream) => {
      set({ userStream: remoteStream });
    });

    // Handle end call
    // socket.on("callEnded", () => get().leaveCall(true));
  },

  // 3. Call Receive/Answer Karna (Incoming)
  answerCall: async () => {
    set({ callAccepted: true });
    const stream = await get().getMediaStream(get().call.type);
    const socket = useAuthStore.getState().socket;

    const peer = new Peer({ initiator: false, trickle: false, stream });

    peer.on("signal", (data) => {
      socket.emit("answerCall", { signal: data, to: get().call.from });
    });

    peer.on("stream", (remoteStream) => {
      set({ userStream: remoteStream });
    });

    peer.signal(get().call.signal);
  },

  // 4. Call Cut Karna
  leaveCall: (isRemote = false) => {
    const { stream, userStream, call } = get(); 
    
    const socket = useAuthStore.getState().socket;
    const authUser = useAuthStore.getState().authUser; 

    // 1. Camera/Mic ko turant band karo
    if (stream) stream.getTracks().forEach((track) => track.stop());
    if (userStream) userStream.getTracks().forEach((track) => track.stop());

    // 2. Socket ko batao call khatam
    if (!isRemote) {
      console.log("☎️ You ended the call manually.");
      const remoteId = call?.from || useChatStore.getState().selectedUser?._id;
      console.log("📡 Signal bhej raha hu is user ko ID:", remoteId);
      
      if (socket && remoteId && authUser) { // Added authUser check
        socket.emit("endCall", { 
          to: remoteId, 
          endedBy: authUser.fullName 
        });
      }else {
        console.error("❌ Emit fail ho gaya. Ya toh Socket nahi hai, ya remoteId missing hai.");
      }
    }

    // 3. State ko Initial level par reset karo
    set({ 
      callAccepted: false, 
      callEnded: true, 
      userStream: null, 
      stream: null, 
      call: {}, 
      callType: null 
    });

    // 4. Thodi der baad reset taaki agla call lag sake
    setTimeout(() => {
      set({ callEnded: false });
    }, 1000);
  },

  // 5. Socket Listeners for Incoming Calls
  initCallListeners: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    // Purane listeners hatao
    socket.off("incomingCall");
    socket.off("callAccepted");
    socket.off("callEnded");

    // Naya listener
    socket.on("incomingCall", ({ from, name, signal, type }) => {
      console.log("Call incoming from:", name);
      set({ call: { isReceivingCall: true, from, name, signal, type } });
    });

    socket.on("callEnded", (data) => {
      const enderName = data?.endedBy || "The other user";
      console.log(`🚨 Call was cut by: ${enderName}`);
      toast(`${enderName} ended the call`, { icon: '📞' });
      
      // FIX 3: isRemote ko true pass karna bahut zaroori hai
      get().leaveCall(true); 
    });
  },
}));