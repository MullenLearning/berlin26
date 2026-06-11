#!/usr/bin/env python3
"""Generate app icons (pure stdlib — no PIL needed).
Dark navy gradient, Berlin-blue-line race ring with a white runner dot and a green finish tick."""
import struct, zlib, math


def png_bytes(w, h, pixels):
    raw = b''.join(b'\x00' + bytes(v for px in row for v in px) for row in pixels)

    def chunk(t, d):
        c = t + d
        return struct.pack('>I', len(d)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    return (b'\x89PNG\r\n\x1a\n'
            + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(raw, 9))
            + chunk(b'IEND', b''))


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def smooth(edge, width, d):
    """1 inside, 0 outside, soft ramp across `width` px around `edge`."""
    t = (d - edge) / width
    return max(0.0, min(1.0, 1.0 - t))


def make(n, path):
    top, bottom = (14, 21, 38), (30, 45, 74)
    # ring = the painted blue line on the Berlin course; dot = the runner; tick = the finish
    amber, sky, green = (74, 141, 240), (255, 255, 255), (74, 222, 128)
    cx, cy, r, thick = n * 0.5, n * 0.52, n * 0.30, n * 0.105
    dot_a = math.radians(-50)           # progress dot position on the ring
    dx, dy = cx + r * math.cos(dot_a), cy + r * math.sin(dot_a)
    aa = max(1.0, n / 256)
    rows = []
    for y in range(n):
        row = []
        for x in range(n):
            c = lerp(top, bottom, y / n)
            d = math.hypot(x - cx, y - cy)
            ring = smooth(thick / 2, aa, abs(d - r))
            if ring > 0:
                c = lerp(c, amber, ring)
            dd = math.hypot(x - dx, y - dy)
            dot = smooth(n * 0.062, aa, dd)
            if dot > 0:
                c = lerp(c, sky, dot)
            # finish tick at top of ring
            tx, ty = cx, cy - r
            td = math.hypot(x - tx, y - ty)
            tick = smooth(n * 0.04, aa, td)
            if tick > 0:
                c = lerp(c, green, tick)
            row.append(c)
        rows.append(row)
    with open(path, 'wb') as f:
        f.write(png_bytes(n, n, rows))
    print('wrote', path)


for size, name in [(180, 'icon-180.png'), (192, 'icon-192.png'), (512, 'icon-512.png')]:
    make(size, name)
