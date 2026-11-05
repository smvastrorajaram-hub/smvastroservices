#!/usr/bin/env python3
"""Generate SMV ASTRO PWA icon and the three website favicon families from ICON/SMV.zip."""
# HOROSCOPE and CALENDAR PWA manifest icons are deliberately left unchanged.
from io import BytesIO
from pathlib import Path
from zipfile import ZipFile
import sys

from PIL import Image, ImageOps

archive = Path(sys.argv[1] if len(sys.argv) > 1 else "ICON/SMV.zip")
root = Path(".")
release = "20261105-active-only-auto-busy-v1"
resampling = Image.Resampling.LANCZOS


def image_from_zip(zf: ZipFile, member: str) -> Image.Image:
    try:
        raw = zf.read(member)
    except KeyError as exc:
        raise SystemExit(f"Required original artwork is missing from {archive}: {member}") from exc
    with Image.open(BytesIO(raw)) as opened:
        opened.verify()
    with Image.open(BytesIO(raw)) as opened:
        return opened.convert("RGB")


with ZipFile(archive) as zf:
    pwa = image_from_zip(zf, "SMV PWA/SMV ASTRO.jpg")
    if pwa.width != pwa.height or pwa.width < 1024:
        raise SystemExit(f"SMV ASTRO PWA source must be a high-resolution square image, found {pwa.size}")
    for size in (192, 512):
        output = root / f"public/assets/icon-{size}.png"
        output.parent.mkdir(parents=True, exist_ok=True)
        pwa.resize((size, size), resampling).save(output, format="PNG", optimize=True)

    website_sources = {
        "SMV WEBSITE/SMV ASTRO.jpg": ("public/assets", "favicon-astro"),
        "SMV WEBSITE/SMV HOROSCOPE.jpg": ("public/horoscope/assets", "favicon-horoscope"),
        "SMV WEBSITE/SMV CALENDAR.jpg": ("public/horoscope/assets", "favicon-calendar"),
    }
    for member, (folder, prefix) in website_sources.items():
        source = image_from_zip(zf, member)
        square = ImageOps.pad(
            source,
            (max(source.width, source.height), max(source.width, source.height)),
            method=resampling,
            color=(255, 255, 255),
            centering=(0.5, 0.5),
        )
        target_dir = root / folder
        target_dir.mkdir(parents=True, exist_ok=True)
        favicon_images = {}
        for size in (16, 32, 64):
            icon = square.resize((size, size), resampling)
            favicon_images[size] = icon
            icon.save(target_dir / f"{prefix}-{size}.png", format="PNG", optimize=True)
        ico_source = square.resize((48, 48), resampling)
        ico_source.save(
            target_dir / f"{prefix}.ico",
            format="ICO",
            sizes=[(16, 16), (32, 32), (48, 48)],
        )

print("Generated SMV ASTRO PWA icons and all three website favicon families from the original SMV.zip sources.")
