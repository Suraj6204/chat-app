import { X, Phone, Video, MoreVertical, LogOut, Trash, UserPlus } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import toast from "react-hot-toast";
import { useCallStore } from "../store/useCallStore";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser, typingUsers, openModal } = useChatStore();
  const { onlineUsers, authUser } = useAuthStore();
  const isOnline = !selectedUser?.isGroup && onlineUsers.includes(selectedUser._id);
  const isTyping = !selectedUser?.isGroup && typingUsers.includes(selectedUser._id);

  const { callUser } = useCallStore();

  const handleCallInit = (type) => {
    if (!isOnline) {
      return toast.error(`${selectedUser.fullName} is offline.`);
    }
    console.log(`Starting ${type} call with ${selectedUser.fullName}...`);
    callUser(selectedUser._id, type, authUser.fullName);
  };

  const isCreatorOfGroup =
    selectedUser?.isGroup &&
    (selectedUser.creator === authUser?._id || selectedUser.creator?._id === authUser?._id);

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        {/* Left side: User Info */}
        <div
          onClick={() => selectedUser?.isGroup && openModal("GroupInfo", selectedUser._id)}
          className={`flex items-center gap-3 ${selectedUser?.isGroup ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
        >
          <div className="avatar">
            <div className="size-10 rounded-full relative flex items-center justify-center bg-neutral text-neutral-content font-bold overflow-hidden border border-base-300">
              {selectedUser?.isGroup ? (
                selectedUser.groupPic ? (
                  <img src={selectedUser.groupPic} alt={selectedUser.name} className="size-full object-cover" />
                ) : (
                  <span>{selectedUser.name.substring(0, 2).toUpperCase()}</span>
                )
              ) : (
                <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.fullName} className="size-full object-cover" />
              )}
              {/* Online Indicator Dot */}
              {isOnline && (
                <span className="absolute bottom-0 right-0 size-3 bg-green-500 border-2 border-base-100 rounded-full" />
              )}
            </div>
          </div>

          <div>
            <h3 className="font-medium">
              {selectedUser?.isGroup ? selectedUser.name : selectedUser?.fullName}
            </h3>

            {selectedUser?.isGroup ? (
              <p className="text-xs text-base-content/60">
                {selectedUser.isDeletedGroup || selectedUser.isDeleted
                  ? "Deleted Group"
                  : `${selectedUser.members?.length || 0} members`}
              </p>
            ) : (
              <p className="text-sm text-base-content/70">
                {isTyping ? "Typing..." : isOnline ? "Online" : "Offline"}
              </p>
            )}
          </div>
        </div>

        {/* Right side: Actions */}
        <div className="flex items-center gap-2">
          {/* Audio/Video Call Dropdown (peer chat only) */}
          {!selectedUser?.isGroup && (
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
          )}

          {/* Group Options Dropdown */}
          {selectedUser?.isGroup && (
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-ghost btn-sm btn-circle cursor-pointer">
                <MoreVertical size={20} className="text-base-content/70" />
              </label>
              <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow-lg bg-base-200 rounded-box w-48 mt-2 border border-base-300">
                {!selectedUser.isDeletedGroup && !selectedUser.isDeleted && (
                  <li>
                    <button
                      className="flex items-center gap-3 py-2"
                      onClick={() => openModal("AddMember", selectedUser._id)}
                    >
                      <UserPlus size={16} />
                      <span className="font-medium">Add Member</span>
                    </button>
                  </li>
                )}
                {!selectedUser.isDeletedGroup && !selectedUser.isDeleted && (
                  <li>
                    <button
                      className="flex items-center gap-3 py-2 text-error hover:bg-error/10"
                      onClick={() => openModal("LeaveGroup", selectedUser._id)}
                    >
                      <LogOut size={16} />
                      <span className="font-medium">Leave Group</span>
                    </button>
                  </li>
                )}
                {isCreatorOfGroup && !selectedUser.isDeletedGroup && !selectedUser.isDeleted && (
                  <li>
                    <button
                      className="flex items-center gap-3 py-2 text-error hover:bg-error/10"
                      onClick={() => openModal("DeleteGroup", selectedUser._id)}
                    >
                      <Trash size={16} />
                      <span className="font-medium">Delete Group</span>
                    </button>
                  </li>
                )}
              </ul>
            </div>
          )}

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

export default ChatHeader;