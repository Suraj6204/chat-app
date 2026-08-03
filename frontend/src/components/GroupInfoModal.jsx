import React, { useState } from 'react';
import { X, UserPlus, LogOut, Trash, UserMinus, Crown } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';

const GroupInfoModal = () => {
  const {
    isModalOpen,
    modalType,
    modalData,
    closeModal,
    openModal,
    groups,
    selectedUser,
    removeMemberFromGroup,
  } = useChatStore();
  const { authUser, onlineUsers } = useAuthStore();
  const [hoveredMemberId, setHoveredMemberId] = useState(null);

  if (!isModalOpen || modalType !== 'GroupInfo') return null;

  // modalData can be groupId or group object
  const groupId = typeof modalData === 'object' ? modalData?._id : modalData;
  const currentGroup =
    groups.find((g) => g._id === groupId) ||
    (selectedUser?.isGroup ? selectedUser : null);

  if (!currentGroup) return null;

  const creatorId =
    typeof currentGroup.creator === 'object'
      ? currentGroup.creator._id
      : currentGroup.creator;
  const isCreator = authUser?._id === creatorId;
  const members = currentGroup.members || [];

  const handleRemoveMember = async (memberId) => {
    if (!isCreator || memberId === creatorId) return;
    await removeMemberFromGroup(currentGroup._id, memberId);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      {/* Modal Container */}
      <div className="w-full max-w-md bg-base-100 border border-base-300 rounded-[28px] flex flex-col max-h-[85vh] text-base-content shadow-2xl overflow-hidden">
        
        {/* Header Block with Close Button */}
        <div className="flex justify-end p-4 pb-0">
          <button
            onClick={closeModal}
            className="btn btn-ghost btn-circle btn-sm text-base-content/60 hover:text-base-content"
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        {/* Top Section: Avatar, Group Name & Member Count */}
        <div className="flex flex-col items-center px-6 pb-6">
          <div className="size-20 rounded-full border-2 border-base-300 overflow-hidden bg-primary/10 text-primary flex items-center justify-center text-3xl font-bold mb-3 shadow-md">
            {currentGroup.groupPic ? (
              <img
                src={currentGroup.groupPic}
                alt={currentGroup.name}
                className="size-full object-cover"
              />
            ) : (
              <span>{currentGroup.name.substring(0, 2).toUpperCase()}</span>
            )}
          </div>
          <h2 className="text-xl font-bold text-base-content tracking-tight">
            {currentGroup.name}
          </h2>
          <p className="text-xs text-base-content/60 font-medium mt-0.5">
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </p>

          {/* Action Buttons Row (2 options: Add Member & Leave / Delete) */}
          <div className="grid grid-cols-2 gap-3 w-full mt-6">
            <button
              type="button"
              onClick={() => openModal('AddMember', currentGroup._id)}
              className="flex flex-col items-center justify-center py-3 px-4 bg-base-200 hover:bg-base-300 text-base-content rounded-2xl transition-all cursor-pointer group"
            >
              <UserPlus size={20} className="text-primary mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold">Add Member</span>
            </button>

            {isCreator ? (
              <button
                type="button"
                onClick={() => openModal('DeleteGroup', currentGroup._id)}
                className="flex flex-col items-center justify-center py-3 px-4 bg-base-200 hover:bg-error/10 text-error rounded-2xl transition-all cursor-pointer group"
              >
                <Trash size={20} className="mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold">Delete</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openModal('LeaveGroup', currentGroup._id)}
                className="flex flex-col items-center justify-center py-3 px-4 bg-base-200 hover:bg-error/10 text-error rounded-2xl transition-all cursor-pointer group"
              >
                <LogOut size={20} className="mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold">Leave</span>
              </button>
            )}
          </div>
        </div>

        {/* Members List Section Header */}
        <div className="flex items-center justify-between px-6 py-3 bg-base-200/50 border-t border-b border-base-300">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-base-content/70">
            <span>Members</span>
            <span className="badge badge-sm badge-ghost text-[10px]">{members.length}</span>
          </div>

          <button
            type="button"
            onClick={() => openModal('AddMember', currentGroup._id)}
            className="btn btn-ghost btn-xs btn-circle text-primary hover:bg-primary/10"
            title="Add Member"
          >
            <UserPlus size={16} />
          </button>
        </div>

        {/* Scrollable Members List */}
        <div className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar">
          <div className="space-y-1">
            {members.map((member) => {
              const memberId = member._id || member;
              const isOwner = memberId === creatorId;
              const isOnline = onlineUsers.includes(memberId);
              const isHovered = hoveredMemberId === memberId;
              const canRemove = isCreator && !isOwner;

              return (
                <div
                  key={memberId}
                  onMouseEnter={() => setHoveredMemberId(memberId)}
                  onMouseLeave={() => setHoveredMemberId(null)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-base-200 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="avatar placeholder relative">
                      <div className="size-10 rounded-full border border-base-300 bg-neutral text-neutral-content flex items-center justify-center font-bold text-sm">
                        {member.profilePic ? (
                          <img
                            src={member.profilePic}
                            alt={member.fullName || 'User'}
                            className="size-full object-cover rounded-full"
                          />
                        ) : (
                          <span>
                            {member.fullName
                              ? member.fullName.substring(0, 2).toUpperCase()
                              : 'U'}
                          </span>
                        )}
                      </div>
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 size-3 bg-green-500 border-2 border-base-100 rounded-full" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate text-base-content">
                          {member._id === authUser?._id
                            ? `${member.fullName || 'User'} (You)`
                            : member.fullName || 'User'}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5 font-medium">
                        {isOnline ? (
                          <span className="text-green-500">online</span>
                        ) : (
                          <span className="text-base-content/50">offline</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Right side: Owner badge OR Remove button on hover */}
                  <div className="flex items-center gap-2">
                    {isOwner && (
                      <span className="badge badge-sm bg-purple-500/20 text-purple-400 border-none font-semibold px-2 py-1 text-[11px] gap-1">
                        <Crown size={12} />
                        owner
                      </span>
                    )}

                    {canRemove && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(memberId)}
                        className={`btn btn-xs btn-error btn-outline rounded-lg flex items-center gap-1 transition-all ${
                          isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                        }`}
                        title="Remove member"
                      >
                        <UserMinus size={13} />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default GroupInfoModal;
