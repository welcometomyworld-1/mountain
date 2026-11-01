# PrivateID — Real-Time Chat & HD Video Calling Platform

> **Private, ID-based real-time communication platform.** Connect instantly using automatically generated unique Chat IDs without ever exposing phone numbers or personal identifiers.

---

## 🌟 Key Features

### 1. ID-Based Identity & Authentication
- **Unique Chat ID Generation**: Every registered user is assigned a unique Chat ID (e.g., `CHAT482913`).
- **Phoneless Authentication**: Sign in using your unique Chat ID and password. No phone number required.
- **Phoneless Account Recovery**: 2-step account recovery strategy using secure, bcrypt-hashed security questions.
- **Privacy Controls**: Granular settings to control who can view your online status and last-seen timestamp (`Everyone`, `My Contacts Only`, or `Nobody`), plus a toggle for read receipts.

### 2. Private Real-Time Messaging
- **Instant Messaging**: Real-time message transmission via Socket.IO WebSockets.
- **Delivery Indicators**: Sent (single check), Delivered (double check), and Read (double blue check) status receipts.
- **Interactive Messaging**:
  - Emoji picker with categorized smilies, gestures, hearts, and activities.
  - Emoji reactions with live count badges and user reaction toggles.
  - Quoted replies with jump-to context snippets.
  - Copy message content with one click.
  - Delete messages ("Delete for me" or "Delete for everyone").
- **Live Indicators**: Real-time typing indicators ("Alex is typing...") and unread message badges.
- **Database Persistence**: Persistent conversation history stored in MongoDB.

### 3. Secure Image Sharing
- **Pre-upload Preview**: View full-size image preview with file size validation and optional caption before sending.
- **Dual-Storage Architecture**:
  - **Cloud Storage**: Automatic integration with Cloudinary when credentials are provided in `.env`.
  - **Protected Local Storage**: Fallback to local storage with authenticated endpoints (`/api/upload/media/:filename`), ensuring private images cannot be accessed via unrestricted public URLs.
- **Thumbnails & Lightbox**: Responsive thumbnails in the chat stream with click-to-view fullscreen Lightbox modal and download options.

### 4. One-to-One HD WebRTC Video & Audio Calling
- **True WebRTC Communication**: Direct peer-to-peer audio and video streaming using native browser `RTCPeerConnection`.
- **Real-Time Signaling**: Call negotiation, SDP offers/answers, and ICE candidate exchange via Socket.IO.
- **In-Call Features**:
  - Incoming call modal with synthesized ringtones (Web Audio API).
  - Outgoing dialing state with busy and offline detection.
  - Camera On/Off and Microphone Mute/Unmute controls with live peer state synchronization.
  - Screen Sharing support (`getDisplayMedia`) with seamless return to webcam.
  - Picture-in-picture local self-view (mirrored) and full-bleed remote video view.
  - Live call duration timer and connection health status.
- **STUN / TURN Ready**: Default Google STUN servers configured with environment variable support for custom TURN relays (Coturn, Twilio, Metered).

### 5. Private Contacts & Security
- **Strict Privacy**: No public directories or user search. Users can only be found by entering their exact Chat ID.
- **Contact Management**: Save discovered users to contacts with custom nicknames.
- **Block / Unblock Users**: Blocked users cannot message, call, or see online presence.
- **Security Hardening**: Protected with `helmet`, `cors`, `express-rate-limit`, `bcryptjs`, and JWT tokens.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Tailwind CSS, Lucide Icons, Vite |
| **Backend** | Node.js, Express, Socket.IO, Mongoose, Multer, Helmet, Morgan |
| **Database** | MongoDB (with automatic embedded In-Memory fallback for zero-friction local testing) |
| **Media / WebRTC** | Native WebRTC `RTCPeerConnection`, Web Audio API, Cloudinary SDK |

---

## 📁 Project Structure

```
online chating/
├── package.json               # Root orchestrator scripts
├── server/
│   ├── .env                   # Local backend environment
│   ├── .env.example           # Environment variables template
│   ├── test-integration.js    # Automated integration test suite
│   ├── src/
│   │   ├── config/            # DB, Cloudinary, and config loaders
│   │   ├── controllers/       # Auth, User, Message, and Upload controllers
│   │   ├── middlewares/       # JWT auth, Multer upload, Rate limiters, Error handler
│   │   ├── models/            # User, Conversation, Message Mongoose models
│   │   ├── routes/            # Express REST endpoints
│   │   ├── sockets/           # Socket.IO connection, chat, and WebRTC call signaling
│   │   ├── utils/             # Chat ID generator, JWT helpers
│   │   └── index.js           # Server entry point
└── client/
    ├── index.html             # Client HTML with Google Fonts & metadata
    ├── vite.config.ts         # Vite configuration with API & WebSocket proxies
    ├── tailwind.config.js     # Tailwind CSS theme configuration
    ├── src/
        ├── api/               # Typed REST API client modules
        ├── components/
        │   ├── auth/          # AuthPage, ResetPasswordModal
        │   ├── chat/          # Sidebar, ChatArea, ChatHeader, MessageBubble, MessageInput, Lightbox, AddContactModal
        │   ├── call/          # IncomingCallModal, VideoCallRoom
        │   └── common/        # Avatar, StatusTick, SettingsModal, ThemeToggle
        ├── context/           # ThemeContext, AuthContext, SocketContext, ChatContext, CallContext
        ├── types/             # TypeScript definitions
        ├── utils/             # Sound synthesis (Web Audio API), WebRTC ICE config
        ├── App.tsx            # Main application layout and routing
        └── main.tsx           # React DOM root entry
```

---

## 🚀 Getting Started (Local Development)

### 1. Prerequisites
- **Node.js** v18+ (tested on Node v24)
- **npm** v9+

> **Note on MongoDB**: You do **not** need to install or run MongoDB locally to test PrivateID. If a local MongoDB instance is not detected, the backend will automatically boot an embedded in-memory MongoDB instance so you can start developing immediately.

### 2. Installation
From the root directory:
```bash
# Install root dependencies
npm install

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

Or run all installs with the root convenience script:
```bash
npm run install:all
```

### 3. Environment Configuration
The server includes a pre-configured `.env` file. You can customize settings in `server/.env`:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://localhost:27017/privateid
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Optional Cloudinary (for cloud image hosting)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Optional TURN Server (for enterprise NAT traversal)
TURN_URL=
TURN_USERNAME=
TURN_CREDENTIAL=
```

### 4. Running the Platform
Run both backend server and frontend client concurrently:
```bash
npm run dev
```

Or run them individually:
```bash
# In terminal 1 (Backend):
npm run dev:server

# In terminal 2 (Frontend):
npm run dev:client
```

- **Frontend**: `http://localhost:5173`
- **Backend API & WebSockets**: `http://localhost:5000`
- **Health Check**: `http://localhost:5000/health`

---

## 🧪 Automated Integration Tests

Run the built-in end-to-end integration test suite verifying all 10 core backend flows (registration, auto Chat ID generation, ID lookup, messaging, reactions, replies, and security question recovery):

```bash
cd server
node test-integration.js
```

---

## 👥 How to Test Between Two Users

1. Open `http://localhost:5173` in your primary browser window.
2. Click **Create Account** and register **User 1** (e.g., Alice).
   - Your unique Chat ID (e.g., `CHAT845761`) will be displayed in the sidebar header with a **Copy ID** button.
3. Open an **Incognito / Private Window** (or a second browser such as Firefox / Edge) and navigate to `http://localhost:5173`.
4. Click **Create Account** and register **User 2** (e.g., Bob).
   - Note Bob's unique Chat ID (e.g., `CHAT283847`).
5. In Alice's window:
   - Click the **+** (User Plus) button in the sidebar.
   - Enter Bob's exact Chat ID and click **Find**.
   - Click **Save Contact** or **Message Now**.
6. **Chat Testing**:
   - Send messages in real-time. Notice instant delivery and status ticks.
   - Attach photos, preview before sending, and click on thumbnails to view full-size in the Lightbox.
   - Hover over a message to reply, copy, or react with emojis (`❤️`, `👍`, `🔥`).
7. **Video Call Testing**:
   - In Alice's window, click the **Video Call** icon in the header.
   - Bob's window will instantly ring with an incoming call screen and sound.
   - Click **Accept** to connect the WebRTC audio/video call.
   - Test Camera On/Off, Microphone Mute, and Screen Share controls.
   - Click the red **End Call** button to hang up.

---

## 🌐 Production Deployment Guide (over HTTPS)

WebRTC and modern browser camera/microphone APIs require a secure origin (`https://` or `localhost`).

### 1. Backend Deployment (Render, Railway, or VPS)
1. Push your repository to GitHub.
2. Set environment variables on your host:
   - `NODE_ENV=production`
   - `PORT=5000`
   - `MONGODB_URI=<Your MongoDB Atlas Connection String>`
   - `JWT_SECRET=<Strong Random Secret>`
   - `CLIENT_URL=https://your-frontend-domain.com`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
3. Build & start script: `npm install && npm start`

### 2. Frontend Deployment (Vercel, Netlify, or Cloudflare Pages)
1. In `client/vite.config.ts`, update the API proxy or set `VITE_API_URL` to point to your deployed backend URL.
2. Build command: `npm run build`
3. Publish directory: `dist`

### 3. Nginx Reverse Proxy with SSL (Ubuntu/Debian)
```nginx
server {
    listen 80;
    server_name chat.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name chat.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/chat.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/chat.yourdomain.com/privkey.pem;

    # Frontend static files
    location / {
        root /var/www/privateid/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSockets & WebRTC Signaling
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 🛡️ License
MIT License. Built for secure, private peer-to-peer real-time communication.
