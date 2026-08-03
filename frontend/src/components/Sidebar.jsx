import {
  Users,
  Menu,
  Ban,
  MinusCircle,
  Trash,
  PinIcon,
  PinOff,
  MessageSquare,
  LogOut,
  UserPlus,
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
    groups,
    getMyGroups,
    isGroupsLoading,
    subscribeToGroupUpdates,
    unsubscribeFromGroupUpdates,
    subscribeToConversationNotifications,
    unsubscribeFromConversationNotifications,
    unreadCounts,
    setUnreadCounts,
  } = useChatStore();
  const { onlineUsers, authUser } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);

  // 🔥 Active Mode Toggle State: 'chats' or 'groups'
  const [activeTab, setActiveTab] = useState("chats");

  const [menuOptions, setMenuOptions] = useState({
    show: false,
    x: 0,
    y: 0,
    userId: null,
  });

  const isSelectedContextMenuChatPinned = authUser?.pinnedChats?.includes(
    menuOptions.userId,
  );

  const selectedGroup = groups.find((g) => g._id === menuOptions.userId);
  const isCreatorOfGroup = selectedGroup && (selectedGroup.creator === authUser?._id || selectedGroup.creator?._id === authUser?._id);

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aPinned = authUser?.pinnedChats?.includes(a._id) || false;
    const bPinned = authUser?.pinnedChats?.includes(b._id) || false;

    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return 0;
  });

  const sortedGroups = [...groups].sort((a, b) => {
    const aPinned = authUser?.pinnedChats?.includes(a._id) || false;
    const bPinned = authUser?.pinnedChats?.includes(b._id) || false;

    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return 0;
  });

  const handleMenuOptions = (e, userId) => {
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
    getMyGroups();
  }, [getUsers, getMyGroups]);

  useEffect(() => {
    if (!authUser) return;

    subscribeToGroupUpdates();
    subscribeToConversationNotifications();
    return () => {
      unsubscribeFromGroupUpdates();
      unsubscribeFromConversationNotifications();
    };
  }, [
    authUser,
    subscribeToGroupUpdates,
    unsubscribeFromGroupUpdates,
    subscribeToConversationNotifications,
    unsubscribeFromConversationNotifications,
  ]);

  useEffect(() => {
    if (!authUser) {
      setUnreadCounts({});
      return;
    }

    setUnreadCounts(authUser.unreadCounts || {});
  }, [authUser, setUnreadCounts]);

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

  if (isUsersLoading || isGroupsLoading) {
    return <SidebarSkeleton />;
  }

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200 bg-base-100">
      {/* Top Header Section */}
      <div className="border-b border-base-300 w-full p-5 flex flex-col gap-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {authUser && (
              <label
                htmlFor="my-drawer"
                className="btn btn-ghost btn-circle btn-sm drawer-button"
              >
                <Menu className="size-5" />
              </label>
            )}
            <h1 className="font-bold text-lg hidden lg:block tracking-tight text-base-content">
              Messages
            </h1>
          </div>
        </div>

        {/* 🔥 NEW UI: Modern Segmented Chat/Group Segment Switcher Toggle */}
        <div className="bg-base-200 p-1 rounded-xl flex-row lg:flex w-fit gap-2">
          <div className="relative">
            <button
              onClick={() => setActiveTab("chats")}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all duration-200 cursor-pointer
              ${activeTab === "chats" ? "bg-primary text-primary-content shadow-sm" : "text-base-content/70 hover:bg-base-300/50"}`}
            >
              <MessageSquare className="size-4" />
              <span className="hidden lg:inline">Personal</span>
            </button>

            {Object.entries(unreadCounts).some(
              ([id, count]) => count > 0 && users.some((u) => u._id === id),
            ) && (
              <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-base-100"></span>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setActiveTab("groups")}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all duration-200 cursor-pointer
              ${activeTab === "groups" ? "bg-primary text-primary-content shadow-sm" : "text-base-content/70 hover:bg-base-300/50"}`}
            >
              <Users className="size-4" />
              <span className="hidden lg:inline">Groups</span>
            </button>

            {Object.entries(unreadCounts).some(
              ([id, count]) => count > 0 && groups.some((g) => g._id === id),
            ) && (
              <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-base-100"></span>
            )}
          </div>
        </div>

        {/* Online Filter Checkbox - Only show when Personal Chats active */}
        {activeTab === "chats" && (
          <div className="hidden lg:flex items-center gap-2 animate-fadeIn">
            <label className="cursor-pointer flex items-center gap-2 select-none">
              <input
                type="checkbox"
                checked={showOnlineOnly}
                onChange={(e) => setShowOnlineOnly(e.target.checked)}
                className="checkbox checkbox-primary checkbox-xs rounded-md"
              />
              <span className="text-xs font-medium text-base-content/80">
                Show online only
              </span>
            </label>
            <div className="badge badge-sm badge-ghost text-[10px] opacity-70">
              {onlineUsers.length - 1} active
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Render Flow List (With Isolated Smooth Scrollbar Integration) */}
      <div className="flex-1 overflow-y-auto w-full px-2 py-3 custom-scrollbar space-y-1">
        {/* ==================== 👥 GROUP MODE VIEW ==================== */}
        {activeTab === "groups" && (
          <>
            {sortedGroups.map((group) => {
              const isGroupPinned = authUser?.pinnedChats?.includes(group._id);

              return (
                <button
                  key={group._id}
                  onClick={() => setSelectedUser({ ...group, isGroup: true })}
                  onContextMenu={(e) => handleMenuOptions(e, group._id)}
                  onDoubleClick={(e) => handleMenuOptions(e, group._id)}
                  className={`
                      w-full p-3 flex items-center gap-3 hover:bg-base-200 rounded-xl transition-all cursor-pointer relative
                      ${selectedUser?._id === group._id ? "bg-base-300 font-medium text-base-content" : "text-base-content/80"}
                    `}
                >
                  <div className="relative mx-auto lg:mx-0 shrink-0">
                    {group.groupPic ? (
                      <div className="relative">
                        <img
                          src={group.groupPic}
                          alt={group.name}
                          className="size-11 object-cover rounded-full border border-base-300"
                        />
                        {unreadCounts?.[group._id] > 0 && (
                          <span className="absolute -top-1 -right-1 badge badge-xs badge-primary lg:hidden">
                            {unreadCounts[group._id]}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="avatar placeholder">
                        <div className="bg-neutral text-neutral-content rounded-full size-11 flex items-center justify-center border border-base-300">
                          <span className="text-sm font-bold">
                            {group.name.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="hidden lg:block text-left min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <div className="font-semibold truncate text-sm">
                        {group.name}
                      </div>
                      <div className="flex items-center gap-2">
                        {unreadCounts?.[group._id] > 0 && (
                          <div className="badge badge-sm badge-primary">
                            {unreadCounts[group._id]}
                          </div>
                        )}
                        {isGroupPinned && (
                          <PinIcon
                            size={13}
                            className="text-primary fill-primary shrink-0 rotate-45"
                          />
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-base-content/60 truncate mt-0.5">
                      {group.isDeletedGroup || group.isDeleted ? (
                        <span className="text-error font-medium">Deleted Group</span>
                      ) : (
                        `${group.members?.length || 0} members`
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {sortedGroups.length === 0 && (
              <div className="text-center text-sm text-base-content/50 py-8 animate-fadeIn">
                No groups joined yet
              </div>
            )}
          </>
        )}

        {/* ==================== 💬 CHAT MODE VIEW ==================== */}
        {activeTab === "chats" && (
          <>
            {sortedUsers.map((user) => {
              const isChatPinned = authUser?.pinnedChats?.includes(user._id);
              return (
                <button
                  key={user._id}
                  onClick={() => setSelectedUser(user)}
                  onContextMenu={(e) => handleMenuOptions(e, user._id)}
                  onDoubleClick={(e) => handleMenuOptions(e, user._id)}
                  className={`
                    w-full p-3 flex items-center gap-3 hover:bg-base-200 rounded-xl transition-all cursor-pointer
                    ${selectedUser?._id === user._id ? "bg-base-300 font-medium text-base-content" : "text-base-content/80"}
                  `}
                >
                  <div className="relative mx-auto lg:mx-0 shrink-0">
                    <div className="relative">
                      <img
                        src={user.profilePic || "/avatar.png"}
                        alt={user.fullName}
                        className="size-11 object-cover rounded-full"
                      />
                      {unreadCounts?.[user._id] > 0 && (
                        <span className="absolute -top-1 -right-1 badge badge-xs badge-primary">
                          {unreadCounts[user._id]}
                        </span>
                      )}
                    </div>
                    {onlineUsers.includes(user._id) && (
                      <span
                        className="absolute bottom-0 right-0 size-3 bg-green-500 
                        rounded-full ring-2 ring-base-100"
                      />
                    )}
                  </div>

                  <div className="hidden lg:block text-left min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <div className="font-semibold truncate text-sm">
                        {user.fullName}
                      </div>

                      <div className="flex items-center gap-2">
                        {unreadCounts?.[user._id] > 0 && (
                          <div className="badge badge-sm badge-primary">
                            {unreadCounts[user._id]}
                          </div>
                        )}
                        {isChatPinned && (
                          <PinIcon
                            size={13}
                            className="text-primary fill-primary shrink-0 rotate-45"
                          />
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-base-content/60 mt-0.5">
                      {typingUsers?.includes(user._id) ? (
                        <span className="text-success font-semibold animate-pulse">
                          Typing...
                        </span>
                      ) : onlineUsers.includes(user._id) ? (
                        <span className="text-green-500">Online</span>
                      ) : (
                        "Offline"
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {sortedUsers.length === 0 && (
              <div className="text-center text-sm text-base-content/50 py-8 animate-fadeIn">
                No users found
              </div>
            )}
          </>
        )}
      </div>

      {/* Right Click Action Dropdown Box */}
      {menuOptions.show && (
        <div
          className="fixed mb-2 w-56 bg-base-200 border border-base-300 rounded-2xl shadow-2xl py-2 z-50 animate-fadeIn"
          style={{
            top: menuOptions.y,
            left: menuOptions.x,
            transform: `
                ${menuOptions.x + 224 > window.innerWidth ? "translateX(-100%)" : "translateX(0)"} 
                ${menuOptions.y + 300 > window.innerHeight ? "translateY(-100%)" : "translateY(0)"}
              `,
          }}
        >
          {selectedGroup ? (
            <>
              {!selectedGroup.isDeletedGroup && !selectedGroup.isDeleted && (
                <MenuOptionsBox
                  icon={UserPlus}
                  label="Add Member"
                  onClick={() => {
                    openModal("AddMember", menuOptions.userId);
                    setMenuOptions((prev) => ({ ...prev, show: false }));
                  }}
                />
              )}

              <hr className="border-base-300 my-1" />

              {!selectedGroup.isDeletedGroup && !selectedGroup.isDeleted && (
                <MenuOptionsBox
                  icon={LogOut}
                  label="Leave Group"
                  className="text-error hover:bg-error/10"
                  onClick={() => {
                    openModal("LeaveGroup", menuOptions.userId);
                    setMenuOptions((prev) => ({ ...prev, show: false }));
                  }}
                />
              )}

              {isCreatorOfGroup && !selectedGroup.isDeletedGroup && !selectedGroup.isDeleted && (
                <MenuOptionsBox
                  icon={Trash}
                  label="Delete Group"
                  className="text-error hover:bg-error/10"
                  onClick={() => {
                    openModal("DeleteGroup", menuOptions.userId);
                    setMenuOptions((prev) => ({ ...prev, show: false }));
                  }}
                />
              )}
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
