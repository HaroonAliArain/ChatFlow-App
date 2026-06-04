<p align="center">
  <img src="client/chatApp/public/chatflow-logo.svg" alt="ChatFlow Logo" width="80" />
</p>

<h1 align="center">ChatFlow — Real-Time Chat Application</h1>

<p align="center">
  A full-stack real-time messaging application built with the <strong>MERN Stack</strong> (MongoDB, Express.js, React, Node.js) featuring instant messaging via <strong>Socket.IO</strong>, <strong>Redis</strong> caching, <strong>Cloudinary</strong> media storage, and a modern responsive UI.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-5.2-000000?logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Socket.IO-4.8-010101?logo=socket.io&logoColor=white" />
  <img src="https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white" />
  <img src="https://img.shields.io/badge/TailwindCSS-4.2-06B6D4?logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-8.0-646CFF?logo=vite&logoColor=white" />
</p>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Backend Architecture](#backend-architecture)
  - [Database Models](#database-models)
  - [API Endpoints](#api-endpoints)
  - [Socket.IO Events](#socketio-events)
  - [Redis Caching](#redis-caching)
- [Frontend Architecture](#frontend-architecture)
  - [State Management](#state-management)
  - [Routing](#routing)
  - [Components](#components)
  - [Services](#services)
  - [Custom Hooks](#custom-hooks)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Environment Variables](#environment-variables)
- [How It Works](#how-it-works)
- [Dependencies](#dependencies)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**ChatFlow** is a feature-rich, real-time messaging application that supports private one-on-one conversations and group chats. It provides a WhatsApp-like experience with features such as real-time message delivery tracking (sent → delivered → seen), typing indicators, emoji reactions, message forwarding, file/image sharing, stickers, and much more.

The app is split into two parts:

| Part | Location | Description |
|------|----------|-------------|
| **Backend (Server)** | `server/` | Express.js REST API + Socket.IO server |
| **Frontend (Client)** | `client/chatApp/` | React + Vite single-page application |

---

## Features

### Messaging
- **Real-time messaging** — instant message delivery using Socket.IO
- **Private chats** — one-on-one conversations between two users
- **Group chats** — multi-user conversations with admin controls
- **Message status tracking** — sent ✓, delivered ✓✓, seen ✓✓ (blue ticks like WhatsApp)
- **Typing indicators** — see when someone is typing in real-time (shown in the conversation sidebar list and active chat header dynamically)
- **Message editing** — edit your sent text messages
- **Message deletion** — soft delete with "This message was deleted" placeholder (delete for me / delete for everyone)
- **Message forwarding** — forward any message to another conversation
- **Reply to messages** — reply to a specific message with context preview
- **Optimistic updates** — messages appear instantly before server confirmation
- **Message drafts** — drafts are saved per conversation when switching between chats
- **Chronological Message Ordering** — previous messages are shown at the top, and newest messages are displayed at the bottom

### Media & Attachments
- **Image sharing** — send images with optional captions and in-chat preview
- **Video sharing** — send video files with a fixed aspect ratio and responsive styling for small/medium screen layouts
- **File sharing** — send documents/files up to 50 MB with direct proxy downloading (no "open" button for simplified operations)
- **Stickers** — built-in sticker picker with Noto Emoji stickers
- **Emoji picker** — full emoji keyboard powered by `emoji-picker-react`
- **Image viewer** — fullscreen image viewer with download support
- **File preview** — opens PDFs/images in browser, Office files via Google Docs Viewer
- **Proxy download** — secure file downloads routed through backend to avoid CORS issues
- **Cloudinary storage** — all media files stored on Cloudinary with auto resource type detection
- **Dynamic Upload Progress** — real-time animated percentage spinner displaying actual upload progress from 0% to 100% for all images, videos, and documents

### User Management
- **User registration** — create account with name, email, and password
- **Login / Logout** — JWT-based authentication with session management
- **Forgot password** — OTP-based password reset via email (Nodemailer + Gmail SMTP)
- **Profile management** — update name, bio/status message, and profile picture
- **Avatar upload** — upload custom profile pictures to Cloudinary
- **Password change** — change password from profile settings
- **User search** — search users by name or email to start new conversations

### Group Features
- **Create groups** — create group chats with custom name and 3+ participants
- **Admin system** — group creator becomes admin with elevated permissions
- **Add members** — admins can add new members to the group
- **Remove members** — admins can remove members from the group
- **Leave group** — members can leave a group (auto-promotes next member to admin if sole admin leaves)
- **Update group info** — admins can change group name, image, and description
- **Delete group** — admins can delete the entire group and all its messages

### Conversations
- **Pin conversations** — pin important chats to the top of the list
- **Mute conversations** — mute notifications for specific chats
- **Unread count** — badge showing number of unread messages per chat
- **Filter tabs** — filter conversations by All, Unread, Personal (DMs), Groups
- **Search conversations** — search through your conversation list
- **Last message preview** — sidebar shows the most recent message per chat

### Real-Time Features
- **Online/Offline status** — see who's online in real-time
- **Last seen timestamps** — shows "last seen today 10:30 AM" / "yesterday" etc.
- **Offline message queue** — messages sent to offline users are queued in Redis and delivered on reconnect
- **Reconnect sync** — missed messages are automatically synced when reconnecting
- **Notification sounds** — custom two-tone chime using Web Audio API (configurable)
- **PWA & App Install Support** — install ChatFlow as a standalone application on mobile and PC; the install option is dynamically displayed in the sidebar exclusively for online users

### UI/UX
- **Dark / Light mode** — theme toggle with persistent preference
- **Responsive design** — works on mobile and desktop (sidebar collapses on mobile)
- **Smooth animations** — fade-in, slide-in, and scale animations throughout
- **Toast notifications** — success/error feedback messages (with elegant, non-intrusive error toasts for failed uploads)
- **Confirm dialogs** — confirmation before destructive actions
- **Message reactions** — react to messages with emojis (👍 ❤️ 😂 😮 😢 🙏) with optimistic UI updates
- **Reactions modal** — view who reacted to a message with option to remove your reaction
- **Context menu** — right-click or tap the dropdown on messages for reply, copy, forward, edit, delete options
- **Contacts tab** — browse and search all registered users
- **Settings navigation** — bottom navigation bar with Chats, Contacts, Calls (coming soon), Settings

---

## Tech Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18+ | JavaScript runtime |
| **Express.js** | 5.2 | Web framework for REST API |
| **MongoDB** | Atlas | NoSQL database for storing all data |
| **Mongoose** | 9.2 | MongoDB ODM (Object Data Modeling) |
| **Socket.IO** | 4.8 | Real-time bidirectional communication |
| **Redis** | 5.11 | In-memory caching and offline message queue |
| **JWT** | 9.0 | Authentication tokens (JSON Web Tokens) |
| **bcryptjs** | 3.0 | Password hashing |
| **Cloudinary** | 2.9 | Cloud-based media storage |
| **Multer** | 2.1 | Multipart file upload handling (memory storage) |
| **Nodemailer** | 8.0 | Email sending for OTP password reset |
| **Streamifier** | 0.1 | Convert Buffer to readable stream for Cloudinary upload |
| **dotenv** | 17.3 | Environment variable management |
| **Nodemon** | 3.1 | Auto-restart during development |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.2 | UI component library |
| **Vite** | 8.0 | Build tool and dev server |
| **TailwindCSS** | 4.2 | Utility-first CSS framework |
| **Zustand** | 5.0 | Lightweight state management |
| **React Router DOM** | 7.14 | Client-side routing |
| **Axios** | 1.15 | HTTP client for API requests |
| **Socket.IO Client** | 4.8 | Real-time communication client |
| **emoji-picker-react** | 4.18 | Emoji keyboard component |
| **react-icons** | 5.6 | Icon library (Ionicons) |
| **date-fns** | 4.1 | Date formatting utilities |
| **ESLint** | 9.39 | Code linting |

---

## Project Structure

```
Chat App/
├── client/                              # Frontend application
│   └── chatApp/
│       ├── public/
│       │   ├── chatflow-logo.svg        # App logo
│       │   ├── notification.wav         # Notification sound file
│       │   ├── manifest.json            # PWA manifest configurations
│       │   └── sw.js                    # Service Worker caching script
│       ├── src/
│       │   ├── assets/                  # Static assets
│       │   ├── components/
│       │   │   ├── chat/
│       │   │   │   ├── ChatHeader.jsx       # Chat header with user info, actions
│       │   │   │   ├── MessageBubble.jsx    # Individual message bubble (711 lines)
│       │   │   │   ├── MessageInput.jsx     # Message input with emoji, stickers, file upload
│       │   │   │   ├── MessageList.jsx      # Scrollable message list with date separators
│       │   │   │   └── TypingIndicator.jsx  # "typing..." animation
│       │   │   ├── common/
│       │   │   │   ├── Avatar.jsx           # Reusable avatar component
│       │   │   │   ├── Button.jsx           # Reusable button component
│       │   │   │   ├── ConfirmDialog.jsx    # Confirmation dialog modal
│       │   │   │   ├── Input.jsx            # Reusable input component
│       │   │   │   ├── Loader.jsx           # Loading spinner
│       │   │   │   └── Toast.jsx            # Toast notification component
│       │   │   ├── modals/
│       │   │   │   ├── AddMemberModal.jsx       # Add member to group modal
│       │   │   │   ├── CreateGroupModal.jsx     # Create new group modal
│       │   │   │   ├── ForwardModal.jsx         # Forward message modal
│       │   │   │   └── ImagePreviewModal.jsx    # Image preview modal
│       │   │   └── sidebar/
│       │   │       ├── ConservationItem.jsx      # Single conversation list item
│       │   │       ├── SearchBar.jsx             # Search bar component
│       │   │       └── Sidebar.jsx               # Main sidebar (408 lines)
│       │   ├── hooks/
│       │   │   ├── useAuth.js           # Authentication operations hook
│       │   │   ├── useChat.js           # Chat operations hook
│       │   │   └── useSocket.js         # Socket connection lifecycle hook
│       │   ├── layout/
│       │   │   ├── AuthLayout.jsx       # Layout wrapper for auth pages
│       │   │   └── MainLayout.jsx       # Layout wrapper for app pages
│       │   ├── pages/
│       │   │   ├── Auth/
│       │   │   │   ├── Login.jsx        # Login page
│       │   │   │   ├── Register.jsx     # Registration page
│       │   │   │   └── OTP.jsx          # OTP verification page (forgot password)
│       │   │   ├── Chat/
│       │   │   │   ├── ChatLayout.jsx   # Chat layout wrapper
│       │   │   │   └── ChatPage.jsx     # Main chat page (sidebar + chat area)
│       │   │   └── Profile/
│       │   │       └── ProfilePage.jsx  # Profile, settings, theme, security page
│       │   ├── routes/
│       │   │   ├── AppRoutes.jsx        # Route definitions
│       │   │   ├── ProtectedRoute.jsx   # Auth guard for protected routes
│       │   │   └── PublicRoute.jsx      # Redirect authenticated users away
│       │   ├── services/
│       │   │   ├── api.js               # Axios instance with interceptors
│       │   │   ├── authService.js       # Auth API calls
│       │   │   ├── conversationService.js  # Conversation API calls
│       │   │   ├── messageService.js    # Message API calls
│       │   │   ├── userService.js       # User search + media upload
│       │   │   └── socket.js           # Socket.IO client instance
│       │   ├── store/
│       │   │   ├── authStore.js         # Auth state (Zustand)
│       │   │   ├── chatStore.js         # Chat/conversation state (Zustand)
│       │   │   ├── messageStore.js      # Message state (Zustand)
│       │   │   ├── socketStore.js       # Socket state + event handlers (Zustand)
│       │   │   └── themeStore.js        # Theme + notification preferences (Zustand)
│       │   ├── utils/
│       │   │   ├── constants.js         # Socket events, message types, defaults
│       │   │   ├── formatTime.js        # Date/time formatting helpers
│       │   │   └── notificationSound.js # Web Audio API notification chime
│       │   ├── App.jsx                  # Root component
│       │   ├── main.jsx                 # Entry point
│       │   └── index.css                # Global styles + theme variables
│       ├── index.html                   # HTML entry point
│       ├── vite.config.js               # Vite configuration
│       ├── eslint.config.js             # ESLint configuration
│       ├── package.json                 # Frontend dependencies
│       └── .env                         # Frontend environment variables
│
└── server/                              # Backend application
    ├── src/
    │   ├── config/
    │   │   ├── db.js                    # MongoDB connection
    │   │   ├── redis.js                 # Redis client with graceful degradation
    │   │   ├── cloudinary.js            # Cloudinary SDK configuration
    │   │   └── multer.js                # Multer file upload config (50 MB limit)
    │   ├── controllers/
    │   │   ├── userController.js        # Auth, profile, OTP, search (13 KB)
    │   │   ├── conversationController.js  # CRUD conversations, groups (26 KB)
    │   │   ├── messageController.js     # Send, edit, delete, forward, react (31 KB)
    │   │   └── mediaController.js       # Upload to Cloudinary, proxy download
    │   ├── middlewares/
    │   │   ├── authMiddleware.js         # JWT auth + role-based authorization
    │   │   └── errorMiddleware.js        # Global error handler
    │   ├── models/
    │   │   ├── User.js                  # User schema
    │   │   ├── Conversation.js          # Conversation schema (private + group)
    │   │   ├── Message.js               # Message schema (text, image, video, file, sticker)
    │   │   └── Notification.js          # Notification schema
    │   ├── routes/
    │   │   ├── userRoutes.js            # /api/users routes
    │   │   ├── conversationRoutes.js    # /api/conversations routes
    │   │   ├── messageRoutes.js         # /api/messages routes
    │   │   └── mediaRoutes.js           # /api/media routes
    │   ├── socket/
    │   │   └── socket.js                # Socket.IO server (368 lines)
    │   └── utils/
    │       └── uploadToCloudinary.js    # Stream upload helper
    ├── public/
    │   └── avatars/
    │       ├── defaultProfileImage.png  # Default user avatar
    │       └── defaultGroupImage.png    # Default group avatar
    ├── server.js                        # Entry point
    ├── package.json                     # Backend dependencies
    └── .env                             # Backend environment variables
```

---

## Backend Architecture

### Database Models

#### User Model

| Field | Type | Description |
|-------|------|-------------|
| `name` | String | User's display name (required, trimmed) |
| `email` | String | Email address (required, unique, regex validated, lowercase) |
| `password` | String | Hashed password (bcrypt, 10 salt rounds) |
| `profilePicture` | String | Avatar URL (default: `/avatars/defaultProfileImage.png`) |
| `bio` | String | Status message (default: "Hey there! I'm using Chat App.") |
| `isOnline` | Boolean | Current online status |
| `lastSeen` | Date | Timestamp of last disconnect |
| `role` | String | `'user'` or `'admin'` |
| `otp` | String | 6-digit OTP for password reset |
| `otpExpiry` | Date | OTP expiration time (5 minutes) |
| `isVerified` | Boolean | Email verification status |

#### Conversation Model

| Field | Type | Description |
|-------|------|-------------|
| `participants` | Array | `{ user, role, isMuted, isPinned }` subdocuments |
| `isGroup` | Boolean | `false` = private chat, `true` = group chat |
| `groupName` | String | Group name (required if `isGroup` is true) |
| `groupImage` | String | Group avatar URL |
| `groupDescription` | String | Group description |
| `lastMessage` | ObjectId → Message | Reference to the latest message |
| `lastMessageAt` | Date | Timestamp for sorting conversations |

**Validation Rules:**
- Private chats must have exactly 2 participants with no admin roles
- Groups must have at least 1 participant and at least one admin
- No duplicate users in participants

#### Message Model

| Field | Type | Description |
|-------|------|-------------|
| `senderId` | ObjectId → User | Message sender |
| `conversation` | ObjectId → Conversation | Parent conversation |
| `content` | String | Text content |
| `mediaUrl` | String | URL to attached media on Cloudinary |
| `fileName` | String | Original filename for file attachments |
| `cloudinaryId` | String | Cloudinary asset ID (for deletion) |
| `messageType` | String | `text`, `image`, `video`, `file`, or `sticker` |
| `status` | String | `sent`, `delivered`, or `seen` |
| `deliveredAt` | Date | When the message was delivered |
| `seenAt` | Date | When the message was seen |
| `isDeleted` | Boolean | Soft delete flag |
| `isEdited` | Boolean | Whether the message has been edited |
| `replyTo` | ObjectId → Message | Reference to the message being replied to |
| `reactions` | Array | `[{ user, emoji }]` — emoji reactions |
| `isForwarded` | Boolean | Whether the message was forwarded |
| `forwardedFrom` | ObjectId → Conversation | Original conversation if forwarded |

**Indexes:**
- `{ conversation, status, senderId }` — for delivery tracking and unread queries
- `{ content: "text" }` — full-text search on message content

#### Notification Model

| Field | Type | Description |
|-------|------|-------------|
| `sender` | ObjectId → User | Who triggered the notification |
| `receiver` | ObjectId → User | Who receives the notification |
| `type` | String | `message`, `reaction`, or `reply` |
| `message` | ObjectId → Message | Related message |
| `conversationId` | ObjectId → Conversation | Related conversation |
| `isRead` | Boolean | Read status |

---

### API Endpoints

#### User Routes — `/api/users`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/register` | ❌ | Register a new user |
| `POST` | `/login` | ❌ | Login and receive JWT token |
| `GET` | `/profile` | ✅ | Get authenticated user's profile |
| `PUT` | `/updateProfile` | ✅ | Update name, bio, profile picture |
| `PUT` | `/updatePassword` | ✅ | Change password |
| `PUT` | `/onlineStatus` | ✅ | Update online status |
| `GET` | `/search?q=...` | ✅ | Search users by name or email (max 20 results) |
| `POST` | `/requestOtp` | ❌ | Request 6-digit OTP via email |
| `POST` | `/verifyOtp` | ❌ | Verify OTP and get reset token |
| `POST` | `/resetPassword` | ❌ | Reset password using reset token |

#### Conversation Routes — `/api/conversations`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/` | ✅ | Get all conversations (Redis cached, 5 min TTL) |
| `POST` | `/private` | ✅ | Create or get existing private chat |
| `POST` | `/group` | ✅ | Create a new group (min 3 participants) |
| `PUT` | `/:id/add-member` | ✅ | Add member to group (admin only) |
| `PUT` | `/:id/remove-member` | ✅ | Remove member from group (admin only) |
| `PUT` | `/:id/update-group` | ✅ | Update group name/image/description (admin only) |
| `PUT` | `/:id/mute` | ✅ | Toggle mute for a conversation |
| `PUT` | `/:id/pin` | ✅ | Toggle pin for a conversation |
| `PUT` | `/:id/leave` | ✅ | Leave a group conversation |
| `DELETE` | `/:id/delete` | ✅ | Delete conversation and all messages |

#### Message Routes — `/api/messages`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/` | ✅ | Send a message |
| `POST` | `/forward` | ✅ | Forward a message to another conversation |
| `GET` | `/:conversationId` | ✅ | Get paginated messages (page & limit query params) |
| `GET` | `/search?conversationId=...&query=...` | ✅ | Full-text search messages |
| `GET` | `/unread/:conversationId` | ✅ | Get unread message count |
| `PUT` | `/seen/:conversationId` | ✅ | Mark all messages as seen |
| `PUT` | `/delivered/:conversationId` | ✅ | Mark messages as delivered |
| `PUT` | `/edit/:messageId` | ✅ | Edit a message's content |
| `PUT` | `/react/:messageId` | ✅ | Add/update emoji reaction |
| `DELETE` | `/react/:messageId` | ✅ | Remove your reaction |
| `DELETE` | `/:messageId` | ✅ | Soft-delete a message |
| `PUT` | `/read/:id` | ✅ | Mark notification as read |

#### Media Routes — `/api/media`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/upload` | ✅ | Upload file to Cloudinary (max 50 MB) |
| `GET` | `/download?url=...&filename=...` | ❌ | Proxy download from Cloudinary |

---

### Socket.IO Events

#### Client → Server Events

| Event | Data | Description |
|-------|------|-------------|
| `join_chat` | `conversationId` | Join a conversation room |
| `leave_chat` | `conversationId` | Leave a conversation room |
| `send_message` | `{ conversationId, content, ... }` | Send a message via socket (with ACK callback) |
| `message_delivered` | `{ messageId }` | Mark a message as delivered |
| `message_seen` | `{ conversationId }` | Mark all messages in a conversation as seen |
| `typing_start` | `conversationId` | User started typing |
| `typing_stop` | `conversationId` | User stopped typing |
| `fetch_messages` | `{ conversationId, page, limit }` | Fetch paginated messages (with ACK callback) |
| `reconnect_sync` | `{ lastSyncTime }` | Sync missed messages since last connection |
| `delete_message` | `{ messageId }` | Request message deletion |

#### Server → Client Events

| Event | Data | Description |
|-------|------|-------------|
| `getOnlineUsers` | `[userId, ...]` | Broadcast list of all online user IDs |
| `receive_message` | `message` | New message in a conversation room |
| `receiveMessage` | `message` | Direct message to individual socket (from REST API) |
| `message_status_updated` | `{ messageId, status, deliveredAt }` | Delivery/seen status change |
| `messages_seen` | `{ conversationId, userId, seenAt }` | Bulk seen notification |
| `pending_messages` | `[messages]` | Queued offline messages delivered on reconnect |
| `sync_messages` | `{ messages }` | Missed messages since last sync time |
| `typing` | `{ conversationId, isTyping }` | Typing indicator for a conversation room |
| `message_deleted` | `{ messageId }` | Message was deleted |
| `message_edited` | `{ messageId, content, isEdited }` | Message was edited |
| `message_reacted` | `{ messageId, reactions }` | Reaction update on a message |
| `new_notification` | Notification object | Push notification for new message/reaction |

**Socket Authentication:** JWT token is sent via `socket.handshake.auth.token` and verified in Socket.IO middleware before allowing connection.

---

### Redis Caching

Redis is used for two main purposes: **caching** and **offline message queuing**. The app works fine without Redis (graceful degradation — runs in "DB-only mode").

| Key Pattern | Type | TTL | Purpose |
|-------------|------|-----|---------|
| `user:{userId}:conversations` | String (JSON) | 5 min | Cached conversation list per user |
| `chat:{conversationId}:messages` | List (JSON) | 5 min | Cached message thread (page 1, max 50) |
| `user:{userId}:pending_messages` | Set | 7 days | Offline message queue |

**Cache invalidation:** All data mutations (send message, edit, delete, create/update conversation) automatically invalidate the relevant Redis caches for all affected participants.

---

## Frontend Architecture

### State Management

The app uses **Zustand** for state management with 5 dedicated stores:

| Store | File | Responsibility |
|-------|------|----------------|
| **authStore** | `store/authStore.js` | User data, JWT token, login/logout, session hydration |
| **chatStore** | `store/chatStore.js` | Conversation list, selected chat, drafts, unread counts |
| **messageStore** | `store/messageStore.js` | Messages array, reply/edit/forward state, optimistic updates |
| **socketStore** | `store/socketStore.js` | Socket connection, online users, typing status, event listeners |
| **themeStore** | `store/themeStore.js` | Dark/light theme, notification preferences (persisted in localStorage) |

**Session persistence:**
- JWT token is stored in `sessionStorage` (cleared on browser tab close)
- Theme and notification preferences are stored in `localStorage` (persist across sessions)
- On page refresh, auth is rehydrated from sessionStorage and user profile is fetched from the API

---

### Routing

| Path | Component | Access | Description |
|------|-----------|--------|-------------|
| `/` | → Redirect to `/chat` | — | Default route |
| `/login` | `Login` | Public | Login page |
| `/register` | `Register` | Public | Registration page |
| `/otp` | `OTP` | Public | OTP verification for password reset |
| `/chat` | `ChatPage` | Protected | Main chat interface |
| `/profile` | `ProfilePage` | Protected | Profile, settings, security |

**Route guards:**
- `ProtectedRoute` — redirects to `/login` if not authenticated
- `PublicRoute` — redirects to `/chat` if already authenticated

---

### Components

#### Chat Components (`components/chat/`)

| Component | Description |
|-----------|-------------|
| **ChatHeader** | Displays selected chat info (name, avatar, online status, last seen), group member list, and actions (mute, pin, leave, add member, delete) |
| **MessageBubble** | Renders a single message with support for text, images, files, stickers, reactions, reply preview, forwarded badge, edit indicator, status ticks, context menu (reply, copy, forward, edit, delete), fullscreen image viewer, and reactions modal |
| **MessageInput** | Text input with emoji picker, sticker picker, attachment menu (photo/file/sticker), file preview with caption, reply/edit banners, typing indicator emission, draft persistence, and optimistic message sending |
| **MessageList** | Scrollable message list with auto-scroll to bottom, date separator headers (Today, Yesterday, Apr 10, 2026), and per-message rendering |
| **TypingIndicator** | Animated typing dots shown when another user is typing |

#### Common Components (`components/common/`)

| Component | Description |
|-----------|-------------|
| **Avatar** | Reusable avatar with fallback to initials via UI Avatars API, online indicator dot, and multiple sizes (xs, sm, md, lg, xl) |
| **Button** | Reusable styled button with loading state |
| **ConfirmDialog** | Modal dialog for confirming destructive actions |
| **Input** | Reusable styled input field |
| **Loader** | Loading spinner animation |
| **Toast** | Auto-dismissing success/error toast notification |

#### Modal Components (`components/modals/`)

| Component | Description |
|-----------|-------------|
| **CreateGroupModal** | Multi-step modal: search users → select participants → set group name → create |
| **AddMemberModal** | Search and add new members to an existing group |
| **ForwardModal** | Select a conversation to forward a message to |
| **ImagePreviewModal** | Fullscreen image preview |

#### Sidebar Components (`components/sidebar/`)

| Component | Description |
|-----------|-------------|
| **Sidebar** | Main sidebar with: logo, search bar, conversation filter tabs (All/Unread/Personal/Groups), conversation list, contacts view with user search, calls placeholder, settings navigation, user profile bar with connection status, bottom navigation tabs |
| **ConversationItem** | Single conversation row showing avatar, name, last message preview, timestamp, unread badge, typing indicator, online dot, pinned/muted icons |
| **SearchBar** | Reusable search input component |

---

### Services

The `services/` directory contains API client functions organized by domain:

| File | Functions | Description |
|------|-----------|-------------|
| **api.js** | Axios instance | Base Axios config with `VITE_API_URL`, auth interceptor (Bearer token from sessionStorage), auto-logout on 401 |
| **authService.js** | `loginUser`, `registerUser`, `requestOTP`, `verifyOTP`, `getProfile`, `updateProfile`, `updatePassword`, `resetPassword` | All authentication and profile API calls |
| **conversationService.js** | `getConversations`, `createPrivateChat`, `createGroupChat`, `addGroupMember`, `removeGroupMember`, `updateGroupInfo`, `deleteConversation`, `toggleMuteChat`, `togglePinChat`, `leaveGroup` | All conversation management API calls |
| **messageService.js** | `getMessages`, `sendMessage`, `deleteMessage`, `editMessage`, `markAsSeen`, `markAsDelivered`, `searchMessages`, `reactToMessage`, `removeReaction`, `getUnreadCount`, `forwardMessage` | All message operation API calls |
| **userService.js** | `searchUsers`, `uploadMedia` | User search and media file upload |
| **socket.js** | Socket.IO instance | Socket client configured with `autoConnect: false` and manual connection control |

---

### Custom Hooks

| Hook | Description |
|------|-------------|
| **useAuth** | Encapsulates login, register, and logout flows with navigation. Connects/disconnects socket on auth state change. |
| **useChat** | Manages chat selection: leaves previous socket room, joins new room, fetches messages, marks them as seen. |
| **useSocket** | Lifecycle hook used in `App.jsx` — connects socket when authenticated, disconnects on logout. |

---

## Getting Started

### Prerequisites

Make sure you have the following installed on your machine:

- **Node.js** (version 18 or higher) — [Download](https://nodejs.org/)
- **MongoDB Atlas** account (free tier works) — [Sign up](https://www.mongodb.com/atlas)
- **Redis** server (optional but recommended) — [Download](https://redis.io/download) or use Docker: `docker run -p 6379:6379 redis`
- **Cloudinary** account (free tier works) — [Sign up](https://cloudinary.com/)
- **Gmail App Password** for email OTP (or any SMTP provider)

---

### Backend Setup

1. **Navigate to the server directory:**
   ```bash
   cd server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create the `.env` file** (see [Environment Variables](#environment-variables) section below)

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   The server will start on `http://localhost:5000` (or your configured PORT).

---

### Frontend Setup

1. **Navigate to the client directory:**
   ```bash
   cd client/chatApp
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create the `.env` file:**
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   The app will open on `http://localhost:5173`.

5. **Build for production (optional):**
   ```bash
   npm run build
   ```

---

### Environment Variables

#### Server (`server/.env`)

```env
# Server
PORT=5000

# MongoDB
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?appName=chatApp

# JWT Authentication
JWT_SECRET_KEY=your_super_secret_jwt_key_here
EXPIRES_IN=7d

# Email (Gmail SMTP for OTP)
EMAIL_USER=your.email@gmail.com
EMAIL_PASS=your_gmail_app_password

# Cloudinary (Media Storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Redis (Optional — app works without it)
REDIS_URL=redis://localhost:6379
```

#### Client (`client/chatApp/.env`)

```env
VITE_API_URL=http://localhost:5000/api
```

> **How to get a Gmail App Password:**
> 1. Go to your Google Account → Security → 2-Step Verification (enable it)
> 2. Go to [App Passwords](https://myaccount.google.com/apppasswords)
> 3. Generate a new app password for "Mail"
> 4. Use that 16-character password as `EMAIL_PASS`

---

## How It Works

### Authentication Flow

```
1. User registers → password hashed with bcrypt → saved to MongoDB
2. User logs in → server validates credentials → returns JWT token + user data
3. Token stored in sessionStorage → sent as Bearer token in all API requests
4. Socket connects with JWT in handshake.auth → server verifies before allowing connection
5. On page refresh → token rehydrated from sessionStorage → user profile fetched from /api/users/profile
6. On 401 response → auto-logout and redirect to /login
```

### Message Flow

```
1. User types message → optimistic message shown instantly (temp ID)
2. REST API call: POST /api/messages → message saved to MongoDB
3. Server emits "receiveMessage" to recipient's socket (if online)
4. Server auto-marks as "delivered" if recipient is online
5. If recipient is offline → message ID queued in Redis (7-day TTL)
6. Recipient comes online → pending messages emitted → marked as delivered → queue cleared
7. Recipient opens the chat → "message_seen" emitted → all messages marked as seen
8. Server confirms message → replaces temp message with real data
```

### Forgot Password Flow

```
1. User enters email on OTP page
2. Server generates 6-digit OTP → sends via Gmail (Nodemailer)
3. OTP stored in database with 5-minute expiry
4. User enters OTP → server verifies → returns a reset token (10-min JWT)
5. User enters new password with reset token → password updated
```

---

## Dependencies

### Backend (`server/package.json`)

| Package | Purpose |
|---------|---------|
| `express` | Web framework for building the REST API |
| `mongoose` | MongoDB object modeling and schema validation |
| `socket.io` | WebSocket server for real-time bidirectional communication |
| `redis` | Redis client for caching and offline message queue |
| `jsonwebtoken` | JWT creation and verification for authentication |
| `bcryptjs` | Password hashing with salt |
| `cloudinary` | Cloud storage SDK for image/file uploads |
| `multer` | Middleware for handling multipart/form-data (file uploads) |
| `streamifier` | Converts Buffer to ReadableStream for Cloudinary streaming |
| `nodemailer` | Sends OTP emails via SMTP (Gmail) |
| `cors` | Cross-Origin Resource Sharing configuration |
| `dotenv` | Loads environment variables from `.env` file |
| `nodemon` | (dev) Auto-restarts server on file changes |

### Frontend (`client/chatApp/package.json`)

| Package | Purpose |
|---------|---------|
| `react` | UI component library |
| `react-dom` | React DOM renderer |
| `react-router-dom` | Declarative routing for React |
| `zustand` | Lightweight state management (no boilerplate) |
| `axios` | Promise-based HTTP client with interceptors |
| `socket.io-client` | Socket.IO client for real-time communication |
| `tailwindcss` | Utility-first CSS framework |
| `@tailwindcss/vite` | TailwindCSS Vite plugin |
| `emoji-picker-react` | Rich emoji picker component |
| `react-icons` | SVG icon library (IonicIcons set used) |
| `date-fns` | Lightweight date utility library |
| `vite` | Next-gen frontend build tool |
| `@vitejs/plugin-react` | Vite plugin for React Fast Refresh |
| `eslint` | JavaScript linter |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

<p align="center">
  Built with ❤️ using the MERN Stack
</p>
