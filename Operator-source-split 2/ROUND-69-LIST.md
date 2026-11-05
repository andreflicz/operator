# Round 69 (2026-11-05), Mac 4.2.0

1. Talk key / Op outside the app: an Accessibility or Input Monitoring switch that belongs to an older copy (another
   signature) shows on and does nothing. Settings → Op → Check now clears Operator's own stale entries
   (`tccutil reset … com.local.operator`) and asks again, and the panel says so with Restart. install-operator.sh
   resets them when the old copy wasn't signed "Operator Local Signing" (or this install can't be), and quits a
   running Operator first. Never tell Andre to drag the .app in by hand: that's what broke it.
2. Journal bubble: the dot was a window drag area, which on a Mac swallows the click. Now moved by hand (pointer
   capture + bubble:moveTo), tap anywhere on it opens it, and acceptFirstMouse so the first click counts.
3. A break past 2 hours is clocking out (r69LongBreakCheck, every minute and on wake): the session ends where the break
   began, the break comes off, the rest is off-the-clock time. state.profile.longBreakMins changes the 2 hours.
4. iPhone: a QR code in the card (scan with the Camera; the code rides in the address `#c=`, so it's paired, Home
   Screen icon too). Break 15/30/60 and End break, "Locked in today", "On the Mac" (front app, or Idle Nm from
   powerMonitor). Same Wi-Fi only.
5. Op's lock_out locks you out (no Hold sheet); clock out while locked in locks out first. The phone's Lock out too.
6. mac-app-test: the move-in seed is written from a blank page (the app page's own saves raced it).
