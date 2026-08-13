# Building & Running MintCare with Tauri on Linux Mint

MintCare Companion is fully configured for **Tauri** (Rust + Vite + React), producing a lightweight native Linux Mint desktop application (.AppImage / .deb package).

---

## 🛠️ Package Installation for Linux Mint 22 (Wilma) & Ubuntu 24.04 (Noble)

Linux Mint 22 and Ubuntu 24.04 use **WebKitGTK 4.1** (`libwebkit2gtk-4.1-dev` and `libsoup-3.0-dev`). Old `4.0` packages were deprecated and removed.

Run `npm run setup:tauri` or execute:

```bash
sudo apt-get update && sudo apt-get install -y \
  cargo rustc pkg-config build-essential libgtk-3-dev \
  libwebkit2gtk-4.1-dev libsoup-3.0-dev \
  libssl-dev libayatana-appindicator3-dev librsvg2-dev \
  curl wget file
```

*(For older Linux Mint 21 / Ubuntu 22.04 systems using WebKitGTK 4.0, replace `libwebkit2gtk-4.1-dev libsoup-3.0-dev` with `libwebkit2gtk-4.0-dev libsoup2.4-dev`)*

---

## 🚀 Step-by-Step Setup & Build Commands

Run all commands from the project root directory:

```bash
# Step 1: Ensure you are in the project root directory
cd ~/Downloads/linux-mint-system-cleanup-and-diagnostic-tool

# Step 2: Install Rust, Cargo, WebKit system libraries & npm dependencies
npm run setup:tauri

# Step 3: Build the native Linux app (.deb & .AppImage)
npm run tauri:build

# Or run in development mode with live hot reload:
npm run tauri:dev
```

---

## 🛠️ How Tauri Integration Works

1. **Frontend Request Interception (`src/main.tsx`)**:
   `window.fetch` is automatically bridged to Tauri's IPC (`invoke("api_request")`) when running inside the Tauri WebView context, or proxied seamlessly to the local system backend.

2. **Native System Access (`src-tauri/src/main.rs`)**:
   The Rust backend handles system queries and administrative IPC calls natively on Linux Mint.

3. **Web / Agent Hybrid Mode**:
   When running in web/browser mode or remote connection mode, the 1-click Linux Mint System Connector agent connects your real system metrics directly to the dashboard.

---

## 📦 Output Artifacts

Running `npm run tauri:build` generates:
- `.deb` installer in `src-tauri/target/release/bundle/deb/`
- `.AppImage` standalone binary in `src-tauri/target/release/bundle/appimage/`

