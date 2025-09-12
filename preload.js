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

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("lilg", {
  // --- Tabs ---
  tabs: {
    onUpdate: (handler) =>
      ipcRenderer.on("tabs-updated", (_e, payload) => handler(payload)),
    activate: (id) => ipcRenderer.send("activate-tab", id),
    new: () => ipcRenderer.send("new-tab"),
    close: (id) => ipcRenderer.send("close-tab", id),
    search: (term) => ipcRenderer.invoke("search-tabs", term),
  },

  // --- In-page search ---
  find: {
    inPage: (term) => ipcRenderer.send("find-in-page", term),
    stop: () => ipcRenderer.send("stop-find-in-page"),
  },
});
