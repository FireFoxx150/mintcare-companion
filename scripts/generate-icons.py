import os
import zlib
import struct

def create_png(width, height, r=16, g=185, b=129):
    raw_rows = []
    max_r = min(width, height) / 2.0
    for y in range(height):
        row = bytearray([0])
        for x in range(width):
            cx, cy = x - width / 2.0 + 0.5, y - height / 2.0 + 0.5
            dist = (cx*cx + cy*cy)**0.5
            if dist <= max_r * 0.8:
                if abs(cx) < max_r * 0.25 and abs(cy) < max_r * 0.4:
                    row.extend([255, 255, 255, 255])
                else:
                    row.extend([r, g, b, 255])
            elif dist <= max_r:
                alpha = int(255 * (1.0 - (dist - max_r * 0.8) / (max_r * 0.2)))
                row.extend([r, g, b, max(0, min(255, alpha))])
            else:
                row.extend([0, 0, 0, 0])
        raw_rows.append(bytes(row))
    
    raw_data = b''.join(raw_rows)
    compressed = zlib.compress(raw_data)
    
    def make_chunk(chunk_type, data):
        return (struct.pack('>I', len(data)) + 
                chunk_type + 
                data + 
                struct.pack('>I', zlib.crc32(chunk_type + data) & 0xffffffff))
    
    png_bytes = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    png_bytes += make_chunk(b'IHDR', ihdr)
    png_bytes += make_chunk(b'IDAT', compressed)
    png_bytes += make_chunk(b'IEND', b'')
    return png_bytes

icons_map = {
    'public/apple-touch-icon.png': (180, 180),
    'public/favicon-16x16.png': (16, 16),
    'public/favicon-32x32.png': (32, 32),
    'public/icon.png': (512, 512),
    'src-tauri/icons/32x32.png': (32, 32),
    'src-tauri/icons/128x128.png': (128, 128),
    'src-tauri/icons/128x128@2x.png': (256, 256),
    'src-tauri/icons/icon.png': (512, 512),
    'src-tauri/icons/Square30x30Logo.png': (30, 30),
    'src-tauri/icons/Square44x44Logo.png': (44, 44),
    'src-tauri/icons/Square71x71Logo.png': (71, 71),
    'src-tauri/icons/Square89x89Logo.png': (89, 89),
    'src-tauri/icons/Square107x107Logo.png': (107, 107),
    'src-tauri/icons/Square142x142Logo.png': (142, 142),
    'src-tauri/icons/Square150x150Logo.png': (150, 150),
    'src-tauri/icons/Square284x284Logo.png': (284, 284),
    'src-tauri/icons/Square310x310Logo.png': (310, 310),
    'src-tauri/icons/StoreLogo.png': (50, 50),
}

for path, (w, h) in icons_map.items():
    os.makedirs(os.path.dirname(path), exist_ok=True)
    png_data = create_png(w, h)
    with open(path, 'wb') as f:
        f.write(png_data)
    print(f'Generated valid PNG: {path} ({w}x{h})')

with open('public/favicon.ico', 'wb') as f:
    f.write(create_png(32, 32))
print('Generated public/favicon.ico')
