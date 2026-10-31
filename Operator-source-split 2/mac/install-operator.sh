#!/bin/bash
# Installs Operator from the zip (or an unzipped Operator.app) and makes macOS accept it.
# Run it in Terminal:   bash ~/Downloads/install-operator.sh
# (or give it the zip:  bash ~/Downloads/install-operator.sh ~/Downloads/Operator-3.2.0-AppleSilicon.zip)
# Your data isn't touched: it lives in ~/Library/Application Support, not in the app.

say(){ printf '\n\033[1m%s\033[0m\n' "$*"; }
die(){ printf '\n\033[31mStopped: %s\033[0m\n' "$*"; exit 1; }

SRC="$1"
if [ -z "$SRC" ]; then
  # the newest Operator zip in Downloads (or an Operator.app left there after unzipping)
  SRC=$(ls -t ~/Downloads/Operator-*.zip 2>/dev/null | head -1)
  [ -z "$SRC" ] && [ -d ~/Downloads/Operator.app ] && SRC=~/Downloads/Operator.app
fi
[ -n "$SRC" ] && [ -e "$SRC" ] || die "couldn't find the Operator zip in Downloads. Run it again with the zip's path after it (drag the zip onto the Terminal window)."

ARCH=$(uname -m)
case "$SRC" in
  *AppleSilicon*) [ "$ARCH" = "arm64" ] || die "this is the Apple Silicon zip, but this Mac is Intel. Use the Intel zip." ;;
  *Intel*) [ "$ARCH" = "x86_64" ] || say "Note: this is the Intel zip on an Apple Silicon Mac. It works through Rosetta, but the AppleSilicon zip is the right one." ;;
esac

say "1/5  Closing Operator"
osascript -e 'quit app "Operator"' >/dev/null 2>&1
sleep 2
pkill -x Operator >/dev/null 2>&1
sleep 1

TMP=$(mktemp -d /tmp/operator-install.XXXXXX) || die "couldn't make a temporary folder"
trap 'rm -rf "$TMP"' EXIT
APP_IN="$SRC"
if [ "${SRC##*.}" = "zip" ]; then
  say "2/5  Unzipping $(basename "$SRC")"
  ditto -x -k "$SRC" "$TMP" || die "the zip didn't unpack. Download it again (it may be incomplete)."
  APP_IN="$TMP/Operator.app"
else
  say "2/5  Using $SRC"
fi
[ -d "$APP_IN/Contents/MacOS" ] || die "there's no Operator.app inside $(basename "$SRC")."

say "3/5  Putting it in Applications"
APP="${OPERATOR_APPS:-/Applications}/Operator.app"
if [ -e "$APP" ]; then rm -rf "$APP" 2>/dev/null || sudo rm -rf "$APP" || die "couldn't remove the old Operator.app"; fi
ditto "$APP_IN" "$APP" 2>/dev/null || sudo ditto "$APP_IN" "$APP" || die "couldn't copy Operator.app into Applications"
[ -w "$APP" ] || sudo chown -R "$(id -un)" "$APP"

say "4/5  Signing it on this Mac (inside out)"
xattr -cr "$APP"
sign(){ codesign --force --sign - --timestamp=none "$1" >/dev/null 2>>"$TMP/sign.log" || { cat "$TMP/sign.log"; die "signing failed on: ${1#$APP/}"; }; }
# loose binaries first: native modules and libraries
while IFS= read -r f; do sign "$f"; done < <(find "$APP/Contents" -type f \( -name '*.node' -o -name '*.dylib' \))
# the helper tools inside the frameworks, then the frameworks, then the helper apps, then the app itself
while IFS= read -r f; do sign "$f"; done < <(find "$APP/Contents/Frameworks" -type f -perm -u+x -path '*/Helpers/*' 2>/dev/null)
while IFS= read -r f; do sign "$f"; done < <(find "$APP/Contents/Frameworks" -maxdepth 1 -name '*.framework')
while IFS= read -r f; do sign "$f"; done < <(find "$APP/Contents/Frameworks" -maxdepth 1 -name '*.app')
sign "$APP"
codesign --verify --strict "$APP" 2>"$TMP/verify.log" || { cat "$TMP/verify.log"; die "macOS doesn't accept the signature."; }
xattr -cr "$APP"

say "5/5  Opening Operator"
open "$APP" || die "macOS wouldn't open it. Try right-click → Open on Operator in Applications."
say "Done. Version $(defaults read "$APP/Contents/Info.plist" CFBundleShortVersionString 2>/dev/null)."
echo "If the talk key doesn't work while Operator is hidden: System Settings → Privacy & Security →"
echo "Input Monitoring and Accessibility: remove Operator with − and add it again with +, then reopen Operator."
