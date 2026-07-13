import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  typingUsers: [], // stores array of user ids who are typing
  replyPreviewMessage: null,
  activeMenuId: null,
  isBlockedByThem: false,

  //  Modal Logic (Multi-Select) - Delete / Forward
  isModalOpen: false,
  modalType: null, // 'Delete' ya 'Forward'
  modalData: [],

  //groups
  groups: [],
  isGroupsLoading: false,
  // unread counts per conversation id (userId or groupId)
  unreadCounts: {},

  getUsers: async () => {
    //userId pass krne ka jrurt nhi hai , req.user se mil jata hai automatic                set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId, isGroup = false) => {
    set({ isMessagesLoading: true });
    try {
      const endpoint = isGroup
        ? `/groups/messages/${userId}`
        : `/messages/${userId}`;

      const res = await axiosInstance.get(endpoint); //axios.get(url)

      if (isGroup) {
        set({
          messages: res.data,
          isBlockedByThem: false, // Groups mein individual blocking trigger nahi hoti
        });
        // Clear unread for this group since user opened it
        set((state) => ({
          unreadCounts: { ...state.unreadCounts, [userId]: 0 },
        }));
      } else {
        set({
          messages: res.data.messages,
          isBlockedByThem: res.data.isBlockedByThem,
        }); //res : {message : "" , senderId : "" , receiverId : ""}
        // Clear unread for this peer conversation since user opened it
        set((state) => ({
          unreadCounts: { ...state.unreadCounts, [userId]: 0 },
        }));
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to load messages", {
        id: "message-error",
      }); //give id for 1 time only error show
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  setActiveMenuId: (menuId) => set({ activeMenuId: menuId }),

  setReplyPreviewMessage: (message) => set({ replyPreviewMessage: message }),
  clearReplyPreviewMessage: () => set({ replyPreviewMessage: null }),

  moveUserToTop: (user) => 
    set((state) => {
      if(!user?._id) return state;
      return { 
        users : [user , ...state.users.filter((u) => u._id !== user._id)] 
      };
    }),

  //it sends replied and normal messages and group msg
  sendMessage: async (messageData) => {
    //messageData - {text , image , video}
    const { selectedUser, replyPreviewMessage, messages , moveUserToTop} = get();
    try {
      const payload = {
        ...messageData,
        conversationType: selectedUser?.isGroup ? "group" : "peer",
        replyTo: replyPreviewMessage ? replyPreviewMessage._id : null, // 🔥 Append target reply reference id
      };

      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        payload,
      );

      set({ messages: [...messages, res.data], replyPreviewMessage: null });

      if (selectedUser && !selectedUser.isGroup) {
        moveUserToTop(selectedUser);
      }
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  setSelectedUser: (selectedUser) =>
    set((state) => ({
      selectedUser,
      // clear unread for opened chat/group
      unreadCounts: selectedUser
        ? { ...state.unreadCounts, [selectedUser._id]: 0 }
        : state.unreadCounts,
    })),

  // Helpers to manage unread counts
  setUnreadCounts: (counts) =>
    set({ unreadCounts: counts ? { ...counts } : {} }),

  incrementUnread: (id, by = 1) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [id]: (state.unreadCounts[id] || 0) + by,
      },
    })),

  clearUnread: (id) =>
    set((state) => ({ unreadCounts: { ...state.unreadCounts, [id]: 0 } })),

  sendStartTyping: () => {
    //sending
    const { selectedUser } = get();
    const socket = useAuthStore.getState().socket;
    if (!socket || !selectedUser) return;
    socket.emit("startTyping", { receiverId: selectedUser._id });
  },

  sendStopTyping: () => {
    const { selectedUser } = get();
    const socket = useAuthStore.getState().socket;
    if (!socket || !selectedUser) return;
    socket.emit("stopTyping", { receiverId: selectedUser._id });
  },

  //chatslice
  openModal: (type, data) =>
    set({
      //openModal - modal ka type and data ko pass krta hai
      isModalOpen: true,
      modalType: type,
      modalData: data, // here , data can [messageIds] or userId
    }),

  closeModal: () =>
    set({
      isModalOpen: false,
      modalType: null,
      modalData: [],
    }),

  deleteMessages: async (messageIds, deleteType) => {
    //messageIds - modalData ka part
    const { selectedUser, messages } = get();
    try {
      await axiosInstance.post("/messages/delete", {
        messageIds,
        deleteType, // 'me' or 'everyone' or 'forward'
        receiverId: selectedUser?._id,
      });

      if (deleteType === "me") {
        // UI se un messages ko filter out kar do instant response ke liye
        const remainingMessages = messages.filter(
          (msg) => !messageIds.includes(msg._id),
        );
        set({ messages: remainingMessages });
      } else {
        const localUpdated = messages.map((msg) =>
          messageIds.includes(msg._id)
            ? {
                ...msg,
                text: "This message was deleted",
                image: null,
                video: null,
                isDeletedEveryone: true,
              }
            : msg,
        );
        set({ messages: localUpdated });
      }

      toast.success(`Deleted for ${deleteType === "me" ? "you" : "everyone"}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete");
    }
  },

  executeDelete: async (deleteType) => {
    const { modalData, deleteMessages, closeModal } = get();
    if (modalData.length === 0) return;
    try {
      await deleteMessages(modalData, deleteType);
      closeModal();
    } catch (error) {
      console.error("Failed to delete messages via store execution:", error);
    }
  },

  executeForward: async (targetUserIds) => {
    const { modalData, messages, closeModal, selectedUser } = get();
    if (modalData.length === 0 || targetUserIds.length === 0) return;
    try {
      const messagesToForward = messages.filter((msg) =>
        modalData.includes(msg._id),
      );

      let newlyCreatedMessages = [];

      for (const targetUserId of targetUserIds) {
        for (const msg of messagesToForward) {
          const payload = {
            text: msg.text || "",
            image: msg.image || null,
            video: msg.video || null,
            conversationType: selectedUser?.isGroup ? "group" : "peer",
          };
          const res = await axiosInstance.post(
            `/messages/send/${targetUserId}`,
            payload,
          );
          // Agar forward usi user ko kiya hai jiski chat abhi khuli hai, toh isko tracking array mein dalo
          if (selectedUser && selectedUser._id === targetUserId) {
            newlyCreatedMessages.push(res.data);
          }
        }
      }

      // 🔥 STATE SYNC: Agar currently opened chat mein forward hua hai, toh instantly screen par dikhao
      if (newlyCreatedMessages.length > 0) {
        set({ messages: [...get().messages, ...newlyCreatedMessages] });
      }

      toast.success("Messages forwarded successfully!");
      closeModal();
    } catch (error) {
      console.error("Forwarding failed:", error);
      toast.error("Failed to forward messages");
    }
  },

  clearChat: async (targetUserId) => {
    try {
      const { selectedUser, messages, closeModal } = get();
      await axiosInstance.patch(`/messages/clear/${targetUserId}`);

      // Agar current open chat hi clear hui hai, toh local state se messages khali karo
      if (selectedUser?._id === targetUserId) {
        set({ messages: [] });
      }

      toast.success("Chat cleared successfully");
      closeModal();
    } catch (error) {
      console.error("Error clearing chat:", error);
      toast.error(error.response?.data?.message || "Failed to clear chat");
    }
  },

  //delete chat for user / group
  deleteChat: async () => {
    try {
      const { modalData, users, selectedUser, closeModal } = get();

      const { targetId, targetType } = modalData;

      if (targetType === "user") {
        await axiosInstance.patch(`/messages/clear/${targetId}`);

        const updatedUsers = users.filter((u) => u._id !== targetId);

        if (selectedUser?._id === targetId) {
          set({
            selectedUser: null,
            messages: [],
          });
        }

        set({
          users: updatedUsers,
        });
      }

      // future group logic
      // if(targetType==="group"){...}

      toast.success("Chat deleted successfully");
      closeModal();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete chat");
    }
  },

  blockUser: async (userId) => {
    try {
      const { closeModal } = get();
      const socket = useAuthStore.getState().socket;

      const res = await axiosInstance.patch(`/auth/block/${userId}`);
      useAuthStore.getState().setAuthUser(res.data);
      toast.success("User blocked");

      if (!socket) return;
      socket.emit("blockUserEvent", { blockedId: userId });
      closeModal();
    } catch (error) {
      toast.error("Failed to block user");
    }
  },

  unblockUser: async (userId) => {
    try {
      const { closeModal, authUser } = get();
      const socket = useAuthStore.getState().socket;

      const res = await axiosInstance.patch(`/auth/unblock/${userId}`);
      useAuthStore.getState().setAuthUser(res.data);
      toast.success("User unblocked");

      if (!socket) return;
      socket.emit("unblockUserEvent", { unblockedId: userId });
      closeModal();
    } catch (error) {
      toast.error("Failed to unblock user");
    }
  },

  togglePinChat: async (userId) => {
    try {
      const { closeModal } = get();
      const res = await axiosInstance.patch(`/messages/pin/${userId}`);
      useAuthStore.getState().setAuthUser(res.data);

      const isPinned = res.data.pinnedChats.includes(userId);
      toast.success(isPinned ? "Chat pinned" : "Chat unpinned");

      closeModal();
    } catch (error) {
      toast.error("Failed to update pin status");
    }
  },

  getMyGroups: async () => {
    set({ isGroupsLoading: true });
    try {
      const res = await axiosInstance.get("/groups/my-groups");
      set({ groups: res.data });

      //real time group formation , emit groupIds
      const socket = useAuthStore.getState().socket;
      if (socket && res.data.length > 0) {
        const groupIds = res.data.map((g) => g._id); // { [_id: "g1",name: "Developers"] , [_id: "g2", name: "Designers"]}
        socket.emit("joinGroupRooms", { groupIds });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch groups");
    } finally {
      set({ isGroupsLoading: false });
    }
  },

  createNewGroup: async (groupData) => {
    try {
      const { closeModal } = get();
      const res = await axiosInstance.post("/groups/create", groupData);
      set((state) => ({ groups: [...state.groups, res.data] }));
      toast.success("Group created successfully");

      //real time group formation , emit new group id
      const socket = useAuthStore.getState().socket;
      if (socket) {
        // socket.emit("newGroupCreated", { groupId: res.data._id }); // {_id: "g1", name: "Developers",members: [...] }
        socket.emit("newGroupCreated", {
          memberIds: groupData.memberIds, // selected user ids array
          groupData: res.data, // populated group document from backend
        });
      }
      closeModal();
    } catch (error) {
      console.log("Error creating group:", error);
      toast.error(error.response?.data?.message || "Failed to create group");
    }
  },

  subscribeToMessages: () => {
    //Receiveing
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on("displayTyping", ({ senderId }) => {
      set((state) => ({
        typingUsers: [...new Set([...state.typingUsers, senderId])],
      }));
    });

    socket.on("hideTyping", ({ senderId }) => {
      set((state) => ({
        typingUsers: state.typingUsers.filter((id) => id !== senderId),
      }));
    });

    socket.on("userBlocked", ({ blockedById }) => {
      const { selectedUser } = get();

      if (blockedById === selectedUser?._id) {
        set({ isBlockedByThem: true });
      }
    });

    socket.on("messagesDeletedEveryone", (deletedMessageIds) => {
      const liveUpdate = get().messages.map((msg) =>
        deletedMessageIds.includes(msg._id)
          ? {
              ...msg,
              text: "This message was deleted",
              image: null,
              video: null,
              isDeletedEveryone: true,
            }
          : msg,
      );
      set({ messages: liveUpdate });
    });
  },

  subscribeToConversationNotifications: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newMessage");
    socket.off("newGroupMessage");

    socket.on("newMessage", (newMessage) => {
      const { selectedUser, messages , users} = get();
      const senderId = newMessage.senderId?._id || newMessage.senderId;
      const isActivePeerChat =
        selectedUser && !selectedUser.isGroup && selectedUser._id === senderId;

      if (isActivePeerChat) {
        set({ messages: [...messages, newMessage] });
        get().clearUnread(senderId);
        return;
      }

      get().incrementUnread(senderId);

      if(newMessage.senderId && typeof newMessage.senderId === "object"){
        set((state) => {
          users : [newMessage.senderId , ...state.users.filter((u) => u._id !== newMessage.senderId._id)]
        })
      }
    });

    socket.on("newGroupMessage", ({ message, groupId }) => {
      const { selectedUser, messages } = get();
      const authUserId = useAuthStore.getState().authUser?._id;
      const incomingSenderId = message.senderId?._id || message.senderId;
      const isOpenGroupChat =
        selectedUser?.isGroup && selectedUser._id === groupId;

      if (isOpenGroupChat && incomingSenderId !== authUserId) {
        set({ messages: [...messages, message] });
        get().clearUnread(groupId);
        return;
      }

      if (incomingSenderId !== authUserId) {
        get().incrementUnread(groupId);
      }
    });

    socket.on("messagesDeletedEveryone", (deletedMessageIds) => {
      const liveUpdate = get().messages.map((msg) =>
        deletedMessageIds.includes(msg._id)
          ? {
              ...msg,
              text: "This message was deleted",
              image: null,
              video: null,
              isDeletedEveryone: true,
            }
          : msg,
      );
      set({ messages: liveUpdate });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("displayTyping");
    socket.off("hideTyping");
    socket.off("messagesDeletedEveryone");
    socket.off("userBlocked");
    socket.off("userUnblocked");
  },

  unsubscribeFromConversationNotifications: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newMessage");
    socket.off("newGroupMessage");
  },

  subscribeToGroupUpdates: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("addNewGroupToSidebar");
    socket.on("addNewGroupToSidebar", (groupData) => {
      if (!groupData || !groupData._id) return;

      const { groups } = get();
      const isAlreadyAdded = groups.some((g) => g._id === groupData._id);

      if (!isAlreadyAdded) {
        set({ groups: [...groups, groupData] });
      }
    });
  },

  unsubscribeFromGroupUpdates: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    socket.off("addNewGroupToSidebar");
  },

  unsubscribeFromGroupMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    socket.off("newGroupMessage");
  },
}));
