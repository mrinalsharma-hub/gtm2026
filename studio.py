#!/usr/bin/env python3
"""
GTM 2026 Multi-Domain Content & Translation Studio Server
Provides multi-domain management across:
1. www.gtm2026.com (Main Hub)
2. www.mrinalgarima.com (Groom's Family & Friends Edition)
3. www.garimamrinal.com (Bride's Family & Friends Edition)

Supports static serving, visual editing API, per-domain backup system, and 1-click Git publishing.
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

DOMAINS_CONFIG = {
    'gtm2026': {
        'id': 'gtm2026',
        'name': 'GTM 2026',
        'domain': 'www.gtm2026.com',
        'repo': 'mrinalsharma-hub/gtm2026',
        'path': '/usr/local/google/home/mrinalsharma/gtm2026',
        'branch': 'main',
        'title': 'Main Celebration Hub',
        'badge': 'Main Hub'
    },
    'mrinalgarima': {
        'id': 'mrinalgarima',
        'name': 'Mrinal & Garima',
        'domain': 'www.mrinalgarima.com',
        'repo': 'mrinalsharma-hub/mrinalgarima',
        'path': '/usr/local/google/home/mrinalsharma/mrinalgarima',
        'branch': 'main',
        'title': "Groom's Family & Friends Edition",
        'badge': "Groom's Edition"
    },
    'garimamrinal': {
        'id': 'garimamrinal',
        'name': 'Garima & Mrinal',
        'domain': 'www.garimamrinal.com',
        'repo': 'mrinalsharma-hub/garimamrinal',
        'path': '/usr/local/google/home/mrinalsharma/garimamrinal',
        'branch': 'main',
        'title': "Bride's Family & Friends Edition",
        'badge': "Bride's Edition"
    }
}

def get_repo_dir(domain_id):
    if domain_id in DOMAINS_CONFIG:
        p = DOMAINS_CONFIG[domain_id]['path']
        if os.path.exists(p):
            return p
    return BASE_DIR

def get_locales_dir(domain_id):
    repo_dir = get_repo_dir(domain_id)
    loc_dir = os.path.join(repo_dir, 'locales')
    os.makedirs(os.path.join(loc_dir, 'backups'), exist_ok=True)
    return loc_dir

class StudioHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def translate_path(self, path):
        path = urllib.parse.unquote(path)
        path = path.split('?', 1)[0].split('#', 1)[0]
        words = [w for w in path.split('/') if w and w != '..']
        
        # Check if requesting a specific domain preview: e.g. /domains/mrinalgarima/index.html
        if len(words) >= 2 and words[0] == 'domains' and words[1] in DOMAINS_CONFIG:
            target_repo = DOMAINS_CONFIG[words[1]]['path']
            res = target_repo
            for word in words[2:]:
                res = os.path.join(res, word)
            return res

        res = BASE_DIR
        for word in words:
            res = os.path.join(res, word)
        return res

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path in ('/', '/studio', '/admin', '/cms'):
            self.send_response(302)
            self.send_header('Location', '/studio.html')
            self.end_headers()
            return

        if parsed.path == '/api/domains':
            self.handle_get_domains()
            return
        
        if parsed.path == '/api/content':
            query = urllib.parse.parse_qs(parsed.query)
            domain_id = query.get('domain', ['gtm2026'])[0]
            self.handle_get_content(domain_id)
            return

        if parsed.path == '/api/git-status':
            query = urllib.parse.parse_qs(parsed.query)
            domain_id = query.get('domain', ['gtm2026'])[0]
            self.handle_get_git_status(domain_id)
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

        domain_id = data.get('domain', 'gtm2026')
        if domain_id not in DOMAINS_CONFIG:
            domain_id = 'gtm2026'

        if parsed.path == '/api/save':
            self.handle_save(domain_id, data)
            return
        elif parsed.path == '/api/publish':
            self.handle_publish(domain_id, data)
            return
        elif parsed.path == '/api/restore':
            self.handle_restore(domain_id, data)
            return
        elif parsed.path == '/api/clone-from-gtm':
            self.handle_clone_from_gtm(domain_id, data)
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

    def handle_get_domains(self):
        domains_list = []
        for d_id, d_info in DOMAINS_CONFIG.items():
            repo_path = d_info['path']
            git_info = self.get_git_info(repo_path)
            domains_list.append({
                'id': d_id,
                'name': d_info['name'],
                'domain': d_info['domain'],
                'repo': d_info['repo'],
                'title': d_info['title'],
                'badge': d_info['badge'],
                'exists': os.path.exists(repo_path),
                'git': git_info
            })
        self.send_json({
            'success': True,
            'domains': domains_list,
            'active_default': 'gtm2026'
        })

    def handle_get_content(self, domain_id):
        try:
            loc_dir = get_locales_dir(domain_id)
            repo_dir = get_repo_dir(domain_id)
            en_path = os.path.join(loc_dir, 'en.json')
            hi_path = os.path.join(loc_dir, 'hi.json')

            en_data = {}
            hi_data = {}

            if os.path.exists(en_path):
                with open(en_path, 'r', encoding='utf-8') as f:
                    en_data = json.load(f)
            if os.path.exists(hi_path):
                with open(hi_path, 'r', encoding='utf-8') as f:
                    hi_data = json.load(f)

            git_info = self.get_git_info(repo_dir)

            self.send_json({
                'success': True,
                'domain': domain_id,
                'domain_info': DOMAINS_CONFIG.get(domain_id, {}),
                'en': en_data,
                'hi': hi_data,
                'total_keys': len(en_data),
                'git': git_info
            })
        except Exception as e:
            self.send_json({'success': False, 'domain': domain_id, 'error': str(e)}, status=500)

    def handle_get_git_status(self, domain_id):
        try:
            repo_dir = get_repo_dir(domain_id)
            git_info = self.get_git_info(repo_dir)
            self.send_json({'success': True, 'domain': domain_id, 'git': git_info})
        except Exception as e:
            self.send_json({'success': False, 'domain': domain_id, 'error': str(e)}, status=500)

    def handle_save(self, domain_id, data):
        try:
            repo_dir = get_repo_dir(domain_id)
            loc_dir = get_locales_dir(domain_id)
            backup_dir = os.path.join(loc_dir, 'backups')
            os.makedirs(backup_dir, exist_ok=True)

            en_data = data.get('en', {})
            hi_data = data.get('hi', {})

            if not en_data:
                self.send_json({'success': False, 'error': 'No English data provided'}, status=400)
                return

            # Make timestamped backup
            ts = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_en = os.path.join(backup_dir, f'en_{ts}.json')
            backup_hi = os.path.join(backup_dir, f'hi_{ts}.json')

            en_path = os.path.join(loc_dir, 'en.json')
            hi_path = os.path.join(loc_dir, 'hi.json')

            with open(backup_en, 'w', encoding='utf-8') as f:
                json.dump(en_data, f, ensure_ascii=False, indent=2)
            if hi_data:
                with open(backup_hi, 'w', encoding='utf-8') as f:
                    json.dump(hi_data, f, ensure_ascii=False, indent=2)

            # Write main files
            with open(en_path, 'w', encoding='utf-8') as f:
                json.dump(en_data, f, ensure_ascii=False, indent=2)
            if hi_data:
                with open(hi_path, 'w', encoding='utf-8') as f:
                    json.dump(hi_data, f, ensure_ascii=False, indent=2)

            self.send_json({
                'success': True,
                'domain': domain_id,
                'message': f"Saved successfully for {DOMAINS_CONFIG.get(domain_id, {}).get('domain', domain_id)}.",
                'backup_timestamp': ts,
                'git': self.get_git_info(repo_dir)
            })
        except Exception as e:
            self.send_json({'success': False, 'domain': domain_id, 'error': str(e)}, status=500)

    def handle_publish(self, domain_id, data):
        try:
            repo_dir = get_repo_dir(domain_id)
            loc_dir = get_locales_dir(domain_id)
            en_data = data.get('en', {})
            hi_data = data.get('hi', {})

            # Write main files
            if en_data:
                en_path = os.path.join(loc_dir, 'en.json')
                with open(en_path, 'w', encoding='utf-8') as f:
                    json.dump(en_data, f, ensure_ascii=False, indent=2)
            if hi_data:
                hi_path = os.path.join(loc_dir, 'hi.json')
                with open(hi_path, 'w', encoding='utf-8') as f:
                    json.dump(hi_data, f, ensure_ascii=False, indent=2)

            # Git commit and push in target repo
            domain_name = DOMAINS_CONFIG.get(domain_id, {}).get('domain', domain_id)
            commit_msg = data.get('commit_message') or f"CMS Update for {domain_name}: {datetime.now().strftime('%Y-%m-%d %H:%M')}"
            
            # Stage locales
            subprocess.run(['git', 'add', 'locales/'], cwd=repo_dir, check=True, capture_output=True)
            
            # Commit if changes exist
            status_res = subprocess.run(['git', 'status', '--porcelain', 'locales/'], cwd=repo_dir, capture_output=True, text=True)
            
            commit_hash = ''
            if status_res.stdout.strip():
                subprocess.run(['git', 'commit', '-m', commit_msg], cwd=repo_dir, check=True, capture_output=True, text=True)
                commit_hash = self.get_latest_commit_hash(repo_dir)
            else:
                commit_hash = self.get_latest_commit_hash(repo_dir)

            # Push to origin main
            push_res = subprocess.run(['git', 'push', 'origin', 'main'], cwd=repo_dir, capture_output=True, text=True)
            
            if push_res.returncode != 0:
                self.send_json({
                    'success': False,
                    'domain': domain_id,
                    'error': f"Git push failed for {domain_name}: {push_res.stderr}",
                    'commit': commit_hash
                }, status=500)
                return

            self.send_json({
                'success': True,
                'domain': domain_id,
                'domain_name': domain_name,
                'message': f"Published live to {domain_name} successfully!",
                'commit': commit_hash,
                'pushed_at': datetime.now().isoformat(),
                'git': self.get_git_info(repo_dir)
            })
        except subprocess.CalledProcessError as e:
            err_msg = e.stderr.decode('utf-8') if e.stderr else str(e)
            self.send_json({'success': False, 'domain': domain_id, 'error': f"Git error: {err_msg}"}, status=500)
        except Exception as e:
            self.send_json({'success': False, 'domain': domain_id, 'error': str(e)}, status=500)

    def handle_restore(self, domain_id, data):
        try:
            repo_dir = get_repo_dir(domain_id)
            subprocess.run(['git', 'checkout', 'HEAD', '--', 'locales/'], cwd=repo_dir, check=True, capture_output=True)
            self.send_json({
                'success': True,
                'domain': domain_id,
                'message': f"Restored locales to last committed version for {domain_id}."
            })
        except Exception as e:
            self.send_json({'success': False, 'domain': domain_id, 'error': str(e)}, status=500)

    def handle_clone_from_gtm(self, domain_id, data):
        try:
            if domain_id == 'gtm2026':
                self.send_json({'success': False, 'error': 'Cannot clone GTM 2026 into itself'}, status=400)
                return

            gtm_loc_dir = get_locales_dir('gtm2026')
            target_loc_dir = get_locales_dir(domain_id)

            gtm_en_path = os.path.join(gtm_loc_dir, 'en.json')
            gtm_hi_path = os.path.join(gtm_loc_dir, 'hi.json')

            with open(gtm_en_path, 'r', encoding='utf-8') as f:
                en_data = json.load(f)
            with open(gtm_hi_path, 'r', encoding='utf-8') as f:
                hi_data = json.load(f)

            # Backup existing
            ts = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_dir = os.path.join(target_loc_dir, 'backups')
            os.makedirs(backup_dir, exist_ok=True)

            target_en_path = os.path.join(target_loc_dir, 'en.json')
            target_hi_path = os.path.join(target_loc_dir, 'hi.json')

            if os.path.exists(target_en_path):
                with open(os.path.join(backup_dir, f'pre_clone_en_{ts}.json'), 'w', encoding='utf-8') as f:
                    with open(target_en_path, 'r', encoding='utf-8') as ef:
                        f.write(ef.read())

            with open(target_en_path, 'w', encoding='utf-8') as f:
                json.dump(en_data, f, ensure_ascii=False, indent=2)
            with open(target_hi_path, 'w', encoding='utf-8') as f:
                json.dump(hi_data, f, ensure_ascii=False, indent=2)

            self.send_json({
                'success': True,
                'domain': domain_id,
                'en': en_data,
                'hi': hi_data,
                'message': f"Cloned content from GTM 2026 into {DOMAINS_CONFIG.get(domain_id, {}).get('domain', domain_id)} successfully."
            })
        except Exception as e:
            self.send_json({'success': False, 'domain': domain_id, 'error': str(e)}, status=500)

    def get_git_info(self, repo_dir):
        try:
            branch = subprocess.run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], cwd=repo_dir, capture_output=True, text=True).stdout.strip()
            last_commit = subprocess.run(['git', 'log', '-1', '--format=%h - %s (%cr)'], cwd=repo_dir, capture_output=True, text=True).stdout.strip()
            status = subprocess.run(['git', 'status', '--porcelain', 'locales/'], cwd=repo_dir, capture_output=True, text=True).stdout.strip()
            return {
                'branch': branch,
                'last_commit': last_commit,
                'has_uncommitted_changes': bool(status)
            }
        except Exception:
            return {'branch': 'unknown', 'last_commit': 'unknown', 'has_uncommitted_changes': False}

    def get_latest_commit_hash(self, repo_dir):
        try:
            return subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], cwd=repo_dir, capture_output=True, text=True).stdout.strip()
        except Exception:
            return ''

def run_server():
    port = PORT
    for attempt in range(10):
        try:
            socketserver.TCPServer.allow_reuse_address = True
            with socketserver.TCPServer(("", port), StudioHandler) as httpd:
                hostname = "mrinalsharma.c.googlers.com"
                print("\n" + "=" * 70)
                print("🌟  GTM 2026 MULTI-DOMAIN CONTENT STUDIO IS RUNNING")
                print("=" * 70)
                print(f"👉 Studio Access:    http://localhost:{port}/studio.html")
                print(f"👉 Network URL:      http://{hostname}:{port}/studio.html")
                print("   Domains Managed:")
                for d_id, d_info in DOMAINS_CONFIG.items():
                    print(f"   • {d_info['name']} ({d_info['domain']}) -> {d_info['repo']}")
                print("=" * 70 + "\n")
                httpd.serve_forever()
        except OSError as e:
            if 'Address already in use' in str(e):
                port += 1
            else:
                raise e

if __name__ == '__main__':
    run_server()

