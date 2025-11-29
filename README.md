# ⚡ Port Assassin - Kill Localhost Processes Instantly

A powerful, lightning-fast desktop application to manage and kill localhost processes by port. **Essential for every developer.**

---

## ⚠️ IMPORTANT NOTE

This is a **vibe coding project** created for fun on a Saturday. It will **NOT be improved or actively maintained**. Use it as-is. No future updates or bug fixes are planned.

---

## 🎯 Why Port Assassin is Essential for Developers

### The Problem
Developers constantly face port conflicts when developing multiple applications locally. Whether you're switching between projects, restarting services, or debugging port-related issues, you need a fast way to:

- **Identify what's using each port** - Know immediately which process is occupying port 3000, 8080, or any other port
- **Kill processes without terminal** - No more opening terminal, typing `lsof -i :3000`, then `kill -9 <PID>`
- **Handle permission issues** - Automatically prompt for sudo when needed
- **Monitor watched ports** - Get real-time notifications when ports become available or occupied
- **Quick access to favorites** - Star your most-used ports for instant access

### The Solution
Port Assassin gives you a sleek, modern UI that lets you:
1. **See all active ports** in one glance with real-time updates
2. **Kill any process** with a single click
3. **Use sudo securely** when needed with password prompts
4. **Get instant notifications** of success or failures
5. **Watch important ports** and receive alerts when they change
6. **Star favorite ports** for quick filtering

---

## 🚀 Features

### Core Features
- ✅ Real-time port monitoring - Updates every 2 seconds
- ✅ One-click process killing - Instantly terminate listening processes
- ✅ Search functionality - Find ports by number, process name, or PID
- ✅ Watched ports - Monitor specific ports for changes
- ✅ Favorites system - Star ports you use frequently
- ✅ Filter by favorites - Quick access to your most-used ports

### Security & Advanced Features
- 🔒 Sudo password prompt - When permission denied, securely prompt for admin password
- 🔐 Secure password handling - Password never stored, only used for authentication
- 📢 Toast notifications - Real-time feedback on all actions
- ⚠️ Error handling - Clear messages when processes can't be killed
- 📊 Live statistics - Active ports, watched ports, and favorites count

### User Experience
- 🎨 Modern dark-themed UI - Sleek and professional design
- ⚡ Smooth animations - Responsive and polished interactions
- 📱 Responsive design - Works on desktop and tablet sizes
- 🎯 Intuitive controls - Clean, minimal interface
- 🔔 Smart notifications - Toast alerts for all operations

---

## 💻 System Requirements

- **macOS 10.13+** (currently built for macOS, can be adapted for Linux/Windows)
- **Go 1.23+**
- **Node.js 16+**

---

## 🚀 Quick Start - How to Run Port Assassin

### One-Line Setup
```bash
git clone <repository-url> && cd Localhost-Port-Assassin && wails dev
```

### Step-by-Step Instructions

#### Prerequisites (One-time setup)
```bash
# Install Go 1.23+
brew install go

# Install Node.js 16+
brew install node

# Install Wails CLI
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

#### Run the Project

**Option 1: Development Mode (Recommended)**
```bash
cd Localhost-Port-Assassin
wails dev
```
- Opens the app automatically
- Hot-reload enabled for React components
- Live Go code recompilation

**Option 2: Production Build**
```bash
cd Localhost-Port-Assassin
wails build
```
- Creates standalone executable in `build/bin/`
- Can be distributed and run on other macOS systems

---

## 🛠️ Installation & Development

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd Localhost-Port-Assassin

# Run development server
wails dev
```

### Development

**Live Development Mode:**
```bash
wails dev
```
This runs with hot-reload for both frontend and backend:
- Frontend: Vite dev server on http://localhost:5173
- Go backend: Automatic recompilation on changes
- Browser dev access: http://localhost:34115 (dev mode only)

### Building

**Production Build:**
```bash
wails build
```

Creates a standalone executable in the `build/bin` directory.

---

## 📋 Project Structure

```
Localhost-Port-Assassin/
├── main.go                          # Wails entry point
├── app.go                           # App struct & Go methods
├── pkg/
│   ├── config/store.go             # Config storage (ports, notifications)
│   └── sys/ports.go                # Port detection & process killing
├── frontend/
│   ├── src/
│   │   ├── App.tsx                 # Main React app
│   │   ├── components/
│   │   │   ├── Dashboard.tsx       # Main dashboard view
│   │   │   ├── PortCard.tsx        # Individual port card
│   │   │   ├── PasswordPromptModal.tsx  # Sudo password input
│   │   │   └── Toast.tsx           # Notification system
│   │   └── store/usePortStore.ts   # Zustand state management
│   ├── tailwind.config.js          # Tailwind CSS config
│   ├── vite.config.ts              # Vite bundler config
│   └── package.json
├── wails.json                       # Wails configuration
└── go.mod                           # Go module definition
```

---

## 🎨 Technology Stack

### Backend
- **Go 1.23** - Type-safe, efficient backend
- **Wails v2** - Go to React bridge
- **lsof** - Port detection on macOS

### Frontend
- **React 18** - UI library
- **TypeScript 4.6** - Type safety
- **Zustand 5** - Lightweight state management
- **Tailwind CSS 4** - Utility-first styling
- **Lucide React** - Beautiful SVG icons
- **Vite 3** - Next-gen bundler

---

## 🔑 Key Components

### Backend (Go)

**`app.go:GetActivePorts()`** - Gets all listening ports with process info
**`app.go:KillProcess(pid)`** - Kills a process by PID
**`app.go:KillProcessWithPassword(pid, password)`** - Kills using sudo with password
**`app.go:GetConfig()` / `SaveConfig()`** - Manages watched ports and settings

### Frontend (React/TypeScript)

**`Dashboard.tsx`** - Main UI container with search, filters, and stats
**`PortCard.tsx`** - Individual port card with kill button, favorites, and modals
**`PasswordPromptModal.tsx`** - Secure password input for elevated kills
**`Toast.tsx`** - Notification system with auto-dismiss
**`usePortStore.ts`** - Zustand store for state management

---

## 🔐 Security Notes

### Password Handling
- Passwords are **never stored** or logged
- Used only for immediate sudo authentication
- Cleared from memory after command execution
- Shell strings are properly escaped to prevent injection

### Processes
- Uses standard macOS `kill -9` for normal termination
- Escalates to sudo using `osascript` or shell scripts when needed
- No privilege elevation without user consent

---

## 📱 Usage Examples

### Find and Kill a Process by Port
1. Open Port Assassin
2. Scroll to find port 3000 (or search for "3000")
3. Click "Kill Process"
4. See success notification

### Watch a Port for Changes
1. Click "+ Add Port"
2. Enter port number (e.g., 5432 for PostgreSQL)
3. Enable notifications if desired
4. Get alerts when status changes

### Quick Access with Favorites
1. Hover over a port card
2. Click the star icon to favorite
3. Use the star filter button to see only favorites
4. Instant access to your most-used ports

### Handle Permission Issues
1. Try to kill a process owned by another user
2. Get "Permission denied" message
3. Click "Kill Process" again when prompted
4. Enter your password in the secure prompt
5. Process killed with sudo privileges

---

## 🐛 Troubleshooting

### Port not showing up
- Port might not be in listening state
- Try clicking "Refresh" button
- Check if service is actually running

### Permission denied errors
- Some processes require admin privileges
- Use the password prompt modal to elevate
- Ensure you have sudo access

### Notifications not working
- Check if notifications are enabled (bell icon)
- Verify system notifications are not muted

---

## 🤝 Contributing

Contributions are welcome! Areas for improvement:
- Linux and Windows support
- Custom port presets/groups
- Process restart functionality
- Network monitoring
- Process resource usage display

---

## 📄 License

See LICENSE file for details.

---

## 💡 Tips & Tricks

- **Keyboard shortcuts** (coming soon) - Quick commands for power users
- **Custom port groups** - Save your frequently used port combinations
- **Watch mode** - Enable to get notifications for port changes
- **Favorites** - Build your own quick-access list
- **Search** - Search by port number, process name, or PID

---

**Port Assassin** - Made for developers, by developers. Kill ports, not productivity. ⚡
