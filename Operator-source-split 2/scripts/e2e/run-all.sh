#!/bin/bash
# Runs every end-to-end suite against dist/command-center-2.html.
# Usage: bash scripts/e2e/run-all.sh   (from the Operator-source-split 2 folder)
cd "$(dirname "$0")/../.." || exit 1
export NODE_PATH="${NODE_PATH:-$(npm root -g)}"
fail=0
for t in phase1 phase2 phase3 phase4a phase4b photo-migration lifecycle regressions alarms clients boards today activity polish tips r5 r6 r7 r8 r9; do
  out=$(node scripts/e2e/$t-test.js dist/command-center-2.html 2>&1)
  echo "$t: $(echo "$out" | grep -c '^PASS') pass, $(echo "$out" | grep -c '^FAIL') fail"
  echo "$out" | grep -E '^FAIL|Error' && fail=1
done
node scripts/e2e/flash-test.js dist/command-center-2.html
exit $fail
