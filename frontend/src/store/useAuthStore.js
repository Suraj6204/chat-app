import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5001" : "/";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  isVerifyingEmail: false,
  tempEmail: null,
  onlineUsers: [],
  socket: null,
  isUsernameLoading: false,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data, tempEmail: res.data?.email });
      get().connectSocket();  //connect socket after authentication
    } catch (error) {
      console.log("Error in checkAuth:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data, tempEmail: res.data.email });
      
      // Auto-send OTP
      await axiosInstance.post("/auth/send-otp", { email: res.data.email });
      toast.success("Account created successfully. Please verify your email.");
      get().connectSocket(); 
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data, tempEmail: res.data.email });
      
      if (!res.data.isVerified) {
        await axiosInstance.post("/auth/send-otp", { email: res.data.email });
        toast.success("Please verify your email.");
      } else {
        toast.success("Logged in successfully");
      }
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Invalid credentials");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("error in update profile:", error);
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;

    const socket = io(BASE_URL, {
      query: {
        userId: authUser._id,
      },
    });
    socket.connect();

    set({ socket: socket });

    //socket.on calls io.emit of backend
    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });
  },

  disconnectSocket: () => {
    if (get().socket?.connected) get().socket.disconnect();
  },

  verifyEmail: async (otp) => {
    set({ isVerifyingEmail: true });
    try {
      const email = get().tempEmail || get().authUser?.email; 
      const res = await axiosInstance.post("/auth/verify-email", { email, otp });
      
      toast.success("Email verified!");
      set({ tempEmail: null }); 
      // Update checkAuth since DB is updated
      await get().checkAuth();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Verification failed");
      return false;
    } finally {
      set({ isVerifyingEmail: false });
    }
  },

  resendOTP: async () => {
    try {
      const email = get().tempEmail || get().authUser?.email;
      if (!email) return toast.error("Email not found. Please signup again.");
      
      const res = await axiosInstance.post("/auth/send-otp", { email });
      toast.success("New OTP sent to your email!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to resend OTP");
    }
  },

  setTempEmail: (email) => set({ tempEmail: email }),
  
  setAuthUser: (user) => set({ authUser: user }),

  checkUsernameAvailability: async (username) => {
    set({ isUsernameLoading: true });

    try{
      const res = await axiosInstance.get(`/auth/check-username/${encodeURIComponent(username)}`);
      return res.data;
    }catch(error){
      return error.response?.data || {
        available: false,
        message: "Something went wrong",
      };
    }finally {
      set({ isUsernameLoading: false });
    }
  },

  updateUsername: async (username) => {
    set({ isUsernameLoading: true });

    try {
      const res = await axiosInstance.patch("/auth/update-username", {
        username,
      });

      set({ authUser: res.data });
      toast.success("Username updated successfully");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update username");
      return null;
    } finally {
      set({ isUsernameLoading: false });
    }
  },

  searchUserByUsername: async (username) =>{
    set({ isUsernameLoading: true });

    try {
      const res = await axiosInstance.get(
        `/auth/search-user?username=${encodeURIComponent(username)}`
      );

      return res.data;
    } catch (error) {
      return error.response?.data || null;
    } finally {
      set({ isUsernameLoading: false });
    }
  },
}));