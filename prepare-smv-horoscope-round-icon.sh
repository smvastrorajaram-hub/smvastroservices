#!/usr/bin/env bash
set -euo pipefail

# Only SMV HOROSCOPE's circular roundIcon needs this smaller square-safe layer.
# Keep its ordinary 57dp adaptive icon and all ASTRO/CALENDAR assets unchanged.
source_icon="icon/horoscope_512.png"
res="smvhoroscopeproduction/src/main/res"
test -s "$source_icon" || {
  echo "::error::Approved HOROSCOPE source PNG is missing: $source_icon"
  exit 1
}

python3 tools/prepare_android_round_launcher_icon.py \
  "$source_icon" \
  "$res/drawable-nodpi/smv_horoscope_launcher_round_foreground.png" \
  "$res/mipmap-nodpi/smv_horoscope_launcher_round.png"

cat > "$res/mipmap-anydpi-v26/smv_horoscope_launcher_round.xml" <<'XML'
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/smv_launcher_background" />
    <foreground android:drawable="@drawable/smv_horoscope_launcher_round_foreground" />
</adaptive-icon>
XML

grep -Fq '@drawable/smv_horoscope_launcher_round_foreground' \
  "$res/mipmap-anydpi-v26/smv_horoscope_launcher_round.xml"

echo "PASS: only SMV HOROSCOPE roundIcon uses the 46dp square-safe foreground."
