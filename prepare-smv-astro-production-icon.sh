#!/usr/bin/env bash
set -euo pipefail

source_icon="ICON/SMV ASTRO.jpg"
res="smvastroproduction/src/main/res"
generator_dir="/tmp/smv-android-icon-generator"

test -s "$source_icon" || {
  echo "::error::Approved SMV ASTRO artwork is missing: $source_icon"
  exit 1
}

mkdir -p "$generator_dir"
javac -encoding UTF-8 -d "$generator_dir" tools/SmvProductLauncherIconGenerator.java
java -Djava.awt.headless=true -cp "$generator_dir" SmvProductLauncherIconGenerator "$source_icon" "$res"

for asset in \
  "$res/drawable-nodpi/ic_launcher_foreground.jpg" \
  "$res/mipmap-nodpi/ic_launcher.jpg" \
  "$res/mipmap-nodpi/ic_launcher_round.jpg" \
  "$res/mipmap-anydpi-v26/ic_launcher.xml" \
  "$res/mipmap-anydpi-v26/ic_launcher_round.xml" \
  "$res/values/colors.xml"; do
  test -s "$asset" || { echo "::error::Generated SMV ASTRO launcher resource is missing: $asset"; exit 1; }
done

for asset in "$res/drawable-nodpi/ic_launcher_foreground.jpg" "$res/mipmap-nodpi/ic_launcher.jpg" "$res/mipmap-nodpi/ic_launcher_round.jpg"; do
  size="$(stat -c%s "$asset")"
  if (( size > 300000 )); then
    echo "::error::Generated Android icon exceeds 300 KB: $asset ($size bytes)"
    exit 1
  fi
done

echo "PASS: SMV ASTRO Android launcher assets are derived from ICON/SMV ASTRO.jpg and stay below 300 KB each."
