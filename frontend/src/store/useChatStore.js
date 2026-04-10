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
        }catch(error){
            toast.error(error.response.data.message);
        }finally{
            set({ isMessagesLoading: false });
        }
    },

    sendMessage: async(messageData) => { //messageData - {text , image}
        const { selectedUser, messages } = get();
        try{
            //axios.post(url , data)
            const res = await axiosInstance.post(`/messages/send/${selectedUser._id}` , messageData);
            set({messages: [...messages ,res.data]});
        }catch(error){
            toast.error(error.response.data.message);
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
    },

    unsubscribeFromMessages: () => {
        const socket = useAuthStore.getState().socket;
        socket.off("newMessage");
        socket.off("displayTyping");
        socket.off("hideTyping");
    },

    setSelectedUser: (selectedUser) => set({ selectedUser }),

    // 
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
}));


