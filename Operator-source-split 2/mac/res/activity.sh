#!/bin/bash
# Operator (Mac app): which app is in front, every 10 s (30 s when you are away), for auto lock-in and
# the activity log. Written to $DATA_DIR/activity.log; the helper serves it to the page on 127.0.0.1:8934.
DATA_DIR="${DATA_DIR:-$HOME/Library/Application Support/Operator}"
ACTIVITY_LOG="$DATA_DIR/activity.log"
touch "$ACTIVITY_LOG" 2>/dev/null
poll_frontmost() {
  N=0
  while true; do
    APP=$(osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true' 2>/dev/null)
    # Seconds since the last keyboard/mouse input, so the page only counts active use
    # (an app merely left open in the foreground doesn't count toward auto lock-in).
    IDLE=$(ioreg -c IOHIDSystem 2>/dev/null | awk '/HIDIdleTime/ {print int($NF/1000000000); exit}')
    # In a browser, also note which website is open (just the domain), so sites can be
    # sorted into work / not work like apps. macOS asks once for permission to read it.
    SITE=""
    URL=""
    # Operator itself runs in Chrome. While it's the window in front (the page says so), don't
    # ask Chrome for its URL — every such question makes Chrome stop and answer, a hitch
    # every 10 seconds right while you're clicking around Operator.
    OPF=""
    [ -f "$DATA_DIR/opfocus" ] && OPF=$(cut -d' ' -f1 "$DATA_DIR/opfocus" 2>/dev/null)
    if [ "$APP" = "Google Chrome" ] && [ "$OPF" = "1" ]; then SITE="Operator"; APP_SKIP_URL=1; else APP_SKIP_URL=""; fi
    [ "$APP" = "Operator" ] && { SITE="Operator"; APP_SKIP_URL=1; }
    case "$APP_SKIP_URL$APP" in
      1*) ;;
      "Google Chrome"|"Brave Browser"|"Microsoft Edge"|"Arc"|"Chromium")
        URL=$(osascript -e "tell application \"$APP\" to get URL of active tab of front window" 2>/dev/null) ;;
      "Safari")
        URL=$(osascript -e 'tell application "Safari" to get URL of front document' 2>/dev/null) ;;
      "firefox"|"Firefox"|"Firefox Developer Edition"|"Firefox Nightly"|"Zen"|"Zen Browser"|"LibreWolf"|"Floorp")
        # Firefox has no AppleScript for its URL, so read the address bar through Accessibility
        # (the same permission full screen uses). If that's not possible, the window title often
        # names the site ("… - YouTube"), and that's mapped to the domain below.
        URL=$(osascript <<'OSA' 2>/dev/null
tell application "System Events"
  set p to first application process whose frontmost is true
  set v to ""
  try
    set v to value of attribute "AXDocument" of front window of p
  end try
  if v is missing value then set v to ""
  if v is "" then
    try
      set tb to first toolbar of (first group of front window of p) whose description is "Navigation"
      set v to value of first UI element of first combo box of tb
    end try
  end if
  if v is missing value then set v to ""
  if v is "" then
    try
      set tb to first toolbar of front window of p whose description is "Navigation"
      set v to value of first UI element of first combo box of tb
    end try
  end if
  if v is missing value then set v to ""
  return v
end tell
OSA
)
        case "$URL" in
          http://*|https://*|file://*) ;;
          *.*/*|*.*) case "$URL" in *" "*) URL="" ;; *) URL="https://$URL" ;; esac ;;
          *) URL="" ;;
        esac
        if [ -z "$URL" ]; then
          TITLE=$(osascript -e 'tell application "System Events" to get name of front window of (first application process whose frontmost is true)' 2>/dev/null)
          case "$TITLE" in
            *YouTube\ Studio*) SITE="studio.youtube.com" ;;
            *YouTube*) SITE="youtube.com" ;;
            *Netflix*) SITE="netflix.com" ;;
            *Twitch*) SITE="twitch.tv" ;;
            *Reddit*|*reddit*) SITE="reddit.com" ;;
            *Instagram*) SITE="instagram.com" ;;
            *TikTok*) SITE="tiktok.com" ;;
            *" / X"*|*"on X:"*) SITE="x.com" ;;
            *"Prime Video"*) SITE="primevideo.com" ;;
            *Disney+*) SITE="disneyplus.com" ;;
            *"Google Docs"*) SITE="docs.google.com" ;;
            *"Google Sheets"*) SITE="sheets.google.com" ;;
            *"Google Slides"*) SITE="slides.google.com" ;;
            *"Google Drive"*) SITE="drive.google.com" ;;
            *Gmail*) SITE="mail.google.com" ;;
            *Figma*) SITE="figma.com" ;;
            *Notion*) SITE="notion.so" ;;
            *Canva*) SITE="canva.com" ;;
            *ChatGPT*) SITE="chatgpt.com" ;;
            *Claude*) SITE="claude.ai" ;;
            *Frame.io*) SITE="frame.io" ;;
            *HighLevel*) SITE="app.gohighlevel.com" ;;
            *"Meta Business"*|*"Ads Manager"*) SITE="business.facebook.com" ;;
            *Facebook*) SITE="facebook.com" ;;
          esac
        fi ;;
      *) URL="" ;;
    esac
    if [ -n "$URL" ]; then
      case "$URL" in
        file://*Operator*|file://*command-center*) SITE="Operator" ;;
        http://*|https://*) SITE=$(printf '%s' "$URL" | sed -E 's#^[a-z]+://##; s#/.*$##; s#:.*$##; s#^www\.##') ;;
      esac
    fi
    if [ -n "$APP" ]; then
      printf '%s\t%s\t%s\t%s\n' "$(date +%s000)" "$APP" "${IDLE:-0}" "$SITE" >> "$ACTIVITY_LOG" 2>/dev/null
    fi
    # Keep the log from growing forever — the app only ever needs recent history.
    N=$((N+1))
    if [ $((N % 30)) -eq 0 ] && [ -f "$ACTIVITY_LOG" ]; then
      tail -n 6000 "$ACTIVITY_LOG" > "$ACTIVITY_LOG.tmp" 2>/dev/null && mv "$ACTIVITY_LOG.tmp" "$ACTIVITY_LOG" 2>/dev/null
    fi
    if [ "${IDLE:-0}" -gt 300 ] 2>/dev/null; then sleep 30; else sleep 10; fi
  done
}


poll_frontmost
