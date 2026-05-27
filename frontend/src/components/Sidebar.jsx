import {
  Users,
  Menu,
  Ban,
  MinusCircle,
  Trash,
  PinIcon,
  PinOff,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import MenuOptionsBox from "./MenuOptionsBox";

const Sidebar = () => {
  const {
    getUsers,
    users,
    selectedUser,
    setSelectedUser,
    isUsersLoading,
    typingUsers,
    activeMenuId,
    setActiveMenuId,
    openModal,
    togglePinChat,
  } = useChatStore();

  const { onlineUsers, authUser } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [menuOptions, setMenuOptions] = useState({
    show: false,
    x: 0,
    y: 0,
    userId: null,
  });

  // Right click context menu ke liye context pin status nikalne ke liye
  const isSelectedContextMenuChatPinned = authUser?.pinnedChats?.includes(menuOptions.userId);

  const filteredUsers = showOnlineOnly
  ? users.filter((user) => onlineUsers.includes(user._id))
  : users;
  
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aPinned = authUser?.pinnedChats?.includes(a._id) || false;
    const bPinned = authUser?.pinnedChats?.includes(b._id) || false;

    if (aPinned && !bPinned) return -1; // a upar jayega
    if (!aPinned && bPinned) return 1; // b upar jayega
    return 0; // standard order intact rahega
  });

  if (isUsersLoading) {
    return <SidebarSkeleton />;
  }

  const handleMenuOptions = (e, userId) => {
    //isse menubox khul rha
    e.preventDefault();
    e.stopPropagation();
    setMenuOptions({
      show: true,
      x: e.clientX,
      y: e.clientY,
      userId,
    });
    setActiveMenuId("sidebar");
  };

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  useEffect(() => {
    const handleClickOnOutside = () => {
      setMenuOptions((prev) => ({ ...prev, show: false }));
    };
    window.addEventListener("click", handleClickOnOutside);
    return () => window.removeEventListener("click", handleClickOnOutside);
  }, []);

  useEffect(() => {
    if (activeMenuId != "sidebar") {
      setMenuOptions((prev) => ({ ...prev, show: false }));
    }
  }, [activeMenuId]);

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center gap-2">
          {authUser && (
            <label
              htmlFor="my-drawer"
              className="btn btn-ghost btn-circle btn-sm drawer-button"
            >
              <Menu className="size-5" />
            </label>
          )}
        </div>

        {/* TODO: Online filter toggle */}
        <div className="mt-3 hidden lg:flex items-center gap-2">
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            <span className="text-sm">Show online only</span>
          </label>
          <span className="text-xs text-zinc-500">
            ({onlineUsers.length - 1} online)
          </span>
        </div>
      </div>

      {/* all users */}
      <div className="overflow-y-auto w-full py-3">
        {sortedUsers.map((user) => {
          const isChatPinned = authUser?.pinnedChats?.includes(user._id);
          return(
            <button
              key={user._id}
              onClick={() => setSelectedUser(user)}
              onContextMenu={(e) => handleMenuOptions(e, user._id)}
              onDoubleClick={(e) => handleMenuOptions(e, user._id)}
              className={`
                mt-1 rounded-md w-full p-3 flex items-center gap-3 hover:bg-base-300 transition-colors cursor-pointer
                ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""}
              `}
            >
              <div className="relative mx-auto lg:mx-0">
                <img
                  src={user.profilePic || "/avatar.png"}
                  alt={user.name}
                  className="size-12 object-cover rounded-full"
                />
                {onlineUsers.includes(user._id) && (
                  <span
                    className="absolute bottom-0 right-0 size-3 bg-green-500 
                    rounded-full ring-2 ring-zinc-900"
                  />
                )}
              </div>

              {/* User info - only visible on larger screens */}
              <div className="hidden lg:block text-left min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <div className="font-medium truncate flex-1">
                    {user.fullName}
                  </div>

                  {isChatPinned && (
                    <PinIcon
                      size={14}
                      className="text-primary fill-primary shrink-0 rotate-45"
                    />
                  )}
                </div>
                <div className="text-sm text-zinc-400">
                  {typingUsers?.includes(user._id) ? (
                    <span className="text-success font-medium">
                      Typing...
                    </span>
                  ) : onlineUsers.includes(user._id) ? (
                    "Online"
                  ) : (
                    "Offline"
                  )}
                </div>
              </div>
            </button>
          )
        })}

        {sortedUsers.length === 0 && (
          <div className="text-center text-zinc-500 py-4">No online users</div>
        )}
      </div>

      {menuOptions.show && (
        <div
          className="fixed mb-2 w-56 bg-base-200 border border-base-300 rounded-2xl shadow-2xl py-2 z-50"
          style={{
            top: menuOptions.y,
            left: menuOptions.x,
            transform: `
                ${menuOptions.x + 224 > window.innerWidth ? "translateX(-100%)" : "translateX(0)"} 
                ${menuOptions.y + 300 > window.innerHeight ? "translateY(-100%)" : "translateY(0)"}
              `,
          }}
        >
          <MenuOptionsBox
            icon={isSelectedContextMenuChatPinned ? PinOff : PinIcon}
            label={isSelectedContextMenuChatPinned ? "Unpin Chat" : "Pin Chat"}
            onClick={() => {
              togglePinChat(menuOptions.userId);
              setMenuOptions((prev) => ({ ...prev, show: false }));
            }}
          />

          <hr className="border-base-300 my-1" />

          <MenuOptionsBox
            icon={Ban}
            label="Block"
            onClick={() => {
              openModal("Block", menuOptions.userId);
              setMenuOptions((prev) => ({ ...prev, show: false }));
            }}
          />

          <MenuOptionsBox
            icon={MinusCircle}
            label="Clear Chat"
            onClick={() => {
              openModal("ClearChat", menuOptions.userId);
              setMenuOptions((prev) => ({ ...prev, show: false }));
            }}
          />

          <MenuOptionsBox
            icon={Trash}
            label="Delete Chat"
            className="text-error hover:bg-error/10"
            onClick={() => {
              openModal("DeleteChat", {
                targetId: menuOptions.userId,
                targetType: "user",
              });
              setMenuOptions((prev) => ({ ...prev, show: false }));
            }}
          />
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
