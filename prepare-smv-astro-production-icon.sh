#!/usr/bin/env bash
set -euo pipefail

# Exact source: the existing 512x512 PNG in the lowercase repository icon/ folder.
# No resizing, recompression, image substitution, or generic launcher resource names.
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
if len(data) < 24:
    raise SystemExit(f"::error::{path} has a truncated PNG header")
width, height = struct.unpack(">II", data[16:24])
if (width, height) != (512, 512):
    raise SystemExit(f"::error::{path} must be 512x512, found {width}x{height}")
if len(data) >= limit:
    raise SystemExit(f"::error::{path} exceeds the 300,000-byte limit: {len(data)}")
print(f"PASS: {path}: {width}x{height}, {len(data)} bytes.")
PY

mkdir -p "$res/drawable-nodpi" "$res/mipmap-nodpi" "$res/mipmap-anydpi-v26" "$res/values"

# Retire old generic ic_launcher resources so Android cannot select stale artwork.
rm -f "$res/drawable-nodpi/ic_launcher_foreground.jpg" \
      "$res/drawable-nodpi/ic_launcher_foreground.png" \
      "$res/mipmap-nodpi/ic_launcher.jpg" "$res/mipmap-nodpi/ic_launcher.png" \
      "$res/mipmap-nodpi/ic_launcher_round.jpg" "$res/mipmap-nodpi/ic_launcher_round.png" \
      "$res/mipmap-anydpi-v26/ic_launcher.xml" "$res/mipmap-anydpi-v26/ic_launcher_round.xml"

# Product-specific resource names make the selected Android launcher unambiguous.
cp "$source_icon" "$res/drawable-nodpi/smv_astro_launcher_foreground.png"
cp "$source_icon" "$res/mipmap-nodpi/smv_astro_launcher.png"
cp "$source_icon" "$res/mipmap-nodpi/smv_astro_launcher_round.png"

cat > "$res/mipmap-anydpi-v26/smv_astro_launcher.xml" <<'XML'
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/smv_launcher_background" />
    <foreground android:drawable="@drawable/smv_astro_launcher_foreground" />
</adaptive-icon>
XML
cp "$res/mipmap-anydpi-v26/smv_astro_launcher.xml" "$res/mipmap-anydpi-v26/smv_astro_launcher_round.xml"
cat > "$res/values/colors.xml" <<'XML'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="smv_launcher_background">#FFFFFF</color>
</resources>
XML

for asset in \
  "$res/drawable-nodpi/smv_astro_launcher_foreground.png" \
  "$res/mipmap-nodpi/smv_astro_launcher.png" \
  "$res/mipmap-nodpi/smv_astro_launcher_round.png"; do
  cmp -s "$source_icon" "$asset" || {
    echo "::error::Launcher asset differs from $source_icon: $asset"
    exit 1
  }
done

echo "PASS: SMV ASTRO launcher manifest resources are product-specific exact copies of icon/astro_512.png."
