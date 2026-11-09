# Fire TV Stick Debloat

Scripts that turn off Amazon telemetry, ads, forced updates and unused apps
on a Fire TV Stick using ADB over Wi-Fi. No root needed.

**Everything can be undone.** Apps are disabled for the user, not deleted from
the system, and the restore script turns them back on. A factory reset also
brings everything back.

## 1. Prepare the Fire Stick

1. **Settings → My Fire TV → About**. Click the device name **7 times** until it
   says "You are now a developer".
2. **Settings → My Fire TV → Developer Options** → turn **ADB Debugging ON**.
3. **Settings → My Fire TV → About → Network**. Write down the **IP address**.

## 2. Prepare your computer

Install Android **platform-tools** (this contains `adb`):

- **Windows:** download from https://developer.android.com/tools/releases/platform-tools,
  unzip it, and put the `platform-tools` folder **inside this folder**.
- **macOS:** `brew install android-platform-tools`
- **Linux:** `sudo apt install adb` (Debian/Ubuntu)

The computer and the Fire Stick must be on the **same Wi-Fi network**.

## 3. Run it

Do a dry run first to see what would change, then run it for real.
**Watch the TV**: the first time, it asks "Allow USB debugging?". Tick
"Always allow" and press **OK**.

**Windows (PowerShell, in this folder):**
```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\debloat.ps1 -Ip 192.168.1.50 -DryRun
.\debloat.ps1 -Ip 192.168.1.50
```

**macOS / Linux:**
```bash
./debloat.sh 192.168.1.50 --dry-run
./debloat.sh 192.168.1.50
```

Then restart the stick (`adb -s 192.168.1.50:5555 reboot`, or unplug it).

### Options

| Windows | macOS / Linux | What it does |
|---|---|---|
| `-Optional` | `--optional` | Also disable Amazon apps from `packages-optional.txt` (Photos, Music, Freevee, Silk, Live TV…) |
| `-DryRun` | `--dry-run` | Show what would happen, change nothing |
| `-UninstallFallback` | `--uninstall-fallback` | If Fire OS blocks disabling an app, remove it for the current user instead (still restorable) |
| `-Restore` | `./restore.sh <ip>` | Undo everything in `debloat-log.txt` |

**Edit the lists before running.** Open `packages-optional.txt` and add `#` in
front of any app you use. Prime Video is commented out by default.

## What gets disabled

- **Safe list** (`packages-safe.txt`): usage metrics, crash reporting, sponsored
  ads/screensaver ads, recommendations, automatic system updates, GameCircle,
  tutorial/legal-notice apps.
- **Optional list** (`packages-optional.txt`): Amazon apps you may not use.

**Never touched** (hardcoded): the home-screen launcher, Settings, the Amazon
Appstore, Alexa voice (the remote's mic button), the keyboard, setup and profiles.
Disabling these can leave the stick unusable.

## Undo

```bash
./restore.sh 192.168.1.50          # undo what the log recorded
./restore.sh 192.168.1.50 --all    # re-enable everything in both lists
```
```powershell
.\debloat.ps1 -Ip 192.168.1.50 -Restore
```
Last resort: **Settings → My Fire TV → Reset to Factory Defaults**.

## Things to know

- **Automatic updates are disabled** in the safe list. This also stops security
  fixes. To update later, run restore, update, then debloat again. If you want
  to keep updates, delete the three `ota` lines from `packages-safe.txt`.
- **Newer Fire OS versions block some changes.** These show as `blocked`. Try
  `--uninstall-fallback`. If an app is still blocked, Fire OS won't let you
  change it without root.
- Package names differ between models and Fire OS versions. Apps your stick
  doesn't have show as `not found` and are skipped.
- Turn **ADB Debugging OFF** again when you're done.

## Free settings worth changing too (no ADB needed)

- **Settings → Preferences → Privacy Settings**: turn off *Device Usage Data*,
  *Collect App Usage Data* and *Interest-based Ads*.
- **Settings → Preferences → Featured Content**: turn off *Video Autoplay*
  and *Audio Autoplay*.
- **Settings → Applications → Manage Installed Applications**: uninstall
  third-party apps you don't use, and clear the cache on large apps.
- Faster menus: in Developer Options or via ADB, set the animation scale to 0.5x:
  `adb shell settings put global window_animation_scale 0.5` (also
  `transition_animation_scale` and `animator_duration_scale`).
