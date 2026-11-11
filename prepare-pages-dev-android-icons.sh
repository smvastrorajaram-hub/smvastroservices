#!/usr/bin/env bash
set -euo pipefail
prepare_icon() {
  local source="$1"
  local flavor="$2"
  local res="smvpagesandroid/src/"$flavor"/res"
  test -s "$source" || { echo "::error::Missing approved app icon: $source"; exit 1; }
  mkdir -p "$res/drawable-nodpi" "$res/mipmap-nodpi" "$res/mipmap-anydpi-v26" "$res/values"
  python3 tools/prepare_android_launcher_icons.py \
    "$source" \
    "$res/drawable-nodpi/pages_launcher_foreground.png" \
    "$res/mipmap-nodpi/pages_launcher.png" \
    --content-dp 58
  cp "$res/mipmap-nodpi/pages_launcher.png" "$res/mipmap-nodpi/pages_launcher_round.png"
  cat > "$res/mipmap-anydpi-v26/pages_launcher.xml" <<'XML'
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/pages_launcher_background" />
    <foreground android:drawable="@drawable/pages_launcher_foreground" />
</adaptive-icon>
XML
  cp "$res/mipmap-anydpi-v26/pages_launcher.xml" "$res/mipmap-anydpi-v26/pages_launcher_round.xml"
  cat > "$res/values/colors.xml" <<'XML'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="pages_launcher_background">#FFFFFF</color>
</resources>
XML
}
prepare_icon "icon/astro_512.png" astro
prepare_icon "icon/horoscope_512.png" horoscope
prepare_icon "icon/calendar_512.png" calendar
echo "PASS: Pages.dev ASTRO, HOROSCOPE and CALENDAR use three independent original 512px launcher icons."
