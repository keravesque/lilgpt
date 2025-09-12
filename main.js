/*
 * LilGPT — A Little GPT Wrapper
 * Product Name: Lil' GPT — A Little GPT Wrapper
 * Description: Minimal Electron wrapper for ChatGPT with tabs (BrowserView),
 *              persistent profile, and stability tweaks.
 *
 * Copyright © 2025 Noelle Hockaday
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 only,
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License v3 for more details.
 *
 * You should have received a copy of the GNU General Public License v3
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

/* eslint-disable */
const {
  app,
  BrowserWindow,
  BrowserView,
  Menu,
  shell,
  nativeImage,
  Tray,
  ipcMain,
} = require("electron");
const path = require("path");

// --- Stability tweaks ---
app.disableHardwareAcceleration(); // helps on many Intel/iGPU systems
app.commandLine.appendSwitch("js-flags", "--max-old-space-size=2048"); // reduce long GC pauses

let win,
  tray,
  isQuitting = false;

// ----- Tab state -----
let tabs = []; // [{ id, view, title, url }]
let activeId = null;
let nextId = 1;

const TABBAR_HEIGHT = 42;

// small helper
function isViewAlive(view) {
  return !!(view && view.webContents && !view.webContents.isDestroyed());
}

function sendTabs() {
  const payload = {
    tabs: tabs.map((t) => ({
      id: t.id,
      title: t.title || "ChatGPT",
      url: t.url || "https://chatgpt.com/",
    })),
    activeId,
  };
  if (win && !win.isDestroyed()) win.webContents.send("tabs-updated", payload);
}

function setViewBounds() {
  if (!win) return;
  const [w, h] = win.getContentSize();
  const bounds = {
    x: 0,
    y: TABBAR_HEIGHT,
    width: w,
    height: Math.max(0, h - TABBAR_HEIGHT),
  };
  const active = tabs.find((t) => t.id === activeId);
  if (active && isViewAlive(active.view)) active.view.setBounds(bounds);
}

function attachActiveView() {
  if (!win) return;
  const active = tabs.find((t) => t.id === activeId);
  if (!active || !isViewAlive(active.view)) return;
  const current = win.getBrowserView();
  if (current) win.setBrowserView(null);
  win.setBrowserView(active.view);
  setViewBounds();
}

function createTab(url = "https://chatgpt.com/") {
  const id = nextId++;
  const view = new BrowserView({
    webPreferences: {
      partition: "persist:chatgpt",
      contextIsolation: true,
      sandbox: true,
      spellcheck: false, // set true if you want it; false is lighter
      backgroundThrottling: false,
    },
  });

  view.webContents.loadURL(url).catch(() => {
    // ignore initial load errors; renderer will show title updates later
  });

  view.webContents.setWindowOpenHandler(({ url }) => {
    createTab(url);
    return { action: "deny" };
  });

  view.webContents.on("page-title-updated", (_e, title) => {
    const t = tabs.find((t) => t.id === id);
    if (t) {
      t.title = title;
      sendTabs();
    }
  });

  view.webContents.on("did-navigate", (_e, newURL) => {
    const t = tabs.find((t) => t.id === id);
    if (t) {
      t.url = newURL;
      sendTabs();
    }
  });

  // Auto-recover from crashes/freezes
  view.webContents.on("render-process-gone", (_e, details) => {
    if (details.reason !== "clean-exit" && isViewAlive(view)) {
      view.webContents.reload();
    }
  });

  view.webContents.on("unresponsive", () => {
    if (isViewAlive(view)) view.webContents.reload();
  });

  const tab = { id, view, title: "ChatGPT", url };
  tabs.push(tab);
  activateTab(id);
}

function closeTab(id) {
  const i = tabs.findIndex((t) => t.id === id);
  if (i === -1) return;
  const wasActive = activeId === id;
  const [tab] = tabs.splice(i, 1);
  try {
    if (isViewAlive(tab?.view)) tab.view.webContents.destroy();
  } catch {}
  try {
    if (tab?.view && !tab.view.isDestroyed?.()) tab.view.destroy?.();
  } catch {}
  if (!tabs.length) {
    activeId = null;
    sendTabs();
    createTab();
    return;
  }
  if (wasActive) {
    const fallback = tabs[Math.max(0, i - 1)];
    activateTab(fallback.id);
  } else {
    sendTabs();
  }
}

function activateTab(id) {
  if (!tabs.find((t) => t.id === id)) return;
  activeId = id;
  attachActiveView();
  sendTabs();
}

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: "#0b0f14",
    autoHideMenuBar: false,
    title: "ChatGPT",
    icon: path.join(__dirname, "icons", "lilgpt-256.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.loadFile(path.join(__dirname, "index.html"));
  win.on("resize", setViewBounds);
  win.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      win.hide();
    }
  });

  // --- unified Always on Top state ---
  let isAlwaysOnTop = false;

  function setWindowAlwaysOnTop(state) {
    isAlwaysOnTop = !!state;
    if (win && !win.isDestroyed()) win.setAlwaysOnTop(isAlwaysOnTop);

    // update tray
    updateTrayMenu();

    // update File menu checkbox
    const menu = Menu.getApplicationMenu();
    if (menu) {
      const fileMenu = menu.items.find(item => item.label === "File");
      if (fileMenu) {
        const alwaysOnTopItem = fileMenu.submenu.items.find(i => i.label === "Always on Top");
        if (alwaysOnTopItem) alwaysOnTopItem.checked = isAlwaysOnTop;
      }
    }
  }

  // --- Menus ---
  const template = [
    ...(process.platform === "darwin"
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        { label: "New Tab", accelerator: "CmdOrCtrl+T", click: () => createTab() },
        { label: "Close Tab", accelerator: "CmdOrCtrl+W", click: () => { if (activeId) closeTab(activeId); } },
        { label: "Kill Active Tab", accelerator: "Shift+CmdOrCtrl+W", click: () => { if (activeId) closeTab(activeId); } },
        { type: "separator" },
        { label: "Restart App", accelerator: "CmdOrCtrl+R", click: () => { isQuitting = true; app.relaunch(); app.exit(0); } },
        { type: "separator" },
        { 
          label: "Always on Top", 
          type: "checkbox", 
          checked: isAlwaysOnTop, 
          click: (mi) => setWindowAlwaysOnTop(mi.checked),
        },
        { type: "separator" },
        { label: "Quit", accelerator: "CmdOrCtrl+Q", click: () => { isQuitting = true; app.quit(); } },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  // --- Tray ---
  const trayIcon = nativeImage.createFromPath(
    path.join(__dirname, "icons", "lilgpt-32.png") // ✅ tray icon
  );
  tray = new Tray(trayIcon);
  tray.setToolTip("Lil' G - ChatGPT Wrapper");

  function updateTrayMenu() {
    tray.setContextMenu(
      Menu.buildFromTemplate([
        {
          label: win?.isVisible() ? "Hide Window" : "Show Window",
          click: () => {
            if (!win) return;
            win.isVisible() ? win.hide() : win.show();
          },
        },
        { type: "separator" },
        {
          label: "Always on Top",
          type: "checkbox",
          checked: isAlwaysOnTop,
          click: (mi) => setWindowAlwaysOnTop(mi.checked),
        },
        {
          label: "Kill Active Tab",
          enabled: !!activeId,
          click: () => { if (activeId) closeTab(activeId); },
        },
        {
          label: "Restart App",
          click: () => { isQuitting = true; app.relaunch(); app.exit(0); },
        },
        { type: "separator" },
        {
          label: "Quit",
          click: () => { isQuitting = true; app.quit(); },
        },
      ])
    );
  }

  // keep Show/Hide label fresh
  win.on("show", updateTrayMenu);
  win.on("hide", updateTrayMenu);

  updateTrayMenu();

  // First tab
  createTab();

  // Window unresponsive guard
  win.on("unresponsive", () => {
    if (activeId) {
      const t = tabs.find((t) => t.id === activeId);
      if (t && isViewAlive(t.view)) t.view.webContents.reload();
    }
  });
}

// IPC from renderer (tab bar UI)
ipcMain.on("activate-tab", (_e, id) => activateTab(id));
ipcMain.on("new-tab", () => createTab());
ipcMain.on("close-tab", (_e, id) => closeTab(id));

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else if (win) win.show();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// --- Search handling ---
ipcMain.on("find-in-page", (_e, term) => {
  const active = tabs.find((t) => t.id === activeId);
  if (active && isViewAlive(active.view)) {
    active.view.webContents.findInPage(term || "");
  }
});

ipcMain.on("stop-find-in-page", () => {
  const active = tabs.find((t) => t.id === activeId);
  if (active && isViewAlive(active.view)) {
    active.view.webContents.stopFindInPage("clearSelection");
  }
});

ipcMain.handle("search-tabs", (_e, term) => {
  const lower = (term || "").toLowerCase();
  return tabs
    .filter(
      (t) =>
        (t.title && t.title.toLowerCase().includes(lower)) ||
        (t.url && t.url.toLowerCase().includes(lower))
    )
    .map((t) => ({
      id: t.id,
      title: t.title || "ChatGPT",
      url: t.url || "https://chatgpt.com/"
    }));
});
