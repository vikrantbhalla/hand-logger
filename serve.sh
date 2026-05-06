#!/usr/bin/env bash
# Serve the hand-logger over your Mac's local network so the iPhone can install it as a PWA.
# Usage: ./serve.sh        # default port 8765
#        ./serve.sh 9000   # custom port
set -euo pipefail
PORT="${1:-8765}"
DIR="$(cd "$(dirname "$0")" && pwd)"

# Prefer Bonjour name (stable across Wi-Fi changes); fall back to LAN IP
BONJOUR_NAME="$(scutil --get LocalHostName 2>/dev/null || hostname -s)"
BONJOUR_URL="http://${BONJOUR_NAME}.local:${PORT}/"
LANIP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")"
IP_URL=""
[ -n "$LANIP" ] && IP_URL="http://${LANIP}:${PORT}/"

# Copy the Bonjour URL to clipboard so it's easy to send via AirDrop / iMessage
echo -n "$BONJOUR_URL" | pbcopy 2>/dev/null || true

clear
cat <<EOF

  Hand Logger — local server running

  On your iPhone Safari, open:
      ${BONJOUR_NAME}.local:${PORT}
$( [ -n "$IP_URL" ] && echo "
  Or, if Bonjour doesn't resolve:
      ${LANIP}:${PORT}" )

  (URL copied to your Mac clipboard — AirDrop or iMessage to your phone if typing is annoying.)

  Once open: tap Share → Add to Home Screen → name it "Hands."

EOF

# Optional QR code if qrencode is installed (brew install qrencode)
if command -v qrencode >/dev/null 2>&1; then
  echo "  Or scan this QR with your iPhone camera:"
  echo
  qrencode -t UTF8 -m 2 "$BONJOUR_URL" | sed 's/^/  /'
  echo
fi

echo "  Ctrl-C to stop."
echo
cd "$DIR"
exec python3 -m http.server "$PORT" --bind 0.0.0.0
