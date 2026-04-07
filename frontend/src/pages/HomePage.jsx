import React from 'react'
import Sidebar from '../components/Sidebar';
import NoChatSelected from '../components/NoChatSelected';
import { useChatStore } from '../store/useChatStore';
import ChatContainer from '../components/ChatContainer';

const HomePage = () => {
  const {selectedUser} = useChatStore();
  return (
    <div className="h-screen bg-base-100">
      <div className="flex h-full w-full overflow-hidden">
        <Sidebar /> 
        {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
      </div>
    </div>
  )
}

export default HomePage;