#!/usr/bin/env bash
set -euo pipefail

# The lowercase repository icon/ directory is the single source of truth.
# These pre-sized PNGs are copied byte-for-byte: no resize, recompression or
# artwork substitution is permitted in the Android production build.
source_icon="icon/astro_512.png"
res="smvastroproduction/src/main/res"
max_bytes=300000

test -s "$source_icon" || {
  echo "::error::Approved SMV ASTRO PNG is missing: $source_icon"
  exit 1
}

python3 - "$source_icon" "$max_bytes" <<'PY'
import pathlib, struct, sys
path = pathlib.Path(sys.argv[1])
limit = int(sys.argv[2])
data = path.read_bytes()
if data[:8] != b"\x89PNG\r\n\x1a\n":
    raise SystemExit(f"::error::{path} is not a valid PNG")
width, height = struct.unpack(">II", data[16:24])
if (width, height) != (512, 512):
    raise SystemExit(f"::error::{path} must be 512x512, found {width}x{height}")
if len(data) >= limit:
    raise SystemExit(f"::error::{path} exceeds the 300,000-byte limit: {len(data)}")
print(f"PASS: {path}: {width}x{height}, {len(data)} bytes.")
PY

mkdir -p "$res/drawable-nodpi" "$res/mipmap-nodpi" "$res/mipmap-anydpi-v26" "$res/values"

# Remove stale resources produced by the previous JPEG-based icon pipeline.
rm -f "$res/drawable-nodpi/ic_launcher_foreground.jpg" \
      "$res/mipmap-nodpi/ic_launcher.jpg" \
      "$res/mipmap-nodpi/ic_launcher_round.jpg"

# Android launcher assets are exact byte-for-byte copies of icon/astro_512.png.
cp "$source_icon" "$res/drawable-nodpi/ic_launcher_foreground.png"
cp "$source_icon" "$res/mipmap-nodpi/ic_launcher.png"
cp "$source_icon" "$res/mipmap-nodpi/ic_launcher_round.png"

cat > "$res/mipmap-anydpi-v26/ic_launcher.xml" <<'XML'
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/smv_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>
XML
cp "$res/mipmap-anydpi-v26/ic_launcher.xml" "$res/mipmap-anydpi-v26/ic_launcher_round.xml"
cat > "$res/values/colors.xml" <<'XML'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="smv_launcher_background">#FFFFFF</color>
</resources>
XML

for asset in \
  "$res/drawable-nodpi/ic_launcher_foreground.png" \
  "$res/mipmap-nodpi/ic_launcher.png" \
  "$res/mipmap-nodpi/ic_launcher_round.png"; do
  cmp -s "$source_icon" "$asset" || {
    echo "::error::Launcher asset differs from $source_icon: $asset"
    exit 1
  }
done

echo "PASS: SMV ASTRO production launcher resources exactly match icon/astro_512.png."
