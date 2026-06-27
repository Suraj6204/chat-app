# Group Chat Flow

> Stack: React 19 + Zustand + Socket.IO Client (frontend) | Express + Mongoose + Socket.IO (backend) | MongoDB (database)

---

## Architecture Overview

```
Frontend (React + Zustand)  <--HTTP/REST-->  Backend (Express)  <-->  MongoDB
        |                                          |
        +-------Socket.IO (WebSocket)--------------+
```

---

## 1. Creating a Group (3-Step Modal)

### Step 1 — Trigger
User clicks **"New Group"** button in `Navbar.jsx:116`:
```jsx
onClick={() => openModal("Forward", "CreateGroup")}
```
This opens the `ForwardModal` with `modalData = "CreateGroup"`.

### Step 2 — Member Selection (`ForwardModal.jsx`)
- Title: "Add group members"
- Displays all users with checkboxes
- On submit → calls `openModal("GroupDetails", selectedUserIds)` → proceeds to Step 3 (`GroupDetailsModal.jsx:52`)

### Step 3 — Group Details (`GroupDetailsModal.jsx`)
- Form fields: group name (required), description (optional), group picture (optional, base64)
- On submit → calls `createNewGroup({ name, description, groupPic, memberIds })` in `useChatStore.js:335`

### Backend — `POST /api/groups/create` (`group.controller.js:5`)
- Protected by JWT middleware
- Creator is auto-included in members, auto-added as admin
- Creates a `Group` document:
  ```js
  {
    name, description, groupPic,
    creator: userId,
    members: [userId, ...memberIds],
    admins: [userId]
  }
  ```
- Returns populated group with member details (no passwords)

### Frontend State Update (`useChatStore.js:338-339`)
- New group appended to local `groups` state → appears in sidebar
- Emits `socket.emit("newGroupCreated", { groupId })` — **note: no backend handler exists for this event**

---

## 2. Loading Groups on App Start

### Sidebar mount (`Sidebar.jsx:86-89`)
```js
useEffect(() => {
  getUsers();
  getMyGroups();
}, []);
```

### `getMyGroups()` (`useChatStore.js:316-333`)
- `GET /api/groups/my-groups` → `Group.find({ members: { $in: [userId] } })` (`group.controller.js:40`)
- Updates `groups` state
- Emits `socket.emit("joinGroupRooms", { groupIds })` → backend joins socket into `group:<groupId>` rooms (`socket.js:119-126`)

---

## 3. Selecting a Group Chat

### Sidebar click (`Sidebar.jsx:148`)
```jsx
onClick={() => setSelectedUser({ ...group, isGroup: true })}
```
The `isGroup: true` flag tells all downstream components this is a group conversation.

### ChatContainer (`ChatContainer.jsx:150-161`)
- Fetches messages: `getMessages(selectedUser._id, true)` → uses `/groups/messages/:groupId` endpoint (`useChatStore.js:41-42`)
- Calls `subscribeToMessages()` to listen for real-time events

### Backend — `GET /api/groups/messages/:id` (`group.controller.js:57`)
```js
Message.find({ receiverId: groupId, conversationType: "group" })
  .populate("senderId", "fullName profilePic")
  .populate({ path: "replyTo", populate: { path: "senderId", select: "fullName" } })
```

---

## 4. Sending a Group Message

### MessageInput (`MessageInput.jsx:68-95`)
- User types & sends → calls `sendMessage({ text, image, video })` in store

### `sendMessage()` (`useChatStore.js:73-89`)
- Sets `conversationType: "group"` based on `selectedUser.isGroup`
- `POST /api/messages/send/:groupId` with payload `{ text, image, video, conversationType: "group", replyTo }`

### Backend — `sendMessage()` (`message.controller.js:75-133`)
1. Uploads image/video to Cloudinary if present
2. Saves `Message` document with `conversationType: "group"`, `receiverId: groupId`
3. Populates `replyTo` data
4. Emits **to Socket.IO room**:
   ```js
   io.to(`group:${receiverId}`).emit("newGroupMessage", { message, groupId })
   ```
5. Returns populated message in HTTP response

### Frontend (sender)
- Message appended to local state immediately:
  ```js
  set({ messages: [...messages, res.data] })
  ```

### Frontend (receivers)
- **Current issue**: `subscribeToMessages()` (`useChatStore.js:354-413`) has **no listener for `"newGroupMessage"`**. Other group members will NOT receive the message in real-time without a manual refresh.

---

## 5. Real-Time Socket.IO Rooms

### Backend (`socket.js:119-126`)
```js
socket.on("joinGroupRooms", ({ groupIds }) => {
  groupIds.forEach((groupId) => {
    socket.join(`group:${groupId}`);
  });
});
```
Each user's socket joins a room per group they belong to. Any message emitted to `io.to(\`group:${groupId}\`)` reaches all online members in that room.

---

## 6. Message Model — Dynamic Referencing

### `message.model.js:16-20`
```js
receiverId: {
  type: mongoose.Schema.Types.ObjectId,
  required: true,
  refPath: "conversationType"
}
```
- When `conversationType === "peer"` → `receiverId` references `User` model
- When `conversationType === "group"` → `receiverId` references `Group` model

This allows a single `messages` collection for both peer and group chats.

---

## 7. Group Model Schema

### `group.model.js`
```js
{
  name: String (required),
  description: String (optional),
  groupPic: String (optional),
  creator: ObjectId -> User (required),
  members: [ObjectId -> User],
  admins: [ObjectId -> User]
}
```

---

## Flaws & Gaps

### Critical

1. **Missing `newGroupMessage` Socket.IO listener on frontend**
   - Backend emits `"newGroupMessage"` to `group:<groupId>` room (`message.controller.js:117`)
   - Frontend `subscribeToMessages()` never listens for this event (`useChatStore.js:354-413`)
   - Other group members don't receive messages in real-time — they must refresh to see them
   - Sender sees the message immediately (from HTTP response), but no one else does

2. **Missing `newGroupCreated` backend handler**
   - Frontend emits `socket.emit("newGroupCreated", { groupId })` (`useChatStore.js:345`)
   - No `socket.on("newGroupCreated")` handler in `socket.js`
   - Other online group members don't get the new group added to their sidebar in real-time

### Moderate

3. **Wrong profile picture shown for group messages**
   - `ChatContainer.jsx:240` uses `selectedUser.profilePic` for all incoming messages
   - For groups, `selectedUser` is the group object → shows `groupPic` instead of the sender's avatar
   - `message.senderId.profilePic` is available but never used for group message display

4. **Reply-to header shows wrong name in groups**
   - `ChatContainer.jsx:296`: `selectedUser?.fullName || "User"` — this shows the group name, not the original message sender's name
   - For groups, should use `message.replyTo.senderId.fullName`
   - Similarly in `MessageInput.jsx:199`: `selectedUser?.fullName || "User"`

5. **Group message deletion not supported**
   - `deleteMessages` controller (`message.controller.js:135`) sends `messagesDeletedEveryone` only to a peer socket, not to a group room
   - `deleteChat` store method (`useChatStore.js:233-265`) has `// future group logic` placeholder — no implementation for groups

6. **Clear chat doesn't work for groups**
   - `clearChat` controller (`message.controller.js:183`) only handles peer-to-peer messages (filters by `senderId`/`receiverId` as ObjectIds)
   - For groups, same logic would match but would unintentionally clear ALL messages in the group for that user

### Minor

7. **Typing indicator doesn't work in groups**
   - `startTyping`/`stopTyping` events (`socket.js:77-90`) use `getReceiverSocketId(receiverId)` which looks up a user by ID
   - When `receiverId` is a group ID, no socket is found → typing indicator silently fails
   - Would need to broadcast to the group room with sender info

8. **Group creation back button loses selected members**
   - `GroupDetailsModal.jsx:52`: clicking back arrow calls `openModal("Forward", "CreateGroup")`
   - This just sets `modalData` to the string `"CreateGroup"`, losing the previously selected `memberIds`
   - User has to re-select all members from scratch

9. **Call button visible in group chat header**
   - `ChatHeader.jsx:10`: `isOnline = onlineUsers.includes(selectedUser._id)` — for groups, `selectedUser._id` is the group ID, which is never in `onlineUsers`
   - Call dropdown shows but is non-functional; should be hidden for group chats

10. **No group member management APIs**
    - No endpoints for: add/remove members, promote/demote admins, update group name/picture, leave group, transfer ownership, delete group

11. **Forwarding from within a group** (`useChatStore.js:188`)
    - `executeForward` hardcodes `conversationType: selectedUser?.isGroup ? "group" : "peer"` — messages forwarded from a group chat context are incorrectly tagged with `conversationType: "group"` even when forwarding to a peer user
