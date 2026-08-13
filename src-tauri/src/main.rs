#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs::{self, OpenOptions};
use std::io::Write;
use std::net::TcpStream;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::Manager;

// ── Logging ────────────────────────────────────────────────────────────────

fn log_path() -> PathBuf {
    dirs_next::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("/tmp"))
        .join("mintcare-companion")
        .join("server.log")
}

fn wlog(msg: &str) {
    let path = log_path();
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(&path) {
        let _ = writeln!(f, "{}", msg);
    }
    println!("[MintCare] {}", msg);
}

// ── Network ────────────────────────────────────────────────────────────────

fn port_open(port: u16) -> bool {
    TcpStream::connect_timeout(
        &format!("127.0.0.1:{}", port).parse().unwrap(),
        Duration::from_millis(300),
    )
    .is_ok()
}

fn wait_for_port(port: u16, timeout: Duration) -> bool {
    let start = Instant::now();
    while start.elapsed() < timeout {
        if port_open(port) {
            wlog(&format!("Port {} ready after {:.1}s", port, start.elapsed().as_secs_f32()));
            return true;
        }
        std::thread::sleep(Duration::from_millis(200));
    }
    false
}

// ── Node discovery ─────────────────────────────────────────────────────────

fn find_node() -> PathBuf {
    for p in &["/usr/bin/node", "/usr/bin/nodejs", "/usr/local/bin/node", "/snap/bin/node"] {
        let p = PathBuf::from(p);
        if p.exists() { return p; }
    }
    if let Ok(home) = std::env::var("HOME") {
        // nvm
        if let Ok(entries) = fs::read_dir(PathBuf::from(&home).join(".nvm/versions/node")) {
            let mut v: Vec<_> = entries.flatten().collect();
            v.sort_by_key(|e| e.file_name());
            if let Some(latest) = v.last() {
                let p = latest.path().join("bin/node");
                if p.exists() { return p; }
            }
        }
        // fnm / volta
        for suffix in &[".fnm/aliases/default/bin/node", ".volta/bin/node"] {
            let p = PathBuf::from(&home).join(suffix);
            if p.exists() { return p; }
        }
    }
    PathBuf::from("node")
}

// ── server.cjs discovery ───────────────────────────────────────────────────

fn find_server(resource_dir: &PathBuf) -> Option<PathBuf> {
    // List the resource dir to aid diagnosis
    wlog(&format!("resource_dir = {:?}", resource_dir));
    if let Ok(entries) = fs::read_dir(resource_dir) {
        for e in entries.flatten() { wlog(&format!("  {:?}", e.path())); }
    }

    let mut candidates = vec![
        // Patched .deb puts server.cjs directly in the lib dir
        resource_dir.join("server.cjs"),
        // res/ layout from our beforeBuildCommand
        resource_dir.join("res").join("server.cjs"),
        // Tauri converts ../ -> _up_/ when bundling resources
        resource_dir.join("_up_").join("dist").join("server.cjs"),
        resource_dir.join("dist").join("server.cjs"),
        // Hardcoded install paths (handles both naming variants)
        PathBuf::from("/usr/lib/mint-care-companion/server.cjs"),
        PathBuf::from("/usr/lib/mint-care-companion/res/server.cjs"),
        PathBuf::from("/usr/lib/mint-care-companion/_up_/dist/server.cjs"),
        PathBuf::from("/usr/lib/mintcare-companion/server.cjs"),
        PathBuf::from("/usr/lib/mintcare-companion/res/server.cjs"),
        PathBuf::from("/usr/lib/mintcare-companion/_up_/dist/server.cjs"),
        PathBuf::from("/usr/share/mint-care-companion/server.cjs"),
        PathBuf::from("/usr/share/mintcare-companion/server.cjs"),
    ];

    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            candidates.push(dir.join("server.cjs"));
            candidates.push(dir.join("../server.cjs"));
            candidates.push(dir.join("../lib/mint-care-companion/server.cjs"));
            candidates.push(dir.join("../lib/mintcare-companion/server.cjs"));
        }
    }

    for c in &candidates {
        wlog(&format!("  check {:?}  -> {}", c, c.exists()));
        if c.exists() { return Some(c.clone()); }
    }
    None
}

// ── Server lifecycle ───────────────────────────────────────────────────────

fn start_server(resource_dir: &PathBuf) -> Option<Child> {
    if port_open(3000) {
        wlog("Port 3000 already open — server pre-started by launcher.");
        return None;
    }

    let node = find_node();
    wlog(&format!("node = {:?}", node));

    let script = match find_server(resource_dir) {
        Some(s) => s,
        None => {
            wlog("ERROR: server.cjs not found");
            return None;
        }
    };
    wlog(&format!("starting {:?}", script));

    let stdout: Stdio = OpenOptions::new().create(true).append(true).open(log_path())
        .map(Stdio::from).unwrap_or_else(|_| Stdio::null());
    let stderr: Stdio = OpenOptions::new().create(true).append(true).open(log_path())
        .map(Stdio::from).unwrap_or_else(|_| Stdio::null());

    let mut cmd = Command::new(&node);
    cmd.arg(&script)
        .env("PORT", "3000")
        .env("NODE_ENV", "production")
        .stdout(stdout)
        .stderr(stderr);

    if let Some(dir) = script.parent() { cmd.current_dir(dir); }

    match cmd.spawn() {
        Ok(child) => { wlog(&format!("server PID {}", child.id())); Some(child) }
        Err(e)    => { wlog(&format!("spawn failed: {}", e)); None }
    }
}

// ── App state ──────────────────────────────────────────────────────────────

struct Backend(Mutex<Option<Child>>);

// ── Helpers ────────────────────────────────────────────────────────────────

fn last_log_lines(n: usize) -> String {
    fs::read_to_string(log_path())
        .unwrap_or_default()
        .lines()
        .rev().take(n).collect::<Vec<_>>()
        .into_iter().rev().collect::<Vec<_>>()
        .join("\n")
}

// ── Entry point ────────────────────────────────────────────────────────────

fn main() {
    // Fresh log each run
    if let Some(p) = log_path().parent() { let _ = fs::create_dir_all(p); }
    let _ = fs::write(log_path(), "");
    wlog("=== MintCare startup ===");

    tauri::Builder::default()
        .setup(|app| {
            let res_dir = app.path_resolver().resource_dir()
                .unwrap_or_else(|| PathBuf::from("."));

            let child = start_server(&res_dir);
            app.manage(Backend(Mutex::new(child)));

            // If port 3000 is already open (launcher script started the server),
            // the window config URL "http://localhost:3000" loads it automatically.
            // No win.eval() needed — that causes Tauri scope errors on remote URLs.
            if port_open(3000) {
                wlog("Port 3000 already open — window will load http://localhost:3000 from config.");
                return Ok(());
            }

            // Server not yet ready — wait up to 20 s
            let ready = wait_for_port(3000, Duration::from_secs(20));
            if ready {
                wlog("Server ready — window will load http://localhost:3000 from config.");
                // No eval needed: window URL is already http://localhost:3000 in tauri.conf.json
            } else {
                wlog("ERROR: server never became ready within 20s");
                // Write a status file the frontend can detect
                let status_path = log_path()
                    .parent()
                    .map(|p| p.join("startup_error.json"))
                    .unwrap_or_else(|| PathBuf::from("/tmp/mintcare_startup_error.json"));
                let log_snippet = last_log_lines(20);
                let json = serde_json::json!({
                    "error": true,
                    "log": log_snippet,
                    "logFile": log_path().display().to_string()
                }).to_string();
                let _ = fs::write(&status_path, &json);
                wlog(&format!("Wrote startup error to {:?}", status_path));
                // The frontend polls /api/health and /api/startup-status to detect this
            }
            Ok(())
        })
        .on_window_event(|ev| {
            if let tauri::WindowEvent::Destroyed = ev.event() {
                let app = ev.window().app_handle();
                if let Some(state) = app.try_state::<Backend>() {
                    if let Ok(mut g) = state.0.lock() {
                        if let Some(mut c) = g.take() {
                            wlog(&format!("killing server PID {}", c.id()));
                            let _ = c.kill();
                            let _ = c.wait();
                        }
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error running MintCare");
}
