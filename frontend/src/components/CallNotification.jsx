import { useCallStore } from "../store/useCallStore";
import { Phone, PhoneOff, Video } from "lucide-react";

const CallNotification = () => {
  const { call, answerCall, leaveCall, callAccepted } = useCallStore();

  // Agar call receive ho rahi hai aur abhi uthayi nahi gayi
  if (!call.isReceivingCall || callAccepted) return null;

  return (
    <div className="fixed top-20 right-4 z-[1000]">
      <div className="card w-64 bg-base-100 shadow-2xl border-2 border-primary p-4">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="avatar online">
            <div className="w-16 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
              <img src="/avatar.png" alt="caller" />
            </div>
          </div>
          
          <div>
            <h3 className="font-bold text-lg">{call.name}</h3>
            <p className="text-sm opacity-70 flex items-center justify-center gap-2">
              {call.type === "video" ? <Video size={14}/> : <Phone size={14}/>}
              Incoming {call.type} call...
            </p>
          </div>

          <div className="flex gap-4 mt-2">
            <button onClick={answerCall} className="btn btn-circle btn-success btn-sm shadow-lg">
              <Phone size={18} />
            </button>
            <button onClick={() => leaveCall(false)} className="btn btn-circle btn-error btn-sm shadow-lg">
              <PhoneOff size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallNotification;