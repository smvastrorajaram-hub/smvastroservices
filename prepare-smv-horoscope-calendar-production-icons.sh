#!/usr/bin/env bash
set -euo pipefail

# Read the approved live PWA artwork into the existing isolated test modules.
# The source assets and all website/PWA icon files remain read-only.
bash prepare-icons.sh

generator_dir="/tmp/smv-product-launcher-icon-generator"
mkdir -p "$generator_dir"
javac -encoding UTF-8 -d "$generator_dir" tools/SmvProductLauncherIconGenerator.java

copy_product_icon() {
  source_module="$1"
  production_module="$2"

  source_icon="$source_module/src/main/res/drawable/app_icon.png"
  production_res="$production_module/src/main/res"

  test -s "$source_icon" || {
    echo "::error::Approved app icon is missing: $source_icon"
    exit 1
  }

  java -Djava.awt.headless=true -cp "$generator_dir" \
    SmvProductLauncherIconGenerator "$source_icon" "$production_res"

  for asset in \
    "$production_res/drawable-nodpi/ic_launcher_foreground.png" \
    "$production_res/mipmap-nodpi/ic_launcher.png" \
    "$production_res/mipmap-nodpi/ic_launcher_round.png" \
    "$production_res/mipmap-anydpi-v26/ic_launcher.xml" \
    "$production_res/mipmap-anydpi-v26/ic_launcher_round.xml" \
    "$production_res/values/colors.xml"; do
    test -s "$asset" || {
      echo "::error::Generated launcher resource is missing: $asset"
      exit 1
    }
  done
}

copy_product_icon smvhoroscope smvhoroscopeproduction
copy_product_icon smvcalendar smvcalendarproduction

echo "PASS: SMV HOROSCOPE and SMV CALENDAR now use the SMV ASTRO 58dp white-background launcher treatment."
