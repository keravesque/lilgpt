/*
 * Lil' G - The Little GPT Wrapper
 *
 * A light-weight Electron wrapper for ChatGPT with tabs (BrowserView),
 * virtualization (Virtuoso), persistent profile, and stability tweaks.
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

const tabsEl = document.getElementById("tabs");
const newTabBtn = document.getElementById("newTab");

const searchBar = document.getElementById("search-bar");
const searchInput = document.getElementById("search-input");

const tabSearchBar = document.getElementById("tab-search-bar");
const tabSearchInput = document.getElementById("tab-search-input");
const tabSearchResults = document.getElementById("tab-search-results");

let state = { tabs: [], activeId: null };

/** Map vertical wheel to horizontal scrolling for the tab strip */
tabsEl.addEventListener(
  "wheel",
  (e) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      tabsEl.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  },
  { passive: false },
);

function renderTabs() {
  tabsEl.innerHTML = "";
  state.tabs.forEach((t) => {
    const btn = document.createElement("div");
    btn.className = "tab" + (t.id === state.activeId ? " active" : "");
    btn.textContent = t.title || "ChatGPT";
    btn.title = t.url || "";
    btn.onclick = () => window.lilg.tabs.activate(t.id);
    btn.onauxclick = (e) => {
      if (e.button === 1) window.lilg.tabs.close(t.id);
    };
    tabsEl.appendChild(btn);

    if (t.id === state.activeId) {
      btn.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  });
}

// update tabs from main
window.lilg.tabs.onUpdate((payload) => {
  state = payload;
  renderTabs();
});

newTabBtn.onclick = () => window.lilg.tabs.new();

// --- Keyboard shortcuts: new / close / cycle ---
window.addEventListener("keydown", (e) => {
  const mod = e.ctrlKey || e.metaKey;
  if (!mod) return;
  if (e.key.toLowerCase() === "t") {
    e.preventDefault();
    window.lilg.tabs.new();
  } else if (e.key.toLowerCase() === "w") {
    e.preventDefault();
    if (state.activeId) window.lilg.tabs.close(state.activeId);
  } else if (e.key === "Tab") {
    e.preventDefault();
    if (!state.tabs.length) return;
    const idx = state.tabs.findIndex((t) => t.id === state.activeId);
    const next =
      (idx + (e.shiftKey ? state.tabs.length - 1 : 1)) % state.tabs.length;
    window.lilg.tabs.activate(state.tabs[next].id);
  }
});

// --- In-page search (Ctrl+F) ---
window.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "f") {
    e.preventDefault();
    searchBar.style.display = "block";
    searchInput.focus();
  } else if (e.key === "Escape" && searchBar.style.display === "block") {
    e.preventDefault();
    closeSearch();
  }
});

searchInput.addEventListener("input", () => {
  const term = searchInput.value.trim();
  if (term) {
    window.lilg.find.inPage(term);
  } else {
    window.lilg.find.stop();
  }
});

function closeSearch() {
  searchInput.value = "";
  searchBar.style.display = "none";
  window.lilg.find.stop();
}

// --- Tab search (Ctrl+Shift+A) ---
window.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") {
    e.preventDefault();
    tabSearchBar.style.display = "block";
    tabSearchInput.focus();
    renderTabSearchResults(""); // show all tabs
  } else if (e.key === "Escape" && tabSearchBar.style.display === "block") {
    e.preventDefault();
    closeTabSearch();
  }
});

tabSearchInput.addEventListener("input", () => {
  renderTabSearchResults(tabSearchInput.value.trim());
});

async function renderTabSearchResults(term) {
  const matches = await window.lilg.tabs.search(term);
  tabSearchResults.innerHTML = "";

  matches.forEach((t) => {
    const item = document.createElement("div");
    item.className = "tab-search-item";
    item.textContent = t.title || t.url || "ChatGPT";
    item.onclick = () => {
      window.lilg.tabs.activate(t.id);
      closeTabSearch();
    };
    tabSearchResults.appendChild(item);
  });

  if (!matches.length) {
    const none = document.createElement("div");
    none.textContent = "No matching tabs";
    none.style.opacity = "0.7";
    tabSearchResults.appendChild(none);
  }
}

function closeTabSearch() {
  tabSearchInput.value = "";
  tabSearchBar.style.display = "none";
  tabSearchResults.innerHTML = "";
}
