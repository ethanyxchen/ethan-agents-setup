import argparse
import bisect
import collections
import csv
import json
import re
import statistics
import sys
import xml.etree.ElementTree as ET

AX_EVENTS = ("_XSetAttributeValue", "_XPerformAction")
FRAMEWORK_NOISE = ("closure", "specialized", "partial apply", "thunk", "reabstraction", "protocol witness", "implicit closure", "outlined")


def load_samples(path):
    frames, binaries, threads, stacks, times = {}, {}, {}, {}, {}
    samples = []
    for _, row in ET.iterparse(path, events=("end",)):
        if row.tag != "row":
            continue
        time = row.find("sample-time")
        if time.get("ref"):
            ms = times[time.get("ref")]
        else:
            ms = int(time.text) / 1e6
            times[time.get("id")] = ms
        thread = row.find("thread")
        if thread.get("ref"):
            name = threads[thread.get("ref")]
        else:
            name = thread.get("fmt")
            threads[thread.get("id")] = name
        backtrace = row.find("tagged-backtrace")
        if backtrace is None:
            backtrace = row.find("backtrace")
        if backtrace is None:
            row.clear()
            continue
        if backtrace.get("ref"):
            stack = stacks[backtrace.get("ref")]
        else:
            stack = []
            for frame in backtrace.iter("frame"):
                if frame.get("ref"):
                    stack.append(frames[frame.get("ref")])
                    continue
                binary = frame.find("binary")
                library = None
                if binary is not None:
                    if binary.get("ref"):
                        library = binaries[binary.get("ref")]
                    else:
                        library = binary.get("name")
                        binaries[binary.get("id")] = library
                entry = (frame.get("name") or frame.get("addr"), library)
                frames[frame.get("id")] = entry
                stack.append(entry)
            stacks[backtrace.get("id")] = stack
        samples.append((ms, name, stack))
        row.clear()
    return samples


def symbol(name):
    return re.sub(r"\(.*", "", name)[:110]


def app_name(main):
    match = re.search(r"\(([^()]+), pid: \d+\)$", main[0][1])
    return match.group(1) if match else None


def category(stack, app):
    names = [name for name, _ in stack]
    if any(library == app and name != "main" and "$main" not in name for name, library in stack):
        return "app code"
    lowered = [name.lower() for name in names]
    if any("layout" in name for name in lowered):
        return "layout"
    if any(name.startswith(("CA::Transaction::commit", "CA::Context::commit", "CA::Layer::display")) for name in names):
        return "render"
    if any(library in ("SwiftUI", "SwiftUICore", "AttributeGraph") for _, library in stack):
        return "SwiftUI graph"
    if any(name.startswith(AX_EVENTS) for name in names):
        return "accessibility event"
    return "other"


def anchors(main, steps):
    starts = [float(step["uptime_ms"]) for step in steps]
    events = []
    for sample in main:
        if any(name.startswith(AX_EVENTS) for name, _ in sample[2]):
            if not events or sample[0] - events[-1] > 50:
                events.append(sample[0])
    if not events:
        sys.exit("No accessibility events in the trace; the recording missed the steps.")
    candidates = {event - start for event in events[:8] for start in starts[:8]}

    def matched(offset):
        return sum(
            1
            for start in starts
            if bisect.bisect_left(events, start + offset + 25) - bisect.bisect_left(events, start + offset - 2) > 0
        )

    offset = max(candidates, key=matched)
    found = matched(offset)
    if found < len(starts) * 0.8:
        sys.exit(f"Only {found} of {len(starts)} steps line up with accessibility events; rerun with a longer --gap.")
    return [start + offset for start in starts]


def report(directory, causes, top):
    main = [sample for sample in load_samples(f"{directory}/samples.xml") if sample[1].startswith("Main Thread")]
    if not main:
        sys.exit("The trace has no main-thread samples.")
    app = app_name(main)
    steps = list(csv.DictReader(open(f"{directory}/steps.tsv"), delimiter="\t"))
    starts = anchors(main, steps)
    times = [sample[0] for sample in main]
    per_step = collections.defaultdict(lambda: {"sync": [], "busy": [], "after": [], "title": [], "categories": collections.Counter(), "functions": collections.Counter(), "causes": collections.Counter()})
    for index, step in enumerate(steps):
        low = starts[index] - 2
        high = starts[index + 1] - 2 if index + 1 < len(starts) else low + 1500
        window = main[bisect.bisect_left(times, low):bisect.bisect_left(times, high)]
        burst = []
        for sample in window:
            if burst and sample[0] - burst[-1][0] > 30:
                break
            burst.append(sample)
        entry = per_step[step["step"]]
        entry["sync"].append(burst[-1][0] - low + 1 if burst else 0)
        entry["busy"].append(len(burst))
        entry["after"].append(len(window) - len(burst))
        if step["title_changed_ms"]:
            entry["title"].append(float(step["title_changed_ms"]))
        for sample in window:
            entry["categories"][category(sample[2], app)] += 1
            seen = set()
            for name, library in sample[2]:
                short = symbol(name)
                if library == app and short not in seen and not short.startswith(FRAMEWORK_NOISE) and short != "main" and "$main" not in short:
                    entry["functions"][short] += 1
                    seen.add(short)
            for label, needles in causes.items():
                if any(needle in name for name, _ in sample[2] for needle in needles):
                    entry["causes"][label] += 1

    summary = {}
    print(f"{app}: {len(steps)} steps. Times in ms. 'sync' runs from the input to the end of the first main-thread burst; 'after' is later main-thread work before the next step.\n")
    print(f"{'step':28s} {'n':>3s} {'sync med':>9s} {'min-max':>13s} {'busy med':>9s} {'after med':>10s} {'title med':>10s}")
    for name, entry in per_step.items():
        count = len(entry["sync"])
        sync = statistics.median(entry["sync"])
        summary[name] = {
            "sync": sync,
            "busy": statistics.median(entry["busy"]),
            "after": statistics.median(entry["after"]),
            "categories": {key: value / count for key, value in entry["categories"].items()},
            "causes": {key: value / count for key, value in entry["causes"].items()},
        }
        title = f"{statistics.median(entry['title']):10.1f}" if entry["title"] else f"{'-':>10s}"
        flag = "  <- outlier, inspect before trusting" if max(entry["sync"]) > 3 * sync + 50 else ""
        print(f"{name[:28]:28s} {count:3d} {sync:9.0f} {min(entry['sync']):6.0f}-{max(entry['sync']):<6.0f} {statistics.median(entry['busy']):9.0f} {statistics.median(entry['after']):10.0f} {title}{flag}")
    print("\nMain-thread time per step by category (ms, mean):")
    for name, data in summary.items():
        print(f"  {name}: " + ", ".join(f"{key}={value:.0f}" for key, value in sorted(data["categories"].items(), key=lambda item: -item[1])))
    if causes:
        print("\nCauses (ms per step, mean; a sample can match several):")
        for name, data in summary.items():
            print(f"  {name}: " + ", ".join(f"{label}={data['causes'].get(label, 0):.1f}" for label in causes))
    print(f"\nHottest {app} functions per step (inclusive ms, mean):")
    for name, entry in per_step.items():
        count = len(entry["sync"])
        print(f"  {name}:")
        for function, value in entry["functions"].most_common(top):
            print(f"    {value / count:7.1f}  {function}")
    json.dump(summary, open(f"{directory}/summary.json", "w"), indent=2)


def compare(before, after):
    old = json.load(open(f"{before}/summary.json"))
    new = json.load(open(f"{after}/summary.json"))
    print(f"{'step':28s} {'sync before':>11s} {'sync after':>10s} {'change':>8s} {'after before':>12s} {'after after':>11s}")
    for name in old:
        if name not in new:
            continue
        a, b = old[name], new[name]
        change = (b["sync"] - a["sync"]) / a["sync"] * 100 if a["sync"] else 0
        print(f"{name[:28]:28s} {a['sync']:11.0f} {b['sync']:10.0f} {change:7.0f}% {a['after']:12.0f} {b['after']:11.0f}")


parser = argparse.ArgumentParser()
commands = parser.add_subparsers(dest="command", required=True)
report_command = commands.add_parser("report")
report_command.add_argument("directory")
report_command.add_argument("--causes", help="JSON object mapping a label to frame-name substrings")
report_command.add_argument("--top", type=int, default=12)
compare_command = commands.add_parser("compare")
compare_command.add_argument("before")
compare_command.add_argument("after")
arguments = parser.parse_args()
if arguments.command == "report":
    report(arguments.directory, json.load(open(arguments.causes)) if arguments.causes else {}, arguments.top)
else:
    compare(arguments.before, arguments.after)
