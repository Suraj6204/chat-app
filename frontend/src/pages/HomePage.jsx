import React, { useEffect } from 'react'
import Sidebar from '../components/Sidebar';
import NoChatSelected from '../components/NoChatSelected';
import { useChatStore } from '../store/useChatStore';
import ChatContainer from '../components/ChatContainer';

// Calling Components aur Store
import CallNotification from "../components/CallNotification";
import VideoContainer from "../components/VideoContainer";
import OutgoingCallContainer from '../components/OutgoingCallContainer';
import { useCallStore } from "../store/useCallStore";
import { useAuthStore } from '../store/useAuthStore';

const HomePage = () => {
  const { selectedUser } = useChatStore();
  const { initCallListeners } = useCallStore();
  const { socket, authUser } = useAuthStore();

  useEffect(() => {
      if (socket && authUser) {
          initCallListeners();
          return () => {
            socket.off("incomingCall");
            socket.off("callAccepted");
            socket.off("callEnded");
          };
      }
  }, [socket, authUser, initCallListeners]);

  return (
    <div className="h-screen bg-base-100 relative">
      <div className="flex h-full w-full overflow-hidden">
        <Sidebar /> 
        {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
      </div>

      {/* Global Calling UI - Ye dono components hamesha top par rahenge */}
      <CallNotification />
      <OutgoingCallContainer />
      <VideoContainer />
    </div>
  )
}

export default HomePage;