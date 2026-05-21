import { useRef, useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Image, Plus, Send, Smile, XCircle, FileText, Camera, Mic, X } from "lucide-react";
import toast from "react-hot-toast";
import MenuOptions from "./MenuOptionsBox";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [menuOptions, setMenuOptions] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const fileInputRef = useRef(null);
  const menuRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const { sendMessage, sendStartTyping, sendStopTyping, replyPreviewMessage, clearReplyPreviewMessage, selectedUser } = useChatStore();
  const { authUser } = useAuthStore();

  const handleImageVideoChange = (e) => {
    const file = e.target.files[0];
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast.error("Please select an image or video file");
      return;
    }

    //1.size check 
    if (file.size > 20 * 1024 * 1024) { // 20MB limit
      return toast.error("File size is too large! Max 20MB allowed.");
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onloadend = () => {
      const base64Data = reader.result;
      if (file.type.startsWith("image/")) {
        setImagePreview(base64Data);
      } else if (file.type.startsWith("video/")) {
        setImagePreview(base64Data);
      }
    };
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    sendStopTyping();
    setIsTyping(false);

    try {
      const isVideo = imagePreview && imagePreview.startsWith("data:video/");
      await sendMessage({
        text: text.trim(),
        image: isVideo ? null : imagePreview,
        video: isVideo ? imagePreview : null,
      });

      // Clear form
      setText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleInputChange = (e) => {
    setText(e.target.value);

    if (!isTyping) {
      setIsTyping(true);
      sendStartTyping();
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendStopTyping();
      setIsTyping(false);
    }, 2000);
  };

  const handleFileInput = () => {
    fileInputRef.current?.click();
    setMenuOptions(false);
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOptions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="p-4 w-full bg-base-100 relative">
      {/* Image Preview Section */}
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            {imagePreview.startsWith("data:video/") ? (
              <video
                src={imagePreview}
                className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
                controls
              />
            ) : (
              <img
                src={imagePreview}
                alt="Preview"
                className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
              />
            )}
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
              flex items-center justify-center shadow-md hover:bg-base-400 transition-colors"
              type="button"
            >
              <XCircle className="size-3" />
            </button>
          </div>
        </div>
      )}

      {menuOptions && (
        <div ref={menuRef} className="absolute bottom-full left-4 mb-2 w-56 bg-base-200 border border-base-300 rounded-2xl shadow-2xl py-2 z-50">

          <MenuOptions icon={FileText} label="Document" onClick={handleFileInput} iconColour="text-indigo-400" />

          <MenuOptions icon={Image} label="Photo & Video" onClick={handleFileInput} iconColour="text-blue-400" />
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-end gap-2 p-2">
        <div className="flex-1 bg-base-200 rounded-3xl flex flex-col overflow-hidden transition-all duration-300 shadow-inner border border-base-300/30">
          
          {/* 1. REPLY BOX  */}
          {replyPreviewMessage && (
            <div className="m-2 p-3 bg-base-300/60 rounded-xl border-l-4 border-primary flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-primary">
                  Replying to {replyPreviewMessage.senderId === authUser._id ? "yourself" : (selectedUser?.fullName || "User")}
                </span>
                <span className="text-sm text-base-content/70 truncate max-w-50 mt-0.5">
                  {replyPreviewMessage.text || "Media attachment"}
                </span>
              </div>
              <button 
                type="button"
                onClick={clearReplyPreviewMessage} 
                className="text-base-content/40 hover:text-error p-1 rounded-full hover:bg-base-content/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* 2. INPUT AREA ROW */}
          <div className="relative flex items-center w-full min-h-14">
            <button
              type="button"
              className="z-10 ml-2 text-base-content/70 hover:bg-base-content/10 rounded-full p-2"
              onClick={() => setMenuOptions(!menuOptions)}
            >
              <Plus size={22} />
            </button>

            <input
              type="text"
              className="flex-1 bg-transparent py-4 px-2 text-base focus:outline-none placeholder-base-content/50"
              placeholder="Type a message..."
              value={text}
              onChange={handleInputChange}
            />

            {/* Right Icons: Smile + Camera */}
            <div className="flex items-center gap-3 mr-4 text-base-content/50">
              <button type="button" className="hover:text-primary"><Smile size={22} /></button>
              <button 
                type="button" 
                className={`hover:text-primary ${imagePreview ? "text-emerald-500" : ""}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera size={22} />
              </button>
            </div>
          </div>
        </div>

        {/* Send/Mic Button */}
        <button
          type="submit"
          className="btn btn-circle bg-primary hover:bg-primary/90 border-none text-white shadow-lg mb-2"
          disabled={!text.trim() && !imagePreview}
        >
          {text.trim() || imagePreview ? <Send size={20} /> : <Mic size={20} />}
        </button>
      </form>
    </div>
  );
};

export default MessageInput;