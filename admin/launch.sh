#!/usr/bin/env bash
# Launch Ovilo Admin Console in user's default browser or Zen Browser
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
INDEX_FILE="$DIR/index.html"

# If a local server is not already running on port 4173, start one in background
if ! nc -z localhost 4173 >/dev/null 2>&1; then
  python3 -m http.server 4173 --directory "$DIR" >/dev/null 2>&1 &
  sleep 0.5
fi

URL="http://localhost:4173/index.html"
echo "Opening Ovilo Admin Console at $URL"

if which zen-browser > /dev/null 2>&1; then
  zen-browser "$URL" &
elif which xdg-open > /dev/null 2>&1; then
  xdg-open "$URL" &
elif which google-chrome-stable > /dev/null 2>&1; then
  google-chrome-stable "$URL" &
fi
