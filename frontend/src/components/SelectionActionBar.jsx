import React from 'react';
import { Trash, X, ArrowUpRight } from 'lucide-react';

const SelectionActionBar = ({ 
  selectedCount, 
  onCancel, 
  onExecuteAction, // Single function jo final action execute karega
  actionType // Isme 'delete' ya 'forward' aayega
}) => {
  return (
    <div className="w-full bg-base-300 border-t border-base-300 p-4 px-6 flex items-center justify-between h-[76px] transition-all duration-200">
      {/* Left Side: Cancel Button & Count */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onCancel} 
          className="btn btn-ghost btn-sm btn-circle text-base-content"
        >
          <X size={20} />
        </button>
        <span className="text-md font-medium text-base-content">
          {selectedCount} selected
        </span>
      </div>
      
      {/* Right Side: Dynamic Action Button (Sirf ek dikhega) */}
      <div>
        {actionType === 'Delete' && (
          <button
            onClick={onExecuteAction}
            disabled={selectedCount === 0}
            className={`btn btn-ghost p-2.5 rounded-full transition-all duration-200 text-base-content hover:bg-error/20 hover:text-error ${
              selectedCount === 0 ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            <Trash size={20} />
          </button>
        )} 
        {actionType === 'Forward' && (
          <button
            onClick={onExecuteAction}
            disabled={selectedCount === 0}
            className={`btn btn-ghost p-2.5 rounded-full transition-all duration-200 text-base-content hover:bg-primary/20 hover:text-primary ${
              selectedCount === 0 ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            <ArrowUpRight size={20} />
          </button>
        )}
      </div>
    </div>
  );
};

export default SelectionActionBar;