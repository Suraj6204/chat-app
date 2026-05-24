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
      actionType: "delete",
      showDeleteEveryone: false,
      onConfirmMe: () =>  clearChat(modalData),
      onConfirmEveryone: null,
    },
    DeleteChat: {
      title: "Delete this entire chat?",
      confirmText: "Delete chat",
      actionType: "delete",
      showDeleteEveryone: false,
      onConfirmMe: () => deleteChat(),
      onConfirmEveryone: null,
    },
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
    </div>
  );
};

export default HomePage;
