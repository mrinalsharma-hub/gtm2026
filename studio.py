#!/usr/bin/env python3
"""
GTM 2026 Content & Translation Studio Server
Provides static serving, visual editing API, backup system, and 1-click Git publishing.
"""

import http.server
import socketserver
import os
import sys
import json
import subprocess
import time
import urllib.parse
from datetime import datetime

PORT = int(os.environ.get('PORT', 8080))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOCALES_DIR = os.path.join(BASE_DIR, 'locales')
BACKUP_DIR = os.path.join(LOCALES_DIR, 'backups')

os.makedirs(BACKUP_DIR, exist_ok=True)

class StudioHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path in ('/', '/studio', '/admin', '/cms'):
            self.send_response(302)
            self.send_header('Location', '/studio.html')
            self.end_headers()
            return
        
        if parsed.path == '/api/content':
            self.handle_get_content()
            return

        if parsed.path == '/api/git-status':
            self.handle_get_git_status()
            return

        # Default static file handler
        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else ''
        try:
            data = json.loads(body) if body else {}
        except Exception:
            data = {}

        if parsed.path == '/api/save':
            self.handle_save(data)
            return
        elif parsed.path == '/api/publish':
            self.handle_publish(data)
            return
        elif parsed.path == '/api/restore':
            self.handle_restore(data)
            return
        else:
            self.send_error(404, 'API endpoint not found')

    def send_json(self, data, status=200):
        out = json.dumps(data, ensure_ascii=False, indent=2).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(out)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.end_headers()
        self.wfile.write(out)

    def handle_get_content(self):
        try:
            en_path = os.path.join(LOCALES_DIR, 'en.json')
            hi_path = os.path.join(LOCALES_DIR, 'hi.json')

            en_data = {}
            hi_data = {}

            if os.path.exists(en_path):
                with open(en_path, 'r', encoding='utf-8') as f:
                    en_data = json.load(f)
            if os.path.exists(hi_path):
                with open(hi_path, 'r', encoding='utf-8') as f:
                    hi_data = json.load(f)

            git_info = self.get_git_info()

            self.send_json({
                'success': True,
                'en': en_data,
                'hi': hi_data,
                'total_keys': len(en_data),
                'git': git_info
            })
        except Exception as e:
            self.send_json({'success': False, 'error': str(e)}, status=500)

    def handle_get_git_status(self):
        try:
            git_info = self.get_git_info()
            self.send_json({'success': True, 'git': git_info})
        except Exception as e:
            self.send_json({'success': False, 'error': str(e)}, status=500)

    def handle_save(self, data):
        try:
            en_data = data.get('en', {})
            hi_data = data.get('hi', {})

            if not en_data:
                self.send_json({'success': False, 'error': 'No English data provided'}, status=400)
                return

            # Make timestamped backup
            ts = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_en = os.path.join(BACKUP_DIR, f'en_{ts}.json')
            backup_hi = os.path.join(BACKUP_DIR, f'hi_{ts}.json')

            en_path = os.path.join(LOCALES_DIR, 'en.json')
            hi_path = os.path.join(LOCALES_DIR, 'hi.json')

            with open(backup_en, 'w', encoding='utf-8') as f:
                json.dump(en_data, f, ensure_ascii=False, indent=2)
            with open(backup_hi, 'w', encoding='utf-8') as f:
                json.dump(hi_data, f, ensure_ascii=False, indent=2)

            # Write main files
            with open(en_path, 'w', encoding='utf-8') as f:
                json.dump(en_data, f, ensure_ascii=False, indent=2)
            with open(hi_path, 'w', encoding='utf-8') as f:
                json.dump(hi_data, f, ensure_ascii=False, indent=2)

            self.send_json({
                'success': True,
                'message': 'Changes saved successfully to static bundles.',
                'backup_timestamp': ts,
                'git': self.get_git_info()
            })
        except Exception as e:
            self.send_json({'success': False, 'error': str(e)}, status=500)

    def handle_publish(self, data):
        try:
            en_data = data.get('en', {})
            hi_data = data.get('hi', {})

            # Write main files
            if en_data and hi_data:
                en_path = os.path.join(LOCALES_DIR, 'en.json')
                hi_path = os.path.join(LOCALES_DIR, 'hi.json')
                with open(en_path, 'w', encoding='utf-8') as f:
                    json.dump(en_data, f, ensure_ascii=False, indent=2)
                with open(hi_path, 'w', encoding='utf-8') as f:
                    json.dump(hi_data, f, ensure_ascii=False, indent=2)

            # Git commit and push
            commit_msg = data.get('commit_message') or f"CMS Update via Studio: {datetime.now().strftime('%Y-%m-%d %H:%M')}"
            
            # Stage locales
            subprocess.run(['git', 'add', 'locales/'], cwd=BASE_DIR, check=True, capture_output=True)
            
            # Commit if changes exist
            status_res = subprocess.run(['git', 'status', '--porcelain', 'locales/'], cwd=BASE_DIR, capture_output=True, text=True)
            
            commit_hash = ''
            if status_res.stdout.strip():
                subprocess.run(['git', 'commit', '-m', commit_msg], cwd=BASE_DIR, check=True, capture_output=True, text=True)
                commit_hash = self.get_latest_commit_hash()
            else:
                commit_hash = self.get_latest_commit_hash()

            # Push to origin main
            push_res = subprocess.run(['git', 'push', 'origin', 'main'], cwd=BASE_DIR, capture_output=True, text=True)
            
            if push_res.returncode != 0:
                self.send_json({
                    'success': False,
                    'error': f"Git push failed: {push_res.stderr}",
                    'commit': commit_hash
                }, status=500)
                return

            self.send_json({
                'success': True,
                'message': 'Published live to GitHub Pages successfully!',
                'commit': commit_hash,
                'pushed_at': datetime.now().isoformat(),
                'git': self.get_git_info()
            })
        except subprocess.CalledProcessError as e:
            err_msg = e.stderr.decode('utf-8') if e.stderr else str(e)
            self.send_json({'success': False, 'error': f"Git error: {err_msg}"}, status=500)
        except Exception as e:
            self.send_json({'success': False, 'error': str(e)}, status=500)

    def handle_restore(self, data):
        try:
            subprocess.run(['git', 'checkout', 'HEAD', '--', 'locales/'], cwd=BASE_DIR, check=True, capture_output=True)
            self.send_json({
                'success': True,
                'message': 'Restored locales to last committed version.'
            })
        except Exception as e:
            self.send_json({'success': False, 'error': str(e)}, status=500)

    def get_git_info(self):
        try:
            branch = subprocess.run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], cwd=BASE_DIR, capture_output=True, text=True).stdout.strip()
            last_commit = subprocess.run(['git', 'log', '-1', '--format=%h - %s (%cr)'], cwd=BASE_DIR, capture_output=True, text=True).stdout.strip()
            status = subprocess.run(['git', 'status', '--porcelain', 'locales/'], cwd=BASE_DIR, capture_output=True, text=True).stdout.strip()
            return {
                'branch': branch,
                'last_commit': last_commit,
                'has_uncommitted_changes': bool(status)
            }
        except Exception:
            return {'branch': 'unknown', 'last_commit': 'unknown', 'has_uncommitted_changes': False}

    def get_latest_commit_hash(self):
        try:
            return subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], cwd=BASE_DIR, capture_output=True, text=True).stdout.strip()
        except Exception:
            return ''

def run_server():
    port = PORT
    for attempt in range(10):
        try:
            socketserver.TCPServer.allow_reuse_address = True
            with socketserver.TCPServer(("", port), StudioHandler) as httpd:
                hostname = "mrinalsharma.c.googlers.com"
                print("\n" + "=" * 65)
                print("🌟  GTM 2026 CONTENT & TRANSLATION STUDIO IS RUNNING")
                print("=" * 65)
                print(f"👉 Local Access:     http://localhost:{port}/studio.html")
                print(f"👉 Network Access:   http://{hostname}:{port}/studio.html")
                print("=" * 65 + "\n")
                httpd.serve_forever()
        except OSError as e:
            if 'Address already in use' in str(e):
                port += 1
            else:
                raise e

if __name__ == '__main__':
    run_server()
