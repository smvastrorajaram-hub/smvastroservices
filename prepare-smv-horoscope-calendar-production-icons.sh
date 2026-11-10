#!/usr/bin/env bash
set -euo pipefail

# Sources of truth: the existing lowercase icon/ PNGs. Never modify these files.
copy_product_icon() {
  local source_icon="$1"
  local production_module="$2"
  local resource_prefix="$3"
  local res="$production_module/src/main/res"

  test -s "$source_icon" || {
    echo "::error::Approved production PNG is missing: $source_icon"
    exit 1
  }
  mkdir -p "$res/drawable-nodpi" "$res/mipmap-nodpi" "$res/mipmap-anydpi-v26" "$res/values"

  # Remove generic launcher names and previous JPEG resources.
  rm -f "$res/drawable-nodpi/ic_launcher_foreground.jpg" \
        "$res/drawable-nodpi/ic_launcher_foreground.png" \
        "$res/mipmap-nodpi/ic_launcher.jpg" "$res/mipmap-nodpi/ic_launcher.png" \
        "$res/mipmap-nodpi/ic_launcher_round.jpg" "$res/mipmap-nodpi/ic_launcher_round.png" \
        "$res/mipmap-anydpi-v26/ic_launcher.xml" "$res/mipmap-anydpi-v26/ic_launcher_round.xml"

  # Fit the complete source inside a 58dp square on the 108dp adaptive canvas.
  # 275px/512px = 58.01dp. The original icon/ PNG is kept byte-for-byte.
  python3 tools/prepare_android_launcher_icons.py \
    "$source_icon" \
    "$res/drawable-nodpi/${resource_prefix}_launcher_foreground.png" \
    "$res/mipmap-nodpi/${resource_prefix}_launcher.png" \
    --content-dp 58
  cp "$res/mipmap-nodpi/${resource_prefix}_launcher.png" \
     "$res/mipmap-nodpi/${resource_prefix}_launcher_round.png"

  cat > "$res/mipmap-anydpi-v26/${resource_prefix}_launcher.xml" <<XML
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/smv_launcher_background" />
    <foreground android:drawable="@drawable/${resource_prefix}_launcher_foreground" />
</adaptive-icon>
XML
  cp "$res/mipmap-anydpi-v26/${resource_prefix}_launcher.xml" "$res/mipmap-anydpi-v26/${resource_prefix}_launcher_round.xml"
  cat > "$res/values/colors.xml" <<'XML'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="smv_launcher_background">#FFFFFF</color>
</resources>
XML

  for asset in \
    "$res/drawable-nodpi/${resource_prefix}_launcher_foreground.png" \
    "$res/mipmap-nodpi/${resource_prefix}_launcher.png" \
    "$res/mipmap-nodpi/${resource_prefix}_launcher_round.png"; do
    test -s "$asset"
    size="$(stat -c%s "$asset")"
    if (( size >= 300000 )); then
      echo "::error::Generated launcher asset exceeds 300 KB: $asset ($size bytes)"
      exit 1
    fi
  done
}

copy_product_icon "icon/horoscope_512.png" smvhoroscopeproduction smv_horoscope
copy_product_icon "icon/calendar_512.png" smvcalendarproduction smv_calendar

echo "PASS: HOROSCOPE and CALENDAR use their original lowercase icon/ PNGs with complete artwork centered at 58.01dp."
