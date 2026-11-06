#!/usr/bin/env bash
# Copie le jeu (kichta-bonbon/) et le moteur 3D (vendor/) dans app-android/www
set -euo pipefail
cd "$(dirname "$0")"
rm -rf www assets
mkdir -p www/vendor assets
cp -r ../kichta-bonbon/. www/
rm -rf www/tools www/README.md
cp ../vendor/three.core.min.js ../vendor/three.module.min.js ../vendor/three.addons.min.js www/vendor/
# Les fichiers du jeu cherchent le moteur dans ../vendor : dans l'application il est dans ./vendor
sed -i 's#\.\./vendor/#./vendor/#g' www/*.js www/index.html
# Icône de l'application (1024 × 1024)
cp ../kichta-bonbon/icon-1024.png assets/icon-only.png
cp ../kichta-bonbon/icon-1024.png assets/icon-foreground.png
python3 - <<'PY'
from pathlib import Path
# Fond rose pour l'icône adaptative Android
import zlib, struct
w = h = 1024
raw = b"".join(b"\x00" + bytes([255, 121, 176]) * w for _ in range(h))
def chunk(t, d):
    return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
Path("assets/icon-background.png").write_bytes(png)
PY
echo "Jeu copié dans www/"
