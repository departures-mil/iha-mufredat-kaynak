#!/usr/bin/env python3
"""kabuk/ (çekirdek 3) dosyalarını arayüz paketine gömer: ui/js/kabuk-paket.js
Arayüz bu paketle eski çekirdeği (2) tek tıkla 3'e geçirir, 3 ve sonrası çekirdeği uygulama içinden günceller.
    python3 araclar/kabuk_paket.py 3.1
"""
import base64, hashlib, json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILES = ['boot.js', 'main.js', 'preload.js', 'lan.js', 'package.json']

def build(ver):
    files = {f: base64.b64encode(open(os.path.join(ROOT, 'kabuk', f), 'rb').read()).decode() for f in FILES}
    h = hashlib.sha256(b''.join(open(os.path.join(ROOT, 'kabuk', f), 'rb').read() for f in ['main.js', 'preload.js', 'lan.js'])).hexdigest()[:16]
    js = '/* otomatik üretilir: araclar/kabuk_paket.py — elle değiştirmeyin */\nwindow.KABUK_PAKET=' + json.dumps({'version': ver, 'hash': h, 'files': files}, separators=(',', ':')) + ';\n'
    open(os.path.join(ROOT, 'ui', 'js', 'kabuk-paket.js'), 'w').write(js)
    return len(js)

if __name__ == '__main__':
    print(build(sys.argv[1] if len(sys.argv) > 1 else '3.1'))
