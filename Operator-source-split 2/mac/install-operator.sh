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
# (who signed the copy that's there now: if it wasn't this installer's signature, macOS's switches for it are stale)
OLD_SIG=""; [ -e "$APP" ] && OLD_SIG=$(codesign -dvv "$APP" 2>&1 | grep -c "Authority=Operator Local Signing")
if pgrep -xq Operator; then osascript -e 'tell application "Operator" to quit' >/dev/null 2>&1; sleep 2; fi
if [ -e "$APP" ]; then rm -rf "$APP" 2>/dev/null || sudo rm -rf "$APP" || die "couldn't remove the old Operator.app"; fi
ditto "$APP_IN" "$APP" 2>/dev/null || sudo ditto "$APP_IN" "$APP" || die "couldn't copy Operator.app into Applications"
[ -w "$APP" ] || sudo chown -R "$(id -un)" "$APP"

say "4/5  Signing it on this Mac (inside out)"
xattr -cr "$APP"
# The same signature every update, so macOS keeps Operator's permissions (Input Monitoring, Accessibility) from one
# version to the next. A throwaway signature counts as a new app each time and macOS silently drops the permission;
# that's why the talk key stopped working outside the app after updates. The first run makes a private signing
# certificate in your login keychain ("Operator Local Signing", only used for this). If that can't be done, it falls
# back to the old way.
CERT="Operator Local Signing"
KC="$HOME/Library/Keychains/login.keychain-db"
IDENT="-"
ident_hash(){ security find-identity -p codesigning "$KC" 2>/dev/null | awk -v n="\"$CERT\"" 'index($0, n) { print $2; exit }'; }
H=$(ident_hash)
if [ -z "$H" ]; then
  cat > "$TMP/cert.cnf" <<CNF
[ req ]
distinguished_name = dn
x509_extensions = ext
prompt = no
[ dn ]
CN = $CERT
[ ext ]
basicConstraints = critical,CA:false
keyUsage = critical,digitalSignature
extendedKeyUsage = critical,codeSigning
CNF
  if /usr/bin/openssl req -x509 -newkey rsa:2048 -nodes -days 7300 -config "$TMP/cert.cnf" -keyout "$TMP/k.pem" -out "$TMP/c.pem" >/dev/null 2>&1 \
     && /usr/bin/openssl pkcs12 -export -inkey "$TMP/k.pem" -in "$TMP/c.pem" -name "$CERT" -out "$TMP/c.p12" -passout pass:operator >/dev/null 2>&1 \
     && security import "$TMP/c.p12" -k "$KC" -P operator -T /usr/bin/codesign >/dev/null 2>&1; then
    H=$(ident_hash)
  fi
  rm -f "$TMP/k.pem" "$TMP/c.p12"
fi
if [ -n "$H" ]; then
  # (a test signature first; if macOS asks to let codesign use the key, click Always Allow)
  cp /usr/bin/true "$TMP/probe" 2>/dev/null
  if codesign --force --sign "$H" --timestamp=none "$TMP/probe" >/dev/null 2>&1; then IDENT="$H"; echo "   Signing as \"$CERT\" (the same every update)."; fi
fi
[ "$IDENT" = "-" ] && echo "   Using a one-off signature (after this update, turn Operator off and on again in Input Monitoring and Accessibility)."
sign(){ codesign --force --sign "$IDENT" --timestamp=none "$1" >/dev/null 2>>"$TMP/sign.log" || { cat "$TMP/sign.log"; die "signing failed on: ${1#$APP/}"; }; }
# loose binaries first: native modules and libraries
while IFS= read -r f; do sign "$f"; done < <(find "$APP/Contents" -type f \( -name '*.node' -o -name '*.dylib' \))
# the helper tools inside the frameworks, then the frameworks, then the helper apps, then the app itself
while IFS= read -r f; do sign "$f"; done < <(find "$APP/Contents/Frameworks" -type f -perm -u+x -path '*/Helpers/*' 2>/dev/null)
while IFS= read -r f; do sign "$f"; done < <(find "$APP/Contents/Frameworks" -maxdepth 1 -name '*.framework')
while IFS= read -r f; do sign "$f"; done < <(find "$APP/Contents/Frameworks" -maxdepth 1 -name '*.app')
sign "$APP"
codesign --verify --strict "$APP" 2>"$TMP/verify.log" || { cat "$TMP/verify.log"; die "macOS doesn't accept the signature."; }
xattr -cr "$APP"

# A switch in Privacy & Security that belongs to a copy signed another way shows on and does nothing. Clear Operator's
# own entries when the signature changed, so macOS asks once, fresh. Same signature as last time: left alone.
if [ "$IDENT" = "-" ] || [ "${OLD_SIG:-0}" = "0" ]; then
  tccutil reset Accessibility com.local.operator >/dev/null 2>&1
  tccutil reset ListenEvent com.local.operator >/dev/null 2>&1
  FRESH=1
fi

say "5/5  Opening Operator"
open "$APP" || die "macOS wouldn't open it. Try right-click → Open on Operator in Applications."
say "Done. Version $(defaults read "$APP/Contents/Info.plist" CFBundleShortVersionString 2>/dev/null)."
if [ -n "$FRESH" ]; then
  echo "macOS will ask to let Operator use Accessibility (for the talk key in other apps). Click Open System Settings,"
  echo "turn Operator on, then in Operator: Settings → Op → Check → Restart Operator. Later updates keep it."
else
  echo "Permissions kept from last time."
fi
