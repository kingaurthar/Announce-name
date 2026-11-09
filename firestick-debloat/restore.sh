#!/usr/bin/env bash
# Undo everything debloat.sh did (reads debloat-log.txt).
# Usage: ./restore.sh <fire-tv-ip> [--all]
#   --all  re-enable every package in both lists, even if it isn't in the log
set -u
DIR="$(cd "$(dirname "$0")" && pwd)"
IP="${1:-}"; [ -z "$IP" ] && { echo "Usage: $0 <fire-tv-ip> [--all]"; exit 1; }
TARGET="$IP"; case "$IP" in *:*) ;; *) TARGET="$IP:5555" ;; esac
adb connect "$TARGET" >/dev/null; sleep 2
sh() { adb -s "$TARGET" shell "$@" 2>&1 | tr -d '\r'; }

if [ "${2:-}" = "--all" ]; then
  PKGS="$(cat "$DIR"/packages-*.txt | sed 's/#.*//' | tr -d ' \r' | grep -v '^$')"
else
  [ -f "$DIR/debloat-log.txt" ] || { echo "No debloat-log.txt found. Use --all."; exit 1; }
  PKGS="$(awk '{print $2}' "$DIR/debloat-log.txt" | sort -u)"
fi

for pkg in $PKGS; do
  sh cmd package install-existing --user 0 "$pkg" >/dev/null
  sh pm enable --user 0 "$pkg" >/dev/null
  echo "  restored  $pkg"
done
[ "${2:-}" != "--all" ] && mv "$DIR/debloat-log.txt" "$DIR/debloat-log.restored.txt"
echo "Done. Rebooting..."; adb -s "$TARGET" reboot
