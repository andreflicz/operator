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
finish_music() { # [playlist to play once the song is over]
  THEN="$1"
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
  if [ -z "$INFO" ]; then [ -n "$THEN" ] && { play_music "$THEN" playlist noramp >/dev/null 2>&1 </dev/null & }; return; fi
  TRACK=${INFO% *}; LEFT=${INFO##* }
  case "$LEFT" in ''|*[!0-9]*) LEFT=300 ;; esac
  # wait it out, then pause the moment that track is over (before the next one gets going)
  ( [ "$LEFT" -gt 3 ] && sleep $((LEFT-3))
    n=0
    while [ $n -lt 30 ]; do
      NOW=$(osascript -e 'tell application "Music" to if player state is playing then return persistent ID of current track' 2>/dev/null)
      if [ "$NOW" != "$TRACK" ]; then
        if [ -n "$THEN" ]; then rm -f "$FINISH_PID_FILE"; play_music "$THEN" playlist noramp
        else [ -n "$NOW" ] && osascript -e 'tell application "Music" to pause' >/dev/null 2>&1; fi
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
      try
        set pl to (first user playlist whose name contains q)
        set song repeat to all
        play pl
        return "ok"
      end try
      return "notfound"
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
link_name() { # Apple Music link → the playlist's name, from the page's title
  U=$(printf '%s' "$1" | sed 's#^music://#https://#; s#^itms://#https://#')
  case "$U" in https://music.apple.com/*|https://embed.music.apple.com/*) ;; *) return ;; esac
  PAGE=$(curl -sL --max-time 8 -A 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15' "$U" 2>/dev/null | tr '\n' ' ')
  T=$(printf '%s' "$PAGE" | sed -n 's/.*<meta property="og:title" content="\([^"]*\)".*/\1/p' | head -1)
  [ -z "$T" ] && T=$(printf '%s' "$PAGE" | sed -n 's/.*<title>\([^<]*\)<\/title>.*/\1/p' | head -1)
  printf '%s' "$T" | sed 's/&amp;/\&/g; s/&#39;/'"'"'/g; s/&#x27;/'"'"'/g; s/&quot;/"/g; s/ - Apple Music$//; s/ on Apple Music$//; s/ - [Pp]laylist.*$//; s/^  *//; s/  *$//'
}
# Operator's own Chrome window (not your everyday Chrome): the pid the launcher started, or the
# main process using Operator's profile
operator_pid() {
  if [ -n "$CHROME_PID" ] && kill -0 "$CHROME_PID" 2>/dev/null; then echo "$CHROME_PID"; return; fi
  PD="${PROFILE_DIR:-$HOME/Library/Application Support/OperatorAppProfile}"
  for p in $(pgrep -f -- "--user-data-dir=$PD" 2>/dev/null); do
    ps -o args= -p "$p" 2>/dev/null | grep -q -- "--type=" || { echo "$p"; return; }
  done
}
# real macOS full screen for the window (needs Accessibility permission for Operator once)
window_full() { # 1|0
  P=$(operator_pid); [ -z "$P" ] && { echo "no window"; return 1; }
  V=false; [ "$1" = "1" ] && V=true
  osascript -e "tell application \"System Events\" to tell (first process whose unix id is $P) to set value of attribute \"AXFullScreen\" of window 1 to $V" 2>&1 >/dev/null
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
      # the whole job goes to the background with its output closed, so the answer goes back right
      # away (otherwise the app timed out, asked again, and the song restarted every second or two)
      if [ -n "$Q" ]; then play_music "$Q" "${K:-song}" >/dev/null 2>&1 </dev/null & fi
      respond 200 '{"ok":true}' ;;
    /music/stop*) stop_music >/dev/null 2>&1 & respond 200 '{"ok":true}' ;;
    /music/finish*) finish_music "$(hexdec "$(param q)")" >/dev/null 2>&1 </dev/null; respond 200 '{"ok":true}' ;;
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
      # play a playlist or a song from the in-app player (no fade-in, no repeat-one); with a link
      # (u=) for something that isn't in your library yet, Apple Music opens it so you can add it
      K=$(param k); Q=$(hexdec "$(param q)"); U=$(hexdec "$(param u)")
      if [ -n "$Q" ] && play_music "$Q" "${K:-playlist}" noramp; then respond 200 "$(now_playing)"
      else
        case "$U" in
          https://music.apple.com/*) open "$(printf '%s' "$U" | sed 's#^https://#music://#')" >/dev/null 2>&1; respond 404 '{"ok":false,"error":"not in your library","opened":true}' ;;
          *) respond 404 '{"ok":false,"error":"not found in your library"}' ;;
        esac
      fi ;;
    /window/full*)
      F=$(param f); case "$F" in 1) ;; *) F=0 ;; esac
      ERR=$(window_full "$F")
      if [ -z "$ERR" ]; then respond 200 '{"ok":true}'
      else case "$ERR" in *ssistive*|*-1719*|*-25211*|*not\ allowed*) respond 403 '{"ok":false,"error":"accessibility"}' ;; *) respond 500 "{\"ok\":false,\"error\":\"$(je "$ERR")\"}" ;; esac; fi ;;
    /music/resolve*)
      U=$(hexdec "$(param u)"); N=$(link_name "$U")
      if [ -n "$N" ]; then respond 200 "{\"ok\":true,\"name\":\"$(je "$N")\"}"; else respond 404 '{"ok":false}'; fi ;;
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
    /ping*) respond 200 '{"ok":true,"helper":7}' ;;
    /news*)
      # a few headlines for the Good morning screen (news sites don't let a page fetch them directly)
      # ?q=<hex topics> → Google News for your topics (last 2 days); otherwise NPR's top stories
      NQ=$(hexdec "$(param q)")
      if [ -n "$NQ" ]; then
        TQ=$(printf '%s' "$NQ" | awk -F',' '{ out=""; for(i=1;i<=NF;i++){ t=$i; gsub(/^ +| +$/, "", t); if(t=="") continue; if(t ~ / /) t="\"" t "\""; out = out (out=="" ? "" : " OR ") t } print out " when:2d" }')
        X=$(curl -s -m 6 -G -A "Mozilla/5.0 (Macintosh) Operator" --data-urlencode "q=$TQ" --data-urlencode "hl=en-US" --data-urlencode "gl=US" --data-urlencode "ceid=US:en" "https://news.google.com/rss/search" 2>/dev/null)
      fi
      case "$X" in *"<item"*) ;; *) X=$(curl -s -m 6 -A "Mozilla/5.0 (Macintosh) Operator" "https://feeds.npr.org/1001/rss.xml" 2>/dev/null) ;; esac
      case "$X" in *"<item"*) ;; *) X=$(curl -s -m 6 -A "Mozilla/5.0 (Macintosh) Operator" "https://feeds.bbci.co.uk/news/rss.xml" 2>/dev/null) ;; esac
      case "$X" in *"<item"*) respond 200 "$X" 'application/rss+xml; charset=utf-8' ;; *) respond 502 '{"ok":false}' ;; esac ;;
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
    # ?since=<ms> → only the newer lines, marked "#inc" so the page knows it's a top-up
    SINCE=$(param since)
    case "$SINCE" in
      ''|*[!0-9]*) BODY=$(cat "$DATA_DIR/activity.log" 2>/dev/null) ;;
      *) BODY="#inc
$(awk -F'\t' -v s="$SINCE" '$1+0 > s+0' "$DATA_DIR/activity.log" 2>/dev/null)" ;;
    esac
    respond 200 "$BODY" 'text/plain; charset=utf-8' ;;
  *) wake_respond ;;
esac
