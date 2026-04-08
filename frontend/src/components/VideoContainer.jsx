import { useEffect, useRef } from "react";
import { useCallStore } from "../store/useCallStore";
import { PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";

const VideoContainer = () => {
  const { stream, userStream, callAccepted, callEnded, leaveCall, callType } = useCallStore();
  const myVideo = useRef();
  const userVideo = useRef();

  // Local Stream set karna
  useEffect(() => {
    if (stream && myVideo.current) myVideo.current.srcObject = stream;
  }, [stream]);

  // Remote Stream set karna
  useEffect(() => {
    if (userStream && userVideo.current) userVideo.current.srcObject = userStream;
  }, [userStream]);

  if (!callAccepted || callEnded) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative bg-base-300 w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl border border-base-content/10">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2 h-[300px] md:h-[450px]">
          {/* User's Video (Remote) */}
          <div className="relative bg-black rounded-xl overflow-hidden flex items-center justify-center">
            {callType === "video" ? (
              <video playsInline ref={userVideo} autoPlay className="w-full h-full object-cover" />
            ) : (
              <div className="avatar placeholder">
                <div className="bg-neutral text-neutral-content rounded-full w-24">
                  <span className="text-3xl">Remote</span>
                </div>
              </div>
            )}
            <div className="absolute bottom-4 left-4 badge badge-secondary">Remote User</div>
          </div>

          {/* My Video (Local) */}
          <div className="relative bg-black rounded-xl overflow-hidden flex items-center justify-center border-2 border-primary/30">
            {callType === "video" ? (
              <video playsInline muted ref={myVideo} autoPlay className="w-full h-full object-cover" />
            ) : (
              <div className="avatar placeholder">
                <div className="bg-neutral text-neutral-content rounded-full w-24">
                  <span className="text-3xl">You</span>
                </div>
              </div>
            )}
            <div className="absolute bottom-4 left-4 badge badge-primary">You</div>
          </div>
        </div>

        {/* Control Bar */}
        <div className="flex justify-center gap-6 p-6 bg-base-200">
          <button className="btn btn-circle btn-ghost bg-base-300"><Mic size={24} /></button>
          <button onClick={() => leaveCall(false)} className="btn btn-circle btn-error animate-pulse">
            <PhoneOff size={24} />
          </button>
          <button className="btn btn-circle btn-ghost bg-base-300"><Video size={24} /></button>
        </div>
      </div>
    </div>
  );
};

export default VideoContainer;