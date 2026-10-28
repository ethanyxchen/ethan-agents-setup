---
name: profile-mac-app
description: Measure how long a macOS app's main thread is busy after a UI interaction (switching tabs, selecting sidebar rows, pressing buttons) by driving it through Accessibility while Instruments records a Time Profiler trace, then attribute the time per step and compare runs before and after a change. Use when a Mac app feels slow or less responsive than native apps, or to prove a performance fix moved the needle.
---

# Profile Mac App

Drive a running Mac app through a repeatable sequence of interactions while `xctrace` records it, then report per step how long the main thread was busy and where the time went. Measure before changing code, and again after each fix, so every improvement has a number.

## Requirements

- macOS with Xcode command line tools (`xcrun xctrace`, `swiftc`) and `python3`.
- The terminal running the agent must have Accessibility access (System Settings › Privacy & Security › Accessibility). The driver exits with a message if it does not.
- A release build of the app. Debug builds distort the profile.

## Launch an isolated copy

Profile real data without touching the user's state. Never attach to the copy the user is using.

1. Build the app with the project's own build script.
2. Copy the app's data into a throwaway home and launch a separate instance in the background with that home. `CFFIXED_USER_HOME` redirects `~/Library` for Foundation APIs, while Keychain access still works:

   ```bash
   home=$(mktemp -d)
   mkdir -p "$home/Library/Application Support/<App>"
   cp -R ~/Library/Application\ Support/<App>/. "$home/Library/Application Support/<App>/"
   open -n -g -j --env CFFIXED_USER_HOME="$home" path/to/<App>.app --args <flags that avoid activation>
   pid=$(pgrep -f "path/to/<App>.app/Contents/MacOS/<App>" | head -1)
   ```

   Read where the app stores its data, which launch flags it supports, and the project's instructions about launching before doing this. Follow any project rule about not taking focus. If the app syncs settings or writes to remote services, confirm that unchanged local data causes no remote writes before profiling. Otherwise ask the user first.
3. `scripts/build-driver.sh` prints the compiled driver's path. `drive open <pid>` sends a reopen event to show the window and hands focus back to the previous app.
4. Quit the copy with `kill <pid>` when finished. Tell the user that a second menu bar icon or Dock icon belongs to the profiling copy.

## Write the plan

Dump the window's Accessibility tree, then list the steps to cycle through:

```bash
"$(scripts/build-driver.sh)" tree <pid> | less
```

```json
{
  "steps": [
    {"name": "Inbox", "role": "AXRow", "label": "Inbox", "action": "select"},
    {"name": "Settings", "role": "AXButton", "label": "Settings", "action": "press"}
  ]
}
```

- `role` and `label` find the first element with that role whose own title, description or value, or any descendant's, equals `label`.
- `select` sets the row as its parent outline or table's selection, the same path a click takes. `press` performs `AXPress`.
- Make consecutive steps real transitions. Before recording, the driver performs the last step once so the first step is a real change.
- The driver timestamps the window title changing. That is a secondary signal; the trace is the measurement.

## Record and report

```bash
scripts/profile.sh --pid <pid> --plan plan.json --out /tmp/profile/<label> [--rounds 8] [--gap 1.5]
```

This records a Time Profiler trace attached to the app while cycling through the plan `rounds` times. It then exports the main-thread samples and prints:

- **sync**: time from the input reaching the app to the end of the first contiguous main-thread burst (gaps of 30 ms or less). This is what the user feels. A frame lasts 16.7 ms at 60 Hz.
- **after**: later main-thread work before the next step, such as async loads landing or saves.
- **category split**: app code, layout, render, SwiftUI graph, accessibility event, other.
- **hottest app functions**: inclusive, with closures and generic specialisations removed.

Steps are anchored by matching the driver's timestamps to the accessibility events the app handled in the trace, so a missed sample cannot shift the alignment.

Add `--causes causes.json` to `analyze.py report <dir>` to measure named suspects. The file maps a label to frame-name substrings, for example `{"search preference walk": ["SearchNavigationSplitViewCandidateKey"], "saving": ["AppModel.save"]}`. Rerunning `report` on an existing directory does not record again.

Compare two runs:

```bash
python3 -I scripts/analyze.py compare /tmp/profile/before /tmp/profile/after
```

## Read the results honestly

- Check that the app's main thread is idle without input: record a few seconds with `xcrun xctrace record --template 'Time Profiler' --attach <pid> --time-limit 10s`. Background timers or animations would otherwise be blamed on the steps.
- Never poll Accessibility while measuring. Every query runs on the app's main thread and can make SwiftUI update, which inflates the numbers. The driver waits on notifications for this reason.
- Treat a step marked as an outlier as suspect until its frames are inspected. It is often unrelated work landing in that window, such as a refresh or an animation.
- Inclusive app-function time can hide framework cost. When layout or the SwiftUI graph dominates, search the trace for framework frames such as preference keys or `NSTableView` row heights, then add them as causes.
- Use the same plan, rounds and data snapshot for before and after, and report medians with ranges.
- Trace files embed the app's environment variables, which can include tokens. Keep them local and never attach them to tickets, PRs or chats.
