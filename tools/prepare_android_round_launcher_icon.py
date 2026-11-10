#!/usr/bin/env python3
"""Generate a round-mask-safe SMV HOROSCOPE foreground and legacy bitmap.

Android adaptive layers are 108dp. A circle-safe 66dp zone must contain the
entire square artwork, so the square's diagonal is kept below 66dp.
"""
from __future__ import annotations

from pathlib import Path
import sys
from math import sqrt

from PIL import Image

CANVAS_PX = 512
CANVAS_DP = 108.0
SAFE_CIRCLE_DP = 66.0
TARGET_DP = 46.0
MAX_BYTES = 300_000


def main() -> int:
    if len(sys.argv) != 4:
        raise SystemExit(
            "Usage: prepare_android_round_launcher_icon.py SOURCE FOREGROUND LEGACY"
        )

    source_path, foreground_path, legacy_path = map(Path, sys.argv[1:])
    if not source_path.is_file():
        raise SystemExit(f"ERROR: HOROSCOPE source icon is missing: {source_path}")
    if source_path.stat().st_size >= MAX_BYTES:
        raise SystemExit("ERROR: source icon must remain below 300 KB")

    with Image.open(source_path) as source:
        if source.format != "PNG" or source.size != (CANVAS_PX, CANVAS_PX):
            raise SystemExit("ERROR: source must be a 512x512 PNG")
        artwork = source.convert("RGBA").resize(
            (round(CANVAS_PX * TARGET_DP / CANVAS_DP),) * 2,
            Image.Resampling.LANCZOS,
        )

    target_px = artwork.width
    effective_dp = target_px * CANVAS_DP / CANVAS_PX
    diagonal_dp = effective_dp * sqrt(2)
    if diagonal_dp > SAFE_CIRCLE_DP:
        raise SystemExit(
            f"ERROR: square artwork diagonal {diagonal_dp:.2f}dp "
            f"exceeds the {SAFE_CIRCLE_DP:.0f}dp circular safe zone"
        )

    offset = (CANVAS_PX - target_px) // 2
    foreground_path.parent.mkdir(parents=True, exist_ok=True)
    legacy_path.parent.mkdir(parents=True, exist_ok=True)

    foreground = Image.new("RGBA", (CANVAS_PX, CANVAS_PX), (0, 0, 0, 0))
    foreground.alpha_composite(artwork, (offset, offset))
    foreground.save(foreground_path, format="PNG", optimize=True)

    legacy = Image.new("RGBA", (CANVAS_PX, CANVAS_PX), (255, 255, 255, 255))
    legacy.alpha_composite(artwork, (offset, offset))
    legacy.convert("RGB").save(legacy_path, format="PNG", optimize=True)

    with Image.open(foreground_path) as check:
        if check.size != (CANVAS_PX, CANVAS_PX):
            raise SystemExit("ERROR: round foreground canvas must be 512x512")
        expected_bbox = (offset, offset, offset + target_px, offset + target_px)
        if check.convert("RGBA").getchannel("A").getbbox() != expected_bbox:
            raise SystemExit("ERROR: round foreground is not centered at the requested size")

    for output in (foreground_path, legacy_path):
        if output.stat().st_size >= MAX_BYTES:
            raise SystemExit(f"ERROR: generated resource exceeds 300 KB: {output}")
        with Image.open(output) as check:
            if check.format != "PNG" or check.size != (CANVAS_PX, CANVAS_PX):
                raise SystemExit(f"ERROR: invalid generated launcher PNG: {output}")

    print(
        f"PASS: HOROSCOPE roundIcon artwork is {effective_dp:.2f}dp square; "
        f"its {diagonal_dp:.2f}dp diagonal fits inside the 66dp circular safe zone."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
