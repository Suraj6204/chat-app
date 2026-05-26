import React, { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  Ban,
  Copy,
  Forward,
  Info,
  Reply,
  Trash,
  X,
} from "lucide-react";
import ChatHeader from "./ChatHeader";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { formatMessageTime } from "../lib/utils";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import MenuOptionsBox from "./MenuOptionsBox";
import SelectionActionBar from "./SelectionActionBar";

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
    setReplyPreviewMessage,
    activeMenuId,
    setActiveMenuId,
    unblockUser,
    isBlockedByThem,
  } = useChatStore();

  const { authUser, setAuthUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [menuOptions, setMenuOptions] = useState({
    show: false,
    x: 0,
    y: 0,
    messageId: null,
  });

  // Selection Mode States
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [actionMode, setActionMode] = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        scrollContainerRef.current;
      setIsScrolledUp(scrollHeight - scrollTop - clientHeight > 100);
    }
  };

  const handleScrollToParentMessage = (parentMessageId) => {
    const targetElement = document.getElementById(`msg-${parentMessageId}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "center" });

      setHighlightedMessageId(parentMessageId);

      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 2000);
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
    setActiveMenuId("chat");
  };

  // Checkbox select/deselect handling
  const handleToggleSelect = (messageId) => {
    setSelectedMessageIds((prev) =>
      prev.includes(messageId)
        ? prev.filter((id) => id !== messageId)
        : [...prev, messageId],
    );
  };

  // selected message delete in bulk
  const handleDeleteSelected = async () => {
    if (selectedMessageIds.length === 0) return;
    openModal("Delete", selectedMessageIds);
    cancelSelectionMode();
  };

  //TODO : forward messages to other chats.
  const handleForwardSelected = () => {
    if (selectedMessageIds.length === 0) return;
    openModal("Forward", selectedMessageIds);
    cancelSelectionMode();
  };

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

  //Block user logic
  //mene jisko block kiya h (unblock option)
  const isBlockedByMe = authUser?.blockedUsers?.some(
    (id) => id.toString() === selectedUser?._id.toString(), //blockeduser:[objectId] and selectedUser.id:(string) - convert both in string to match
  );

  //isBlockedByThem -   //me jisse blocked hua hu (you are blocked)
  // isko hmesa backend se lo , taki user ko pata na chale samne wala ar kis kis ko block kiya h

  const isBlocked = isBlockedByMe || isBlockedByThem; 
  useEffect(() => {
    const handleClickOnOutside = () => {
      setMenuOptions((prev) => ({ ...prev, show: false }));
    };
    window.addEventListener("click", handleClickOnOutside);
    return () => window.removeEventListener("click", handleClickOnOutside);
  }, []);

  useEffect(() => {
    getMessages(selectedUser._id);
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [
    selectedUser._id,
    getMessages,
    subscribeToMessages,
    unsubscribeFromMessages,
    authUser
  ]);

  useEffect(() => {
    const lastMessage = messages?.[messages.length - 1];
    const isMyMessage = lastMessage?.senderId === authUser._id;

    if (!isScrolledUp || isMyMessage) {
      scrollToBottom();
    }
  }, [messages, typingUsers, authUser._id]);

  useEffect(() => {
    if (activeMenuId != "chat") {
      setMenuOptions((prev) => ({ ...prev, show: false }));
    }
  }, [activeMenuId]);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
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
            id={`msg-${message._id}`}
            className={`flex items-center relative group w-full transition-all duration-300 rounded-lg ${
              highlightedMessageId === message._id
                ? "bg-primary/20 ring-2 ring-primary/50 py-2"
                : isSelectionMode
                  ? selectedMessageIds.includes(message._id)
                    ? message.isDeletedEveryone
                      ? "bg-base-300/70"
                      : "bg-base-200 cursor-pointer"
                    : "hover:bg-base-200 cursor-pointer"
                  : "hover:bg-base-200/30"
            }`}
            onClick={() =>
              isSelectionMode &&
              !message.isDeletedEveryone &&
              handleToggleSelect(message._id)
            }
          >
            {/* Left Multi-select Checkbox Element */}
            {isSelectionMode && !message.isDeletedEveryone && (
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
            <div
              className={`chat flex-1 ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
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
                    {message.replyTo && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleScrollToParentMessage(message.replyTo._id);
                        }}
                        className={`mb-2 p-2 rounded-lg border-l-4 text-xs cursor-pointer transition-all flex flex-col gap-0.5 max-w-full select-none ${
                          message.senderId === authUser._id
                            ? "bg-primary-focus/30 border-white text-white/90 hover:bg-primary-focus/45"
                            : "bg-base-300/60 border-primary text-base-content/90 hover:bg-base-300/90"
                        }`}
                      >
                        <span
                          className={`font-semibold ${
                            message.senderId === authUser._id
                              ? "text-white"
                              : "text-primary"
                          }`}
                        >
                          {message.replyTo.senderId === authUser._id
                            ? "You"
                            : selectedUser?.fullName || "User"}
                        </span>
                        <span className="opacity-80 truncate block">
                          {message.replyTo.text
                            ? message.replyTo.text
                            : message.replyTo.image
                              ? "📷 Photo"
                              : message.replyTo.video
                                ? "🎥 Video"
                                : "Attachment"}
                        </span>
                      </div>
                    )}
                    {message.image && (
                      <img
                        src={message.image}
                        alt="Attachment"
                        className="sm:max-w-5 rounded-md mb-2"
                      />
                    )}
                    {message.video && (
                      <video
                        src={message.video}
                        controls
                        className="sm:max-w-50 rounded-md mb-2"
                      />
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
                ${menuOptions.x + 224 > window.innerWidth ? "translateX(-100%)" : "translateX(0)"} 
                ${menuOptions.y + 300 > window.innerHeight ? "translateY(-100%)" : "translateY(0)"}
              `,
            }}
          >
            <MenuOptionsBox
              icon={Reply}
              label="Reply"
              onClick={() => {
                const msg = messages.find(
                  (m) => m._id === menuOptions.messageId,
                );
                if (msg) setReplyPreviewMessage(msg);
                setMenuOptions((prev) => ({ ...prev, show: false }));
              }}
            />

            <MenuOptionsBox
              icon={Forward}
              label="Forward"
              onClick={() => {
                setIsSelectionMode(true);
                setActionMode("Forward");
                setSelectedMessageIds([menuOptions.messageId]);
                setMenuOptions((prev) => ({ ...prev, show: false }));
              }}
            />

            <MenuOptionsBox
              icon={Copy}
              label="Copy"
              onClick={() => {
                const msg = messages.find(
                  (m) => m._id === menuOptions.messageId,
                );
                if (msg?.text) navigator.clipboard.writeText(msg.text);
                setMenuOptions((prev) => ({ ...prev, show: false }));
              }}
            />
            <hr className="border-base-300 my-1" />

            <MenuOptionsBox
              icon={Trash}
              label="Delete"
              className="text-error hover:bg-error/10 "
              onClick={() => {
                setIsSelectionMode(true);
                setActionMode("Delete");
                setSelectedMessageIds([menuOptions.messageId]);
                setMenuOptions((prev) => ({ ...prev, show: false }));
              }}
            />
          </div>
        )}

        {/* Dynamic Typing indicators */}
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
              <div
                className="w-2 h-2 bg-base-content/60 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              ></div>
              <div
                className="w-2 h-2 bg-base-content/60 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              ></div>
              <div
                className="w-2 h-2 bg-base-content/60 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              ></div>
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
      {isBlocked ? (
        <div className="flex flex-col items-center justify-center p-6 bg-base-200 border-t border-base-300 gap-3">
          {isBlockedByMe ? (
            <>
              <div className="flex gap-4">
                <button
                  onClick={() => openModal("DeleteChat", selectedUser._id)}
                  className="btn btn-md text-error hover:bg-error hover:text-error-content border border-error rounded-full"
                >
                  <Trash size={22} />
                  <span>Delete Chat</span>
                </button>

                <button
                  onClick={() => openModal("Unblock", selectedUser._id)}
                  className="btn btn-md text-success border border-success hover:bg-success hover:text-success-content rounded-full"
                >
                  <Ban size={22} />
                  <span>Unblock</span>
                </button>
              </div>
            </>
          ) : isBlockedByThem ? (
            <div className="flex items-center gap-2 text-error font-semibold bg-error/10 px-6 py-3 rounded-xl border border-error/20">
              <Ban size={18} />
              <span>You are blocked!</span>
            </div>
          ) : null
          }
        </div>
      ) : isSelectionMode ? (
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
