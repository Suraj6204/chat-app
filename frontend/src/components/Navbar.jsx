import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useThemeStore } from "../store/useThemeStore";
import { LogOut, MessageSquare, Menu, Palette, Moon, Sun, ChevronDown, User, Settings } from "lucide-react";

const Navbar = () => {
  const { logout, authUser } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Consider "light" as the light mode, anything else as dark (e.g., "coffee")
  const isDark = theme !== "light";

  const closeDrawer = () => {
    const drawer = document.getElementById("my-drawer");
    if (drawer) drawer.checked = false;
  };

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "coffee");
  };

  const handleLogout = () => {
    logout();
    closeDrawer();
  };

  return (
    <div className="drawer z-50">
      <input id="my-drawer" type="checkbox" className="drawer-toggle" />
      
      {/* Side Drawer */}
      <div className="drawer-side z-[100]">
        <label htmlFor="my-drawer" aria-label="close sidebar" className="drawer-overlay"></label> 
        <div className="menu p-0 w-[300px] min-h-full bg-base-200 text-base-content flex flex-col shadow-2xl">
          
          {authUser && (
            <>
              {/* Profile Header section */}
              <div className="bg-base-300 p-6 flex flex-col gap-4 relative">
                <div className="flex items-center justify-between">
                  <div className="size-[60px] rounded-full bg-primary flex items-center justify-center overflow-hidden text-primary-content">
                    {authUser.profilePic ? (
                      <img src={authUser.profilePic} alt="profile" className="object-cover w-full h-full" />
                    ) : (
                      <span className="text-2xl font-bold uppercase">
                        {authUser.fullName ? authUser.fullName.charAt(0) : "U"}
                      </span>
                    )}
                  </div>
                </div>
                
                <div 
                  className="flex items-center justify-between cursor-pointer hover:bg-base-200/50 p-2 -mx-2 rounded-lg transition-colors"
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                >
                  <div className="flex flex-col select-none">
                    <span className="font-semibold text-[15px]">{authUser.fullName || "User"}</span>
                    <span className="text-[13px] text-base-content/70">Set Emoji Status</span>
                  </div>
                  <ChevronDown className={`size-5 text-base-content/70 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
                </div>
                
                {/* Collapsible Profile & Logout Menu */}
                <div 
                  className={`flex flex-col overflow-hidden transition-all duration-300 ease-in-out -mx-2 bg-base-100 rounded-lg mt-1 ${
                    isProfileOpen ? 'max-h-40 opacity-100 border border-base-300' : 'max-h-0 opacity-0'
                  }`}
                >
                   <Link 
                     to="/profile" 
                     onClick={closeDrawer}
                     className="px-4 py-3 hover:bg-base-200 flex items-center gap-3 transition-colors"
                   >
                     <User className="size-[18px] text-base-content/80" />
                     <span className="font-medium text-[14px]">My Profile</span>
                   </Link>
                   <button 
                     onClick={handleLogout}
                     className="px-4 py-3 hover:bg-base-200 flex items-center gap-3 text-error transition-colors text-left"
                   >
                     <LogOut className="size-[18px]" />
                     <span className="font-medium text-[14px]">Logout</span>
                   </button>
                </div>
              </div>

              {/* Main Menu Links */}
              <ul className="flex flex-col flex-1 py-2 text-[15px] font-medium">
                <li>
                  <Link 
                    to="/" 
                    onClick={closeDrawer}
                    className="px-6 py-3 hover:bg-base-300/50 rounded-none flex items-center gap-5 transition-colors"
                  >
                    <MessageSquare className="size-[22px] text-base-content/60" />
                    Chat
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/settings" 
                    onClick={closeDrawer}
                    className="px-6 py-3 hover:bg-base-300/50 rounded-none flex items-center gap-5 transition-colors"
                  >
                    <Palette className="size-[22px] text-base-content/60" />
                    Themes
                  </Link>
                </li>
                
                <div className="h-[1px] bg-base-300 w-full my-2"></div>
                
                <li>
                  <button 
                    onClick={toggleTheme}
                    className="px-6 py-3 hover:bg-base-300/50 rounded-none flex items-center justify-between w-full transition-colors"
                  >
                    <div className="flex items-center gap-5">
                      {isDark ? <Moon className="size-[22px] text-base-content/60" /> : <Sun className="size-[22px] text-base-content/60" />}
                      <span>Night Mode</span>
                    </div>
                    <div className="form-control">
                      <input 
                        type="checkbox" 
                        className="toggle toggle-sm toggle-primary pointer-events-none" 
                        checked={isDark} 
                        readOnly 
                      />
                    </div>
                  </button>
                </li>
              </ul>
            </>
          )}

          {!authUser && (
            <div className="flex-1 flex flex-col justify-center items-center gap-4 p-4 text-center">
               <MessageSquare className="size-12 text-primary opacity-50 mb-2" />
               <h2 className="text-xl font-bold">Welcome to Chatty!</h2>
               <p className="text-sm opacity-70">Login to join the conversation.</p>
               <Link to="/login" onClick={closeDrawer} className="btn btn-primary w-full mt-4">Login to Chat</Link>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
};

export default Navbar;