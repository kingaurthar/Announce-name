#!/usr/bin/env bash
# Fire TV Stick debloater (macOS / Linux).
# Disables apps per user via ADB. Nothing is deleted from the system
# partition, and restore.sh undoes everything listed in the log.
#
# Usage: ./debloat.sh <fire-tv-ip> [--optional] [--dry-run] [--uninstall-fallback]
set -u

DIR="$(cd "$(dirname "$0")" && pwd)"
IP="${1:-}"
OPTIONAL=0; DRY=0; FALLBACK=0
shift || true
for a in "$@"; do
  case "$a" in
    --optional) OPTIONAL=1 ;;
    --dry-run) DRY=1 ;;
    --uninstall-fallback) FALLBACK=1 ;;
    *) echo "Unknown option: $a"; exit 1 ;;
  esac
done

if [ -z "$IP" ]; then
  echo "Usage: $0 <fire-tv-ip> [--optional] [--dry-run] [--uninstall-fallback]"
  echo "Find the IP under Settings > My Fire TV > About > Network."
  exit 1
fi

command -v adb >/dev/null || { echo "adb not found. Install Android platform-tools first."; exit 1; }

# Never touch these: removing them can leave you with no home screen or settings.
PROTECTED="com.amazon.tv.launcher com.amazon.tv.settings com.amazon.tv.settings.v2 \
com.amazon.firehomestarter com.amazon.venezia com.amazon.vizzini com.amazon.tv.ime \
com.amazon.device.sync com.amazon.tv.oobe com.amazon.ftv.profilepicker"

TARGET="$IP"; case "$IP" in *:*) ;; *) TARGET="$IP:5555" ;; esac
echo "Connecting to $TARGET (accept the prompt on your TV if it appears)..."
adb connect "$TARGET" >/dev/null
for i in 1 2 3 4 5 6 7 8 9 10; do
  [ "$(adb -s "$TARGET" get-state 2>/dev/null)" = "device" ] && break
  sleep 2
done
[ "$(adb -s "$TARGET" get-state 2>/dev/null)" = "device" ] || {
  echo "Could not connect. Check that ADB debugging is ON and you allowed this computer on the TV."; exit 1; }

sh() { adb -s "$TARGET" shell "$@" 2>&1 | tr -d '\r'; }

echo "Device: $(sh getprop ro.product.model) / Fire OS $(sh getprop ro.build.version.name)"

LISTS="$DIR/packages-safe.txt"
[ $OPTIONAL -eq 1 ] && LISTS="$LISTS $DIR/packages-optional.txt"
LOG="$DIR/debloat-log.txt"
INSTALLED="$(sh pm list packages | sed 's/^package://')"

done_n=0; skip_n=0; fail_n=0
for pkg in $(cat $LISTS | sed 's/#.*//' | tr -d ' \r' | grep -v '^$'); do
  case " $PROTECTED " in *" $pkg "*) echo "  PROTECTED  $pkg (skipped)"; continue ;; esac
  if ! printf '%s\n' "$INSTALLED" | grep -qx "$pkg"; then
    echo "  not found  $pkg"; skip_n=$((skip_n+1)); continue
  fi
  if [ $DRY -eq 1 ]; then echo "  would disable  $pkg"; continue; fi
  out="$(sh pm disable-user --user 0 "$pkg")"
  if printf '%s' "$out" | grep -q "disabled-user"; then
    echo "  disabled   $pkg"; echo "disable $pkg" >> "$LOG"; done_n=$((done_n+1))
  elif [ $FALLBACK -eq 1 ]; then
    out2="$(sh pm uninstall -k --user 0 "$pkg")"
    if printf '%s' "$out2" | grep -q "Success"; then
      echo "  removed*   $pkg (for user 0 only; restorable)"; echo "uninstall $pkg" >> "$LOG"; done_n=$((done_n+1))
    else
      echo "  FAILED     $pkg: $out2"; fail_n=$((fail_n+1))
    fi
  else
    echo "  blocked    $pkg ($out)"; fail_n=$((fail_n+1))
  fi
done

echo
echo "Done. changed=$done_n  not-present=$skip_n  blocked=$fail_n"
[ $DRY -eq 0 ] && [ $done_n -gt 0 ] && echo "Log written to $LOG. Run ./restore.sh $IP to undo."
[ $fail_n -gt 0 ] && [ $FALLBACK -eq 0 ] && echo "Some were blocked by Fire OS. Try again with --uninstall-fallback."
echo "Restart the stick to apply: adb -s $TARGET reboot"
exit 0
