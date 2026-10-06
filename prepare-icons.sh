#!/usr/bin/env bash
set -euo pipefail

fetch_icon () {
  module="$1"
  url="$2"
  make_foreground="${3:-false}"

  drawable="$module/src/main/res/drawable"
  mkdir -p "$drawable"

  rm -f "$drawable/app_icon.xml"
  curl -fL "$url" -o "$drawable/app_icon.png"

  if [ "$make_foreground" = "true" ]; then
    # Adaptive launcher icon foreground for SMV ASTRO / SMV HOROSCOPE.
    # Uses the same approved PWA icon artwork; Android applies the round mask.
    cp "$drawable/app_icon.png" "$drawable/app_icon_foreground.png"
  else
    rm -f "$drawable/app_icon_foreground.png"
  fi
}

fetch_icon smvastro "https://smvastroservices.in/assets/icon-192.png" true
fetch_icon smvhoroscope "https://smvastroservices.in/horoscope/assets/icon-192.png" true
fetch_icon smvcalendar "https://smvastroservices.in/horoscope/assets/calendar-192.png" false

echo "Official SMV PWA icons prepared, including adaptive foregrounds for ASTRO and HOROSCOPE."
