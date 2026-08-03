// modal to select users to forward messages or add group members
import { useState } from 'react';
import { X, Search, ArrowRight } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';

const ForwardModal = () => {
  const {
    isModalOpen,
    modalType,
    modalData,
    openModal,
    closeModal,
    users,
    groups,
    executeForward,
    addMembersToGroup,
    selectedUser,
  } = useChatStore();
  const { authUser } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isModalOpen || (modalType !== 'Forward' && modalType !== 'AddMember')) return null;
  const isGroupContext = modalData === "CreateGroup";
  const isAddMemberContext = modalType === "AddMember";
  const targetGroupId = isAddMemberContext ? modalData : null;
  const currentGroup = groups.find((g) => g._id === targetGroupId) || (selectedUser?.isGroup ? selectedUser : null);

  const isAlreadyMember = (userId) => {
    if (!isAddMemberContext || !currentGroup?.members) return false;
    return currentGroup.members.some((m) => (m._id || m).toString() === userId.toString());
  };

  // Toggle selected users for multiple selection support
  const handleToggleUser = (userId) => {
    if (isAlreadyMember(userId)) return;
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Filter users based on input query string
  const filteredUsers = users.filter((user) =>
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleForwardSubmit = async () => {
    if (selectedUserIds.length === 0) return;

    if (isGroupContext) {
      openModal("GroupDetails", selectedUserIds);
    } else if (isAddMemberContext) {
      setIsSubmitting(true);
      await addMembersToGroup(targetGroupId, selectedUserIds);
      setIsSubmitting(false);
      setSelectedUserIds([]);
    } else {
      setIsSubmitting(true);
      await executeForward(selectedUserIds);
      setIsSubmitting(false);
      setSelectedUserIds([]);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      {/* Container Box */}
      <div className="w-full max-w-md bg-base-100 border border-base-300 rounded-2xl flex flex-col max-h-[85vh] text-base-content shadow-2xl overflow-hidden">
        
        {/* Header Block */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-base-300">
          <div className="flex items-center gap-4">
            <button 
              onClick={closeModal} 
              className="btn btn-ghost btn-circle btn-sm text-base-content/70 hover:text-error transition-colors"
              type="button"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-semibold text-base-content">
              {isGroupContext ? "Add group members" : isAddMemberContext ? "Add new members to group" : "Forward message to"}
            </h3>
          </div>
        </div>

        {/* Search Input Bar wrapper */}
        <div className="p-3">
          <div className="flex items-center gap-3 bg-base-200 rounded-xl px-4 py-2 border border-base-300 focus-within:border-primary transition-all duration-200">
            <Search size={18} className="text-base-content/50" />
            <input 
              type="text" 
              placeholder="Search name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent w-full focus:outline-none text-sm text-base-content placeholder-base-content/40"
            />
          </div>
        </div>

        {/* Users Selection Scroll Area */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 custom-scrollbar">
          <p className="text-xs font-bold text-primary px-4 pt-2 pb-3 tracking-wider uppercase">Select contacts</p>
          
          <div className="space-y-0.5">
            {filteredUsers.map((user) => {
              const isMe = user._id === authUser?._id;
              const alreadyMember = isAlreadyMember(user._id);
              const isSelected = selectedUserIds.includes(user._id);
              
              return (
                <div 
                  key={user._id}
                  onClick={() => !alreadyMember && handleToggleUser(user._id)}
                  className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${
                    alreadyMember
                      ? 'opacity-50 cursor-not-allowed bg-base-200/30'
                      : isSelected
                        ? 'bg-base-200 cursor-pointer'
                        : 'hover:bg-base-200 cursor-pointer'
                  }`}
                >
                  {/* Styled DaisyUI Checkbox */}
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="checkbox"
                      checked={isSelected}
                      disabled={alreadyMember}
                      onChange={() => handleToggleUser(user._id)}
                      onClick={(e) => e.stopPropagation()}
                      className="checkbox checkbox-primary checkbox-sm rounded-md border-base-content/30"
                    />
                  </div>

                  {/* Profile Picture */}
                  <div className="avatar">
                    <div className="size-11 rounded-full border border-base-300">
                      <img src={user.profilePic || "/avatar.png"} alt={user.fullName} className="object-cover" />
                    </div>
                  </div>

                  {/* User Details Name Layout */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[15px] font-medium text-base-content truncate">
                      {isMe ? "Suraj (You)" : user.fullName}
                    </h4>
                    <p className="text-xs text-base-content/60 truncate mt-0.5">
                      {alreadyMember ? "Already a member" : isMe ? "Group creator" : "Contact"}
                    </p>
                  </div>
                </div>
              );
            })}

            {filteredUsers.length === 0 && (
              <p className="text-sm text-base-content/50 text-center py-8">No contacts found</p>
            )}
          </div>
        </div>

        {/* Dynamic Action Trigger Footer */}
        {selectedUserIds.length > 0 && (
          <div className="p-4 bg-base-200 border-t border-base-300 flex justify-end items-center gap-3 animate-in slide-in-from-bottom duration-200">
            <span className="text-sm text-base-content/60 font-medium">
              {selectedUserIds.length} selected
            </span>
            <button 
              onClick={handleForwardSubmit}
              disabled={isSubmitting}
              className="btn btn-sm btn-primary rounded-full px-6 font-semibold"
            >
              {isGroupContext ? (
                <><span>Next</span><ArrowRight size={16} /></>
              ) : isAddMemberContext ? (
                <span>{isSubmitting ? "Adding..." : "Add Members"}</span>
              ) : (
                <span>{isSubmitting ? "Forwarding..." : "Forward"}</span>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default ForwardModal;