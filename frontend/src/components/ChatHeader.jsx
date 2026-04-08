import { X, Phone, Video, ChevronDown } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import toast from "react-hot-toast";
import { useCallStore } from "../store/useCallStore";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const isOnline = onlineUsers.includes(selectedUser._id);

  const { callUser } = useCallStore();
  const { authUser } = useAuthStore();
  const handleCallInit = (type) => {
    if (!isOnline) {
      return toast.error(`${selectedUser.fullName} is offline.`);
    }
    console.log(`Starting ${type} call with ${selectedUser.fullName}...`);
    callUser(selectedUser._id, type, authUser.fullName);
  };

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        {/* Left side: User Info */}
        <div className="flex items-center gap-3">
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.fullName} />
              {/* Online Indicator Dot */}
              {isOnline && (
                <span className="absolute bottom-0 right-0 size-3 bg-green-500 border-2 border-base-100 rounded-full" />
              )}
            </div>
          </div>

          <div>
            <h3 className="font-medium">{selectedUser.fullName}</h3>
            <p className="text-sm text-base-content/70">
              {isOnline ? "Online" : "Offline"}
            </p>
          </div>
        </div>

        {/* Right side: Actions */}
        <div className="flex items-center gap-4">
          {/* Audio/Video Call Dropdown */}
          <div className="dropdown dropdown-end">
            <label tabIndex={0} className="btn btn-ghost btn-sm btn-circle">
              <Phone size={20} className={isOnline ? "text-primary" : "text-base-content/40"} />
            </label>
            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow-lg bg-base-200 rounded-box w-44 mt-2 border border-base-300">
              <li>
                <button 
                  className="flex items-center gap-3 py-3"
                  onClick={() => handleCallInit("video")}
                >
                  <Video size={18} className="text-success" />
                  <span className="font-medium">Video Call</span>
                </button>
              </li>
              <li>
                <button 
                  className="flex items-center gap-3 py-3"
                  onClick={() => handleCallInit("audio")}
                >
                  <Phone size={18} className="text-info" />
                  <span className="font-medium">Audio Call</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Close Chat button */}
          <button 
            className="btn btn-ghost btn-sm btn-circle" 
            onClick={() => setSelectedUser(null)}
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
const handleCallInit = (type) => {
    if (!isOnline) {
      return toast.error(`${selectedUser.fullName} is offline. Call can only be made when user is online.`);
    }
    
    // Agar online hai toh Phase 3 wala calling logic yahan aayega
    console.log(`Starting ${type} call with ${selectedUser.fullName}...`);
    // callUser(selectedUser._id, type); 
  };
export default ChatHeader;