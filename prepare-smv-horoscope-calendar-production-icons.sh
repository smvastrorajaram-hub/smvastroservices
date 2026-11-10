#!/usr/bin/env bash
set -euo pipefail

# The lowercase repository icon/ directory is the single source of truth.
# Copy the user's existing 512x512 PNGs unchanged; never resize/recompress.
max_bytes=300000

validate_png() {
  local source_icon="$1"
  test -s "$source_icon" || {
    echo "::error::Approved production PNG is missing: $source_icon"
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
}

write_adaptive_resources() {
  local res="$1"
  mkdir -p "$res/drawable-nodpi" "$res/mipmap-nodpi" "$res/mipmap-anydpi-v26" "$res/values"
  rm -f "$res/drawable-nodpi/ic_launcher_foreground.jpg" \
        "$res/mipmap-nodpi/ic_launcher.jpg" \
        "$res/mipmap-nodpi/ic_launcher_round.jpg"
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
}

copy_product_icon() {
  local source_icon="$1"
  local production_module="$2"
  local res="$production_module/src/main/res"

  validate_png "$source_icon"
  write_adaptive_resources "$res"

  # Keep the exact source PNG bytes in every production launcher resource slot.
  cp "$source_icon" "$res/drawable-nodpi/ic_launcher_foreground.png"
  cp "$source_icon" "$res/mipmap-nodpi/ic_launcher.png"
  cp "$source_icon" "$res/mipmap-nodpi/ic_launcher_round.png"

  for asset in \
    "$res/drawable-nodpi/ic_launcher_foreground.png" \
    "$res/mipmap-nodpi/ic_launcher.png" \
    "$res/mipmap-nodpi/ic_launcher_round.png"; do
    cmp -s "$source_icon" "$asset" || {
      echo "::error::Launcher asset differs from $source_icon: $asset"
      exit 1
    }
  done
}

copy_product_icon "icon/horoscope_512.png" smvhoroscopeproduction
copy_product_icon "icon/calendar_512.png" smvcalendarproduction

echo "PASS: HOROSCOPE and CALENDAR production launchers are exact copies of their matching icon/ PNGs."
