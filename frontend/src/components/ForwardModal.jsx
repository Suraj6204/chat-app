// modal to select users to forward messages
import { useState } from 'react';
import { X, Search } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';

const ForwardModal = () => {
  const { isModalOpen, modalType, closeModal, users, executeForward, modalMessageIds } = useChatStore();
  const { authUser } = useAuthStore();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isModalOpen || modalType !== 'Forward') return null;

  // Toggle selected users for multiple forward support
  const handleToggleUser = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId] // user already selected hai toh remove karo nhi toh add karo
    );
  };

  // Filter users based on input query string
  const filteredUsers = users.filter(user => 
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleForwardSubmit = async () => {
    if (selectedUserIds.length === 0) return;
    setIsSubmitting(true);
    await executeForward(selectedUserIds);
    setIsSubmitting(false);
    setSelectedUserIds([]);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#111b21] border border-gray-800 rounded-2xl flex flex-col max-h-[85vh] text-[#e9edef] shadow-2xl overflow-hidden">
        
        {/* Header Block */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-4">
            <button onClick={closeModal} className="hover:bg-gray-800 p-1.5 rounded-full transition-colors text-[#aebac1]">
              <X size={22} />
            </button>
            <h3 className="text-lg font-medium text-[#e9edef]">Forward message to</h3>
          </div>
        </div>

        {/* Search Input Bar wrapper */}
        <div className="p-3">
          <div className="flex items-center gap-3 bg-[#202c33] rounded-xl px-4 py-2 border border-transparent focus-within:border-[#00a884] transition-all">
            <Search size={18} className="text-[#8696a0]" />
            <input 
              type="text" 
              placeholder="Search name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent w-full focus:outline-none text-sm text-[#e9edef] placeholder-[#8696a0]"
            />
          </div>
        </div>

        {/* Users Selection Scroll Area */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 custom-scrollbar">
          <p className="text-xs font-semibold text-[#00a884] px-4 pt-2 pb-3 tracking-wider uppercase">Recent chats</p>
          
          <div className="space-y-0.5">
            {filteredUsers.map((user) => {
              const isMe = user._id === authUser?._id;
              const isSelected = selectedUserIds.includes(user._id);
              
              return (
                <div 
                  key={user._id}
                  onClick={() => handleToggleUser(user._id)}
                  className={`flex items-center gap-4 px-4 py-3 hover:bg-[#202c33] cursor-pointer rounded-xl transition-colors ${
                    isSelected ? 'bg-[#202c33]' : ''
                  }`}
                >
                  {/* Styled Rounded Checkbox */}
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleUser(user._id)}
                      onClick={(e) => e.stopPropagation()}
                      className="checkbox checkbox-sm rounded-md border-2 border-[#8696a0] checked:border-[#00a884] checked:bg-[#00a884]"
                    />
                  </div>

                  {/* Profile Picture */}
                  <div className="avatar">
                    <div className="size-11 rounded-full border border-gray-800">
                      <img src={user.profilePic || "/avatar.png"} alt={user.fullName} />
                    </div>
                  </div>

                  {/* User Details Name Layout */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[15px] font-medium text-[#e9edef] truncate">
                      {isMe ? "Suraj (You)" : user.fullName}
                    </h4>
                    <p className="text-xs text-[#8696a0] truncate mt-0.5">
                      {isMe ? "Message yourself" : "Active chat session"}
                    </p>
                  </div>
                </div>
              );
            })}

            {filteredUsers.length === 0 && (
              <p className="text-sm text-[#8696a0] text-center py-8">No contacts found</p>
            )}
          </div>
        </div>

        {/* Dynamic Action Trigger Footer */}
        {selectedUserIds.length > 0 && (
          <div className="p-4 bg-[#202c33]/50 border-t border-gray-800 flex justify-end items-center gap-3 animate-in slide-in-from-bottom duration-200">
            <span className="text-sm text-[#8696a0]">
              {selectedUserIds.length} selected
            </span>
            <button 
              onClick={handleForwardSubmit}
              disabled={isSubmitting}
              className="btn btn-sm border-none bg-[#00a884] text-[#111b21] hover:bg-[#00a884]/90 rounded-full px-6 font-semibold"
            >
              {isSubmitting ? "Forwarding..." : "Forward"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default ForwardModal;