#!/usr/bin/env bash
#
# Build the Expo dev-client and deploy (install + launch) it on the Android
# emulator — self-sufficient: starts the Windows adb server + emulator if they
# are down (e.g. after a Windows re-login), waits for boot, unlocks, then builds.
#
# Local "build in WSL, emulator on Windows, adb-bridge" setup
# (see .agents memory: zeta-local-android-build-wsl).
#
# Still NOT started here (use your other run configs): Metro ("Mobile: Metro")
# and the backend ("Infrastructure" / "Backend (Go)").
#
# Override via env if your paths/ports differ:
#   JAVA_HOME ANDROID_HOME ADB_SERVER_SOCKET WIN_ANDROID_SDK
#   APP_ID AVD METRO_PORT EMULATOR_PIN  (EMULATOR_PIN= to skip unlock)
#
set -uo pipefail

# ── Linux toolchain (the gradle build runs in WSL) ───────────────────────────
: "${JAVA_HOME:=$HOME/.sdkman/candidates/java/21.0.6-tem}"
[ -x "$JAVA_HOME/bin/java" ] || JAVA_HOME="$HOME/.sdkman/candidates/java/current"
export JAVA_HOME
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export ADB_SERVER_SOCKET="${ADB_SERVER_SOCKET:-tcp:127.0.0.1:5037}"   # bridge → Windows adb server
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"

APP_ID="${APP_ID:-com.m4xon.zeta}"
AVD="${AVD:-Pixel_8}"
METRO_PORT="${METRO_PORT:-8082}"
EMULATOR_PIN="${EMULATOR_PIN-0000}"           # secure-lock PIN after a cold boot; set EMULATOR_PIN= to skip
DEV_URL="zeta://expo-development-client/?url=http://10.0.2.2:${METRO_PORT}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# ── locate the Windows SDK (emulator + its adb server live on Windows) ───────
if [ -z "${WIN_ANDROID_SDK:-}" ]; then
  _wla="$(cmd.exe /c 'echo %LOCALAPPDATA%' 2>/dev/null | tr -d '\r')"
  [ -n "$_wla" ] && WIN_ANDROID_SDK="$(wslpath "$_wla" 2>/dev/null)/Android/Sdk"
fi
WIN_ADB="${WIN_ANDROID_SDK:-/nonexistent}/platform-tools/adb.exe"
WIN_EMU="${WIN_ANDROID_SDK:-/nonexistent}/emulator/emulator.exe"

emu_count() { adb devices 2>/dev/null | grep -c "emulator-"; }

# ── 1. ensure adb server + a running emulator ────────────────────────────────
echo "==> [1/4] ensuring emulator…"
[ -x "$WIN_ADB" ] && "$WIN_ADB" start-server >/dev/null 2>&1 || true
adb start-server >/dev/null 2>&1 || true

JUST_LAUNCHED=0
if [ "$(emu_count)" = "0" ]; then
  if [ -x "$WIN_EMU" ]; then
    echo "   no emulator running — launching $AVD on Windows…"
    "$WIN_EMU" -avd "$AVD" -netdelay none -netspeed full >/dev/null 2>&1 &
    JUST_LAUNCHED=1
  else
    echo "!! No emulator, and the Windows emulator wasn't found." >&2
    echo "   Start $AVD via Android Studio ▸ Device Manager, or set WIN_ANDROID_SDK, then re-run." >&2
    exit 1
  fi
fi

echo "   waiting for device + full boot…"
timeout 240 adb wait-for-device || { echo "!! emulator did not register on adb" >&2; exit 1; }
tries=0
while [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" != "1" ]; do
  sleep 2; tries=$((tries + 1))
  [ "$tries" -gt 120 ] && { echo "!! boot timeout" >&2; exit 1; }
done

# unlock only when we cold-booted it ourselves (avoid typing the PIN into a
# screen the user already unlocked)
if [ "$JUST_LAUNCHED" = "1" ] && [ -n "$EMULATOR_PIN" ]; then
  echo "   unlocking (PIN)…"
  adb shell input keyevent KEYCODE_WAKEUP >/dev/null 2>&1 || true; sleep 1
  adb shell input swipe 540 1900 540 600 >/dev/null 2>&1 || true; sleep 1
  adb shell input text "$EMULATOR_PIN" >/dev/null 2>&1 || true
  adb shell input keyevent 66 >/dev/null 2>&1 || true; sleep 1
fi
echo "   ready: $(adb devices | grep -m1 emulator || echo '?')"

# ── 2. build + install ───────────────────────────────────────────────────────
echo "==> [2/4] gradle :app:installDebug (build + install)…"
cd "$ROOT/mobile/android"
if ! ./gradlew :app:installDebug; then
  echo "   first attempt failed (often a transient emulator-console flicker) — retrying once…" >&2
  ./gradlew :app:installDebug || { echo "!! build/install failed" >&2; exit 1; }
fi

# ── 3. Metro check ───────────────────────────────────────────────────────────
echo "==> [3/4] checking Metro on :$METRO_PORT…"
if curl -s -m3 "http://127.0.0.1:${METRO_PORT}/status" >/dev/null 2>&1; then
  echo "   Metro is up."
else
  echo "!! Metro is NOT running on :$METRO_PORT — start the \"Mobile: Metro\" run config first." >&2
  echo "   (Without it the app opens the dev-launcher 'connect to a server' screen.)" >&2
fi

# ── 4. launch ────────────────────────────────────────────────────────────────
echo "==> [4/4] launching app on the emulator…"
adb shell input keyevent KEYCODE_WAKEUP >/dev/null 2>&1 || true
adb shell am force-stop "$APP_ID" >/dev/null 2>&1 || true
adb shell am start -n "$APP_ID/.MainActivity" \
  -a android.intent.action.VIEW -d "$DEV_URL" >/dev/null 2>&1
echo "==> done — app built, installed and launched."
