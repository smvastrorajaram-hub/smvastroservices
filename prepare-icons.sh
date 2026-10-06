#!/usr/bin/env bash
set -euo pipefail

fetch_icon () {
  module="$1"
  url="$2"
  rm -f "$module/src/main/res/drawable/app_icon.xml"
  curl -fL "$url" -o "$module/src/main/res/drawable/app_icon.png"
}

fetch_icon smvastro "https://smvastroservices.in/assets/icon-192.png"
fetch_icon smvhoroscope "https://smvastroservices.in/horoscope/assets/icon-192.png"
fetch_icon smvcalendar "https://smvastroservices.in/horoscope/assets/calendar-192.png"

echo "Official SMV PWA icons prepared."
