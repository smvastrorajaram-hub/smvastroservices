#!/usr/bin/env bash
set -euo pipefail

drawable="smvastroproduction/src/main/res/drawable"
mkdir -p "$drawable"
curl --fail --location --silent --show-error \
  "https://smvastroservices.in/assets/icon-192.png" \
  --output "$drawable/app_icon.png"

test -s "$drawable/app_icon.png"
echo "Official SMV ASTRO launcher icon prepared for the Production Android module."
