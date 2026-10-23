#!/usr/bin/env python3
"""Optimize the three original PNGs in mobile/ into the SMV ASTRO assets used by the website.

Original uploads are retained as backups. The square-ish image becomes the logo;
of the remaining two, the portrait becomes the shared mobile Header/Hero image,
and the wider one becomes the desktop Hero. Every active WebP must be <500 KB.
"""
from pathlib import Path
from io import BytesIO
import math
import re

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
others = [item for item in images if item is not logo]
mobile = min(others, key=lambda item: item["ratio"])
desktop = max(others, key=lambda item: item["ratio"])

jobs = [
    (logo, ROOT / "public/assets/smv-home-logo.webp", (900, 900), "Logo"),
    (mobile, ROOT / "public/photo/smv-home-mobile-hero.webp", (1440, 2200), "Mobile Header + Hero"),
    (desktop, ROOT / "public/photo/smv-home-desktop-hero.webp", (1920, 1200), "Desktop Hero"),
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

# Update the existing canonical CSS with the exact pixel ratio of the optimized mobile image.
mobile_dim = dimensions["Mobile Header + Hero"]
height_vw = 100 * mobile_dim["height"] / mobile_dim["width"]
css_path = ROOT / "public/smvastro.css"
css = css_path.read_text(encoding="utf-8")
pattern = r"height:calc((?:SMV_HOME_MOBILE_IMAGE_HEIGHT_VW|[0-9]+(?:\.[0-9]+)?vw) - clamp\(190px,42\.507vw,235px\))!important;"
css, count = re.subn(pattern, f"height:calc({height_vw:.8f}vw - clamp(190px,42.507vw,235px))!important;", css, count=1)
if count != 1:
    raise SystemExit("Could not update the shared mobile Hero height ratio in public/smvastro.css")
css_path.write_text(css, encoding="utf-8")
print("PASS: all three active WebP assets are under 500 KB; shared mobile image offset/height matches its actual ratio.")
