import React, { useEffect } from "react";
import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import { useChatStore } from "../store/useChatStore";
import ChatContainer from "../components/ChatContainer";

// Calling Components aur Store
import CallNotification from "../components/CallNotification";
import VideoContainer from "../components/VideoContainer";
import OutgoingCallContainer from "../components/OutgoingCallContainer";
import { useCallStore } from "../store/useCallStore";
import { useAuthStore } from "../store/useAuthStore";
import ConfirmationModal from "../components/ConfirmationModal";
import ForwardModal from "../components/ForwardModal";
import GroupDetailsModal from "../components/GroupDetailsModal";
import GroupInfoModal from "../components/GroupInfoModal";

const HomePage = () => {
  const {
    selectedUser,
    isModalOpen,
    modalType,
    modalData, // user id jisko - delete , clear ya forward krna hai
    closeModal,
    executeDelete,
    executeForward,
    clearChat,
    deleteChat,
    blockUser,
    unblockUser,
    deleteGroup,
    leaveGroup
  } = useChatStore();

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

  //sara alag alag modal hai jiska ui similar h(confirmationModal jesa) jha type ke help se modal select kr rhe
  const modalConfig = {
    Delete: {  // openModal(type = Delete , )
      title: "Delete message?",
      confirmText: "Delete for me",
      actionType: "delete",
      showDeleteEveryone: true,
      onConfirmMe: () => executeDelete("me"),
      onConfirmEveryone: () => executeDelete("everyone"),
    },
    Forward: {
      title: "Forward message?",
      confirmText: "Forward",
      actionType: "primary",
      showDeleteEveryone: false,
      onConfirmMe: () => executeForward(modalData), // 
      onConfirmEveryone: null,
    },
    ClearChat: {
      title: "Clear this chat?",
      confirmText: "Clear chat",
      actionType: "Delete",
      showDeleteEveryone: false,
      onConfirmMe: () =>  clearChat(modalData),
      onConfirmEveryone: null,
    },
    DeleteChat: {
      title: "Delete this entire chat?",
      confirmText: "Delete chat",
      actionType: "Delete",
      showDeleteEveryone: false,
      onConfirmMe: () => deleteChat(),
      onConfirmEveryone: null,
    },
    Block: {
      title: "Block this user?",
      confirmText: "Block",
      actionType: "Delete", // Red color button ke liye
      showDeleteEveryone: false,
      onConfirmMe: () => { blockUser(modalData); },
      onConfirmEveryone: null
    },
    Unblock: {
      title: "Unblock this user?",
      confirmText: "Unblock",
      actionType: "primary", // Red color button ke liye
      showDeleteEveryone: false,
      onConfirmMe: () => { unblockUser(modalData); },
      onConfirmEveryone: null
    },
    DeleteGroup: {
      title: "Delete this group? This will permanently delete the group and all its messages.",
      confirmText: "Delete Group",
      actionType: "Delete",
      showDeleteEveryone: false,
      onConfirmMe: () => deleteGroup(modalData),
      onConfirmEveryone: null
    },
    LeaveGroup: {
      title: "Are you sure you want to leave this group?",
      confirmText: "Leave Group",
      actionType: "Delete",
      showDeleteEveryone: false,
      onConfirmMe: () => leaveGroup(modalData),
      onConfirmEveryone: null
    }
  };

  const currentConfig = modalConfig[modalType] || {};

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

      {isModalOpen && (
        <ConfirmationModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onConfirmMe={currentConfig.onConfirmMe}
          title={currentConfig.title}
          confirmText={currentConfig.confirmText}
          actionType={currentConfig.actionType}
          showDeleteEveryone={currentConfig.showDeleteEveryone}
          onConfirmEveryone={currentConfig.onConfirmEveryone}
        />
      )}

      <ForwardModal />
      {isModalOpen && modalType === "GroupDetails" && <GroupDetailsModal />}
      {isModalOpen && modalType === "GroupInfo" && <GroupInfoModal />}
    </div>
  );
};

export default HomePage;
