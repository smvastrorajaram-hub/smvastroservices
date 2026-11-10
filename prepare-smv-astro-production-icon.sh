#!/usr/bin/env bash
set -euo pipefail

# Source of truth: the existing lowercase icon/ PNG. Never modify this source.
source_icon="icon/astro_512.png"
res="smvastroproduction/src/main/res"

test -s "$source_icon" || {
  echo "::error::Approved SMV ASTRO PNG is missing: $source_icon"
  exit 1
}

mkdir -p "$res/drawable-nodpi" "$res/mipmap-nodpi" "$res/mipmap-anydpi-v26" "$res/values"

# Retire old generic resources so Android cannot select stale launcher artwork.
rm -f "$res/drawable-nodpi/ic_launcher_foreground.jpg" \
      "$res/drawable-nodpi/ic_launcher_foreground.png" \
      "$res/mipmap-nodpi/ic_launcher.jpg" "$res/mipmap-nodpi/ic_launcher.png" \
      "$res/mipmap-nodpi/ic_launcher_round.jpg" "$res/mipmap-nodpi/ic_launcher_round.png" \
      "$res/mipmap-anydpi-v26/ic_launcher.xml" "$res/mipmap-anydpi-v26/ic_launcher_round.xml"

# Android adaptive icons use a 108dp canvas. Fit the complete approved image
# into 60dp (284/512 px = 59.91dp) and center it; don't crop or alter icon/.
python3 tools/prepare_android_launcher_icons.py \
  "$source_icon" \
  "$res/drawable-nodpi/smv_astro_launcher_foreground.png" \
  "$res/mipmap-nodpi/smv_astro_launcher.png" \
  --content-dp 60
cp "$res/mipmap-nodpi/smv_astro_launcher.png" "$res/mipmap-nodpi/smv_astro_launcher_round.png"

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
  test -s "$asset"
  size="$(stat -c%s "$asset")"
  if (( size >= 300000 )); then
    echo "::error::Generated launcher asset exceeds 300 KB: $asset ($size bytes)"
    exit 1
  fi
done

echo "PASS: SMV ASTRO uses the lowercase icon/ source with complete artwork centered at 59.91dp."
