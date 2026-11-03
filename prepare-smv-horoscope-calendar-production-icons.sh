#!/usr/bin/env bash
set -euo pipefail

# Reuse the already approved Horoscope and Calendar PWA artwork without changing
# the website/PWA files. The existing helper downloads icons into the TEST modules;
# copy those generated files into the new production modules only.
bash prepare-icons.sh

copy_product_icon() {
  source_module="$1"
  production_module="$2"
  mkdir -p "$production_module/src/main/res/drawable-nodpi" \
           "$production_module/src/main/res/mipmap-nodpi"

  source_drawable="$source_module/src/main/res/drawable"
  production_drawable="$production_module/src/main/res/drawable-nodpi"
  production_mipmap="$production_module/src/main/res/mipmap-nodpi"

  test -s "$source_drawable/app_icon.png"
  cp "$source_drawable/app_icon.png" "$production_mipmap/ic_launcher.png"
  cp "$source_drawable/app_icon.png" "$production_mipmap/ic_launcher_round.png"

  if [[ -s "$source_drawable/app_icon_foreground.png" ]]; then
    cp "$source_drawable/app_icon_foreground.png" "$production_drawable/app_icon_foreground.png"
  else
    cp "$source_drawable/app_icon.png" "$production_drawable/app_icon_foreground.png"
  fi
}

copy_product_icon smvhoroscope smvhoroscopeproduction
copy_product_icon smvcalendar smvcalendarproduction

for module in smvhoroscopeproduction smvcalendarproduction; do
  test -s "$module/src/main/res/drawable-nodpi/app_icon_foreground.png"
  test -s "$module/src/main/res/mipmap-nodpi/ic_launcher.png"
  test -s "$module/src/main/res/mipmap-nodpi/ic_launcher_round.png"
done

echo "PASS: Production Horoscope and Calendar launcher resources were copied from the approved PWA artwork."
