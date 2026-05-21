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
    replyPreviewMessage:null,

    //  Modal Logic (Multi-Select) - Delete / Forward
    isModalOpen: false,
    modalType: null,        // 'Delete' ya 'Forward'
    modalMessageIds: [],

    getUsers: async () => { //userId pass krne ka jrurt nhi hai , req.user se mil jata hai automatic                set({ isUsersLoading: true });
        try{
            const res = await axiosInstance.get("/messages/users");
            set({users : res.data })
        }
        catch (error) {
            toast.error(error.response.data.message);
        } 
        finally {
            set({ isUsersLoading: false });
        }
    },

    getMessages: async (userId) => {
        set({ isMessagesLoading: true });
        try{
            //axios.get(url)
            const res = await axiosInstance.get(`/messages/${userId}`);
            set({messages : res.data});
            //res : {message : "" , senderId : "" , receiverId : ""}
        }catch(error){
            toast.error(error.response.data.message);
        }finally{
            set({ isMessagesLoading: false });
        }
    },

    setReplyPreviewMessage: (message) => set({ replyPreviewMessage: message }),
    clearReplyPreviewMessage: () => set({ replyPreviewMessage: null }),

    //it sends replied and normal messages
    sendMessage: async(messageData) => { //messageData - {text , image , video}
        const { selectedUser,replyPreviewMessage , messages } = get();
        try{
            const payload = {
                ...messageData,
                replyTo: replyPreviewMessage ? replyPreviewMessage._id : null // 🔥 Append target reply reference id
            };
            const res = await axiosInstance.post(`/messages/send/${selectedUser._id}` , payload);

            set({messages: [...messages , res.data] , replyPreviewMessage: null});
        }catch(error){
            toast.error(error.response.data.message);
        }
    },
    
    setSelectedUser: (selectedUser) => set({ selectedUser }),

    sendStartTyping: () => { //sending 
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
    openModal: (type, messageIds) => set({ 
        isModalOpen: true, 
        modalType: type, 
        modalMessageIds: messageIds 
    }),
    
    closeModal: () => set({ 
        isModalOpen: false, 
        modalType: null, 
        modalMessageIds: [] 
    }),
    
    deleteMessages: async (messageIds, deleteType) => {
        const { selectedUser, messages } = get();
        try {
            await axiosInstance.post("/messages/delete", {
                messageIds,
                deleteType, // 'me' or 'everyone' or 'forward'
                receiverId: selectedUser?._id
            });

            if(deleteType === "me") {
                // UI se un messages ko filter out kar do instant response ke liye
                const remainingMessages = messages.filter(msg => !messageIds.includes(msg._id));
                set({ messages: remainingMessages });
            }
            else{
                const localUpdated = messages.map(msg => 
                    messageIds.includes(msg._id)
                    ? {...msg , text: "This message was deleted" , image: null , video: null, isDeletedEveryone: true}
                    : msg
                );
                set({ messages: localUpdated });
            }
            
            toast.success(`Deleted for ${deleteType === 'me' ? 'you' : 'everyone'}`);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to delete");
        }
    },

    executeDelete: async (deleteType) => {
        const { modalMessageIds, deleteMessages, closeModal } = get();
        if (modalMessageIds.length === 0) return;
        try {
            await deleteMessages(modalMessageIds , deleteType ); 
            closeModal(); 
        } catch (error) {
            console.error("Failed to delete messages via store execution:", error);
        }
    },
    
    executeForward: async (targetUserIds) => {
        const { modalMessageIds, messages , closeModal, selectedUser } = get();
        if (modalMessageIds.length === 0 || targetUserIds.length === 0) return;
        try{
            const messagesToForward = messages.filter(msg => modalMessageIds.includes(msg._id));

            let newlyCreatedMessages = [];
            
            for (const targetUserId of targetUserIds) {
                for (const msg of messagesToForward) {
                    const payload = {
                        text: msg.text || "",
                        image: msg.image || null,
                        video: msg.video || null,
                    };
                    const res = await axiosInstance.post(`/messages/send/${targetUserId}`, payload);
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
        }catch(error){
            console.error("Forwarding failed:", error);
            toast.error("Failed to forward messages");
        }
        
    },

    subscribeToMessages: () => { //Receiveing 
        const { selectedUser } = get();
        if (!selectedUser) return;
    
        const socket = useAuthStore.getState().socket;
    
        socket.on("newMessage", (newMessage) => {
        const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
        if (!isMessageSentFromSelectedUser) return;
    
        set({
            messages: [...get().messages, newMessage],
        });
        });
    
        socket.on("displayTyping", ({ senderId }) => {
            set((state) => ({
                typingUsers: [...new Set([...state.typingUsers, senderId])]
            }));
        });
    
        socket.on("hideTyping", ({ senderId }) => {
            set((state) => ({
                typingUsers: state.typingUsers.filter((id) => id !== senderId)
            }));
        });

        socket.on("messagesDeletedEveryone", (deletedMessageIds) => {
            const liveUpdate = get().messages.map(msg => 
                deletedMessageIds.includes(msg._id)
                    ? {...msg , text: "This message was deleted" , image: null , video: null, isDeletedEveryone: true}
                    : msg
            );
            set({ messages: liveUpdate });
        });
    },
    
    unsubscribeFromMessages: () => {
        const socket = useAuthStore.getState().socket;
        socket.off("newMessage");
        socket.off("displayTyping");
        socket.off("hideTyping");
        socket.off("messagesDeletedEveryone");
    },
    
}));


