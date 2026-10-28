#!/bin/bash
set -euo pipefail
usage() {
  echo "usage: profile.sh --pid <pid> --plan <plan.json> --out <dir> [--rounds 8] [--gap 1.5]" >&2
  exit 2
}
rounds=8
gap=1.5
while [ $# -gt 0 ]; do
  case "$1" in
    --pid) pid="$2"; shift 2 ;;
    --plan) plan="$2"; shift 2 ;;
    --out) out="$2"; shift 2 ;;
    --rounds) rounds="$2"; shift 2 ;;
    --gap) gap="$2"; shift 2 ;;
    *) usage ;;
  esac
done
[ -n "${pid:-}" ] && [ -n "${plan:-}" ] && [ -n "${out:-}" ] || usage
scripts="$(cd "$(dirname "$0")" && pwd)"
drive="$("$scripts/build-driver.sh")"
steps=$(python3 -I -c 'import json,sys; print(len(json.load(open(sys.argv[1]))["steps"]))' "$plan")
mkdir -p "$out"
rm -rf "$out/trace.trace"
"$drive" open "$pid"
sleep 3
limit=$(python3 -I -c "import math; print(math.ceil($rounds * $steps * ($gap + 0.6) + 8))")
xcrun xctrace record --template 'Time Profiler' --attach "$pid" --output "$out/trace.trace" \
  --time-limit "${limit}s" > "$out/xctrace.log" 2>&1 &
recorder=$!
sleep 4
"$drive" run "$pid" "$plan" "$rounds" "$gap" > "$out/steps.tsv"
wait "$recorder" || true
xcrun xctrace export --input "$out/trace.trace" \
  --xpath '/trace-toc/run[@number="1"]/data/table[@schema="time-profile"]' > "$out/samples.xml"
python3 -I "$scripts/analyze.py" report "$out"
