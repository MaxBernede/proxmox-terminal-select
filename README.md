# ✂ Proxmox Terminal Select

Extension (and userscript) for **Zen Browser / Firefox / Chrome**: easily select and copy text in the
**Proxmox xterm.js terminal**, even when an app grabs the mouse (Claude Code, htop, vim, mc…).

[![Install (signed .xpi)](https://img.shields.io/badge/Install-signed%20.xpi-2ea44f?style=for-the-badge&logo=firefoxbrowser)](https://github.com/MaxBernede/proxmox-terminal-select/releases/latest/download/proxmox-terminal-select.xpi)
[![Userscript](https://img.shields.io/badge/or-userscript-555?style=for-the-badge)](https://raw.githubusercontent.com/MaxBernede/proxmox-terminal-select/main/proxmox-terminal-select.user.js)

## The problem

When you run Claude Code in the Proxmox web terminal, the app enables mouse tracking:
click-dragging is sent to the app instead of selecting text, so you can't copy anything.

## What it does

| Action | Effect |
|---|---|
| **Click-drag** in the terminal | Selects text and **copies it automatically** ("Copied ✓" toast) |
| Double-click / triple-click | Selects a word / a line |
| **Alt+Shift+S** | Opens the whole terminal content (including scrollback) as plain, freely selectable text. Esc to close |
| **Alt+Shift+F** or click the `✂ Select` badge | Toggles force select (OFF = the mouse goes back to the app as usual) |

> ⚠️ Works with the Proxmox **xterm.js** console (`>_ Console` ▸ `xterm.js`).
> With noVNC the screen is an image, so there is no text to select.

## Install — Zen / Firefox (signed, permanent)

1. Click **[proxmox-terminal-select.xpi](https://github.com/MaxBernede/proxmox-terminal-select/releases/latest/download/proxmox-terminal-select.xpi)**:
   Zen/Firefox offers to **add the extension** ▸ **Add**.
   (Otherwise: download the file, then `about:addons` ▸ ⚙ ▸ **Install Add-on From File…**)
2. Reload the Proxmox console tab: the `✂ Select: ON` badge appears in the top-right corner.

The extension is signed by Mozilla (unlisted distribution): it stays installed across restarts
and **updates automatically** from this repository (`updates.json`).

## Install — Chrome / Edge / Brave

1. Download **[proxmox-terminal-select.zip](https://github.com/MaxBernede/proxmox-terminal-select/releases/latest/download/proxmox-terminal-select.zip)** and extract it.
2. `chrome://extensions` ▸ enable **Developer mode** ▸ **Load unpacked** ▸ pick the folder.

## Alternative install — userscript

1. Install **[Violentmonkey](https://addons.mozilla.org/firefox/addon/violentmonkey/)** (Tampermonkey works too).
2. Click **[proxmox-terminal-select.user.js](https://raw.githubusercontent.com/MaxBernede/proxmox-terminal-select/main/proxmox-terminal-select.user.js)** ▸ **Install**.

## How it works

xterm.js allows text selection while **Shift** is held, even when the app captures the mouse.
The script intercepts clicks in the terminal and re-sends them to xterm.js as if Shift were held.
Hover and wheel events still go to the app.
Plain-text mode reads the xterm.js buffer directly (`term.buffer.active`).

Nothing is sent anywhere: everything happens in the page. On other sites the script does nothing
(it stops if it can't find an xterm.js terminal).

## Build & release

The source is `content.js`. `./build.ps1` generates `proxmox-terminal-select.user.js` (committed)
and the `.zip` (Chrome). For a new Zen/Firefox version:

1. Bump `version` in `manifest.json` and run `./build.ps1`.
2. Sign (AMO API keys in `WEB_EXT_API_KEY` / `WEB_EXT_API_SECRET`) from a folder containing only `manifest.json` and `content.js`:
   `npx web-ext sign --channel=unlisted --source-dir <folder>`
3. Publish the signed `.xpi` as a release asset named `proxmox-terminal-select.xpi`, and add the version to `updates.json`.

## License

MIT
