import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import ChatHeader from './ChatHeader'
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { formatMessageTime } from '../lib/utils';
import MessageInput from './MessageInput';
import MessageSkeleton from './skeletons/MessageSkeleton';
const ChatContainer = () => {
    const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    typingUsers,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [isScrolledUp, setIsScrolledUp] = useState(false);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
       const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
       // If distance from bottom is greater than 100px, it means the user scrolled up
       setIsScrolledUp(scrollHeight - scrollTop - clientHeight > 100);
    }
  };

  const scrollToBottom = () => {
    if (messageEndRef.current) {
        messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    getMessages(selectedUser._id);

    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [selectedUser._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    const lastMessage = messages?.[messages.length - 1];
    const isMyMessage = lastMessage?.senderId === authUser._id;

    if (!isScrolledUp || isMyMessage) {
      scrollToBottom();
    }
  }, [messages, typingUsers, authUser._id]);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }
  return (
    <div className="flex-1 flex flex-col overflow-auto relative">
        <ChatHeader />
       <div 
         className="flex-1 overflow-y-auto p-4 space-y-4 relative" 
         ref={scrollContainerRef} 
         onScroll={handleScroll}
       >
        {messages.map((message) => (
          <div
            key={message._id}
            className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
          >
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={
                    message.senderId === authUser._id
                      ? authUser.profilePic || "/avatar.png"
                      : selectedUser.profilePic || "/avatar.png"
                  }
                  alt="profile pic"
                />
              </div>
            </div>

            <div className="chat-header mb-1">
              <time className="text-xs opacity-50 ml-1">
                {formatMessageTime(message.createdAt)}
              </time>
            </div>

            <div className={`chat-bubble flex flex-col ${message.senderId === authUser._id ? "chat-bubble-primary" : "bg-base-200 text-base-content"}`}>
              {message.image && (
                <img
                  src={message.image}
                  alt="Attachment"
                  className="sm:max-w-[200px] rounded-md mb-2"
                />
              )}
              {message.video && (
                <video
                  src={message.video}
                  controls
                  className="sm:max-w-[200px] rounded-md mb-2"
                />
              )}
              {message.text && <p>{message.text}</p>}
            </div>

          </div>

        ))}

        {/* typing skeleton */}
        {typingUsers?.includes(selectedUser._id) && (
          <div className="chat chat-start">
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={selectedUser.profilePic || "/avatar.png"}
                  alt="profile pic"
                />
              </div>
            </div>
            <div className="chat-bubble flex items-center justify-center gap-1 w-16 h-10 mt-1 bg-base-200">
              <div className="w-2 h-2 bg-base-content/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
              <div className="w-2 h-2 bg-base-content/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
              <div className="w-2 h-2 bg-base-content/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
            </div>
          </div>
        )}

        {/*Automatic scroll to bottom when open chat*/}
        <div ref={messageEndRef}></div>
       </div>

       {/* Floating Scroll Down Button */}
       {isScrolledUp && (
         <button
           onClick={scrollToBottom}
           className="absolute bottom-20 left-1/2 -translate-x-1/2 btn btn-circle btn-sm bg-base-200 border border-base-300 shadow-xl opacity-90 hover:opacity-100 z-10 animate-bounce"
         >
           <ArrowDown size={18} />
         </button>
       )}

        <MessageInput />
    </div>
  )
}

export default ChatContainer