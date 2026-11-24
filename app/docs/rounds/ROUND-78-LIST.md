# Round 78 (Mac 4.10.0)

## Mind view
- **Opening things works.** One click on a planet flies you into it and opens that page (Focus, Business, Social, Calendar, Personal, XP). Before, the camera moved between the two clicks of a double-click, so the second click missed.
- Double-clicking a task now opens it. It used to throw an error.
- The side card hides once a page is open, so it can't block buttons.
- Tabs inside an opened page (Settings, etc.) respond to clicks.
- **No restart** to switch between Mind view and classic. It changes in place.
- Text can't be highlighted by accident anywhere. Text boxes, the journal and long text can still be selected.
- The map drops to 8 frames a second when the app is idle in the background.

## The galaxy
- **The middle is a 3D sun:** a white-hot core, a moving surface, a corona, slow streamers and loops of fire on the edge. Op's state (listening, thinking, locked in) tints the halo around it.
- **Planets are lit from the sun's side,** with a night side, cloud bands, a rim of atmosphere and a ring that passes behind and in front.
- **Zoom in much further** (scroll). Perspective gets stronger as you go in, and anything the camera flies through fades away.
- **Important things get a beacon:** a light straight up with a diamond on top and a pulse. That covers overdue tasks, the task you're on, high-priority tasks due today, drifting clients, deadlines today and a level ready to claim. Their names always show. Each planet gets a red count of what needs you there.

## Today
- The "TODAY 0m / 3h" and "TASKS 0/7" bars are gone. The streak and week stay.

## iPhone
- **Big Log workout button** on the front. Pick what you did and for how long; it logs a real workout. The Workout chip on the Log tab now does the same; before, it only set a reminder.
- **XP card** on the front: your level, XP to the next level, XP today, and the quests with what each is worth.
- **Works without the VPN:**
  - **Bug fix:** the Mac could hand the phone Tailscale's own 100.x address as its "Wi-Fi" address. It now picks the real home Wi-Fi address.
  - Settings → Your iPhone explains how to turn on Tailscale's **VPN On Demand**, so the same icon (and every tag) works at home and away with nothing to switch on.
  - It also offers a home-only address (`yourmac.local`) for a second icon that never needs Tailscale.

## Window
- **The window remembers its monitor,** position and size. A restart puts it back where it was.
- Leaving the Command Center's full screen puts it back exactly where it was, not on the main display.

## GitHub
- `main` now has everything (Rounds 57–78).
- The old work branches that were already in `main` are deleted.
- The unfinished Round 57 attempt (`claude/r57-fixes`), which later work replaced, is kept as the tag `archive/r57-fixes` and its branch deleted.
