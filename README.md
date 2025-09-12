[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
# Lil' G - The Little GPT Wrapper
Minimal Electron wrapper for ChatGPT with **tabs**, a **persistent profile**, and **stability tweaks**.  
  
Lil' G attempts to fix the problem of long-running conversations crashing the ChatGPT web interface, which seems to be particularily problematic when working on programming projects. Note this initial release is just a base to work off of that gives slightly better performance, tabbing,

> **Note**: Increasing the Electron/V8 heap only affects your *local* renderer process. It does **not** increase ChatGPT’s server-side context window or memory.

## Features

### Implemented (Version 1.0.0)
- 🗂️ **Tabbed browsing with BrowserView**: New, Close, Cycle; middle-click to close
- 🔐 **Persistent Chromium profile** (`persist:chatgpt`) so login sticks
- 🧰 **Tray & utilities**: Toggle, “Always on Top,” Restart App, Kill Active Tab
- 🛡️ **Stability tweaks** (Linux/iGPU safe defaults: GPU disabled, safer GC limit)
- 🔝 **Cross-platform Always on Top** (works even where OS support is limited)
- 🐥🔎 **Search conversation text** with `Ctrl+F`
- 🔍🐤 **Search tab titles** with `Ctrl+Shift+F`
- 🧪 **Packaged builds**: AppImage and `.deb` (Linux), plus targets for Win/macOS

### Coming Soon (Version 1.0.1)
- 🌐 **React-Virtuoso virtualization** (default) to prevent long threads from crashing Chromium
- 🌎 **Open in ChatGPT web view**: See the original conversation with all elements intact
- 🗺️ **Flattened full-history view**: Entire conversation in one page, heavy elements stripped for performance
- 📋 **Clone conversation**: Start a new thread with selected messages copied over for context
- ☣️ **Per-tab JavaScript toggle**
- ☢️ **Global JavaScript toggle**
- 📜 **Local conversation logging**
- ⚠️ **Performance usage alerts** when approaching resource limits
- 🐥🛠 **Configurable stability options** (GPU, GC, warnings)
- 🐥🔎📄🔍🐤 **Search functions accessible via menu**

## Requirements
- Node.js + npm
- Linux (for building AppImage/`.deb` locally). For Windows/macOS artifacts, build on those OSes.

## Quick Start (dev)
```bash
npm install
npm start
```

## Build (packaging)
```bash
# Unpacked build (debug)
npm run dist

# Linux artifacts (AppImage + .deb)
npm run pack:linux

# On Linux, you might need:
chmod +x dist/*.AppImage
./dist/*.AppImage
```

> If you want Windows or macOS installers, run `npm run pack:win` on Windows and `npm run pack:mac` on macOS.

## Troubleshooting
- **Blank window / freezes on Intel iGPU**: We disable GPU by default in `main.js`.
  If issues persist, try launching with:
  `LIBVA_DRIVER_NAME=i965 npm start`
- **Login popups**: Handled inside tabs; sessions persist in the `persist:chatgpt` profile.
- **AppImage won’t run**: Install FUSE v2: `sudo apt install libfuse2`.

## Project Metadata
- Name: `LilGPT`
- Product Name: **Lil' GPT — A Little GPT Wrapper**
- App ID: `com.littleapps.chatgptwrapper`

## License
**GPL-3.0-only**

```
Copyright © 2025 Noelle Hockaday

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License version 3 only,
as published by the Free Software Foundation.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License v3 for more details.

You should have received a copy of the GNU General Public License v3
along with this program. If not, see <https://www.gnu.org/licenses/>.
```

*ChatGPT is a service by OpenAI. This project is an independent wrapper and not affiliated with or endorsed by OpenAI.*
