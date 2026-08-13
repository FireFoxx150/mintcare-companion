#!/bin/bash
# MintCare Companion — .deb builder
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()  { echo -e "${GREEN}[OK]${NC}  $*"; }
err() { echo -e "${RED}[ERR]${NC} $*" >&2; exit 1; }
inf() { echo -e "${YELLOW}[..]${NC}  $*"; }

# ── 1. Build frontend + server.cjs ───────────────────────────────────────
inf "Installing npm dependencies..."
npm install --silent

inf "Building frontend and backend bundle..."
npm run build

[ -f dist/server.cjs ]  || err "dist/server.cjs not produced — check build output."
[ -f dist/index.html ]  || err "dist/index.html not produced — check build output."
ok "dist/ built — server.cjs $(du -sh dist/server.cjs | cut -f1)"

# ── 2. Stage into src-tauri/res/ ─────────────────────────────────────────
inf "Staging resources into src-tauri/res/ ..."
mkdir -p src-tauri/res
cp -r dist/. src-tauri/res/
ok "src-tauri/res/ staged"

# ── 3. Tauri build ───────────────────────────────────────────────────────
inf "Compiling Rust binary and creating initial .deb (this takes a few minutes)..."
npx @tauri-apps/cli build --bundles deb 2>&1 | tail -25

DEB=$(find src-tauri/target/release/bundle/deb -name "*.deb" 2>/dev/null | head -1)
[ -n "$DEB" ] || err "No .deb found in src-tauri/target/release/bundle/deb/"
ok "Tauri .deb: $DEB"

# ── 4. Patch the .deb ────────────────────────────────────────────────────
inf "Patching .deb — injecting server files and launcher..."
WORK=$(mktemp -d)
dpkg-deb -R "$DEB" "$WORK"

# Locate the app dirs inside the extracted package
APP_LIB=$(find "$WORK/usr/lib" -maxdepth 1 -mindepth 1 -type d | head -1)
[ -n "$APP_LIB" ] || { mkdir -p "$WORK/usr/lib/mintcare-companion"; APP_LIB="$WORK/usr/lib/mintcare-companion"; }
APP_NAME=$(basename "$APP_LIB")
INSTALL_DIR="/usr/lib/$APP_NAME"
ok "App lib dir  : $APP_LIB  (→ $INSTALL_DIR)"

BIN_FILE=$(find "$WORK/usr/bin" -maxdepth 1 -type f 2>/dev/null | head -1)
[ -n "$BIN_FILE" ] || err "No binary found inside .deb usr/bin"
BIN_NAME=$(basename "$BIN_FILE")
ok "Binary name  : $BIN_NAME"

# Move the real Tauri binary into the lib dir
mv "$BIN_FILE" "$APP_LIB/mintcare-bin"
chmod +x "$APP_LIB/mintcare-bin"

# Inject server files
cp dist/server.cjs  "$APP_LIB/server.cjs"
cp dist/index.html  "$APP_LIB/index.html"
rm -rf "$APP_LIB/assets"
cp -r dist/assets   "$APP_LIB/assets"
ok "Injected server.cjs, index.html, assets/ → $INSTALL_DIR"

# ── 5. Write the launcher script ─────────────────────────────────────────
# Use a quoted heredoc ('LAUNCHER') so NO variables are expanded here —
# every $ and $() in the script body is literal and runs at install-time.
# The only thing we bake in at build-time is INSTALL_DIR (via sed after).
cat > "$WORK/usr/bin/$BIN_NAME" << 'LAUNCHER'
#!/bin/bash
# MintCare Companion launcher
# Starts the Express backend, waits for it, then opens the Tauri window.
APP="__INSTALL_DIR__"
LOG="/tmp/mintcare-server.log"

# ── Find Node.js ──────────────────────────────────────────────────────────
NODE_BIN=""
for candidate in /usr/bin/node /usr/bin/nodejs /usr/local/bin/node /snap/bin/node; do
    [ -x "$candidate" ] && NODE_BIN="$candidate" && break
done
if [ -z "$NODE_BIN" ]; then
    NODE_BIN=$(command -v node 2>/dev/null || command -v nodejs 2>/dev/null || echo "")
fi
if [ -z "$NODE_BIN" ]; then
    MSG="Node.js is not installed.\nRun:  sudo apt install nodejs\nThen restart MintCare."
    zenity --error --title="MintCare — Missing Dependency" --text="$MSG" 2>/dev/null \
        || xmessage "$MSG" 2>/dev/null \
        || (echo "$MSG" && read)
    exit 1
fi

# ── Start Express backend ─────────────────────────────────────────────────
echo "=== MintCare startup $(date) ===" > "$LOG"
echo "Node: $NODE_BIN" >> "$LOG"
echo "App:  $APP" >> "$LOG"
"$NODE_BIN" "$APP/server.cjs" >> "$LOG" 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID" >> "$LOG"

# ── Wait for port 3000 ───────────────────────────────────────────────────
# Uses /dev/tcp (bash built-in) — no nc/curl/netcat dependency needed.
READY=0
for i in $(seq 1 60); do
    if (echo > /dev/tcp/127.0.0.1/3000) 2>/dev/null; then
        READY=1
        echo "Server ready after ${i} × 0.5 s" >> "$LOG"
        break
    fi
    sleep 0.5
done

if [ $READY -eq 0 ]; then
    echo "WARNING: server not ready after 30 s — check $LOG" >> "$LOG"
    # Don't exit — try to open the window anyway.
    # The app will show its own error banner if the backend is unreachable.
fi

# ── Launch Tauri window ───────────────────────────────────────────────────
"$APP/mintcare-bin" "$@"
EXIT_CODE=$?

# ── Cleanup ───────────────────────────────────────────────────────────────
kill "$SERVER_PID" 2>/dev/null
wait "$SERVER_PID" 2>/dev/null
exit $EXIT_CODE
LAUNCHER

# Bake the real install path in (the only build-time substitution needed)
sed -i "s|__INSTALL_DIR__|$INSTALL_DIR|g" "$WORK/usr/bin/$BIN_NAME"
chmod +x "$WORK/usr/bin/$BIN_NAME"
ok "Launcher written to /usr/bin/$BIN_NAME (port check uses /dev/tcp — no nc needed)"

# ── 6. Repack ────────────────────────────────────────────────────────────
OUT="$(dirname "$DEB")/mintcare-companion_1.0.0_amd64.deb"
dpkg-deb --build "$WORK" "$OUT"
rm -rf "$WORK"

echo ""
ok "════════════════════════════════════════"
ok " Build complete!"
ok " → $OUT"
ok "════════════════════════════════════════"
echo ""
echo "  Install :  sudo dpkg -i $OUT"
echo "  Fix deps:  sudo apt install -f"
echo "  Log file:  /tmp/mintcare-server.log   (check here if backend fails)"
echo ""
