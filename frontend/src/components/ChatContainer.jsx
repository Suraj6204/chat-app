import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, Ban, Copy, Forward, Info, Reply, Trash, X } from 'lucide-react';
import ChatHeader from './ChatHeader';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { formatMessageTime } from '../lib/utils';
import MessageInput from './MessageInput';
import MessageSkeleton from './skeletons/MessageSkeleton';
import MenuOptionsBox from './MenuOptionsBox';
import SelectionActionBar from './SelectionActionBar';

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    typingUsers,
    openModal,
  } = useChatStore();

  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [menuOptions, setMenuOptions] = useState({ show: false, x: 0, y: 0, messageId: null });

  // Selection Mode States
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [actionMode, setActionMode] = useState(null);


  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      setIsScrolledUp(scrollHeight - scrollTop - clientHeight > 100);
    }
  };

  const scrollToBottom = () => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleMenuOptions = (e, message) => {
    if (isSelectionMode || message.isDeletedEveryone) return; // Selection mode active hone par overlay context menu block hoga
    e.preventDefault();
    e.stopPropagation();
    setMenuOptions({
      show: true,
      x: e.clientX,
      y: e.clientY,
      messageId: message._id,
    });
  };

  // Checkbox select/deselect handling
  const handleToggleSelect = (messageId) => {
    setSelectedMessageIds((prev) =>
      prev.includes(messageId)
        ? prev.filter((id) => id !== messageId)
        : [...prev, messageId]
    );
  };

  // Bulk Delete Action Handler
  const handleDeleteSelected = async () => {
    if (selectedMessageIds.length === 0) return;
    openModal('Delete', selectedMessageIds);
    cancelSelectionMode();
  };

  //TODO : forward messages to other chats.
  const handleForwardSelected = () => {
    if (selectedMessageIds.length === 0) return;
    openModal('Forward', selectedMessageIds);
    cancelSelectionMode();
  }

  const cancelSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedMessageIds([]);
  };

  //selectionbar ke icon ko click krne pe kon sa function chlega
  const actionMap = {
    Delete: handleDeleteSelected,
    Forward: handleForwardSelected,
    // star: handleStarSelected,     // Future feature
    // report: handleReportSelected  // Future feature
  };

  useEffect(() => {
    const handleClickOnOutside = () => {
      setMenuOptions(prev => ({ ...prev, show: false }));
    };
    window.addEventListener('click', handleClickOnOutside);
    return () => window.removeEventListener('click', handleClickOnOutside);
  }, []);

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
    <div className="flex-1 flex flex-col overflow-auto relative bg-base-100">
      <ChatHeader />

      <div
        className="flex-1 overflow-y-auto p-4 space-y-4 relative"
        ref={scrollContainerRef}
        onScroll={handleScroll}
      >
        {messages.map((message) => (
          <div
            key={message._id}
            className={`flex items-center relative group w-full transition-colors duration-150 ${isSelectionMode ?
              selectedMessageIds.includes(message._id) ?
                message.isDeletedEveryone ? 
                'bg-base-300/70' :
                'bg-base-200 cursor-pointer' 
              : 'hover:bg-base-200 cursor-pointer'
              : ''
              }`}
            onClick={() => isSelectionMode && !message.isDeletedEveryone && handleToggleSelect(message._id)}
          >
            {/* Left Multi-select Checkbox Element */}
            {isSelectionMode && !message.isDeletedEveryone &&(
              <div className="flex items-center justify-center px-2">
                <input
                  type="checkbox"
                  checked={selectedMessageIds.includes(message._id)}
                  onChange={() => handleToggleSelect(message._id)}
                  className="checkbox checkbox-sm checkbox-primary border-2 border-base-content/30 rounded-md transition-all"
                  onClick={(e) => e.stopPropagation()} // prevent line bubble action conflict
                />
              </div>
            )}

            {/* Standard DaisyUI Message Layout */}
            <div className={`chat flex-1 ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}>
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

              <div
                onContextMenu={(e) => handleMenuOptions(e, message)}
                onDoubleClick={(e) => handleMenuOptions(e, message)}
                className={`chat-bubble flex flex-col  ${
                  message.isDeletedEveryone 
                    ? "bg-base-300/70 text-base-content/40 italic shadow-none cursor-default" 
                    : message.senderId === authUser._id 
                      ? "chat-bubble-primary cursor-pointer" 
                      : "bg-base-200 text-base-content cursor-pointer"
                }`}
              >
                {message.isDeletedEveryone ? (
                  <div className="flex items-center gap-2 py-0.5 pr-2 select-none">
                    <Ban size={14} className="opacity-60" />
                    <span className="text-sm tracking-wide">
                      {message.deletedByEveryone === authUser._id
                        ? "You deleted this message"
                        : `This message was deleted by ${selectedUser.fullName || "them"}`}
                    </span>
                  </div>
                ) : (
                <>
                  {message.image && (
                    <img src={message.image} alt="Attachment" className="sm:max-w-[200px] rounded-md mb-2" />
                  )}
                  {message.video && (
                    <video src={message.video} controls className="sm:max-w-[200px] rounded-md mb-2" />
                  )}
                  {message.text && <p>{message.text}</p>}
                </>
              )}
              </div> 
            </div>
          </div>
        ))}


        {/* Right Click Popup Box Options Menu */}
        {menuOptions.show && (
          <div
            className="fixed mb-2 w-56 bg-base-200 border border-base-300 rounded-2xl shadow-2xl py-2 z-50"
            style={{
              top: menuOptions.y,
              left: menuOptions.x,
              transform: `
                ${menuOptions.x + 224 > window.innerWidth ? 'translateX(-100%)' : 'translateX(0)'} 
                ${menuOptions.y + 300 > window.innerHeight ? 'translateY(-100%)' : 'translateY(0)'}
              `,
            }}
          >
            <MenuOptionsBox icon={Reply} label="Reply" />

            <MenuOptionsBox
              icon={Forward}
              label="Forward"
              onClick={() => {
                setIsSelectionMode(true);
                setActionMode('Forward');
                setSelectedMessageIds([menuOptions.messageId]);
                setMenuOptions(prev => ({ ...prev, show: false }));
              }} />

            <MenuOptionsBox
              icon={Copy}
              label="Copy"
              onClick={() => {
                const msg = messages.find(m => m._id === menuOptions.messageId);
                if (msg?.text) navigator.clipboard.writeText(msg.text);
                setMenuOptions(prev => ({ ...prev, show: false }));
              }}
            />
            <hr className="border-base-300 my-1" />

            <MenuOptionsBox
              icon={Trash}
              label="Delete"
              className="text-error hover:bg-error/10 "
              onClick={() => {
                setIsSelectionMode(true);
                setActionMode('Delete');
                setSelectedMessageIds([menuOptions.messageId]);
                setMenuOptions(prev => ({ ...prev, show: false }));
              }}
            />
          </div>
        )}

        {/* Dynamic Typing indicators */}
        {typingUsers?.includes(selectedUser._id) && (
          <div className="chat chat-start">
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img src={selectedUser.profilePic || "/avatar.png"} alt="profile pic" />
              </div>
            </div>
            <div className="chat-bubble flex items-center justify-center gap-1 w-16 h-10 mt-1 bg-base-200">
              <div className="w-2 h-2 bg-base-content/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
              <div className="w-2 h-2 bg-base-content/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
              <div className="w-2 h-2 bg-base-content/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
            </div>
          </div>
        )}

        <div ref={messageEndRef}></div>
      </div>

      {/* Floating swipe down button */}
      {isScrolledUp && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 btn btn-circle btn-sm bg-base-200 border border-base-300 shadow-xl opacity-90 hover:opacity-100 z-10 animate-bounce"
        >
          <ArrowDown size={18} />
        </button>
      )}

      {/* Bottom Swap Bar: Input or Multi-Delete Controls */}
      {isSelectionMode ? (
        <SelectionActionBar
          selectedCount={selectedMessageIds.length}
          onCancel={cancelSelectionMode}
          onExecuteAction={actionMap[actionMode]}
          actionType={actionMode}
        />
      ) : (
        <MessageInput />
      )}
    </div>
  );
};

export default ChatContainer;