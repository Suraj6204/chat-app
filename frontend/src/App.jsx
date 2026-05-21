import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';

import { useThemeStore } from "./store/useThemeStore";
import { useAuthStore } from "./store/useAuthStore";
import { useEffect } from "react";
import { Loader } from "lucide-react";
import { Navigate } from "react-router-dom";

import { Toaster } from "react-hot-toast";
import { Routes, Route } from "react-router-dom";
import HomePage from './pages/HomePage';
import Navbar from './components/Navbar';
import EmailVerify from './pages/EmailVerify';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';

const App = () => {
  const { authUser, checkAuth, isCheckingAuth, onlineUsers } = useAuthStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // console.log("Online users:", onlineUsers);

  if (isCheckingAuth && !authUser)
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size-10 animate-spin" />
      </div>
    );

  return (
    <div data-theme={theme} className="min-h-screen transition-all duration-300">
      <Navbar />

      <Routes>
        <Route path="/" element={authUser ? (authUser.isVerified ? <HomePage /> : <Navigate to="/verify-email" />) : <Navigate to="/login" />} />
        <Route path="/signup" element={!authUser ? <SignUpPage /> : (authUser.isVerified ? <Navigate to="/" /> : <Navigate to="/verify-email" />)} />
        <Route path="/login" element={!authUser ? <LoginPage /> : (authUser.isVerified ? <Navigate to="/" /> : <Navigate to="/verify-email" />)} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={authUser ? <ProfilePage /> : <Navigate to="/login" />} />
        <Route path="/verify-email" element={authUser && !authUser.isVerified ? <EmailVerify /> : <Navigate to="/" />} />
      </Routes>

      <Toaster />
    </div>
  )
}

export default App