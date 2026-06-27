import React, { useState, useRef } from 'react';
import { X, Camera, ArrowLeft, Users } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';

const GroupDetailsModal = () => {
  const { isModalOpen, modalType, modalData, closeModal, createNewGroup, openModal } = useChatStore();
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [groupPic, setGroupPic] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  if (!isModalOpen || modalType !== 'GroupDetails') return null;

  // modalData holds the array of selected userIds from step 2
  const selectedMemberIds = modalData;

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64Image = reader.result;
      setGroupPic(base64Image);
    };
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    setIsSubmitting(true);
    await createNewGroup({
      name: groupName,
      description,
      groupPic,
      memberIds: selectedMemberIds,
    });
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-base-100 border border-base-300 rounded-2xl flex flex-col max-h-[85vh] text-base-content shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header with Back Arrow to return to Member Selection */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-base-300">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => openModal("Forward", "CreateGroup")} // 🔥 Back button returns to selection modal
              className="btn btn-ghost btn-circle btn-sm text-base-content/70 hover:text-primary transition-colors"
              type="button"
            >
              <ArrowLeft size={20} />
            </button>
            <h3 className="text-lg font-semibold text-base-content">New Group Details</h3>
          </div>
          <button onClick={closeModal} className="text-base-content/50 hover:text-error"><X size={20} /></button>
        </div>

        <form onSubmit={handleFinalSubmit} className="p-6 space-y-6 overflow-y-auto">
          
          {/* 1. PROFILE PICTURE SELECTION */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative group">
              <div className="size-24 rounded-full border-2 border-base-300 overflow-hidden bg-base-200 flex items-center justify-center">
                {groupPic ? (
                  <img src={groupPic} alt="Group pic" className="size-full object-cover" />
                ) : (
                  <Users className="size-10 text-base-content/40" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg"
              >
                <Camera size={16} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
            <span className="text-xs text-base-content/60">Group Icon (Optional)</span>
          </div>

          {/* 2. GROUP NAME INPUT */}
          <div className="form-control w-full">
            <label className="label py-1"><span className="label-text font-medium text-xs uppercase opacity-70">Group Name</span></label>
            <input 
              type="text" 
              placeholder="e.g. Squad Goals 🚀" 
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="input input-bordered w-full bg-base-200/50 focus:input-primary text-sm rounded-xl"
              required 
            />
          </div>

          {/* 3. DESCRIPTION INPUT */}
          <div className="form-control w-full">
            <label className="label py-1"><span className="label-text font-medium text-xs uppercase opacity-70">Description (Optional)</span></label>
            <textarea 
              placeholder="What is this group about?" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="textarea textarea-bordered w-full bg-base-200/50 focus:textarea-primary text-sm rounded-xl resize-none h-20"
            />
          </div>

          {/* Member badge count layout */}
          <div className="text-xs text-base-content/60 font-medium bg-base-200 p-3 rounded-xl text-center">
            Creating group with <span className="text-primary font-bold">{selectedMemberIds?.length || 0}</span> selected members.
          </div>

          {/* FOOTER ACTIONS */}
          <div className="flex justify-end gap-3 pt-4 border-t border-base-300">
            <button type="button" onClick={closeModal} className="btn btn-sm btn-ghost rounded-full">Cancel</button>
            <button 
              type="submit" 
              disabled={isSubmitting || !groupName.trim()}
              className="btn btn-sm btn-primary rounded-full px-6"
            >
              {isSubmitting ? "Creating..." : "Create Group"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default GroupDetailsModal;