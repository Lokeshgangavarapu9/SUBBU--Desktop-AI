// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::os::windows::process::CommandExt;
use std::path::PathBuf;
use std::process::Command;
use std::sync::atomic::{AtomicU16, Ordering};
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};
use serde::{Deserialize, Serialize};

const CREATE_NO_WINDOW: u32 = 0x08000000;
static GATEWAY_BRIDGE_PORT: AtomicU16 = AtomicU16::new(0);

#[derive(Serialize, Deserialize)]
struct DesktopCommandResult {
    ok: bool,
    data: Option<serde_json::Value>,
    output: Option<String>,
    error: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct SystemTelemetry {
    ram_used_gb: f64,
    ram_total_gb: f64,
    ollama_online: bool,
    openclaw_online: bool,
}

fn ensure_services_running() {
    // 1. Ensure Ollama is running on port 11434
    let ollama_up = std::net::TcpStream::connect_timeout(
        &"127.0.0.1:11434".parse().unwrap(),
        std::time::Duration::from_millis(400),
    ).is_ok();

    if !ollama_up {
        let ollama_path = std::env::var("LOCALAPPDATA")
            .map(|la| PathBuf::from(la).join("Programs").join("Ollama").join("ollama.exe"))
            .unwrap_or_else(|_| PathBuf::from("ollama.exe"));

        let mut cmd = Command::new("cmd.exe");
        if ollama_path.exists() {
            cmd.args(["/c", &ollama_path.to_string_lossy(), "serve"]);
        } else {
            cmd.args(["/c", "ollama", "serve"]);
        }
        cmd.env("OLLAMA_ORIGINS", "*");
        cmd.creation_flags(CREATE_NO_WINDOW);
        let _ = cmd.spawn();
    }

    // 2. Ensure OpenClaw Gateway is running on port 18789
    let openclaw_up = std::net::TcpStream::connect_timeout(
        &"127.0.0.1:18789".parse().unwrap(),
        std::time::Duration::from_millis(400),
    ).is_ok();

    if !openclaw_up {
        let openclaw_cmd = std::env::var("APPDATA")
            .map(|ad| PathBuf::from(ad).join("npm").join("openclaw.cmd"))
            .unwrap_or_else(|_| PathBuf::from("openclaw.cmd"));

        let mut cmd = Command::new("cmd.exe");
        if openclaw_cmd.exists() {
            cmd.args(["/c", &openclaw_cmd.to_string_lossy(), "gateway", "run"]);
        } else {
            cmd.args(["/c", "openclaw", "gateway", "run"]);
        }
        cmd.creation_flags(CREATE_NO_WINDOW);
        let _ = cmd.spawn();
    }
}

#[tauri::command]
fn execute_desktop_command(app_handle: tauri::AppHandle, args: Vec<String>) -> DesktopCommandResult {
    // Locate agent-desktop-launcher.exe in root or bundled directory
    let root = app_handle
        .path()
        .resource_dir()
        .unwrap_or_else(|_| PathBuf::from("."));
    
    let candidates = [
        root.join("agent-desktop-launcher.exe"),
        PathBuf::from("agent-desktop-launcher.exe"),
        PathBuf::from(r"C:\Users\LOKESH\subbu 2.0\agent-desktop-launcher.exe"),
    ];

    let launcher_exe = candidates
        .iter()
        .find(|p| p.exists())
        .cloned()
        .unwrap_or_else(|| PathBuf::from("agent-desktop-launcher.exe"));

    let mut cmd = Command::new(&launcher_exe);
    cmd.args(&args);
    cmd.creation_flags(CREATE_NO_WINDOW);

    match cmd.output() {
        Ok(output) => {
            let stdout_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let stderr_str = String::from_utf8_lossy(&output.stderr).trim().to_string();

            if output.status.success() {
                if let Ok(json_val) = serde_json::from_str::<serde_json::Value>(&stdout_str) {
                    DesktopCommandResult {
                        ok: true,
                        data: Some(json_val),
                        output: None,
                        error: None,
                    }
                } else {
                    DesktopCommandResult {
                        ok: true,
                        data: None,
                        output: Some(if stdout_str.is_empty() { stderr_str } else { stdout_str }),
                        error: None,
                    }
                }
            } else {
                DesktopCommandResult {
                    ok: false,
                    data: None,
                    output: None,
                    error: Some(if stderr_str.is_empty() { stdout_str } else { stderr_str }),
                }
            }
        }
        Err(e) => DesktopCommandResult {
            ok: false,
            data: None,
            output: None,
            error: Some(format!("Failed to execute launcher: {}", e)),
        },
    }
}

#[tauri::command]
fn open_application(app_name: String) -> Result<String, String> {
    let lower = app_name.to_lowercase();
    let mut cmd = Command::new("cmd.exe");
    cmd.creation_flags(CREATE_NO_WINDOW);

    match lower.as_str() {
        "notepad" => {
            cmd.args(["/c", "start", "", "notepad.exe"]);
        }
        "calculator" | "calc" => {
            cmd.args(["/c", "start", "", "calc.exe"]);
        }
        "browser" | "chrome" | "edge" => {
            cmd.args(["/c", "start", "", "https://www.google.com"]);
        }
        "calendar" => {
            cmd.args(["/c", "start", "", "https://calendar.google.com"]);
        }
        _ => return Err(format!("Unknown or unauthorized application target: {}", app_name)),
    }

    match cmd.spawn() {
        Ok(_) => Ok(format!("Successfully opened {}", app_name)),
        Err(e) => Err(format!("Failed to open {}: {}", app_name, e)),
    }
}

fn read_gateway_token() -> Option<String> {
    std::env::var("USERPROFILE").ok().and_then(|up| {
        let path = PathBuf::from(up).join(".openclaw").join("openclaw.json");
        std::fs::read_to_string(path).ok().and_then(|content| {
            serde_json::from_str::<serde_json::Value>(&content).ok().and_then(|v| {
                v.get("gateway")?
                    .get("auth")?
                    .get("token")?
                    .as_str()
                    .map(|s| s.to_string())
            })
        })
    })
}

fn read_until_delimiter<R: Read>(reader: &mut R, delimiter: &[u8]) -> Result<Vec<u8>, std::io::Error> {
    let mut buf = Vec::new();
    let mut byte = [0u8; 1];
    while reader.read_exact(&mut byte).is_ok() {
        buf.push(byte[0]);
        if buf.ends_with(delimiter) {
            return Ok(buf);
        }
        if buf.len() > 65536 {
            return Err(std::io::Error::new(std::io::ErrorKind::InvalidData, "Header too large"));
        }
    }
    Err(std::io::Error::new(std::io::ErrorKind::UnexpectedEof, "EOF before delimiter"))
}

fn read_ws_frame<R: Read>(reader: &mut R) -> Result<(u8, Vec<u8>), std::io::Error> {
    let mut header = [0u8; 2];
    reader.read_exact(&mut header)?;
    let b0 = header[0];
    let b1 = header[1];
    let is_masked = (b1 & 0x80) != 0;
    let len_byte = b1 & 0x7F;
    let payload_len: usize = if len_byte <= 125 {
        len_byte as usize
    } else if len_byte == 126 {
        let mut len_bytes = [0u8; 2];
        reader.read_exact(&mut len_bytes)?;
        u16::from_be_bytes(len_bytes) as usize
    } else {
        let mut len_bytes = [0u8; 8];
        reader.read_exact(&mut len_bytes)?;
        u64::from_be_bytes(len_bytes) as usize
    };

    let mask = if is_masked {
        let mut m = [0u8; 4];
        reader.read_exact(&mut m)?;
        Some(m)
    } else {
        None
    };

    let mut payload = vec![0u8; payload_len];
    reader.read_exact(&mut payload)?;

    if let Some(m) = mask {
        for (i, b) in payload.iter_mut().enumerate() {
            *b ^= m[i % 4];
        }
    }

    Ok((b0, payload))
}

fn write_ws_frame<W: Write>(writer: &mut W, b0: u8, payload: &[u8], masked: bool) -> Result<(), std::io::Error> {
    let mut header = Vec::new();
    header.push(b0);
    let len = payload.len();
    let mask_bit = if masked { 0x80 } else { 0 };

    if len <= 125 {
        header.push(mask_bit | (len as u8));
    } else if len <= 65535 {
        header.push(mask_bit | 126);
        header.extend_from_slice(&(len as u16).to_be_bytes());
    } else {
        header.push(mask_bit | 127);
        header.extend_from_slice(&(len as u64).to_be_bytes());
    }

    if masked {
        let mask = [0x12, 0x34, 0x56, 0x78];
        header.extend_from_slice(&mask);
        let mut masked_payload = payload.to_vec();
        for (i, b) in masked_payload.iter_mut().enumerate() {
            *b ^= mask[i % 4];
        }
        writer.write_all(&header)?;
        writer.write_all(&masked_payload)?;
    } else {
        writer.write_all(&header)?;
        writer.write_all(payload)?;
    }

    writer.flush()?;
    Ok(())
}

#[inline]
fn log_bridge(_msg: &str) {}

fn handle_bridge_connection(mut client: TcpStream, token: String) {
    log_bridge("handle_bridge_connection starting");
    let mut upstream = match TcpStream::connect("127.0.0.1:18789") {
        Ok(s) => s,
        Err(e) => {
            log_bridge(&format!("Failed to connect to OpenClaw: {}", e));
            return;
        }
    };
    log_bridge("Connected to upstream 127.0.0.1:18789");

    // 1. Read HTTP Upgrade request from client and sanitize headers
    let http_req = match read_until_delimiter(&mut client, b"\r\n\r\n") {
        Ok(data) => data,
        Err(e) => {
            log_bridge(&format!("Failed to read client HTTP req: {}", e));
            return;
        }
    };

    let req_str = String::from_utf8_lossy(&http_req);
    log_bridge(&format!("Client HTTP req:\n{}", req_str));
    let mut modified_req_headers = Vec::new();
    for line in req_str.split("\r\n") {
        let line_lower = line.to_ascii_lowercase();
        if line_lower.starts_with("host:") {
            modified_req_headers.push("Host: 127.0.0.1:18789".to_string());
        } else if line_lower.starts_with("sec-websocket-extensions:") {
            // Drop extensions (permessage-deflate) to ensure uncompressed JSON frames
            continue;
        } else if !line.is_empty() {
            modified_req_headers.push(line.to_string());
        }
    }
    let sanitized_req = modified_req_headers.join("\r\n") + "\r\n\r\n";

    if upstream.write_all(sanitized_req.as_bytes()).is_err() || upstream.flush().is_err() {
        log_bridge("Failed to send sanitized HTTP req to upstream");
        return;
    }

    // 2. Read HTTP 101 response from upstream and sanitize headers
    let http_res = match read_until_delimiter(&mut upstream, b"\r\n\r\n") {
        Ok(data) => data,
        Err(e) => {
            log_bridge(&format!("Failed to read upstream HTTP res: {}", e));
            return;
        }
    };

    let res_str = String::from_utf8_lossy(&http_res);
    log_bridge(&format!("Upstream HTTP res:\n{}", res_str));
    let mut modified_res_headers = Vec::new();
    for line in res_str.split("\r\n") {
        let line_lower = line.to_ascii_lowercase();
        if line_lower.starts_with("sec-websocket-extensions:") {
            continue;
        } else if !line.is_empty() {
            modified_res_headers.push(line.to_string());
        }
    }
    let sanitized_res = modified_res_headers.join("\r\n") + "\r\n\r\n";

    if client.write_all(sanitized_res.as_bytes()).is_err() || client.flush().is_err() {
        log_bridge("Failed to send sanitized HTTP res to client");
        return;
    }

    // 3. Upstream sends connect.challenge -> forward to client
    let (c_b0, c_payload) = match read_ws_frame(&mut upstream) {
        Ok(f) => f,
        Err(e) => {
            log_bridge(&format!("Failed to read challenge from upstream: {}", e));
            return;
        }
    };
    log_bridge(&format!("Forwarding challenge to client (len={})", c_payload.len()));
    if write_ws_frame(&mut client, c_b0, &c_payload, false).is_err() {
        log_bridge("Failed to write challenge to client");
        return;
    }

    // 4. Client sends connect request -> inject secret token on native side!
    let (req_b0, req_payload) = match read_ws_frame(&mut client) {
        Ok(f) => f,
        Err(e) => {
            log_bridge(&format!("Failed to read connect request from client: {}", e));
            return;
        }
    };
    log_bridge(&format!("Read client frame b0={:x}, len={}", req_b0, req_payload.len()));

    let mut final_payload = req_payload;
    if let Ok(mut json) = serde_json::from_slice::<serde_json::Value>(&final_payload) {
        if json.get("method").and_then(|m| m.as_str()) == Some("connect") {
            log_bridge("Injecting secret auth token into connect request");
            json["params"]["auth"] = serde_json::json!({ "token": token });
            if let Ok(new_bytes) = serde_json::to_vec(&json) {
                final_payload = new_bytes;
            }
        }
    }
    if write_ws_frame(&mut upstream, req_b0, &final_payload, true).is_err() {
        log_bridge("Failed to forward connect request to upstream");
        return;
    }
    log_bridge("Piped connect frame to upstream. Starting transparent copy loops.");

    // 5. Bidirectional transparent piping of all remaining frames
    let mut client_read = match client.try_clone() {
        Ok(s) => s,
        Err(_) => return,
    };
    let mut client_write = client;
    let mut upstream_read = match upstream.try_clone() {
        Ok(s) => s,
        Err(_) => return,
    };
    let mut upstream_write = upstream;

    let t1 = std::thread::spawn(move || {
        let _ = std::io::copy(&mut client_read, &mut upstream_write);
    });
    let _ = std::io::copy(&mut upstream_read, &mut client_write);
    let _ = t1.join();
}

fn start_gateway_bridge() {
    let listener = match TcpListener::bind("127.0.0.1:0") {
        Ok(l) => l,
        Err(e) => {
            eprintln!("[GatewayBridge] Failed to bind local bridge: {}", e);
            return;
        }
    };

    let port = listener.local_addr().unwrap().port();
    GATEWAY_BRIDGE_PORT.store(port, Ordering::SeqCst);

    std::thread::spawn(move || {
        for stream in listener.incoming() {
            if let Ok(client) = stream {
                if let Some(token) = read_gateway_token() {
                    std::thread::spawn(move || {
                        handle_bridge_connection(client, token);
                    });
                }
            }
        }
    });
}

#[tauri::command]
fn get_gateway_endpoint() -> String {
    let port = GATEWAY_BRIDGE_PORT.load(Ordering::SeqCst);
    if port > 0 {
        format!("ws://127.0.0.1:{}", port)
    } else {
        "ws://127.0.0.1:18789".to_string()
    }
}

#[repr(C)]
#[allow(non_snake_case)]
struct MEMORYSTATUSEX {
    dwLength: u32,
    dwMemoryLoad: u32,
    ullTotalPhys: u64,
    ullAvailPhys: u64,
    ullTotalPageFile: u64,
    ullAvailPageFile: u64,
    ullTotalVirtual: u64,
    ullAvailVirtual: u64,
    ullAvailExtendedVirtual: u64,
}

extern "system" {
    fn GlobalMemoryStatusEx(lpBuffer: *mut MEMORYSTATUSEX) -> i32;
}

#[tauri::command]
fn get_system_telemetry() -> SystemTelemetry {
    let ollama_online = std::net::TcpStream::connect_timeout(
        &"127.0.0.1:11434".parse().unwrap(),
        std::time::Duration::from_millis(600),
    ).is_ok();

    let openclaw_online = std::net::TcpStream::connect_timeout(
        &"127.0.0.1:18789".parse().unwrap(),
        std::time::Duration::from_millis(600),
    ).is_ok();

    let (total_gb, used_gb) = unsafe {
        let mut mem = MEMORYSTATUSEX {
            dwLength: std::mem::size_of::<MEMORYSTATUSEX>() as u32,
            dwMemoryLoad: 0,
            ullTotalPhys: 0,
            ullAvailPhys: 0,
            ullTotalPageFile: 0,
            ullAvailPageFile: 0,
            ullTotalVirtual: 0,
            ullAvailVirtual: 0,
            ullAvailExtendedVirtual: 0,
        };
        if GlobalMemoryStatusEx(&mut mem) != 0 {
            let total = mem.ullTotalPhys as f64 / (1024.0 * 1024.0 * 1024.0);
            let avail = mem.ullAvailPhys as f64 / (1024.0 * 1024.0 * 1024.0);
            let used = (total - avail).max(0.0);
            (((total * 10.0).round() / 10.0), ((used * 10.0).round() / 10.0))
        } else {
            (16.0, 8.0)
        }
    };

    SystemTelemetry {
        ram_used_gb: used_gb,
        ram_total_gb: total_gb,
        ollama_online,
        openclaw_online,
    }
}

#[tauri::command]
fn toggle_window(app_handle: tauri::AppHandle) -> Result<bool, String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        let is_visible = window.is_visible().unwrap_or(false);
        if is_visible {
            let _ = window.hide();
            Ok(false)
        } else {
            let _ = window.show();
            let _ = window.unminimize();
            let _ = window.set_focus();
            Ok(true)
        }
    } else {
        Err("Main window not found".into())
    }
}

fn main() {
    tauri::Builder::default()
        // Register single-instance plugin first before any other plugins
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.show();
                let _ = win.unminimize();
                let _ = win.set_focus();
            } else {
                eprintln!("[SingleInstance] Second instance launched, but 'main' window could not be found.");
            }
        }))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        // Intercept CloseRequested: hide to tray instead of destroying the window
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .setup(|app| {
            // Supervise background AI services safely
            ensure_services_running();

            // Start isolated native gateway authentication bridge
            start_gateway_bridge();

            // 1. Build System Tray Safely
            let show_i = MenuItemBuilder::with_id("show", "Show SUBBU").build(app)?;
            let hide_i = MenuItemBuilder::with_id("hide", "Hide SUBBU").build(app)?;
            let dash_i = MenuItemBuilder::with_id("dash", "Open Diagnostics").build(app)?;
            let quit_i = MenuItemBuilder::with_id("quit", "Quit SUBBU").build(app)?;

            let tray_menu = MenuBuilder::new(app)
                .item(&show_i)
                .item(&hide_i)
                .separator()
                .item(&dash_i)
                .separator()
                .item(&quit_i)
                .build()?;

            if let Some(icon) = app.default_window_icon().cloned() {
                let _tray = TrayIconBuilder::new()
                    .icon(icon)
                    .menu(&tray_menu)
                    .show_menu_on_left_click(false)
                    .tooltip("SUBBU — Personal AI Companion")
                    .on_menu_event(|app, event| match event.id.as_ref() {
                        "show" => {
                            if let Some(win) = app.get_webview_window("main") {
                                let _ = win.show();
                                let _ = win.unminimize();
                                let _ = win.set_focus();
                            }
                        }
                        "hide" => {
                            if let Some(win) = app.get_webview_window("main") {
                                let _ = win.hide();
                            }
                        }
                        "dash" => {
                            if let Some(win) = app.get_webview_window("main") {
                                let _ = win.show();
                                let _ = win.unminimize();
                                let _ = win.set_focus();
                                let _ = win.emit("open-dashboard", ());
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event
                        {
                            let app = tray.app_handle();
                            if let Some(win) = app.get_webview_window("main") {
                                let is_visible = win.is_visible().unwrap_or(false);
                                if is_visible {
                                    let _ = win.hide();
                                } else {
                                    let _ = win.show();
                                    let _ = win.unminimize();
                                    let _ = win.set_focus();
                                }
                            }
                        }
                    })
                    .build(app)?;
            }

            // 2. Global Hotkey: Alt+Space
            match "Alt+Space".parse::<Shortcut>() {
                Ok(shortcut) => {
                    let app_handle = app.handle().clone();
                    if let Err(e) = app.global_shortcut().on_shortcut(shortcut, move |_app, _sc, event| {
                        if event.state() == ShortcutState::Pressed {
                            if let Some(win) = app_handle.get_webview_window("main") {
                                let is_visible = win.is_visible().unwrap_or(false);
                                if is_visible {
                                    let _ = win.hide();
                                } else {
                                    let _ = win.show();
                                    let _ = win.unminimize();
                                    let _ = win.set_focus();
                                }
                            }
                        }
                    }) {
                        eprintln!("[GlobalShortcut] Warning: Failed to register 'Alt+Space' hotkey: {}", e);
                    } else {
                        println!("[GlobalShortcut] 'Alt+Space' hotkey registered successfully.");
                    }
                }
                Err(e) => {
                    eprintln!("[GlobalShortcut] Warning: Failed to parse 'Alt+Space' shortcut: {}", e);
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            execute_desktop_command,
            open_application,
            toggle_window,
            get_system_telemetry,
            get_gateway_endpoint,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Subbu desktop application");
}
