import React from 'react';

const ConfirmationModal = ({ isOpen, onClose, onConfirmMe, onConfirmEveryone, title, confirmText, actionType , showDeleteEveryone }) => {
  if (!isOpen) return null;

  return (
    // 1. Full Screen Blur Overlay Backdrop
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
      
      {/* 2. Modal Box Content Area */}
      <div className="w-[90%] max-w-md bg-base-300 border border-base-300 rounded-[28px] p-6 shadow-2xl text-base-content animate-in fade-in zoom-in-95 duration-200">
        
        {/* Dynamic Title */}
        <h3 className="text-xl font-medium mb-12 tracking-wide">
          {title || "Delete message?"}
        </h3>

        {/* 3. Bottom Actions Panel Bar */}
        <div className="flex justify-end items-center gap-6">
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm text-success font-semibold hover:bg-success/10 rounded-full px-4 normal-case tracking-wide"
          >
            Cancel
          </button>
          
          <button
            onClick={onConfirmMe}
            className={`btn btn-sm rounded-full px-5 font-semibold normal-case tracking-wide shadow-md ${
              actionType === 'Delete' 
                ? 'bg-success text-black hover:bg-success/90 border-none' 
                : 'btn-primary'
            }`}
          >
            {confirmText || "Delete for me"}
          </button>

          {showDeleteEveryone && (
            <button 
              onClick={onConfirmEveryone} 
              className="btn btn-sm btn-error rounded-full px-4"
            >
              Delete for everyone
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;