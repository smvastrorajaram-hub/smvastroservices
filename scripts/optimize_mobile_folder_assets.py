#!/usr/bin/env python3
"""Optimize the supplied brand logo for the website.

The Header and Hero use the solid #24103F canvas and do not generate photo
assets. The original PNG files in mobile/ remain available as source backups.
"""
from pathlib import Path
from io import BytesIO
import math

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "mobile"
MAX_BYTES = 480_000
sources = sorted(SOURCE_DIR.glob("*.png"))
if len(sources) != 3:
    raise SystemExit(f"Expected exactly 3 PNG assets in mobile/, found {len(sources)}")

images = []
for path in sources:
    with Image.open(path) as opened:
        image = ImageOps.exif_transpose(opened).copy()
    images.append({"path": path, "image": image, "ratio": image.width / image.height})

logo = min(images, key=lambda item: abs(math.log(max(item["ratio"], 1e-6))))
jobs = [
    (logo, ROOT / "public/assets/smv-home-logo.webp", (900, 900), "Logo"),
]

def optimized_webp(image, destination, bounds, label):
    destination.parent.mkdir(parents=True, exist_ok=True)
    mode = "RGBA" if ("A" in image.getbands() or "transparency" in image.info) else "RGB"
    working = image.convert(mode)
    working.thumbnail(bounds, Image.Resampling.LANCZOS)
    while True:
        for quality in (88, 84, 80, 76, 72, 68, 64, 60, 56, 52, 48):
            buf = BytesIO()
            working.save(buf, "WEBP", quality=quality, method=6)
            data = buf.getvalue()
            if len(data) < MAX_BYTES:
                destination.write_bytes(data)
                print(f"{label}: source={image.width}x{image.height}; optimized={working.width}x{working.height}; quality={quality}; bytes={len(data)}; path={destination.relative_to(ROOT)}")
                return working.width, working.height, len(data)
        w, h = max(1, int(working.width * .88)), max(1, int(working.height * .88))
        if (w, h) == working.size or min(w, h) < 160:
            raise SystemExit(f"Could not compress {label} below 500 KB")
        working = working.resize((w, h), Image.Resampling.LANCZOS)

dimensions = {}
for source, destination, bounds, label in jobs:
    w, h, size = optimized_webp(source["image"], destination, bounds, label)
    if size >= 500_000:
        raise SystemExit(f"{destination.name} exceeds 500 KB")
    dimensions[label] = {"width": w, "height": h, "bytes": size}

print("PASS: the generated brand-logo WebP is below 500 KB; no Header/Hero photo assets are generated.")
