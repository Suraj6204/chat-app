import { useCallStore } from "../store/useCallStore";
import { useChatStore } from "../store/useChatStore";
import { PhoneOff, Video, Phone } from "lucide-react";

const OutgoingCallContainer = () => {
  const { callAccepted, callEnded, stream, leaveCall, callType } = useCallStore();
  const { selectedUser } = useChatStore();

  // Agar call start ho gayi hai (stream hai) par accept nahi hui aur end bhi nahi hui
  const isCalling = stream && !callAccepted && !callEnded;

  if (!isCalling) return null;

  return (
    <div className="fixed inset-0 z-[998] flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="bg-base-200 w-80 p-8 rounded-3xl shadow-2xl border border-primary/20 flex flex-col items-center animate-in fade-in zoom-in duration-300">
        
        {/* Profile Pic with Pulsing Effect */}
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20"></div>
          <div className="avatar">
            <div className="w-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
              <img src={selectedUser?.profilePic || "/avatar.png"} alt="calling" />
            </div>
          </div>
        </div>

        <h2 className="text-xl font-bold text-base-content mb-1">
          {selectedUser?.fullName}
        </h2>
        <p className="text-primary font-medium animate-pulse mb-8 flex items-center gap-2">
          {callType === "video" ? <Video size={16}/> : <Phone size={16}/>}
          Calling...
        </p>

        {/* Cancel Button */}
        <button 
          onClick={() => leaveCall(false)}
          className="btn btn-circle btn-error btn-lg shadow-lg hover:scale-110 transition-transform"
        >
          <PhoneOff size={28} />
        </button>
      </div>
    </div>
  );
};

export default OutgoingCallContainer;