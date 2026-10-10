#!/bin/bash
# Operator's local helper: answers the page's requests on 127.0.0.1 (never anything else).
# The launcher runs a small always-listening server (bridge.pl) that hands each request here:
#   helper.sh wake  "<request line>"     → port 8935: wake the Mac, music, open links
#   helper.sh ghl   "<request line>"     → port 8936: the GoHighLevel bridge
# With no request line given it reads one from stdin (the older nc-based fallback).
# Prints one complete HTTP response. Anything left running in the background must not hold
# on to stdout, or the page would wait for it — hence the >/dev/null on every '&'.
KIND="$1"
REQ_LINE="$2"
[ -z "$REQ_LINE" ] && IFS= read -r REQ_LINE
REQ_PATH=$(printf '%s' "$REQ_LINE" | awk '{print $2}')
DATA_DIR="${DATA_DIR:-$HOME/Library/Application Support/Operator}"
RAMP_PID_FILE="$DATA_DIR/music-ramp.pid"
FALLBACK_PID_FILE="$DATA_DIR/music-fallback.pid"
FINISH_PID_FILE="$DATA_DIR/music-finish.pid"
GHL_KEY_FILE="$DATA_DIR/ghl.key"

hexdec() { printf '%b' "$(printf '%s' "$1" | sed 's/../\\x&/g')"; }
param() { printf '%s' "$REQ_PATH" | sed -n "s/.*[?&]$1=\([0-9a-zA-Z._-]*\).*/\1/p"; }
# JSON string escape (quotes, backslashes; control characters dropped)
je() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' | tr -d '\000-\010\013\014\016-\037' | tr '\t\n\r' '   '; }
respond() { # code, body, [content type]
  LEN=$(printf '%s' "$2" | wc -c | tr -d ' ')
  printf 'HTTP/1.1 %s OK\r\nAccess-Control-Allow-Origin: *\r\nContent-Type: %s\r\nContent-Length: %s\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n%s' "$1" "${3:-application/json; charset=utf-8}" "$LEN" "$2"
}

# ---------------- wake / music ----------------
wake_front() {
  caffeinate -u -t 5 >/dev/null 2>&1 &
  # an alarm nobody can hear is no alarm: unmute, and bring a very low volume up
  osascript -e 'set v to output volume of (get volume settings)' -e 'if v < 35 then set volume output volume 50' -e 'set volume without output muted' >/dev/null 2>&1
  [ -n "$CHROME_PID" ] && osascript -e "tell application \"System Events\" to set frontmost of (first process whose unix id is $CHROME_PID) to true" >/dev/null 2>&1
}
kill_music_jobs() {
  for f in "$RAMP_PID_FILE" "$FALLBACK_PID_FILE" "$FINISH_PID_FILE"; do
    if [ -f "$f" ]; then kill "$(cat "$f")" 2>/dev/null; rm -f "$f"; fi
  done
}
stop_music() {
  kill_music_jobs
  osascript >/dev/null 2>&1 <<'APPLESCRIPT'
if application "Music" is running then
  tell application "Music"
    if player state is playing then pause
    set song repeat to off
  end tell
end if
APPLESCRIPT
}
finish_music() {
  kill_music_jobs
  # no more repeating; note the track that's on and how long it has left
  INFO=$(osascript 2>/dev/null <<'APPLESCRIPT'
if application "Music" is running then
  tell application "Music"
    set song repeat to off
    if player state is playing then return ((persistent ID of current track) & " " & (round ((duration of current track) - player position) rounding up))
  end tell
end if
return ""
APPLESCRIPT
)
  [ -z "$INFO" ] && return
  TRACK=${INFO% *}; LEFT=${INFO##* }
  case "$LEFT" in ''|*[!0-9]*) LEFT=300 ;; esac
  # wait it out, then pause the moment that track is over (before the next one gets going)
  ( [ "$LEFT" -gt 3 ] && sleep $((LEFT-3))
    n=0
    while [ $n -lt 30 ]; do
      NOW=$(osascript -e 'tell application "Music" to if player state is playing then return persistent ID of current track' 2>/dev/null)
      if [ "$NOW" != "$TRACK" ]; then
        [ -n "$NOW" ] && osascript -e 'tell application "Music" to pause' >/dev/null 2>&1
        break
      fi
      sleep 1; n=$((n+1))
    done
    rm -f "$FINISH_PID_FILE" ) >/dev/null 2>&1 &
  echo $! > "$FINISH_PID_FILE"
}
play_music() { # name, song|playlist, [noramp]
  kill_music_jobs
  RESULT=$(osascript - "$1" "$2" 2>/dev/null <<'APPLESCRIPT'
on run argv
  set q to item 1 of argv
  set k to item 2 of argv
  tell application "Music"
    if k is "playlist" then
      try
        set song repeat to all
        play playlist q
        return "ok"
      end try
    end if
    try
      set hits to (search library playlist 1 for q only songs)
      if (count of hits) > 0 then
        if k is "song" then set song repeat to one
        play (item 1 of hits)
        return "ok"
      end if
    end try
    try
      set song repeat to all
      play playlist q
      return "ok"
    end try
  end tell
  return "notfound"
end run
APPLESCRIPT
)
  if [ "$3" = "noramp" ]; then [ "$RESULT" = "ok" ]; return; fi
  if [ "$RESULT" = "ok" ]; then
    osascript -e 'tell application "Music" to set sound volume to 35' >/dev/null 2>&1
    # fade the music up over about a minute
    ( for v in 45 55 65 75 85 100; do
        sleep 8
        osascript -e "tell application \"Music\" to set sound volume to $v" >/dev/null 2>&1
      done ) >/dev/null 2>&1 &
    echo $! > "$RAMP_PID_FILE"
  else
    ( n=0; while [ $n -lt 300 ]; do afplay /System/Library/Sounds/Glass.aiff >/dev/null 2>&1; n=$((n+1)); done ) >/dev/null 2>&1 &
    echo $! > "$FALLBACK_PID_FILE"
  fi
}
# what's playing in the Music app, as JSON (never launches Music just to ask)
now_playing() {
  OUT=$(osascript 2>/dev/null <<'APPLESCRIPT'
if application "Music" is not running then return "off"
tell application "Music"
  set st to player state as string
  if st is "stopped" then return "stopped"
  try
    set t to current track
    set tb to tab
    return st & tb & (name of t) & tb & (artist of t) & tb & (album of t) & tb & ((player position) as integer) & tb & ((duration of t) as integer) & tb & sound volume & tb & (shuffle enabled as string)
  on error
    return st
  end try
end tell
APPLESCRIPT
)
  case "$OUT" in
    off) printf '{"ok":true,"state":"off"}' ;;
    ""|stopped) printf '{"ok":true,"state":"stopped"}' ;;
    *)
      ST=$(printf '%s' "$OUT" | cut -f1); NM=$(printf '%s' "$OUT" | cut -f2); AR=$(printf '%s' "$OUT" | cut -f3); AL=$(printf '%s' "$OUT" | cut -f4)
      PO=$(printf '%s' "$OUT" | cut -f5); DU=$(printf '%s' "$OUT" | cut -f6); VO=$(printf '%s' "$OUT" | cut -f7); SH=$(printf '%s' "$OUT" | cut -f8)
      case "$PO" in ''|*[!0-9]*) PO=0 ;; esac; case "$DU" in ''|*[!0-9]*) DU=0 ;; esac; case "$VO" in ''|*[!0-9]*) VO=0 ;; esac
      [ "$SH" = "true" ] || SH=false
      printf '{"ok":true,"state":"%s","name":"%s","artist":"%s","album":"%s","pos":%s,"dur":%s,"vol":%s,"shuffle":%s}' "$(je "$ST")" "$(je "$NM")" "$(je "$AR")" "$(je "$AL")" "$PO" "$DU" "$VO" "$SH" ;;
  esac
}
playlists_json() {
  OUT=$(osascript 2>/dev/null <<'APPLESCRIPT'
tell application "Music"
  set AppleScript's text item delimiters to linefeed
  set n to (name of every user playlist whose special kind is none) as text
  set AppleScript's text item delimiters to ""
  return n
end tell
APPLESCRIPT
)
  printf '{"ok":true,"lists":['
  FIRST=1
  printf '%s\n' "$OUT" | while IFS= read -r L; do
    [ -z "$L" ] && continue
    if [ $FIRST = 1 ]; then FIRST=0; else printf ','; fi
    printf '"%s"' "$(je "$L")"
  done
  printf ']}'
}
wake_respond() {
  case "$REQ_PATH" in
    /music/play*)
      K=$(param k); Q=$(hexdec "$(param q)")
      [ -n "$Q" ] && play_music "$Q" "${K:-song}" >/dev/null 2>&1 &
      respond 200 '{"ok":true}' ;;
    /music/stop*) stop_music >/dev/null 2>&1 & respond 200 '{"ok":true}' ;;
    /music/finish*) finish_music >/dev/null 2>&1; respond 200 '{"ok":true}' ;;
    /music/now*) respond 200 "$(now_playing)" ;;
    /music/cmd*)
      kill_music_jobs
      case "$(param c)" in
        playpause) osascript -e 'tell application "Music" to playpause' >/dev/null 2>&1 ;;
        play) osascript -e 'tell application "Music" to play' >/dev/null 2>&1 ;;
        pause) osascript -e 'tell application "Music" to pause' >/dev/null 2>&1 ;;
        next) osascript -e 'tell application "Music" to next track' >/dev/null 2>&1 ;;
        prev) osascript -e 'tell application "Music" to previous track' >/dev/null 2>&1 ;;
        shuffle) osascript -e 'tell application "Music" to set shuffle enabled to not shuffle enabled' >/dev/null 2>&1 ;;
      esac
      respond 200 "$(now_playing)" ;;
    /music/vol*)
      V=$(param v); case "$V" in ''|*[!0-9]*) V=50 ;; esac; [ "$V" -gt 100 ] && V=100
      osascript -e "tell application \"Music\" to set sound volume to $V" >/dev/null 2>&1
      respond 200 '{"ok":true}' ;;
    /music/playlists*) respond 200 "$(playlists_json)" ;;
    /music/pick*)
      # play a playlist or a song from the in-app player (no fade-in, no repeat-one)
      K=$(param k); Q=$(hexdec "$(param q)")
      if [ -n "$Q" ] && play_music "$Q" "${K:-playlist}" noramp; then respond 200 "$(now_playing)"; else respond 404 '{"ok":false,"error":"not found in your library"}'; fi ;;
    /opfocus*)
      F=$(param f); case "$F" in 1) ;; *) F=0 ;; esac
      printf '%s %s' "$F" "$(date +%s)" > "$DATA_DIR/opfocus" 2>/dev/null
      respond 200 '{"ok":true}' ;;
    /open*)
      # open a web link in another browser (music in Firefox: its ad blocker skips the ads)
      B=$(param b); U=$(hexdec "$(param u)")
      case "$U" in
        http://*|https://*)
          case "$B" in
            firefox) open -a Firefox "$U" 2>/dev/null || open "$U" ;;
            safari) open -a Safari "$U" 2>/dev/null || open "$U" ;;
            *) open "$U" ;;
          esac ;;
      esac
      respond 200 '{"ok":true}' ;;
    /ping*) respond 200 '{"ok":true,"helper":3}' ;;
    # only an alarm ever brings Operator to the front — nothing else (an empty or unknown
    # request used to, which pulled the window back over other apps every few seconds)
    /wake|/wake\?*) wake_front >/dev/null 2>&1 & respond 200 '{"ok":true}' ;;
    *) respond 404 '{"ok":false}' ;;
  esac
}

# ---------------- GoHighLevel ----------------
#   /ghl/save?t=<hex key>   store the key        /ghl/forget   delete it
#   /ghl/status             is a key saved?
#   /ghl/api?m=GET|PUT|POST|DELETE&p=<hex path>[&b=<hex json body>]   call the GHL API (v2)
ghl_respond() {
  CODE=400; BODY='{"error":"bad request"}'
  case "$REQ_PATH" in
    /ghl/save*)
      T=$(hexdec "$(param t)")
      if [ -n "$T" ]; then ( umask 077; printf '%s' "$T" > "$GHL_KEY_FILE" ); chmod 600 "$GHL_KEY_FILE" 2>/dev/null; CODE=200; BODY='{"ok":true}'; fi ;;
    /ghl/forget*)
      rm -f "$GHL_KEY_FILE"; CODE=200; BODY='{"ok":true}' ;;
    /ghl/status*)
      CODE=200; if [ -s "$GHL_KEY_FILE" ]; then BODY='{"ok":true,"hasKey":true,"helper":3}'; else BODY='{"ok":true,"hasKey":false,"helper":3}'; fi ;;
    /ghl/api*)
      M=$(param m); P=$(hexdec "$(param p)"); B=$(hexdec "$(param b)")
      case "$M" in GET|PUT|POST|DELETE) ;; *) M=GET ;; esac
      case "$P" in
        /contacts*|/opportunities*|/calendars*|/conversations*|/locations*|/users*|/social-media-posting*)
          if [ ! -s "$GHL_KEY_FILE" ]; then CODE=401; BODY='{"error":"no key saved"}'
          else
            GHL_AUTH="Authorization: Bearer $(cat "$GHL_KEY_FILE")"
            if [ -n "$B" ]; then
              OUT=$(curl -sS --max-time 25 -X "$M" -H "$GHL_AUTH" -H "Version: 2021-07-28" -H "Accept: application/json" \
                -H "Content-Type: application/json" --data "$B" -w '\n%{http_code}' "https://services.leadconnectorhq.com$P" 2>&1)
            else
              OUT=$(curl -sS --max-time 25 -X "$M" -H "$GHL_AUTH" -H "Version: 2021-07-28" -H "Accept: application/json" \
                -w '\n%{http_code}' "https://services.leadconnectorhq.com$P" 2>&1)
            fi
            CODE=$(printf '%s' "$OUT" | tail -n 1); BODY=$(printf '%s' "$OUT" | sed '$d')
            case "$CODE" in [1-5][0-9][0-9]) ;; *) CODE=502; BODY='{"error":"could not reach GoHighLevel"}' ;; esac
            [ "$CODE" = "000" ] && { CODE=502; BODY='{"error":"could not reach GoHighLevel"}'; }
          fi ;;
        *) CODE=403; BODY='{"error":"path not allowed"}' ;;
      esac ;;
  esac
  respond "$CODE" "$BODY"
}

case "$KIND" in
  ghl) ghl_respond ;;
  activity)
    # recent foreground-app samples for the page (written by the launcher every 10 s)
    BODY=$(cat "$DATA_DIR/activity.log" 2>/dev/null)
    respond 200 "$BODY" 'text/plain; charset=utf-8' ;;
  *) wake_respond ;;
esac
