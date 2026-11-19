#!/usr/bin/env python3
"""
Ovilo Universal yt-dlp Extraction Server
Provides instant, high-speed media resolution for YouTube (with JS challenge solving),
TikTok, Instagram, Twitter/X, Reddit, Facebook, and 1000+ sites.
"""

import sys
import json
import urllib.parse
import subprocess
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

PORT = 8765
YTDLP_BIN = "/home/rir790/.local/bin/yt-dlp"

class ExtractorHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Keep logs concise
        sys.stderr.write(f"[ytdlp-server] {format % args}\n")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Accept')
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/health':
            self._send_json({"status": "ok", "service": "ovilo-ytdlp-engine"})
            return

        if parsed.path == '/extract':
            qs = urllib.parse.parse_qs(parsed.query)
            target_url = qs.get('url', [''])[0].strip()
            if not target_url:
                self._send_error("Missing 'url' query parameter", 400)
                return
            self._handle_extraction(target_url)
            return

        self._send_error("Endpoint not found", 404)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/extract':
            content_len = int(self.headers.get('Content-Length', 0))
            raw_body = self.rfile.read(content_len).decode('utf-8', errors='ignore')
            target_url = ""
            try:
                body_json = json.loads(raw_body)
                target_url = body_json.get('url', '').strip()
            except Exception:
                qs = urllib.parse.parse_qs(raw_body)
                target_url = qs.get('url', [''])[0].strip()

            if not target_url:
                self._send_error("Missing 'url' in body", 400)
                return
            self._handle_extraction(target_url)
            return

        self._send_error("Endpoint not found", 404)

    def _handle_extraction(self, target_url):
        try:
            cmd = [
                YTDLP_BIN,
                "--dump-single-json",
                "--no-warnings",
                "--no-playlist",
                "--format", "bestvideo+bestaudio/best",
                target_url
            ]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=25)
            if res.returncode != 0:
                err_text = (res.stderr or res.stdout or "Extraction failed").strip()
                self._send_error(f"yt-dlp error: {err_text[:200]}", 500)
                return

            raw = json.loads(res.stdout)
            title = raw.get('title') or 'Extracted Media'
            author = raw.get('uploader') or raw.get('channel') or raw.get('extractor_key') or 'Web Stream'
            thumbnail = raw.get('thumbnail')
            platform = raw.get('extractor_key') or raw.get('extractor') or 'Universal Web'

            formats_list = []
            seen_labels = set()

            # Process all streams
            all_formats = raw.get('formats') or []
            
            # 1. Best Audio
            audio_formats = [f for f in all_formats if f.get('acodec') != 'none' and f.get('vcodec') == 'none' and f.get('url')]
            audio_formats.sort(key=lambda x: x.get('abr') or x.get('tbr') or 0, reverse=True)
            for a in audio_formats[:2]:
                abr = int(a.get('abr') or a.get('tbr') or 128)
                ext = a.get('ext') or 'm4a'
                label = f"Lossless Audio ({ext.upper()} • {abr} kbps)"
                if label not in seen_labels:
                    seen_labels.add(label)
                    formats_list.append({
                        "label": label,
                        "streamUrl": a['url'],
                        "extension": ext,
                        "isAudioOnly": True,
                        "quality": "Audio"
                    })

            # 2. Muxed Video (has both audio and video)
            muxed_formats = [f for f in all_formats if f.get('acodec') != 'none' and f.get('vcodec') != 'none' and f.get('url')]
            muxed_formats.sort(key=lambda x: (x.get('height') or 0, x.get('tbr') or 0), reverse=True)
            for v in muxed_formats:
                height = v.get('height') or 0
                res_label = f"{height}p" if height else "Video"
                ext = v.get('ext') or 'mp4'
                label = f"Video {res_label} ({ext.upper()})"
                if label not in seen_labels:
                    seen_labels.add(label)
                    formats_list.append({
                        "label": label,
                        "streamUrl": v['url'],
                        "extension": ext,
                        "isAudioOnly": False,
                        "quality": res_label
                    })

            # Fallback if no muxed video found (e.g. single best direct url)
            if not formats_list and raw.get('url'):
                ext = raw.get('ext') or 'mp4'
                formats_list.append({
                    "label": f"Direct Stream ({ext.upper()})",
                    "streamUrl": raw['url'],
                    "extension": ext,
                    "isAudioOnly": False,
                    "quality": "Best"
                })

            response_data = {
                "success": True,
                "originalUrl": target_url,
                "title": title,
                "author": author,
                "thumbnailUrl": thumbnail,
                "platform": platform,
                "formats": formats_list
            }
            self._send_json(response_data)
        except subprocess.TimeoutExpired:
            self._send_error("Extraction timed out after 25s", 504)
        except Exception as e:
            self._send_error(f"Internal error: {e}", 500)

    def _send_json(self, data, code=200):
        body = json.dumps(data).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_error(self, message, code=400):
        self._send_json({"success": False, "error": message}, code=code)

if __name__ == '__main__':
    server = ThreadingHTTPServer(('0.0.0.0', PORT), ExtractorHandler)
    print(f"[ytdlp-server] Started on http://0.0.0.0:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
