#!/usr/bin/env bash
set -euo pipefail

# Keep the existing isolated test-module assets ready; the production launcher
# resources below come exclusively from the three user-uploaded ICON files.
bash prepare-icons.sh

generator_dir="/tmp/smv-android-icon-generator"
mkdir -p "$generator_dir"
javac -encoding UTF-8 -d "$generator_dir" tools/SmvProductLauncherIconGenerator.java

copy_product_icon() {
  source_icon="$1"
  production_module="$2"
  production_res="$production_module/src/main/res"

  test -s "$source_icon" || {
    echo "::error::Production Android launcher asset is missing: $source_icon"
    exit 1
  }

  java -Djava.awt.headless=true -cp "$generator_dir" \
    SmvProductLauncherIconGenerator "$source_icon" "$production_res"

  for asset in \
    "$production_res/drawable-nodpi/ic_launcher_foreground.jpg" \
    "$production_res/mipmap-nodpi/ic_launcher.jpg" \
    "$production_res/mipmap-nodpi/ic_launcher_round.jpg" \
    "$production_res/mipmap-anydpi-v26/ic_launcher.xml" \
    "$production_res/mipmap-anydpi-v26/ic_launcher_round.xml" \
    "$production_res/values/colors.xml"; do
    test -s "$asset" || {
      echo "::error::Generated launcher resource is missing: $asset"
      exit 1
    }
  done

  for asset in "$production_res/drawable-nodpi/ic_launcher_foreground.jpg" "$production_res/mipmap-nodpi/ic_launcher.jpg" "$production_res/mipmap-nodpi/ic_launcher_round.jpg"; do
    size="$(stat -c%s "$asset")"
    if (( size > 300000 )); then
      echo "::error::Generated Android icon exceeds 300 KB: $asset ($size bytes)"
      exit 1
    fi
  done
}

copy_product_icon "smvhoroscopeproduction/launcher/icon-master.jpg" smvhoroscopeproduction
copy_product_icon "smvcalendarproduction/launcher/icon-master.jpg" smvcalendarproduction

echo "PASS: HOROSCOPE and CALENDAR use their each app module’s own launcher asset; every generated launcher image is below 300 KB."
