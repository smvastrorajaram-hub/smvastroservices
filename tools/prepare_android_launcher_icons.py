#!/usr/bin/env python3
"""Create Android adaptive/legacy launcher resources with 60dp artwork on a 108dp canvas.

The source PNG in icon/ is never changed. Its complete square artwork is resized
with aspect ratio preserved and centered on a transparent adaptive foreground
and a white legacy bitmap canvas.
"""
from __future__ import annotations

import argparse
from pathlib import Path
import sys

from PIL import Image

MAX_SOURCE_BYTES = 300_000
CANVAS_PX = 512
CANVAS_DP = 108.0
TARGET_DP = 60.0


def png_size(path: Path) -> tuple[int, int]:
    with Image.open(path) as image:
        if image.format != "PNG":
            raise SystemExit(f"ERROR: {path} must be PNG, found {image.format}")
        return image.size


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("foreground", type=Path)
    parser.add_argument("legacy", type=Path)
    parser.add_argument("--content-dp", type=float, default=TARGET_DP)
    args = parser.parse_args()

    if not 58.0 <= args.content_dp <= 60.0:
        raise SystemExit("ERROR: --content-dp must be between 58 and 60 dp.")
    if not args.source.is_file():
        raise SystemExit(f"ERROR: approved icon source is missing: {args.source}")
    source_bytes = args.source.stat().st_size
    if source_bytes >= MAX_SOURCE_BYTES:
        raise SystemExit(f"ERROR: source PNG must be below 300,000 bytes: {source_bytes}")
    if png_size(args.source) != (CANVAS_PX, CANVAS_PX):
        raise SystemExit(f"ERROR: {args.source} must be 512x512 pixels.")

    target_px = round(CANVAS_PX * args.content_dp / CANVAS_DP)
    effective_dp = target_px * CANVAS_DP / CANVAS_PX
    if not 58.0 <= effective_dp <= 60.0:
        raise SystemExit(f"ERROR: generated artwork size {effective_dp:.3f}dp is outside 58–60dp.")

    with Image.open(args.source) as source_image:
        artwork = source_image.convert("RGBA").resize(
            (target_px, target_px), Image.Resampling.LANCZOS
        )

    offset = (CANVAS_PX - target_px) // 2
    args.foreground.parent.mkdir(parents=True, exist_ok=True)
    args.legacy.parent.mkdir(parents=True, exist_ok=True)

    foreground = Image.new("RGBA", (CANVAS_PX, CANVAS_PX), (0, 0, 0, 0))
    foreground.alpha_composite(artwork, (offset, offset))
    foreground.save(args.foreground, format="PNG", optimize=True)

    legacy = Image.new("RGBA", (CANVAS_PX, CANVAS_PX), (255, 255, 255, 255))
    legacy.alpha_composite(artwork, (offset, offset))
    legacy.convert("RGB").save(args.legacy, format="PNG", optimize=True)

    with Image.open(args.foreground) as generated:
        if generated.size != (CANVAS_PX, CANVAS_PX):
            raise SystemExit("ERROR: adaptive foreground canvas must remain 512x512.")
        if generated.getchannel("A").getbbox() != (
            offset, offset, offset + target_px, offset + target_px
        ):
            raise SystemExit("ERROR: adaptive artwork is not centered at the requested size.")

    for output in (args.foreground, args.legacy):
        if png_size(output) != (CANVAS_PX, CANVAS_PX):
            raise SystemExit(f"ERROR: generated launcher resource is not 512x512: {output}")
        output_bytes = output.stat().st_size
        if output_bytes >= MAX_SOURCE_BYTES:
            raise SystemExit(f"ERROR: generated launcher resource exceeds 300 KB: {output} ({output_bytes} bytes)")

    print(
        f"PASS: {args.source} -> centered {target_px}px artwork "
        f"({effective_dp:.2f}dp) on a {CANVAS_DP:.0f}dp canvas; "
        f"512x512 PNG outputs are below 300 KB."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
