from pathlib import Path
import base64
import re
import struct
import subprocess

SOURCE_COMMIT = 'f5aad54143d17470429b81a8194281f5a6f5a265'
NAMES = ['ready', 'reading', 'thinking', 'asking', 'clarifier']
OUT = Path('mobile/assets/vela')

for name in NAMES:
    path = f'mobile/assets/vela/{name}.b64.js'
    source = subprocess.check_output(['git', 'show', f'{SOURCE_COMMIT}:{path}'], text=True)
    match = re.search(r"export default '([^']+)';", source)
    if not match:
        raise SystemExit(f'Could not parse {path}')

    data = base64.b64decode(match.group(1), validate=True)
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        raise SystemExit(f'{name}: decoded data is not PNG')

    width, height = struct.unpack('>II', data[16:24])
    if width < 100 or height < 100:
        raise SystemExit(f'{name}: suspicious dimensions {width}x{height}')

    target = OUT / f'{name}.png'
    target.write_bytes(data)
    print(f'{name}: {width}x{height}, {len(data)} bytes')
