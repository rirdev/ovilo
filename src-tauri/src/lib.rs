use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::process::Stdio;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::net::TcpListener;
use tokio::io::{AsyncReadExt, AsyncWriteExt, AsyncSeekExt, AsyncBufReadExt};

const DEFAULT_TMDB_API_KEY: &str = "4e44d9029b1270a757cddc766a1bcb63"; // Active Public TMDB v3 Key
const TMDB_BASE_URL: &str = "https://api.themoviedb.org/3";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub custom_tmdb_api_key: String,
    pub preferred_server: String,
    pub auto_play_next: bool,
    pub high_quality_posters: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            custom_tmdb_api_key: String::new(),
            preferred_server: "vidsrc_ru".to_string(),
            auto_play_next: true,
            high_quality_posters: true,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WatchHistoryItem {
    pub id: u32,
    pub title: String,
    pub poster_path: Option<String>,
    pub backdrop_path: Option<String>,
    pub media_type: String,
    pub season: Option<u32>,
    pub episode: Option<u32>,
    pub last_watched_timestamp: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FavoriteItem {
    pub id: u32,
    pub title: String,
    pub poster_path: Option<String>,
    pub backdrop_path: Option<String>,
    pub media_type: String,
    pub vote_average: f64,
    pub release_year: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct UserData {
    pub settings: AppSettings,
    pub history: Vec<WatchHistoryItem>,
    pub favorites: Vec<FavoriteItem>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MusicTrack {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub duration: Option<f64>,
    pub stream_url: String,
    pub file_path: Option<String>,
    pub artwork_url: Option<String>,
    pub is_local: bool,
    pub has_lyrics: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LyricsResult {
    pub synced: bool,
    pub plain_lyrics: Option<String>,
    pub synced_lyrics: Option<String>,
}

pub struct AppState {
    pub client: reqwest::Client,
    pub user_data: Mutex<UserData>,
}

fn get_data_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    fs::create_dir_all(&app_dir).map_err(|e| format!("Failed to create app data dir: {}", e))?;
    Ok(app_dir.join("user_data.json"))
}

fn load_user_data(app: &AppHandle) -> UserData {
    if let Ok(path) = get_data_file_path(app) {
        if path.exists() {
            if let Ok(contents) = fs::read_to_string(&path) {
                if let Ok(data) = serde_json::from_str::<UserData>(&contents) {
                    return data;
                }
            }
        }
    }
    UserData::default()
}

fn save_user_data(app: &AppHandle, data: &UserData) -> Result<(), String> {
    let path = get_data_file_path(app)?;
    let serialized = serde_json::to_string_pretty(data)
        .map_err(|e| format!("Failed to serialize user data: {}", e))?;
    fs::write(&path, serialized).map_err(|e| format!("Failed to write user data file: {}", e))?;
    Ok(())
}

fn get_active_api_key(state: &State<AppState>) -> String {
    let lock = state.user_data.lock().unwrap();
    if !lock.settings.custom_tmdb_api_key.trim().is_empty() {
        lock.settings.custom_tmdb_api_key.trim().to_string()
    } else {
        DEFAULT_TMDB_API_KEY.to_string()
    }
}

// ---------------------------------------------------------
// Streaming Video Sources Generator
// ---------------------------------------------------------

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StreamSource {
    pub name: String,
    pub key: String,
    pub url: String,
    pub badge: String,
}

#[tauri::command]
fn get_video_sources(
    media_type: String,
    id: u32,
    imdb_id: Option<String>,
    season: Option<u32>,
    episode: Option<u32>,
) -> Vec<StreamSource> {
    let s = season.unwrap_or(1);
    let ep = episode.unwrap_or(1);

    if media_type == "tv" {
        vec![
            StreamSource {
                name: "VidSrc.ru (Official)".to_string(),
                key: "vidsrc_ru".to_string(),
                url: format!("https://vidsrc.ru/tv/{}/{}/{}?colour=e50914&autoplay=true&autonextepisode=true", id, s, ep),
                badge: "Fast 1080p".to_string(),
            },
            StreamSource {
                name: "VidLink (Ad-Free & Fast)".to_string(),
                key: "vidlink".to_string(),
                url: format!("https://vidlink.pro/tv/{}/{}/{}?primaryColor=e50914", id, s, ep),
                badge: "No Ads • 1080p".to_string(),
            },
            StreamSource {
                name: "SuperEmbed / Multi".to_string(),
                key: "superembed".to_string(),
                url: format!("https://multiembed.mov/?video_id={}&tmdb=1&s={}&e={}", id, s, ep),
                badge: "Failover".to_string(),
            },
            StreamSource {
                name: "VidSrc.cc (v2 Engine)".to_string(),
                key: "vidsrc_cc".to_string(),
                url: format!("https://vidsrc.cc/v2/embed/tv/{}/{}/{}", id, s, ep),
                badge: "Multi-Sub".to_string(),
            },
            StreamSource {
                name: "VidSrc.to (Direct)".to_string(),
                key: "vidsrc_to".to_string(),
                url: format!("https://vidsrc.to/embed/tv/{}/{}/{}", id, s, ep),
                badge: "Fast CDN".to_string(),
            },
            StreamSource {
                name: "VidSrc.xyz (Mirror)".to_string(),
                key: "vidsrc_xyz".to_string(),
                url: format!("https://vidsrc.xyz/embed/tv/{}/{}/{}", id, s, ep),
                badge: "Adaptive".to_string(),
            },
        ]
    } else {
        // Movie sources
        let vidsrc_ru_url = match &imdb_id {
            Some(imdb) if !imdb.is_empty() => format!("https://vidsrc.ru/movie/{}?colour=e50914&autoplay=true", imdb),
            _ => format!("https://vidsrc.ru/movie/{}?colour=e50914&autoplay=true", id),
        };

        vec![
            StreamSource {
                name: "VidSrc.ru (Official)".to_string(),
                key: "vidsrc_ru".to_string(),
                url: vidsrc_ru_url,
                badge: "Fast 1080p".to_string(),
            },
            StreamSource {
                name: "VidLink (Ad-Free & Fast)".to_string(),
                key: "vidlink".to_string(),
                url: format!("https://vidlink.pro/movie/{}?primaryColor=e50914", id),
                badge: "No Ads • 1080p".to_string(),
            },
            StreamSource {
                name: "SuperEmbed / Multi".to_string(),
                key: "superembed".to_string(),
                url: format!("https://multiembed.mov/?video_id={}&tmdb=1", id),
                badge: "Failover".to_string(),
            },
            StreamSource {
                name: "VidSrc.cc (v2 Engine)".to_string(),
                key: "vidsrc_cc".to_string(),
                url: format!("https://vidsrc.cc/v2/embed/movie/{}", id),
                badge: "Multi-Sub".to_string(),
            },
            StreamSource {
                name: "VidSrc.to (Direct)".to_string(),
                key: "vidsrc_to".to_string(),
                url: format!("https://vidsrc.to/embed/movie/{}", id),
                badge: "Fast CDN".to_string(),
            },
            StreamSource {
                name: "VidSrc.xyz (Mirror)".to_string(),
                key: "vidsrc_xyz".to_string(),
                url: format!("https://vidsrc.xyz/embed/movie/{}", id),
                badge: "Adaptive".to_string(),
            },
        ]
    }
}

// ---------------------------------------------------------
// TMDB API Commands via Rust reqwest
// ---------------------------------------------------------

#[tauri::command]
async fn tmdb_request(
    state: State<'_, AppState>,
    endpoint: String,
    query_params: Option<Vec<(String, String)>>,
) -> Result<serde_json::Value, String> {
    let api_key = get_active_api_key(&state);
    let mut url = format!("{}{}?api_key={}", TMDB_BASE_URL, endpoint, api_key);

    if let Some(params) = query_params {
        for (k, v) in params {
            url.push_str(&format!("&{}={}", k, urlencoding::encode(&v)));
        }
    }

    let response = state
        .client
        .get(&url)
        .header("Accept", "application/json")
        .header("User-Agent", "CineStream-Native-Rust/1.0")
        .send()
        .await
        .map_err(|e| format!("Network request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "TMDB returned HTTP status {}: {}",
            response.status(),
            response.text().await.unwrap_or_default()
        ));
    }

    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse TMDB JSON: {}", e))?;

    Ok(json)
}

#[tauri::command]
async fn fetch_trending(
    state: State<'_, AppState>,
    media_type: Option<String>,
    time_window: Option<String>,
) -> Result<serde_json::Value, String> {
    let m = media_type.unwrap_or_else(|| "all".to_string());
    let t = time_window.unwrap_or_else(|| "day".to_string());
    let endpoint = format!("/trending/{}/{}", m, t);
    tmdb_request(state, endpoint, None).await
}

#[tauri::command]
async fn fetch_popular(
    state: State<'_, AppState>,
    media_type: String,
    page: Option<u32>,
) -> Result<serde_json::Value, String> {
    let p = page.unwrap_or(1).to_string();
    let endpoint = format!("/{}/popular", media_type);
    tmdb_request(state, endpoint, Some(vec![("page".to_string(), p)])).await
}

#[tauri::command]
async fn fetch_top_rated(
    state: State<'_, AppState>,
    media_type: String,
    page: Option<u32>,
) -> Result<serde_json::Value, String> {
    let p = page.unwrap_or(1).to_string();
    let endpoint = format!("/{}/top_rated", media_type);
    tmdb_request(state, endpoint, Some(vec![("page".to_string(), p)])).await
}

#[tauri::command]
async fn fetch_genres(
    state: State<'_, AppState>,
    media_type: String,
) -> Result<serde_json::Value, String> {
    let endpoint = format!("/genre/{}/list", media_type);
    tmdb_request(state, endpoint, None).await
}

#[tauri::command]
async fn fetch_discover_by_genre(
    state: State<'_, AppState>,
    media_type: String,
    genre_id: u32,
    page: Option<u32>,
) -> Result<serde_json::Value, String> {
    let p = page.unwrap_or(1).to_string();
    let endpoint = format!("/discover/{}", media_type);
    tmdb_request(
        state,
        endpoint,
        Some(vec![
            ("with_genres".to_string(), genre_id.to_string()),
            ("sort_by".to_string(), "popularity.desc".to_string()),
            ("page".to_string(), p),
        ]),
    )
    .await
}

#[tauri::command]
async fn fetch_details(
    state: State<'_, AppState>,
    media_type: String,
    id: u32,
) -> Result<serde_json::Value, String> {
    let endpoint = format!("/{}/{}", media_type, id);
    tmdb_request(
        state,
        endpoint,
        Some(vec![(
            "append_to_response".to_string(),
            "videos,credits,similar,recommendations,external_ids".to_string(),
        )]),
    )
    .await
}

#[tauri::command]
async fn fetch_season_episodes(
    state: State<'_, AppState>,
    tv_id: u32,
    season_number: u32,
) -> Result<serde_json::Value, String> {
    let endpoint = format!("/tv/{}/season/{}", tv_id, season_number);
    tmdb_request(state, endpoint, None).await
}

#[tauri::command]
async fn search_multi(
    state: State<'_, AppState>,
    query: String,
    page: Option<u32>,
) -> Result<serde_json::Value, String> {
    let p = page.unwrap_or(1).to_string();
    let endpoint = "/search/multi".to_string();
    tmdb_request(
        state,
        endpoint,
        Some(vec![
            ("query".to_string(), query),
            ("page".to_string(), p),
            ("include_adult".to_string(), "false".to_string()),
        ]),
    )
    .await
}

// ---------------------------------------------------------
// User Library & Settings Commands
// ---------------------------------------------------------

#[tauri::command]
fn get_user_data(state: State<'_, AppState>) -> UserData {
    let lock = state.user_data.lock().unwrap();
    lock.clone()
}

#[tauri::command]
fn save_settings(
    app: AppHandle,
    state: State<'_, AppState>,
    settings: AppSettings,
) -> Result<(), String> {
    let mut lock = state.user_data.lock().unwrap();
    lock.settings = settings;
    save_user_data(&app, &lock)
}

#[tauri::command]
fn add_watch_history(
    app: AppHandle,
    state: State<'_, AppState>,
    item: WatchHistoryItem,
) -> Result<Vec<WatchHistoryItem>, String> {
    let mut lock = state.user_data.lock().unwrap();
    // Remove previous entry with same id
    lock.history.retain(|h| h.id != item.id);
    lock.history.insert(0, item);
    // Keep max 50 items
    if lock.history.len() > 50 {
        lock.history.truncate(50);
    }
    save_user_data(&app, &lock)?;
    Ok(lock.history.clone())
}

#[tauri::command]
fn toggle_favorite(
    app: AppHandle,
    state: State<'_, AppState>,
    item: FavoriteItem,
) -> Result<bool, String> {
    let mut lock = state.user_data.lock().unwrap();
    let is_fav = if let Some(idx) = lock.favorites.iter().position(|f| f.id == item.id) {
        lock.favorites.remove(idx);
        false
    } else {
        lock.favorites.insert(0, item);
        true
    };
    save_user_data(&app, &lock)?;
    Ok(is_fav)
}

#[tauri::command]
fn set_user_library(
    app: AppHandle,
    state: State<'_, AppState>,
    favorites: Vec<FavoriteItem>,
    history: Vec<WatchHistoryItem>,
) -> Result<(), String> {
    let mut lock = state.user_data.lock().unwrap();
    lock.favorites = favorites;
    lock.history = history;
    save_user_data(&app, &lock)?;
    Ok(())
}

// ---------------------------------------------------------
// Music Section Commands (Local Library & Online Streaming)
// ---------------------------------------------------------

fn scan_dir_recursive(dir: &std::path::Path, tracks: &mut Vec<MusicTrack>) {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    if !name.starts_with('.') {
                        scan_dir_recursive(&path, tracks);
                    }
                }
            } else if path.is_file() {
                if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                    let ext_lower = ext.to_lowercase();
                    if matches!(ext_lower.as_str(), "opus" | "mp3" | "m4a" | "flac" | "wav" | "ogg") {
                        let file_stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("Unknown");
                        let clean_title = if let Some(idx) = file_stem.find('[') {
                            file_stem[..idx].trim().to_string()
                        } else {
                            file_stem.to_string()
                        };

                        let parent = match path.parent() {
                            Some(p) => p,
                            None => continue,
                        };

                        let (artist, title) = if let Some((art, tit)) = clean_title.split_once(" - ") {
                            (art.trim().to_string(), tit.trim().to_string())
                        } else if let Some(parent_name) = parent.file_name().and_then(|p| p.to_str()) {
                            if parent_name != "Music" && parent_name != "Ryotunes" && parent_name != "Ovilo" && parent_name != "Downloads" {
                                (parent_name.to_string(), clean_title.clone())
                            } else {
                                ("Local Artist".to_string(), clean_title.clone())
                            }
                        } else {
                            ("Local Artist".to_string(), clean_title.clone())
                        };

                        let mut artwork_path = None;
                        for img_ext in &["jpg", "png", "webp", "jpeg"] {
                            let candidate = parent.join(format!("{}.{}", file_stem, img_ext));
                            if candidate.exists() {
                                artwork_path = Some(candidate.to_string_lossy().to_string());
                                break;
                            }
                        }
                        if artwork_path.is_none() {
                            for generic_img in &["cover.jpg", "folder.jpg", "cover.png", "album.jpg"] {
                                let candidate = parent.join(generic_img);
                                if candidate.exists() {
                                    artwork_path = Some(candidate.to_string_lossy().to_string());
                                    break;
                                }
                            }
                        }

                        let lrc_candidate = parent.join(format!("{}.lrc", file_stem));
                        let has_lyrics = lrc_candidate.exists();

                        let mut duration_est: Option<f64> = None;
                        if has_lyrics {
                            if let Ok(lrc_content) = fs::read_to_string(&lrc_candidate) {
                                for line in lrc_content.lines().rev() {
                                    if let Some(start) = line.find('[') {
                                        if let Some(end) = line[start..].find(']') {
                                            let tag = &line[start + 1..start + end];
                                            if let Some((m_str, s_str)) = tag.split_once(':') {
                                                if let (Ok(m), Ok(s)) = (m_str.parse::<f64>(), s_str.replace(':', ".").parse::<f64>()) {
                                                    duration_est = Some((m * 60.0 + s + 4.0).round());
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        if duration_est.is_none() {
                            if let Ok(output) = std::process::Command::new("ffprobe")
                                .args(&[
                                    "-v", "error",
                                    "-show_entries", "format=duration",
                                    "-of", "default=noprint_wrappers=1:nokey=1",
                                    &path.to_string_lossy()
                                ])
                                .output()
                            {
                                if output.status.success() {
                                    if let Ok(s) = String::from_utf8(output.stdout) {
                                        if let Ok(dur) = s.trim().parse::<f64>() {
                                            duration_est = Some(dur.round());
                                        }
                                    }
                                }
                            }
                        }

                        let vid_id = if let (Some(start), Some(end)) = (file_stem.rfind('['), file_stem.rfind(']')) {
                            if end > start + 1 {
                                Some(file_stem[start + 1..end].trim().to_string())
                            } else {
                                None
                            }
                        } else {
                            None
                        };

                        let file_path_str = path.to_string_lossy().to_string();
                        let id = if let Some(ref vid) = vid_id {
                            format!("yt_{}", vid)
                        } else {
                            format!("local_{}", file_stem.replace(' ', "_"))
                        };
                        let stream_url = format!("http://127.0.0.1:4545/media?path={}", urlencoding::encode(&file_path_str));
                        let artwork_url = artwork_path.map(|p| format!("http://127.0.0.1:4545/media?path={}", urlencoding::encode(&p)));

                        tracks.push(MusicTrack {
                            id,
                            title: if title.is_empty() { file_stem.to_string() } else { title },
                            artist,
                            album: Some("Offline Library".to_string()),
                            duration: duration_est,
                            stream_url,
                            file_path: Some(file_path_str),
                            artwork_url,
                            is_local: true,
                            has_lyrics,
                        });
                    }
                }
            }
        }
    }
}

fn dirs_or_home_music() -> PathBuf {
    if let Some(p) = dirs::audio_dir() {
        if p.exists() {
            return p;
        }
    }
    if let Some(home) = dirs::home_dir() {
        let p = home.join("Music");
        if p.exists() {
            return p;
        }
    }
    dirs::audio_dir().unwrap_or_else(|| PathBuf::from("Music"))
}

fn resolve_ovilo_download_dir() -> PathBuf {
    if let Some(download_dir) = dirs::download_dir() {
        download_dir.join("Ovilo")
    } else if let Some(home) = dirs::home_dir() {
        home.join("Downloads").join("Ovilo")
    } else {
        PathBuf::from("Downloads").join("Ovilo")
    }
}

#[tauri::command]
fn scan_local_music(folder_path: Option<String>) -> Result<Vec<MusicTrack>, String> {
    let mut tracks = Vec::new();

    if let Some(p) = folder_path {
        let custom_dir = PathBuf::from(p);
        if custom_dir.exists() {
            scan_dir_recursive(&custom_dir, &mut tracks);
        }
        return Ok(tracks);
    }

    // 1. Scan user's system Music directory
    let music_dir = dirs_or_home_music();
    if music_dir.exists() {
        scan_dir_recursive(&music_dir, &mut tracks);
    }

    // 2. Scan Ovilo Downloads directory (where offline downloaded music is stored)
    let dl_dir = resolve_ovilo_download_dir();
    if dl_dir.exists() && dl_dir != music_dir {
        scan_dir_recursive(&dl_dir, &mut tracks);
    }

    // Deduplicate by file_path or title & artist
    tracks.sort_by(|a, b| a.title.cmp(&b.title));
    tracks.dedup_by(|a, b| {
        if let (Some(fa), Some(fb)) = (&a.file_path, &b.file_path) {
            fa == fb
        } else {
            a.title == b.title && a.artist == b.artist
        }
    });

    Ok(tracks)
}

#[tauri::command]
fn read_local_lrc(file_path: String) -> Result<Option<String>, String> {
    let p = std::path::Path::new(&file_path);
    if let (Some(parent), Some(stem)) = (p.parent(), p.file_stem().and_then(|s| s.to_str())) {
        let lrc_path = parent.join(format!("{}.lrc", stem));
        if lrc_path.exists() {
            if let Ok(content) = fs::read_to_string(lrc_path) {
                return Ok(Some(content));
            }
        }
    }
    Ok(None)
}

#[derive(serde::Serialize)]
pub struct SystemStorageStats {
    pub total_gb: f64,
    pub used_gb: f64,
    pub free_gb: f64,
    pub percent: f64,
}

#[tauri::command]
fn get_storage_stats() -> SystemStorageStats {
    #[cfg(target_os = "linux")]
    {
        if let Ok(output) = std::process::Command::new("df").args(["-k", "."]).output() {
            if let Ok(stdout) = String::from_utf8(output.stdout) {
                let lines: Vec<&str> = stdout.lines().collect();
                if lines.len() >= 2 {
                    let parts: Vec<&str> = lines[1].split_whitespace().collect();
                    if parts.len() >= 4 {
                        let total_k: f64 = parts[1].parse().unwrap_or(0.0);
                        let used_k: f64 = parts[2].parse().unwrap_or(0.0);
                        let free_k: f64 = parts[3].parse().unwrap_or(0.0);
                        let total_gb = total_k / 1024.0 / 1024.0;
                        let used_gb = used_k / 1024.0 / 1024.0;
                        let free_gb = free_k / 1024.0 / 1024.0;
                        let percent = if total_gb > 0.0 { (used_gb / total_gb) * 100.0 } else { 0.0 };
                        return SystemStorageStats {
                            total_gb: (total_gb * 10.0).round() / 10.0,
                            used_gb: (used_gb * 10.0).round() / 10.0,
                            free_gb: (free_gb * 10.0).round() / 10.0,
                            percent: (percent * 10.0).round() / 10.0,
                        };
                    }
                }
            }
        }
    }

    SystemStorageStats {
        total_gb: 128.0,
        used_gb: 13.0,
        free_gb: 115.0,
        percent: 10.2,
    }
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct ResolvedAudioStream {
    pub url: String,
    pub video_id: Option<String>,
    pub duration: Option<f64>,
    pub title: Option<String>,
    pub artist: Option<String>,
}

fn levenshtein_sim(s1: &str, s2: &str) -> f64 {
    let s1 = s1.trim().to_lowercase();
    let s2 = s2.trim().to_lowercase();
    if s1 == s2 { return 1.0; }
    if s1.is_empty() || s2.is_empty() { return 0.0; }
    if s1.contains(&s2) || s2.contains(&s1) { return 0.8; }

    let v1: Vec<char> = s1.chars().collect();
    let v2: Vec<char> = s2.chars().collect();
    let len1 = v1.len();
    let len2 = v2.len();
    let mut matrix = vec![vec![0usize; len2 + 1]; len1 + 1];
    for i in 0..=len1 { matrix[i][0] = i; }
    for j in 0..=len2 { matrix[0][j] = j; }
    for i in 1..=len1 {
        for j in 1..=len2 {
            let cost = if v1[i - 1] == v2[j - 1] { 0 } else { 1 };
            matrix[i][j] = (matrix[i - 1][j] + 1)
                .min(matrix[i][j - 1] + 1)
                .min(matrix[i - 1][j - 1] + cost);
        }
    }
    let max_len = len1.max(len2);
    1.0 - (matrix[len1][len2] as f64 / max_len as f64)
}

#[tauri::command]
async fn fetch_online_lyrics(
    state: State<'_, AppState>,
    track_name: String,
    artist_name: String,
    duration: Option<f64>,
    video_id: Option<String>,
) -> Result<Option<LyricsResult>, String> {
    let _ = video_id;
    #[derive(Deserialize, Clone)]
    struct LrcLibResp {
        #[serde(rename = "trackName")]
        track_name: Option<String>,
        #[serde(rename = "artistName")]
        artist_name: Option<String>,
        #[serde(rename = "syncedLyrics")]
        synced_lyrics: Option<String>,
        #[serde(rename = "plainLyrics")]
        plain_lyrics: Option<String>,
        #[serde(default)]
        instrumental: bool,
        #[serde(default)]
        duration: Option<f64>,
    }

    // 1. Resolve effective track and artist names (handling "Artist - Track" video titles)
    let (mut effective_track, mut effective_artist) = (track_name.clone(), artist_name.clone());
    if effective_track.contains(" - ") {
        let parts: Vec<&str> = effective_track.splitn(2, " - ").collect();
        if parts.len() == 2 {
            let possible_artist = parts[0].trim();
            let possible_track = parts[1].trim();
            let is_generic = effective_artist.is_empty()
                || effective_artist.eq_ignore_ascii_case("YouTube Music")
                || effective_artist.eq_ignore_ascii_case("Local Artist")
                || effective_artist.eq_ignore_ascii_case("Unknown Artist")
                || effective_artist.eq_ignore_ascii_case("Unknown")
                || effective_artist.to_lowercase().contains("vevo");
            if is_generic && !possible_artist.is_empty() {
                effective_artist = possible_artist.to_string();
                effective_track = possible_track.to_string();
            }
        }
    }

    // 2. Query LRCLIB with ArchiveTune / ovilo_flutter exact clean strings
    let mut clean_track_str = effective_track.clone();
    for tag in &[
        "(official video)", "[official video]",
        "(official music video)", "[official music video]",
        "(official audio)", "[official audio]",
        "(lyrics video)", "[lyrics video]",
        "(lyric video)", "[lyric video]",
        "(lyrics)", "[lyrics]",
        "(audio)", "[audio]",
        "(visualizer)", "[visualizer]",
        "(music video)", "[music video]",
        "(4k)", "[4k]", "(hd)", "[hd]",
    ] {
        if let Some(idx) = clean_track_str.to_lowercase().find(tag) {
            clean_track_str.replace_range(idx..idx + tag.len(), "");
        }
    }
    let clean_track = clean_track_str.trim_start_matches('#').trim();

    let is_generic_artist = effective_artist.is_empty()
        || effective_artist.eq_ignore_ascii_case("Local Artist")
        || effective_artist.eq_ignore_ascii_case("Unknown Artist")
        || effective_artist.eq_ignore_ascii_case("Unknown")
        || effective_artist.eq_ignore_ascii_case("YouTube Music");

    let clean_artist = if is_generic_artist {
        ""
    } else {
        effective_artist
            .split('&').next().unwrap_or(&effective_artist)
            .split(',').next().unwrap_or(&effective_artist)
            .split("feat").next().unwrap_or(&effective_artist)
            .trim()
    };

    let is_valid_match = |item: &LrcLibResp| -> bool {
        // Duration check: allows YouTube stream duration to differ from studio master by up to 15.0s
        if let Some(target) = duration {
            if target > 0.0 && (target - 215.0).abs() > 0.01 {
                if let Some(item_dur) = item.duration {
                    if (item_dur - target).abs() > 15.0 {
                        return false;
                    }
                }
            }
        }
        let item_title = item.track_name.as_deref().unwrap_or("");
        let title_sim = levenshtein_sim(clean_track, item_title);
        if !clean_artist.is_empty() {
            let item_artist = item.artist_name.as_deref().unwrap_or("");
            let artist_sim = levenshtein_sim(clean_artist, item_artist);
            if title_sim < 0.50 || (title_sim + artist_sim) / 2.0 < 0.50 {
                return false;
            }
        } else {
            // When artist is unknown/generic, require reasonable title similarity
            if title_sim < 0.70 {
                return false;
            }
        }
        true
    };

    let mut candidate_plain: Option<String> = None;

    // A. If artist is known and duration is provided, try exact GET with duration first
    if !clean_artist.is_empty() {
        if let Some(dur) = duration {
            if dur > 0.0 && (dur - 215.0).abs() > 0.01 {
                let url = format!(
                    "https://lrclib.net/api/get?track_name={}&artist_name={}&duration={}",
                    urlencoding::encode(clean_track),
                    urlencoding::encode(clean_artist),
                    dur.round() as u64
                );
                if let Ok(resp) = state.client.get(&url).header("User-Agent", "OVILO-Music/1.0").send().await {
                    if resp.status().is_success() {
                        if let Ok(data) = resp.json::<LrcLibResp>().await {
                            if data.instrumental {
                                return Ok(Some(LyricsResult {
                                    synced: false,
                                    plain_lyrics: Some("♪ Instrumental ♪".to_string()),
                                    synced_lyrics: None,
                                }));
                            }
                            if is_valid_match(&data) {
                                let has_synced = data.synced_lyrics.as_ref().map_or(false, |s| !s.trim().is_empty());
                                if has_synced {
                                    return Ok(Some(LyricsResult {
                                        synced: true,
                                        plain_lyrics: data.plain_lyrics,
                                        synced_lyrics: data.synced_lyrics,
                                    }));
                                } else if candidate_plain.is_none() && data.plain_lyrics.is_some() {
                                    candidate_plain = data.plain_lyrics;
                                }
                            }
                        }
                    }
                }
            }
        }

        // B. Search endpoint with track_name + artist_name (ArchiveTune pattern)
        let search_url = format!(
            "https://lrclib.net/api/search?track_name={}&artist_name={}",
            urlencoding::encode(clean_track),
            urlencoding::encode(clean_artist)
        );
        if let Ok(resp) = state.client.get(&search_url).header("User-Agent", "OVILO-Music/1.0").send().await {
            if resp.status().is_success() {
                if let Ok(results) = resp.json::<Vec<LrcLibResp>>().await {
                    let valid_synced: Vec<&LrcLibResp> = results
                        .iter()
                        .filter(|r| r.synced_lyrics.as_ref().map_or(false, |s| !s.trim().is_empty()) && is_valid_match(r))
                        .collect();

                    if !valid_synced.is_empty() {
                        let best = if let Some(target) = duration {
                            if target > 0.0 && (target - 215.0).abs() > 0.01 {
                                let mut b = valid_synced[0];
                                let mut min_diff = (b.duration.unwrap_or(0.0) - target).abs();
                                for cand in &valid_synced[1..] {
                                    let diff = (cand.duration.unwrap_or(0.0) - target).abs();
                                    if diff < min_diff {
                                        min_diff = diff;
                                        b = cand;
                                    }
                                }
                                b
                            } else {
                                valid_synced[0]
                            }
                        } else {
                            valid_synced[0]
                        };

                        return Ok(Some(LyricsResult {
                            synced: true,
                            plain_lyrics: best.plain_lyrics.clone(),
                            synced_lyrics: best.synced_lyrics.clone(),
                        }));
                    }

                    if candidate_plain.is_none() {
                        if let Some(first_plain) = results.iter().find(|r| r.plain_lyrics.is_some() && is_valid_match(r)) {
                            candidate_plain = first_plain.plain_lyrics.clone();
                        }
                    }
                }
            }
        }

        // C. Fallback: GET without duration if search yielded no synced lyrics
        let url_no_dur = format!(
            "https://lrclib.net/api/get?track_name={}&artist_name={}",
            urlencoding::encode(clean_track),
            urlencoding::encode(clean_artist)
        );
        if let Ok(resp) = state.client.get(&url_no_dur).header("User-Agent", "OVILO-Music/1.0").send().await {
            if resp.status().is_success() {
                if let Ok(data) = resp.json::<LrcLibResp>().await {
                    if data.instrumental {
                        return Ok(Some(LyricsResult {
                            synced: false,
                            plain_lyrics: Some("♪ Instrumental ♪".to_string()),
                            synced_lyrics: None,
                        }));
                    }
                    if is_valid_match(&data) {
                        let has_synced = data.synced_lyrics.as_ref().map_or(false, |s| !s.trim().is_empty());
                        if has_synced {
                            return Ok(Some(LyricsResult {
                                synced: true,
                                plain_lyrics: data.plain_lyrics,
                                synced_lyrics: data.synced_lyrics,
                            }));
                        } else if candidate_plain.is_none() && data.plain_lyrics.is_some() {
                            candidate_plain = data.plain_lyrics;
                        }
                    }
                }
            }
        }
    } else {
        // D. Fallback search with track title alone ONLY when artist is unknown
        let search_title_url = format!(
            "https://lrclib.net/api/search?track_name={}",
            urlencoding::encode(clean_track)
        );
        if let Ok(resp) = state.client.get(&search_title_url).header("User-Agent", "OVILO-Music/1.0").send().await {
            if resp.status().is_success() {
                if let Ok(results) = resp.json::<Vec<LrcLibResp>>().await {
                    let valid_synced: Vec<&LrcLibResp> = results
                        .iter()
                        .filter(|r| r.synced_lyrics.as_ref().map_or(false, |s| !s.trim().is_empty()) && is_valid_match(r))
                        .collect();

                    if !valid_synced.is_empty() {
                        let best = if let Some(target) = duration {
                            if target > 0.0 {
                                let mut b = valid_synced[0];
                                let mut min_diff = (b.duration.unwrap_or(0.0) - target).abs();
                                for cand in &valid_synced[1..] {
                                    let diff = (cand.duration.unwrap_or(0.0) - target).abs();
                                    if diff < min_diff {
                                        min_diff = diff;
                                        b = cand;
                                    }
                                }
                                b
                            } else {
                                valid_synced[0]
                            }
                        } else {
                            valid_synced[0]
                        };

                        return Ok(Some(LyricsResult {
                            synced: true,
                            plain_lyrics: best.plain_lyrics.clone(),
                            synced_lyrics: best.synced_lyrics.clone(),
                        }));
                    }
                }
            }
        }
    }

    // 3. Fall back to plain lyrics if synced lyrics were unavailable
    if let Some(plain) = candidate_plain {
        return Ok(Some(LyricsResult {
            synced: false,
            plain_lyrics: Some(plain),
            synced_lyrics: None,
        }));
    }

    Ok(None)
}

#[tauri::command]
fn save_local_lrc(file_path: String, lrc_content: String) -> Result<bool, String> {
    let p = std::path::Path::new(&file_path);
    if let (Some(parent), Some(stem)) = (p.parent(), p.file_stem().and_then(|s| s.to_str())) {
        let lrc_path = parent.join(format!("{}.lrc", stem));
        if fs::write(lrc_path, lrc_content).is_ok() {
            return Ok(true);
        }
    }
    Ok(false)
}

#[tauri::command]
async fn resolve_online_stream(
    app: AppHandle,
    title: String,
    artist: String,
    video_id: Option<String>,
    expected_duration: Option<f64>,
) -> Result<ResolvedAudioStream, String> {
    let bin_path = resolve_ytdlp_binary(&app);

    // 1. If direct video ID provided, extract the direct audio stream from this exact video (matches ovilo_flutter behavior)
    if let Some(vid) = &video_id {
        if !vid.is_empty() {
            let url_target = format!("https://www.youtube.com/watch?v={}", vid);
            if let Ok(output) = tokio::process::Command::new(&bin_path)
                .args(["-g", "-f", "140/bestaudio[ext=m4a]/bestaudio/best", "--no-warnings", &url_target])
                .output()
                .await
            {
                if output.status.success() {
                    let stream = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    if stream.starts_with("http") {
                        return Ok(ResolvedAudioStream {
                            url: stream,
                            video_id: Some(vid.clone()),
                            duration: expected_duration,
                            title: Some(title),
                            artist: Some(artist),
                        });
                    }
                }
            }
        }
    }

    let clean_title = title
        .split('(').next().unwrap_or(&title)
        .split('[').next().unwrap_or(&title)
        .trim_start_matches('#')
        .trim();

    let is_generic_artist = artist.is_empty()
        || artist.eq_ignore_ascii_case("Local Artist")
        || artist.eq_ignore_ascii_case("Unknown Artist")
        || artist.eq_ignore_ascii_case("Unknown");

    let clean_artist = if is_generic_artist {
        ""
    } else {
        artist
            .split('&').next().unwrap_or(&artist)
            .split(',').next().unwrap_or(&artist)
            .split("feat").next().unwrap_or(&artist)
            .trim()
    };

    // Determine target studio track duration to match against
    let mut target_duration: Option<f64> = None;
    if let Some(d) = expected_duration {
        if d > 10.0 && (d - 215.0).abs() > 0.01 {
            target_duration = Some(d);
        }
    }

    // If target duration is still unknown and we have artist, query LRCLIB for the exact studio duration
    if target_duration.is_none() && !clean_artist.is_empty() {
        let lrclib_url = format!(
            "https://lrclib.net/api/get?track_name={}&artist_name={}",
            urlencoding::encode(clean_title),
            urlencoding::encode(clean_artist)
        );
        let state = app.state::<AppState>();
        if let Ok(resp) = state.client.get(&lrclib_url)
            .header("User-Agent", "OVILO-Music/1.0")
            .timeout(std::time::Duration::from_millis(2000))
            .send()
            .await
        {
            if resp.status().is_success() {
                if let Ok(val) = resp.json::<serde_json::Value>().await {
                    if let Some(dur) = val.get("duration").and_then(|d| d.as_f64()) {
                        if dur > 10.0 {
                            target_duration = Some(dur);
                        }
                    }
                }
            }
        }
    }

    // 2. High-precision YouTube candidate search (filtering out music videos with dialogue/intros)
    let search_query = if !clean_artist.is_empty() {
        format!("ytsearch8:{} {} audio", clean_title, clean_artist)
    } else {
        format!("ytsearch8:{} audio", clean_title)
    };

    #[derive(Deserialize, Debug)]
    struct YtCandidate {
        id: Option<String>,
        title: Option<String>,
        duration: Option<f64>,
        channel: Option<String>,
        uploader: Option<String>,
    }

    if let Ok(output) = tokio::process::Command::new(&bin_path)
        .args([
            "--dump-json",
            "--flat-playlist",
            "--no-warnings",
            &search_query,
        ])
        .output()
        .await
    {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let mut candidates: Vec<YtCandidate> = Vec::new();
            for line in stdout.lines() {
                if let Ok(cand) = serde_json::from_str::<YtCandidate>(line) {
                    if cand.id.is_some() {
                        candidates.push(cand);
                    }
                }
            }

            if !candidates.is_empty() {
                let score_cand = |c: &YtCandidate| -> f64 {
                    let mut score = 0.0f64;
                    let t_lower = c.title.as_deref().unwrap_or("").to_lowercase();
                    let ch_lower = c.channel.as_deref().unwrap_or("").to_lowercase();
                    let up_lower = c.uploader.as_deref().unwrap_or("").to_lowercase();

                    // Heavy penalty for music videos with narrative intros/outros
                    if t_lower.contains("music video")
                        || t_lower.contains("official video")
                        || t_lower.contains("official music video")
                        || t_lower.contains("musicvideo")
                        || t_lower.contains("(m/v)")
                        || t_lower.contains("[m/v]")
                        || t_lower.contains(" m/v")
                    {
                        score -= 150.0;
                    }

                    // Penalty for live recordings, remixes, covers, extended
                    if t_lower.contains("live")
                        || t_lower.contains("concert")
                        || t_lower.contains("performance")
                        || t_lower.contains("remix")
                        || t_lower.contains("slowed")
                        || t_lower.contains("sped up")
                        || t_lower.contains("extended")
                        || t_lower.contains("1 hour")
                        || t_lower.contains("karaoke")
                        || t_lower.contains("instrumental")
                        || t_lower.contains("cover")
                    {
                        score -= 120.0;
                    }

                    // Penalty for Vevo channels (known for hosting narrative music videos)
                    if ch_lower.contains("vevo") || up_lower.contains("vevo") {
                        score -= 60.0;
                    }

                    // Boost for YouTube Music Topic channels (pure studio masters)
                    if ch_lower.ends_with("- topic") || ch_lower.contains("- topic")
                        || up_lower.ends_with("- topic") || up_lower.contains("- topic")
                    {
                        score += 80.0;
                    }

                    // Boost for audio / lyric tracks
                    if t_lower.contains("official audio") {
                        score += 60.0;
                    } else if t_lower.contains("[audio]") || t_lower.contains("(audio)") || t_lower.contains(" audio") {
                        score += 40.0;
                    }

                    if t_lower.contains("lyric video") || t_lower.contains("lyrics video") || t_lower.contains("official lyric") {
                        score += 35.0;
                    } else if t_lower.contains("(lyrics)") || t_lower.contains("[lyrics]") || t_lower.contains(" lyrics") {
                        score += 25.0;
                    }

                    // Duration match against target studio duration
                    if let (Some(target), Some(cand_dur)) = (target_duration, c.duration) {
                        let diff = (cand_dur - target).abs();
                        if diff <= 2.0 {
                            score += 100.0;
                        } else if diff <= 5.0 {
                            score += 60.0;
                        } else if diff <= 10.0 {
                            score += 20.0;
                        } else {
                            score -= diff * 5.0;
                        }
                    }

                    score
                };

                if let Some(best) = candidates.into_iter().max_by(|a, b| {
                    score_cand(a).partial_cmp(&score_cand(b)).unwrap_or(std::cmp::Ordering::Equal)
                }) {
                    if let Some(vid_id) = best.id {
                        let url_target = format!("https://www.youtube.com/watch?v={}", vid_id);
                        if let Ok(output) = tokio::process::Command::new(&bin_path)
                            .args(["-g", "-f", "140/bestaudio[ext=m4a]/bestaudio/best", "--no-warnings", &url_target])
                            .output()
                            .await
                        {
                            if output.status.success() {
                                let stream = String::from_utf8_lossy(&output.stdout).trim().to_string();
                                if stream.starts_with("http") {
                                    return Ok(ResolvedAudioStream {
                                        url: stream,
                                        video_id: Some(vid_id),
                                        duration: best.duration.or(target_duration),
                                        title: best.title.or(Some(title.clone())),
                                        artist: best.uploader.or(best.channel).or(Some(artist.clone())),
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // 3. Fallback to direct query
    let fallback_query = format!("ytsearch1:{} {} official audio", clean_title, artist);
    let output = tokio::process::Command::new(&bin_path)
        .args(["-g", "-f", "140/bestaudio[ext=m4a]/bestaudio/best", "--no-warnings", &fallback_query])
        .output()
        .await
        .map_err(|e| format!("yt-dlp failed: {}", e))?;

    if output.status.success() {
        let stream = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if stream.starts_with("http") {
            return Ok(ResolvedAudioStream {
                url: stream,
                video_id: None,
                duration: target_duration,
                title: Some(title),
                artist: Some(artist),
            });
        }
    }

    Err("Could not resolve streaming audio URL".to_string())
}

#[tauri::command]
async fn search_online_music(
    app: AppHandle,
    state: State<'_, AppState>,
    query: String,
) -> Result<Vec<MusicTrack>, String> {
    if query.trim().is_empty() {
        return Ok(vec![]);
    }

    // 1. High-fidelity YouTube search via yt-dlp: gives exact video IDs, titles, and durations
    let search_arg = format!("ytsearch20:{}", query);
    let bin_path = resolve_ytdlp_binary(&app);
    if let Ok(output) = tokio::process::Command::new(&bin_path)
        .args([&search_arg, "--dump-json", "--flat-playlist", "--no-warnings"])
        .output()
        .await
    {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let mut tracks = Vec::new();

            for line in stdout.lines() {
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(line) {
                    let id = val.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let title = val.get("title").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let artist = val
                        .get("uploader")
                        .and_then(|v| v.as_str())
                        .or_else(|| val.get("channel").and_then(|v| v.as_str()))
                        .unwrap_or("YouTube Music")
                        .to_string();
                    let duration = val.get("duration").and_then(|v| v.as_f64());

                    let mut artwork = None;
                    if let Some(thumbs) = val.get("thumbnails").and_then(|v| v.as_array()) {
                        if let Some(last) = thumbs.last() {
                            artwork = last.get("url").and_then(|v| v.as_str()).map(|s| s.to_string());
                        }
                    }
                    if artwork.is_none() && !id.is_empty() {
                        artwork = Some(format!("https://i.ytimg.com/vi/{}/hqdefault.jpg", id));
                    }

                    if !id.is_empty() && !title.is_empty() {
                        tracks.push(MusicTrack {
                            id: format!("yt_{}", id),
                            title,
                            artist,
                            album: Some("YouTube Music".to_string()),
                            duration,
                            stream_url: String::new(),
                            file_path: None,
                            artwork_url: artwork,
                            is_local: false,
                            has_lyrics: true,
                        });
                    }
                }
            }

            if !tracks.is_empty() {
                return Ok(tracks);
            }
        }
    }

    // 2. iTunes catalog fallback
    let itunes_url = format!(
        "https://itunes.apple.com/search?term={}&entity=song&limit=40",
        urlencoding::encode(&query)
    );

    if let Ok(resp) = state
        .client
        .get(&itunes_url)
        .header("User-Agent", "OVILO-Music/1.0")
        .send()
        .await
    {
        if resp.status().is_success() {
            #[derive(Deserialize)]
            #[serde(rename_all = "camelCase")]
            struct ItunesResult {
                track_id: Option<u64>,
                track_name: Option<String>,
                artist_name: Option<String>,
                collection_name: Option<String>,
                preview_url: Option<String>,
                #[serde(rename = "artworkUrl100")]
                artwork_url100: Option<String>,
                track_time_millis: Option<f64>,
            }

            #[derive(Deserialize)]
            struct ItunesResponse {
                results: Vec<ItunesResult>,
            }

            if let Ok(data) = resp.json::<ItunesResponse>().await {
                let tracks: Vec<MusicTrack> = data
                    .results
                    .into_iter()
                    .filter_map(|r| {
                        let title = r.track_name?;
                        let artist = r.artist_name.unwrap_or_else(|| "Unknown Artist".to_string());
                        let artwork = r.artwork_url100.map(|u| u.replace("100x100bb", "600x600bb"));
                        let duration = r.track_time_millis.map(|ms| ms / 1000.0);
                        let preview = r.preview_url.unwrap_or_default();
                        let id = r
                            .track_id
                            .map(|tid| format!("itunes_{}", tid))
                            .unwrap_or_else(|| format!("itunes_{}", title));

                        Some(MusicTrack {
                            id,
                            title,
                            artist,
                            album: r.collection_name,
                            duration: duration.or(Some(210.0)),
                            stream_url: preview,
                            file_path: None,
                            artwork_url: artwork,
                            is_local: false,
                            has_lyrics: true,
                        })
                    })
                    .collect();

                if !tracks.is_empty() {
                    return Ok(tracks);
                }
            }
        }
    }

    Ok(vec![])
}

#[tauri::command]
async fn fetch_trending_music(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Vec<MusicTrack>, String> {
    let rss_url = "https://itunes.apple.com/us/rss/topsongs/limit=100/json";
    if let Ok(resp) = state
        .client
        .get(rss_url)
        .header("User-Agent", "OVILO-Music/1.0")
        .send()
        .await
    {
        if resp.status().is_success() {
            if let Ok(json_val) = resp.json::<serde_json::Value>().await {
                if let Some(entries) = json_val
                    .get("feed")
                    .and_then(|f| f.get("entry"))
                    .and_then(|e| e.as_array())
                {
                    let mut tracks = Vec::new();
                    for entry in entries {
                        let title = entry
                            .get("im:name")
                            .and_then(|n| n.get("label"))
                            .and_then(|l| l.as_str())
                            .unwrap_or("")
                            .to_string();
                        if title.is_empty() {
                            continue;
                        }
                        let artist = entry
                            .get("im:artist")
                            .and_then(|a| a.get("label"))
                            .and_then(|l| l.as_str())
                            .unwrap_or("Unknown Artist")
                            .to_string();
                        let album = entry
                            .get("im:collection")
                            .and_then(|c| c.get("im:name"))
                            .and_then(|l| l.as_str())
                            .map(|s| s.to_string());

                        let track_id = entry
                            .get("id")
                            .and_then(|i| i.get("attributes"))
                            .and_then(|a| a.get("im:id"))
                            .and_then(|s| s.as_str())
                            .unwrap_or("");
                        let id = if !track_id.is_empty() {
                            format!("itunes_{}", track_id)
                        } else {
                            format!("itunes_{}", title)
                        };

                        let mut artwork = None;
                        if let Some(images) = entry.get("im:image").and_then(|i| i.as_array()) {
                            if let Some(last_img) = images.last() {
                                if let Some(url_str) = last_img.get("label").and_then(|l| l.as_str()) {
                                    artwork = Some(url_str.replace("170x170bb", "600x600bb"));
                                }
                            }
                        }

                        let mut stream_url = String::new();
                        if let Some(links) = entry.get("link").and_then(|l| l.as_array()) {
                            for link in links {
                                if let Some(attrs) = link.get("attributes") {
                                    let ltype = attrs.get("type").and_then(|t| t.as_str()).unwrap_or("");
                                    if ltype.contains("audio") {
                                        if let Some(href) = attrs.get("href").and_then(|h| h.as_str()) {
                                            stream_url = href.to_string();
                                            break;
                                        }
                                    }
                                }
                            }
                        }

                        let duration: Option<f64> = None;

                        tracks.push(MusicTrack {
                            id,
                            title,
                            artist,
                            album,
                            duration,
                            stream_url,
                            file_path: None,
                            artwork_url: artwork,
                            is_local: false,
                            has_lyrics: true,
                        });
                    }

                    if !tracks.is_empty() {
                        return Ok(tracks);
                    }
                }
            }
        }
    }

    search_online_music(app, state, "top hits 2025 chart".to_string()).await
}

// ---------------------------------------------------------
// Local HTTP Streaming Media Server (Port 4545)
// Provides instant byte-range audio/video and artwork streaming for WebKitGTK
// ---------------------------------------------------------
static CURRENT_NAV_TAB: std::sync::RwLock<Option<String>> = std::sync::RwLock::new(None);
static CURRENT_NOTCH_CMD: std::sync::RwLock<Option<String>> = std::sync::RwLock::new(None);

fn start_local_media_server(app: AppHandle) {
    std::thread::spawn(move || {
        let rt = match tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
        {
            Ok(r) => r,
            Err(e) => {
                eprintln!("Failed to create tokio runtime for media server: {}", e);
                return;
            }
        };

        rt.block_on(async {
            let listener = match TcpListener::bind("127.0.0.1:4545").await {
                Ok(l) => l,
                Err(e) => {
                    eprintln!("Local media server failed to bind 127.0.0.1:4545: {}", e);
                    return;
                }
            };

        while let Ok((mut socket, _)) = listener.accept().await {
            let app_handle = app.clone();
            tokio::spawn(async move {
                let mut buffer = [0u8; 4096];
                let n = match socket.read(&mut buffer).await {
                    Ok(n) if n > 0 => n,
                    _ => return,
                };

                let req_str = String::from_utf8_lossy(&buffer[..n]);
                let lines_vec: Vec<&str> = req_str.lines().collect();
                let first_line = lines_vec.first().copied().unwrap_or("");
                let mut parts = first_line.split_whitespace();
                let method = parts.next().unwrap_or("GET");
                let uri = parts.next().unwrap_or("/");

                // Extract and validate Origin header
                let mut origin_header: Option<String> = None;
                for line in &lines_vec {
                    let lower = line.to_lowercase();
                    if lower.starts_with("origin:") {
                        origin_header = Some(line.split_at(7).1.trim().to_string());
                        break;
                    }
                }

                // Allow local origins, WebKit2GTK crossOrigin anonymous ("null"), and Tauri webview origins
                let is_origin_allowed = match &origin_header {
                    None => true, // Native media element or direct local loopback without cross-origin
                    Some(orig) => {
                        let o = orig.to_lowercase();
                        o == "null"
                            || o == "tauri://localhost"
                            || o == "http://tauri.localhost"
                            || o == "https://tauri.localhost"
                            || o == "http://localhost:1420"
                            || o == "http://127.0.0.1:1420"
                            || o.starts_with("http://localhost")
                            || o.starts_with("http://127.0.0.1")
                    }
                };

                // Reject rogue cross-origin requests from external web pages (prevents LFI/data exfiltration)
                if !is_origin_allowed {
                    let _ = socket.write_all(b"HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\nForbidden: Untrusted Origin").await;
                    return;
                }

                let cors_header = "Access-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, HEAD, OPTIONS\r\nAccess-Control-Allow-Headers: Range, Content-Type, Origin, Accept\r\n".to_string();

                if method == "OPTIONS" {
                    let cors_options = format!(
                        "HTTP/1.1 204 No Content\r\n{}Access-Control-Allow-Methods: GET, HEAD, OPTIONS\r\nAccess-Control-Allow-Headers: Range, Content-Type\r\nConnection: close\r\n\r\n",
                        cors_header
                    );
                    let _ = socket.write_all(cors_options.as_bytes()).await;
                    return;
                }

                if method != "GET" && method != "HEAD" {
                    let _ = socket.write_all(b"HTTP/1.1 405 Method Not Allowed\r\nConnection: close\r\n\r\n").await;
                    return;
                }

                if uri.starts_with("/nav?") {
                    let mut clean_tab = String::new();
                    if let Some(tab_idx) = uri.find("tab=") {
                        let tab = &uri[tab_idx + 4..];
                        clean_tab = tab.split('&').next().unwrap_or("").to_string();
                        if !clean_tab.is_empty() {
                            if let Ok(mut lock) = CURRENT_NAV_TAB.write() {
                                *lock = Some(clean_tab.clone());
                            }
                        }
                    }
                    let mut clean_subtab = String::new();
                    if let Some(sub_idx) = uri.find("subtab=") {
                        let sub = &uri[sub_idx + 7..];
                        clean_subtab = sub.split('&').next().unwrap_or("").to_string();
                    }
                    let mut clean_notch = String::new();
                    if let Some(notch_idx) = uri.find("notch=") {
                        let notch = &uri[notch_idx + 6..];
                        clean_notch = notch.split('&').next().unwrap_or("").to_string();
                        if let Ok(mut lock) = CURRENT_NOTCH_CMD.write() {
                            *lock = Some(clean_notch.clone());
                        }
                    }

                    let _ = app_handle.emit("ovilo_navigate", serde_json::json!({
                        "tab": clean_tab,
                        "subtab": clean_subtab,
                        "notch": clean_notch,
                    }));

                    let resp = format!(
                        "HTTP/1.1 200 OK\r\n{}Content-Type: text/plain\r\nConnection: close\r\n\r\nOK",
                        cors_header
                    );
                    let _ = socket.write_all(resp.as_bytes()).await;
                    return;
                }

                if uri.starts_with("/del_file?") {
                    if let Some(p_idx) = uri.find("path=") {
                        let p_raw = &uri[p_idx + 5..];
                        let clean_p = p_raw.split('&').next().unwrap_or("");
                        let decoded_p = urlencoding::decode(clean_p).unwrap_or(std::borrow::Cow::Borrowed("")).to_string();
                        let del_res = delete_disk_download(decoded_p).await;
                        let body = match del_res {
                            Ok(_) => "DELETED".to_string(),
                            Err(e) => format!("ERR: {}", e),
                        };
                        let resp = format!(
                            "HTTP/1.1 200 OK\r\n{}Content-Type: text/plain\r\nConnection: close\r\n\r\n{}",
                            cors_header, body
                        );
                        let _ = socket.write_all(resp.as_bytes()).await;
                        return;
                    }
                }

                if uri.starts_with("/dl_music?") {
                    let mut title = "Die With A Smile".to_string();
                    let mut artist = "Lady Gaga Bruno Mars".to_string();
                    if let Some(t_idx) = uri.find("title=") {
                        let t_raw = &uri[t_idx + 6..];
                        let clean_t = t_raw.split('&').next().unwrap_or("");
                        title = urlencoding::decode(clean_t).unwrap_or(std::borrow::Cow::Borrowed("")).to_string();
                    }
                    if let Some(a_idx) = uri.find("artist=") {
                        let a_raw = &uri[a_idx + 7..];
                        let clean_a = a_raw.split('&').next().unwrap_or("");
                        artist = urlencoding::decode(clean_a).unwrap_or(std::borrow::Cow::Borrowed("")).to_string();
                    }

                    let _ = app_handle.emit("ovilo_test_download_music", serde_json::json!({
                        "title": title,
                        "artist": artist,
                    }));

                    let resp = format!(
                        "HTTP/1.1 200 OK\r\n{}Content-Type: text/plain\r\nConnection: close\r\n\r\nQueued download for {} - {}",
                        cors_header, title, artist
                    );
                    let _ = socket.write_all(resp.as_bytes()).await;
                    return;
                }

                if uri.starts_with("/poll_nav") {
                    let mut tab_out = String::new();
                    if let Ok(mut lock) = CURRENT_NAV_TAB.write() {
                        if let Some(t) = lock.take() {
                            tab_out = t;
                        }
                    }
                    let mut notch_out = String::new();
                    if let Ok(mut lock) = CURRENT_NOTCH_CMD.write() {
                        if let Some(n) = lock.take() {
                            notch_out = n;
                        }
                    }
                    let resp = format!(
                        "HTTP/1.1 200 OK\r\n{}Content-Type: application/json\r\nConnection: close\r\n\r\n{{\"tab\":\"{}\",\"notch\":\"{}\"}}",
                        cors_header, tab_out, notch_out
                    );
                    let _ = socket.write_all(resp.as_bytes()).await;
                    return;
                }

                if uri.starts_with("/proxy_stream?") {
                    let remote_url = if let Some(idx) = uri.find("url=") {
                        let raw = &uri[idx + 4..];
                        let clean_raw = raw.split('&').next().unwrap_or("");
                        urlencoding::decode(clean_raw).unwrap_or(std::borrow::Cow::Borrowed("")).to_string()
                    } else {
                        String::new()
                    };

                    if remote_url.is_empty() || !remote_url.starts_with("http") {
                        let resp = format!("HTTP/1.1 400 Bad Request\r\n{}Connection: close\r\n\r\nMissing url parameter", cors_header);
                        let _ = socket.write_all(resp.as_bytes()).await;
                        return;
                    }

                    // Extract Range header from incoming request for HTML5 audio seeking/buffering
                    let mut range_val: Option<String> = None;
                    for line in &lines_vec {
                        let lower = line.to_lowercase();
                        if lower.starts_with("range:") {
                            range_val = Some(line.split_at(6).1.trim().to_string());
                            break;
                        }
                    }

                    let client = reqwest::Client::builder()
                        .timeout(std::time::Duration::from_secs(45))
                        .build()
                        .unwrap_or_default();

                    let mut req_builder = client.get(&remote_url)
                        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36");

                    if let Some(ref r) = range_val {
                        req_builder = req_builder.header("Range", r);
                    }

                    match req_builder.send().await {
                        Ok(mut resp) => {
                            let status = resp.status();
                            let status_code = status.as_u16();
                            let status_text = status.canonical_reason().unwrap_or("OK");

                            let content_type = resp.headers()
                                .get(reqwest::header::CONTENT_TYPE)
                                .and_then(|v| v.to_str().ok())
                                .unwrap_or("audio/mp4");

                            let content_length = resp.headers()
                                .get(reqwest::header::CONTENT_LENGTH)
                                .and_then(|v| v.to_str().ok());

                            let content_range = resp.headers()
                                .get(reqwest::header::CONTENT_RANGE)
                                .and_then(|v| v.to_str().ok());

                            let mut headers_str = format!(
                                "HTTP/1.1 {} {}\r\n{}Content-Type: {}\r\nAccept-Ranges: bytes\r\n",
                                status_code, status_text, cors_header, content_type
                            );

                            if let Some(cl) = content_length {
                                headers_str.push_str(&format!("Content-Length: {}\r\n", cl));
                            }
                            if let Some(cr) = content_range {
                                headers_str.push_str(&format!("Content-Range: {}\r\n", cr));
                            }
                            headers_str.push_str("Connection: close\r\n\r\n");

                            if socket.write_all(headers_str.as_bytes()).await.is_ok() {
                                while let Ok(Some(chunk)) = resp.chunk().await {
                                    if socket.write_all(&chunk).await.is_err() {
                                        break;
                                    }
                                }
                            }
                        }
                        Err(e) => {
                            let resp = format!("HTTP/1.1 502 Bad Gateway\r\n{}Connection: close\r\n\r\nProxy error: {}", cors_header, e);
                            let _ = socket.write_all(resp.as_bytes()).await;
                        }
                    }
                    return;
                }

                let file_path = if let Some(idx) = uri.find("path=") {
                    let raw = &uri[idx + 5..];
                    let clean_raw = raw.split('&').next().unwrap_or("");
                    urlencoding::decode(clean_raw).unwrap_or(std::borrow::Cow::Borrowed("")).to_string()
                } else {
                    String::new()
                };

                if file_path.is_empty() {
                    let resp = format!("HTTP/1.1 400 Bad Request\r\n{}Connection: close\r\n\r\nMissing path parameter", cors_header);
                    let _ = socket.write_all(resp.as_bytes()).await;
                    return;
                }

                // Canonicalize to prevent directory traversal
                let canon_path = match std::fs::canonicalize(&file_path) {
                    Ok(p) => p,
                    Err(_) => {
                        let resp = format!("HTTP/1.1 404 Not Found\r\n{}Connection: close\r\n\r\n", cors_header);
                        let _ = socket.write_all(resp.as_bytes()).await;
                        return;
                    }
                };

                if !canon_path.is_file() {
                    let resp = format!("HTTP/1.1 403 Forbidden\r\n{}Connection: close\r\n\r\nDirectory listing not allowed", cors_header);
                    let _ = socket.write_all(resp.as_bytes()).await;
                    return;
                }

                // Restrict served media strictly to permitted media/audio/video/image extensions
                let ext = canon_path
                    .extension()
                    .and_then(|e| e.to_str())
                    .unwrap_or("")
                    .to_lowercase();

                let allowed_media_exts = [
                    "opus", "ogg", "mp3", "wav", "flac", "m4a", "aac", "mp4", "webm", "mkv", "avi",
                    "jpg", "jpeg", "png", "webp", "lrc", "vtt", "srt"
                ];

                if !allowed_media_exts.contains(&ext.as_str()) {
                    let resp = format!("HTTP/1.1 403 Forbidden\r\n{}Connection: close\r\n\r\nRefusing to serve non-media file type", cors_header);
                    let _ = socket.write_all(resp.as_bytes()).await;
                    return;
                }

                // Prevent access to hidden files or hidden directory paths (e.g. .ssh, .bashrc, .config), but allow .thumbnails
                let has_hidden_component = canon_path.components().any(|c| {
                    let s = c.as_os_str().to_string_lossy();
                    s.starts_with('.') && s != "." && s != ".." && s != ".thumbnails"
                });
                if has_hidden_component {
                    let resp = format!("HTTP/1.1 403 Forbidden\r\n{}Connection: close\r\n\r\nAccess denied to hidden path", cors_header);
                    let _ = socket.write_all(resp.as_bytes()).await;
                    return;
                }

                let mut has_range = false;
                let mut range_start = 0u64;
                let mut range_end = None;
                for line in &lines_vec {
                    let lower = line.to_lowercase();
                    if lower.starts_with("range: bytes=") {
                        has_range = true;
                        let r = line.split_at(13).1.trim();
                        let r_parts: Vec<&str> = r.split('-').collect();
                        if let Ok(s) = r_parts[0].parse::<u64>() {
                            range_start = s;
                        }
                        if r_parts.len() > 1 && !r_parts[1].is_empty() {
                            if let Ok(e) = r_parts[1].parse::<u64>() {
                                range_end = Some(e);
                            }
                        }
                        break;
                    }
                }

                let mut file = match tokio::fs::File::open(&canon_path).await {
                    Ok(f) => f,
                    Err(_) => {
                        let resp = format!("HTTP/1.1 500 Internal Server Error\r\n{}Connection: close\r\n\r\n", cors_header);
                        let _ = socket.write_all(resp.as_bytes()).await;
                        return;
                    }
                };

                let metadata = match file.metadata().await {
                    Ok(m) => m,
                    Err(_) => return,
                };
                let total_len = metadata.len();

                let end = range_end.unwrap_or(total_len.saturating_sub(1)).min(total_len.saturating_sub(1));
                let content_length = if end >= range_start { end - range_start + 1 } else { 0 };

                let content_type = match ext.as_str() {
                    "opus" => "audio/ogg",
                    "ogg" => "audio/ogg",
                    "mp3" => "audio/mpeg",
                    "wav" => "audio/wav",
                    "flac" => "audio/flac",
                    "m4a" | "aac" => "audio/mp4",
                    "mp4" => "video/mp4",
                    "webm" => "video/webm",
                    "jpg" | "jpeg" => "image/jpeg",
                    "png" => "image/png",
                    "webp" => "image/webp",
                    _ => "application/octet-stream",
                };

                let headers = if has_range {
                    format!(
                        "HTTP/1.1 206 Partial Content\r\nContent-Type: {}\r\nContent-Length: {}\r\nAccept-Ranges: bytes\r\nContent-Range: bytes {}-{}/{}\r\n{}Access-Control-Allow-Methods: GET, HEAD, OPTIONS\r\nAccess-Control-Allow-Headers: Range, Content-Type\r\nConnection: close\r\n\r\n",
                        content_type, content_length, range_start, end, total_len, cors_header
                    )
                } else {
                    format!(
                        "HTTP/1.1 200 OK\r\nContent-Type: {}\r\nContent-Length: {}\r\nAccept-Ranges: bytes\r\n{}Access-Control-Allow-Methods: GET, HEAD, OPTIONS\r\nAccess-Control-Allow-Headers: Range, Content-Type\r\nConnection: close\r\n\r\n",
                        content_type, content_length, cors_header
                    )
                };

                if socket.write_all(headers.as_bytes()).await.is_err() {
                    return;
                }

                if method == "HEAD" {
                    return;
                }

                if file.seek(std::io::SeekFrom::Start(range_start)).await.is_err() {
                    return;
                }

                let mut to_send = content_length;
                let mut chunk = [0u8; 65536];
                while to_send > 0 {
                    let to_read = (to_send as usize).min(chunk.len());
                    match file.read(&mut chunk[..to_read]).await {
                        Ok(0) => break,
                        Ok(bytes_read) => {
                            if socket.write_all(&chunk[..bytes_read]).await.is_err() {
                                break;
                            }
                            to_send -= bytes_read as u64;
                        }
                        Err(_) => break,
                    }
                }
            });
        }
        });
    });
}

// ---------------------------------------------------------
// YT-DLP Universal Media Downloader
// ---------------------------------------------------------

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct YtDlpStatus {
    pub available: bool,
    pub version: String,
    pub path: String,
    pub ffmpeg_available: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct YtDlpMediaInfo {
    pub id: String,
    pub title: String,
    pub uploader: Option<String>,
    pub duration: Option<f64>,
    pub thumbnail: Option<String>,
    pub webpage_url: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct YtDlpProgressPayload {
    pub download_id: String,
    pub percent: f64,
    pub speed: String,
    pub eta: String,
    pub total_size: String,
    pub status: String,
    pub file_path: Option<String>,
    pub error: Option<String>,
}

fn resolve_ytdlp_binary(app: &AppHandle) -> PathBuf {
    let mut resolved: Option<PathBuf> = None;

    if let Ok(appdir) = std::env::var("APPDIR") {
        let candidates = [
            PathBuf::from(&appdir).join("usr/lib/ovilio/resources/yt-dlp"),
            PathBuf::from(&appdir).join("usr/bin/resources/yt-dlp"),
            PathBuf::from(&appdir).join("usr/lib/ovilo/resources/yt-dlp"),
            PathBuf::from(&appdir).join("resources/yt-dlp"),
            PathBuf::from(&appdir).join("yt-dlp"),
        ];
        for c in &candidates {
            if c.exists() {
                resolved = Some(c.clone());
                break;
            }
        }
    }

    if resolved.is_none() {
        if let Ok(resource_dir) = app.path().resource_dir() {
            let p = resource_dir.join("resources").join("yt-dlp");
            if p.exists() {
                resolved = Some(p);
            } else {
                let p2 = resource_dir.join("yt-dlp");
                if p2.exists() {
                    resolved = Some(p2);
                }
            }
        }
    }

    if resolved.is_none() {
        if let Ok(exe) = std::env::current_exe() {
            if let Some(parent) = exe.parent() {
                let p = parent.join("resources").join("yt-dlp");
                if p.exists() {
                    resolved = Some(p);
                } else {
                    let p2 = parent.join("yt-dlp");
                    if p2.exists() {
                        resolved = Some(p2);
                    }
                }
            }
        }
    }

    if resolved.is_none() {
        if let Some(home) = dirs::home_dir() {
            let p = home.join(".local/bin/yt-dlp");
            if p.exists() {
                resolved = Some(p);
            }
        }
    }

    let target = resolved.unwrap_or_else(|| PathBuf::from("yt-dlp"));

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(metadata) = std::fs::metadata(&target) {
            let mut perms = metadata.permissions();
            if perms.mode() & 0o111 == 0 {
                perms.set_mode(perms.mode() | 0o755);
                let _ = std::fs::set_permissions(&target, perms);
            }
        }
    }

    target
}

#[tauri::command]
async fn ytdlp_check_status(app: AppHandle) -> Result<YtDlpStatus, String> {
    let bin_path = resolve_ytdlp_binary(&app);
    let output = tokio::process::Command::new(&bin_path)
        .arg("--version")
        .output()
        .await;

    let (available, version) = match output {
        Ok(out) if out.status.success() => {
            let ver = String::from_utf8_lossy(&out.stdout).trim().to_string();
            (true, ver)
        }
        _ => (false, String::new()),
    };

    let ffmpeg_out = tokio::process::Command::new("ffmpeg")
        .arg("-version")
        .output()
        .await;
    let ffmpeg_available = ffmpeg_out.map(|o| o.status.success()).unwrap_or(false);

    Ok(YtDlpStatus {
        available,
        version,
        path: bin_path.to_string_lossy().to_string(),
        ffmpeg_available,
    })
}

#[tauri::command]
async fn ytdlp_get_info(app: AppHandle, url: String) -> Result<YtDlpMediaInfo, String> {
    let bin_path = resolve_ytdlp_binary(&app);
    let trimmed = url.trim();
    if trimmed.is_empty() {
        return Err("URL cannot be empty".to_string());
    }

    // Defensive check: Only permit http, https, and ftp protocols (prevents argument/flag injection)
    if !trimmed.starts_with("http://") && !trimmed.starts_with("https://") && !trimmed.starts_with("ftp://") {
        return Err("Invalid URL protocol. Only http://, https://, and ftp:// URLs are allowed.".to_string());
    }

    let mut cmd = tokio::process::Command::new(&bin_path);
    cmd.args(&[
        "--extractor-args",
        "youtube:player_client=ios,android,mweb,web",
        "--dump-single-json",
        "--no-warnings",
        "--no-playlist",
        "--skip-download",
        "--",
        trimmed,
    ]);

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Failed to run yt-dlp: {}", e))?;

    if !output.status.success() {
        let err_str = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to retrieve video info: {}", err_str));
    }

    let json_val: serde_json::Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("Failed to parse metadata: {}", e))?;

    let id = json_val.get("id").and_then(|v| v.as_str()).unwrap_or("unknown").to_string();
    let title = json_val.get("title").and_then(|v| v.as_str()).unwrap_or("Untitled Video").to_string();
    let uploader = json_val.get("uploader").and_then(|v| v.as_str()).map(|s| s.to_string());
    let duration = json_val.get("duration").and_then(|v| v.as_f64());
    let thumbnail = json_val.get("thumbnail").and_then(|v| v.as_str()).map(|s| s.to_string());
    let webpage_url = json_val.get("webpage_url").and_then(|v| v.as_str()).map(|s| s.to_string());
    let description = json_val.get("description").and_then(|v| v.as_str()).map(|s| s.chars().take(250).collect::<String>());

    Ok(YtDlpMediaInfo {
        id,
        title,
        uploader,
        duration,
        thumbnail,
        webpage_url,
        description,
    })
}

#[tauri::command]
async fn download_music_track(
    app: AppHandle,
    download_id: String,
    title: String,
    artist: String,
    stream_url: Option<String>,
    video_id: Option<String>,
) -> Result<String, String> {
    let clean_title = title.replace(&['/', '\\', ':', '*', '?', '"', '<', '>', '|'][..], " ").trim().to_string();
    let clean_artist = artist.replace(&['/', '\\', ':', '*', '?', '"', '<', '>', '|'][..], " ").trim().to_string();

    let download_dir = resolve_ovilo_download_dir();
    let _ = fs::create_dir_all(&download_dir);

    // 1. Resolve direct HTTP audio stream URL if not provided or if preview
    let direct_url = if let Some(ref s) = stream_url {
        if s.starts_with("http")
            && !s.contains("apple.com")
            && !s.contains("mzstatic.com")
            && !s.contains("itunes")
            && !s.contains("AudioPreview")
            && !s.contains("AudioPreview_dummy")
        {
            s.clone()
        } else {
            resolve_online_stream(app.clone(), clean_title.clone(), clean_artist.clone(), video_id, None).await?.url
        }
    } else {
        resolve_online_stream(app.clone(), clean_title.clone(), clean_artist.clone(), video_id, None).await?.url
    };

    let ext = if direct_url.contains(".mp3") { "mp3" } else { "m4a" };
    let file_name = format!("{} - {}.{}", clean_artist, clean_title, ext);
    let target_path = download_dir.join(&file_name);

    let d_id = download_id.clone();
    let app_clone = app.clone();
    let target_path_clone = target_path.clone();

    // Spawn direct async HTTP download task via reqwest (ArchiveTune methodology)
    tokio::spawn(async move {
        use tokio::io::AsyncWriteExt;

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(180))
            .build()
            .unwrap_or_default();

        let req = client
            .get(&direct_url)
            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36");

        let mut response = match req.send().await {
            Ok(res) => res,
            Err(e) => {
                let _ = app_clone.emit(
                    "ytdlp_progress",
                    YtDlpProgressPayload {
                        download_id: d_id.clone(),
                        percent: 0.0,
                        speed: String::new(),
                        eta: String::new(),
                        total_size: String::new(),
                        status: "error".to_string(),
                        file_path: None,
                        error: Some(format!("HTTP error: {}", e)),
                    },
                );
                return;
            }
        };

        if !response.status().is_success() {
            let _ = app_clone.emit(
                "ytdlp_progress",
                YtDlpProgressPayload {
                    download_id: d_id.clone(),
                    percent: 0.0,
                    speed: String::new(),
                    eta: String::new(),
                    total_size: String::new(),
                    status: "error".to_string(),
                    file_path: None,
                    error: Some(format!("HTTP error status: {}", response.status())),
                },
            );
            return;
        }

        let total_size = response.content_length().unwrap_or(0);
        let total_size_str = if total_size > 0 {
            format!("{:.1} MB", total_size as f64 / (1024.0 * 1024.0))
        } else {
            "Unknown".to_string()
        };

        let mut file = match tokio::fs::File::create(&target_path_clone).await {
            Ok(f) => f,
            Err(e) => {
                let _ = app_clone.emit(
                    "ytdlp_progress",
                    YtDlpProgressPayload {
                        download_id: d_id.clone(),
                        percent: 0.0,
                        speed: String::new(),
                        eta: String::new(),
                        total_size: String::new(),
                        status: "error".to_string(),
                        file_path: None,
                        error: Some(format!("File creation error: {}", e)),
                    },
                );
                return;
            }
        };

        let mut downloaded: u64 = 0;
        let mut last_emit = std::time::Instant::now();
        let mut last_bytes = 0u64;

        while let Ok(Some(chunk)) = response.chunk().await {
            let len = chunk.len() as u64;
            if let Err(e) = file.write_all(&chunk).await {
                let _ = app_clone.emit(
                    "ytdlp_progress",
                    YtDlpProgressPayload {
                        download_id: d_id.clone(),
                        percent: 0.0,
                        speed: String::new(),
                        eta: String::new(),
                        total_size: String::new(),
                        status: "error".to_string(),
                        file_path: None,
                        error: Some(format!("Write error: {}", e)),
                    },
                );
                return;
            }
            downloaded += len;

            let now = std::time::Instant::now();
            if now.duration_since(last_emit).as_millis() > 250 {
                let elapsed_secs = now.duration_since(last_emit).as_secs_f64();
                let speed_bps = if elapsed_secs > 0.0 {
                    (downloaded - last_bytes) as f64 / elapsed_secs
                } else {
                    0.0
                };
                let speed_str = format!("{:.1} MB/s", speed_bps / (1024.0 * 1024.0));
                let percent = if total_size > 0 {
                    ((downloaded as f64 / total_size as f64) * 100.0).min(99.9)
                } else {
                    50.0
                };
                let eta_secs = if speed_bps > 0.0 && total_size > downloaded {
                    ((total_size - downloaded) as f64 / speed_bps) as u64
                } else {
                    0
                };
                let eta_str = format!("{:02}:{:02}", eta_secs / 60, eta_secs % 60);

                let _ = app_clone.emit(
                    "ytdlp_progress",
                    YtDlpProgressPayload {
                        download_id: d_id.clone(),
                        percent,
                        speed: speed_str,
                        eta: eta_str,
                        total_size: total_size_str.clone(),
                        status: "downloading".to_string(),
                        file_path: None,
                        error: None,
                    },
                );
                last_emit = now;
                last_bytes = downloaded;
            }
        }

        let _ = file.flush().await;

        let _ = app_clone.emit(
            "ytdlp_progress",
            YtDlpProgressPayload {
                download_id: d_id.clone(),
                percent: 100.0,
                speed: "Done".to_string(),
                eta: "00:00".to_string(),
                total_size: total_size_str,
                status: "completed".to_string(),
                file_path: Some(target_path_clone.to_string_lossy().to_string()),
                error: None,
            },
        );
    });

    Ok(target_path.to_string_lossy().to_string())
}

#[tauri::command]
async fn ytdlp_start_download(
    app: AppHandle,
    download_id: String,
    url: String,
    format_type: String,
) -> Result<String, String> {
    let bin_path = resolve_ytdlp_binary(&app);
    let trimmed_url = url.trim().to_string();
    if trimmed_url.is_empty() {
        return Err("URL cannot be empty".to_string());
    }

    // Defensive check: Only permit http, https, ftp, and search protocols
    if !trimmed_url.starts_with("http://")
        && !trimmed_url.starts_with("https://")
        && !trimmed_url.starts_with("ftp://")
        && !trimmed_url.starts_with("ytsearch")
    {
        return Err("Invalid URL protocol. Only http://, https://, ftp://, and search URLs are allowed.".to_string());
    }

    let download_dir = resolve_ovilo_download_dir();
    let _ = fs::create_dir_all(&download_dir);

    let output_template = format!("{}/%(title)s [%(id)s].%(ext)s", download_dir.to_string_lossy());

    let mut cmd = tokio::process::Command::new(&bin_path);
    cmd.arg("--extractor-args")
       .arg("youtube:player_client=ios,android,mweb,web")
       .arg("--newline")
       .arg("--no-playlist")
       .arg("--progress-template")
       .arg("PROGRESS:%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s|%(progress._total_bytes_str)s")
       .arg("-o")
       .arg(&output_template);

    let lower_url = trimmed_url.to_lowercase();
    let is_direct_file = lower_url.ends_with(".iso")
        || lower_url.ends_with(".zip")
        || lower_url.ends_with(".tar")
        || lower_url.ends_with(".gz")
        || lower_url.ends_with(".apk")
        || lower_url.ends_with(".exe")
        || lower_url.ends_with(".msi")
        || lower_url.ends_with(".mkv")
        || lower_url.ends_with(".mp4")
        || lower_url.ends_with(".avi")
        || lower_url.ends_with(".pdf")
        || lower_url.contains("/ftp")
        || lower_url.starts_with("ftp://");

    if !is_direct_file {
        match format_type.as_str() {
            "audio_mp3" => {
                cmd.args(&["-x", "--audio-format", "mp3", "--audio-quality", "320k"]);
            }
            "audio_flac" => {
                cmd.args(&["-x", "--audio-format", "flac"]);
            }
            "audio_m4a" | "audio_aac" => {
                cmd.args(&["-x", "--audio-format", "m4a"]);
            }
            "video_480" => {
                cmd.args(&["-f", "bestvideo[height<=480]+bestaudio/best[height<=480]/best"]);
            }
            "video_720" => {
                cmd.args(&["-f", "bestvideo[height<=720]+bestaudio/best[height<=720]/best"]);
            }
            "video_1080" => {
                cmd.args(&["-f", "bestvideo[height<=1080]+bestaudio/best[height<=1080]/best"]);
            }
            "video_1440" => {
                cmd.args(&["-f", "bestvideo[height<=1440]+bestaudio/best[height<=1440]/best"]);
            }
            "video_2160" | "video_best" => {
                cmd.args(&["-f", "bestvideo+bestaudio/best"]);
            }
            _ => {
                if format_type.contains("audio") {
                    cmd.args(&["-x", "--audio-format", "mp3", "--audio-quality", "320k"]);
                } else {
                    cmd.args(&["-f", "bestvideo+bestaudio/best"]);
                }
            }
        }
    }

    // Prepend -- to treat input strictly as URL positional argument
    cmd.arg("--").arg(&trimmed_url);
    cmd.stdout(Stdio::piped());
    // Use null for stderr to prevent pipe buffer saturation and process deadlocks
    cmd.stderr(Stdio::null());

    let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn yt-dlp: {}", e))?;
    let stdout = child.stdout.take().ok_or("Failed to open child stdout")?;

    let d_id = download_id.clone();
    let app_clone = app.clone();
    let download_dir_clone = download_dir.clone();

    tokio::spawn(async move {
        let mut reader = tokio::io::BufReader::new(stdout).lines();
        let mut final_file_path: Option<String> = None;

        while let Ok(Some(line)) = reader.next_line().await {
            let line_str = line.trim();
            if line_str.starts_with("PROGRESS:") {
                let payload_str = &line_str[9..];
                let parts: Vec<&str> = payload_str.split('|').collect();
                if parts.len() >= 4 {
                    let percent_raw = parts[0].trim().trim_end_matches('%');
                    let percent = percent_raw.parse::<f64>().unwrap_or(0.0);
                    let speed = parts[1].trim().to_string();
                    let eta = parts[2].trim().to_string();
                    let total_size = parts[3].trim().to_string();

                    let _ = app_clone.emit(
                        "ytdlp_progress",
                        YtDlpProgressPayload {
                            download_id: d_id.clone(),
                            percent,
                            speed,
                            eta,
                            total_size,
                            status: "downloading".to_string(),
                            file_path: None,
                            error: None,
                        },
                    );
                }
            } else if line_str.contains("[ExtractAudio] Destination:")
                || line_str.contains("[download] Destination:")
                || line_str.contains("[Merger] Merging formats into")
            {
                if let Some(idx) = line_str.find(':') {
                    let p = line_str[idx + 1..].trim().trim_matches('"');
                    final_file_path = Some(p.to_string());
                }
            } else if line_str.contains("[download]") && line_str.contains("has already been downloaded") {
                if let Some(rest) = line_str.strip_prefix("[download]") {
                    if let Some(end_idx) = rest.find("has already been downloaded") {
                        let p = rest[..end_idx].trim().trim_matches('"');
                        final_file_path = Some(p.to_string());
                    }
                }
            }
        }

        match child.wait().await {
            Ok(status) if status.success() => {
                let resolved_path = final_file_path
                    .filter(|p| std::path::Path::new(p).exists())
                    .or_else(|| {
                        if let Ok(entries) = std::fs::read_dir(&download_dir_clone) {
                            let mut files: Vec<(std::path::PathBuf, std::time::SystemTime)> = entries
                                .filter_map(|e| e.ok())
                                .filter_map(|e| {
                                    let p = e.path();
                                    if p.is_file() {
                                        let modified = e.metadata().and_then(|m| m.modified()).unwrap_or(std::time::SystemTime::UNIX_EPOCH);
                                        Some((p, modified))
                                    } else {
                                        None
                                    }
                                })
                                .collect();
                            files.sort_by(|a, b| b.1.cmp(&a.1));
                            files.first().map(|(p, _)| p.to_string_lossy().to_string())
                        } else {
                            None
                        }
                    })
                    .unwrap_or_else(|| download_dir_clone.to_string_lossy().to_string());

                let _ = app_clone.emit(
                    "ytdlp_progress",
                    YtDlpProgressPayload {
                        download_id: d_id.clone(),
                        percent: 100.0,
                        speed: "Done".to_string(),
                        eta: "00:00".to_string(),
                        total_size: "Completed".to_string(),
                        status: "completed".to_string(),
                        file_path: Some(resolved_path),
                        error: None,
                    },
                );
            }
            Ok(status) => {
                let _ = app_clone.emit(
                    "ytdlp_progress",
                    YtDlpProgressPayload {
                        download_id: d_id.clone(),
                        percent: 0.0,
                        speed: String::new(),
                        eta: String::new(),
                        total_size: String::new(),
                        status: "error".to_string(),
                        file_path: None,
                        error: Some(format!("Exit code: {}", status)),
                    },
                );
            }
            Err(e) => {
                let _ = app_clone.emit(
                    "ytdlp_progress",
                    YtDlpProgressPayload {
                        download_id: d_id.clone(),
                        percent: 0.0,
                        speed: String::new(),
                        eta: String::new(),
                        total_size: String::new(),
                        status: "error".to_string(),
                        file_path: None,
                        error: Some(format!("Process error: {}", e)),
                    },
                );
            }
        }
    });

    Ok(download_dir.to_string_lossy().to_string())
}

#[tauri::command]
async fn ytdlp_open_downloads_folder() -> Result<(), String> {
    let download_dir = resolve_ovilo_download_dir();
    let _ = fs::create_dir_all(&download_dir);

    #[cfg(target_os = "windows")]
    let _ = std::process::Command::new("explorer").arg(&download_dir).spawn();

    #[cfg(target_os = "macos")]
    let _ = std::process::Command::new("open").arg(&download_dir).spawn();

    #[cfg(target_os = "linux")]
    let _ = std::process::Command::new("xdg-open").arg(&download_dir).spawn();

    Ok(())
}

#[tauri::command]
async fn ytdlp_open_media_file(path: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    if !p.exists() {
        return Err(format!("File does not exist: {}", path));
    }

    let canonical = p.canonicalize().map_err(|e| format!("Invalid file path: {}", e))?;
    if !canonical.is_file() {
        return Err("Specified path is not a regular file.".to_string());
    }

    let ext = canonical.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
    let allowed_exts = [
        "mp4", "mkv", "avi", "mov", "webm", "mp3", "flac", "wav", "m4a", "ogg", "opus", "aac",
        "iso", "zip", "tar", "gz", "pdf", "jpg", "jpeg", "png", "webp", "srt", "vtt", "lrc"
    ];

    if !allowed_exts.contains(&ext.as_str()) {
        return Err(format!("Refusing to launch potentially unsafe executable or script file (.{})", ext));
    }

    #[cfg(target_os = "windows")]
    let _ = std::process::Command::new("explorer").arg(&canonical).spawn();

    #[cfg(target_os = "macos")]
    let _ = std::process::Command::new("open").arg(&canonical).spawn();

    #[cfg(target_os = "linux")]
    let _ = std::process::Command::new("xdg-open").arg(&canonical).spawn();

    Ok(())
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct DiskFileItem {
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
    pub size_str: String,
    pub extension: String,
    pub modified_timestamp: u64,
    pub thumbnail_url: Option<String>,
}

fn format_bytes_rust(bytes: u64) -> String {
    if bytes < 1024 {
        format!("{} B", bytes)
    } else if bytes < 1024 * 1024 {
        format!("{:.1} KB", bytes as f64 / 1024.0)
    } else if bytes < 1024 * 1024 * 1024 {
        format!("{:.1} MB", bytes as f64 / (1024.0 * 1024.0))
    } else {
        format!("{:.2} GB", bytes as f64 / (1024.0 * 1024.0 * 1024.0))
    }
}

fn extract_yt_id_from_name(name: &str) -> Option<String> {
    if let Some(start) = name.rfind('[') {
        if let Some(end) = name[start..].rfind(']') {
            let id = &name[start + 1..start + end];
            if id.len() >= 8 && id.len() <= 16 && !id.contains(' ') {
                return Some(id.to_string());
            }
        }
    }
    None
}

#[tauri::command]
async fn get_disk_downloads() -> Result<Vec<DiskFileItem>, String> {
    let download_dir = resolve_ovilo_download_dir();
    let _ = fs::create_dir_all(&download_dir);
    let thumb_dir = download_dir.join(".thumbnails");
    let _ = fs::create_dir_all(&thumb_dir);

    let mut list = Vec::new();
    if let Ok(entries) = fs::read_dir(&download_dir) {
        for entry in entries.flatten() {
            if let Ok(meta) = entry.metadata() {
                if meta.is_file() {
                    let path = entry.path();
                    let name = entry.file_name().to_string_lossy().to_string();
                    if name.ends_with(".part") || name.ends_with(".ytdl") || name.starts_with('.') {
                        continue;
                    }
                    let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("").to_lowercase();
                    let size = meta.len();
                    let modified = meta.modified()
                        .ok()
                        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                        .map(|d| d.as_secs())
                        .unwrap_or(0);

                    let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("");
                    let thumb_path = thumb_dir.join(format!("{}.jpg", stem));

                    let mut thumbnail_url: Option<String> = None;

                    // 1. Check existing cached thumbnail in .thumbnails
                    if thumb_path.exists() && fs::metadata(&thumb_path).map(|m| m.len() > 0).unwrap_or(false) {
                        thumbnail_url = Some(format!("http://127.0.0.1:4545/media?path={}", urlencoding::encode(&thumb_path.to_string_lossy())));
                    } else if ["mp4", "mkv", "webm", "mov", "avi"].contains(&ext.as_str()) {
                        // Generate video thumbnail snapshot via ffmpeg
                        let res = std::process::Command::new("ffmpeg")
                            .args([
                                "-y",
                                "-ss", "00:00:02",
                                "-i", path.to_str().unwrap_or(""),
                                "-vframes", "1",
                                "-vf", "scale=320:-1",
                                thumb_path.to_str().unwrap_or(""),
                            ])
                            .output();

                        if let Ok(out) = res {
                            if out.status.success() && thumb_path.exists() {
                                thumbnail_url = Some(format!("http://127.0.0.1:4545/media?path={}", urlencoding::encode(&thumb_path.to_string_lossy())));
                            }
                        }
                    }

                    // 2. If still no thumbnail, check if YouTube ID is in brackets [ID]
                    if thumbnail_url.is_none() {
                        if let Some(yt_id) = extract_yt_id_from_name(&name) {
                            thumbnail_url = Some(format!("https://i.ytimg.com/vi/{}/hqdefault.jpg", yt_id));
                        }
                    }

                    list.push(DiskFileItem {
                        name,
                        path: path.to_string_lossy().to_string(),
                        size_bytes: size,
                        size_str: format_bytes_rust(size),
                        extension: ext,
                        modified_timestamp: modified,
                        thumbnail_url,
                    });
                }
            }
        }
    }
    list.sort_by(|a, b| b.modified_timestamp.cmp(&a.modified_timestamp));
    Ok(list)
}

#[tauri::command]
async fn delete_disk_download(path: String) -> Result<(), String> {
    let base_dir = resolve_ovilo_download_dir();
    let canonical_base = base_dir.canonicalize().map_err(|e| format!("Downloads directory not found: {}", e))?;
    
    let candidate = if std::path::Path::new(&path).is_absolute() {
        std::path::PathBuf::from(&path)
    } else {
        base_dir.join(&path)
    };

    let target = candidate.canonicalize().map_err(|e| format!("Invalid path {}: {}", candidate.display(), e))?;

    // Strictly enforce that the target file resides within the user's Ovilo downloads directory
    if !target.starts_with(&canonical_base) {
        return Err("Access denied: Cannot delete files outside the Ovilo downloads directory".to_string());
    }

    if target.is_file() {
        let file_stem = target.file_stem().and_then(|s| s.to_str()).unwrap_or("").to_string();
        fs::remove_file(&target).map_err(|e| format!("Failed to delete file: {}", e))?;

        // Also clean up thumbnail sidecar
        let thumb_path = base_dir.join(".thumbnails").join(format!("{}.jpg", file_stem));
        if thumb_path.exists() {
            let _ = fs::remove_file(thumb_path);
        }

        // Also clean up .lrc
        let lrc_path = base_dir.join(format!("{}.lrc", file_stem));
        if lrc_path.exists() {
            let _ = fs::remove_file(lrc_path);
        }
    } else {
        return Err("Target is not a valid file".to_string());
    }

    Ok(())
}

#[tauri::command]
async fn fetch_bdix_api(state: State<'_, AppState>, url: String) -> Result<String, String> {
    let res = state.client
        .get(&url)
        .header("User-Agent", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36")
        .timeout(std::time::Duration::from_secs(25))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let text = res.text().await.map_err(|e| e.to_string())?;
    Ok(text)
}

// ---------------------------------------------------------
// Application Entry
// ---------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(6))
        .build()
        .expect("Failed to create reqwest client");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            start_local_media_server(app.handle().clone());
            let user_data = load_user_data(&app.handle());
            app.manage(AppState {
                client,
                user_data: Mutex::new(user_data),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_video_sources,
            tmdb_request,
            fetch_trending,
            fetch_popular,
            fetch_top_rated,
            fetch_genres,
            fetch_discover_by_genre,
            fetch_details,
            fetch_season_episodes,
            search_multi,
            get_user_data,
            save_settings,
            add_watch_history,
            toggle_favorite,
            set_user_library,
            scan_local_music,
            read_local_lrc,
            save_local_lrc,
            fetch_online_lyrics,
            search_online_music,
            fetch_trending_music,
            resolve_online_stream,
            get_storage_stats,
            ytdlp_check_status,
            ytdlp_get_info,
            download_music_track,
            ytdlp_start_download,
            ytdlp_open_downloads_folder,
            ytdlp_open_media_file,
            get_disk_downloads,
            delete_disk_download,
            fetch_bdix_api
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
