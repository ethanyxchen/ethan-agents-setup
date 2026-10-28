import AppKit
import ApplicationServices

struct Plan: Decodable {
  struct Step: Decodable {
    let name: String
    let role: String
    let label: String
    let action: String
  }
  let steps: [Step]
}

func attribute(_ element: AXUIElement, _ name: String) -> AnyObject? {
  var value: AnyObject?
  return AXUIElementCopyAttributeValue(element, name as CFString, &value) == .success ? value : nil
}

func children(_ element: AXUIElement) -> [AXUIElement] {
  (attribute(element, "AXChildren") as? [AXUIElement]) ?? []
}

func texts(_ element: AXUIElement) -> [String] {
  ["AXTitle", "AXDescription", "AXValue"].compactMap { attribute(element, $0) as? String }
}

func first(in element: AXUIElement, visited: inout Set<AXUIElement>, where matches: (AXUIElement) -> Bool) -> AXUIElement? {
  guard visited.insert(element).inserted else { return nil }
  if matches(element) { return element }
  for child in children(element) {
    if let found = first(in: child, visited: &visited, where: matches) { return found }
  }
  return nil
}

func first(in element: AXUIElement, where matches: (AXUIElement) -> Bool) -> AXUIElement? {
  var visited = Set<AXUIElement>()
  return first(in: element, visited: &visited, where: matches)
}

func labelled(_ element: AXUIElement, _ label: String) -> Bool {
  first(in: element) { texts($0).contains(label) } != nil
}

func dump(_ element: AXUIElement, depth: Int, visited: inout Set<AXUIElement>) {
  let role = attribute(element, "AXRole") as? String ?? "?"
  let line = String(repeating: "  ", count: depth) + role + " " + texts(element).map { "\"\($0.prefix(60))\"" }.joined(separator: " ")
  guard visited.insert(element).inserted else {
    print(line + "  <- already listed above (cycle in the accessibility tree)")
    return
  }
  print(line)
  for child in children(element) { dump(child, depth: depth + 1, visited: &visited) }
}

func milliseconds() -> Double { Double(clock_gettime_nsec_np(CLOCK_UPTIME_RAW)) / 1e6 }

func reopen(_ pid: pid_t, _ app: AXUIElement) {
  let front = NSWorkspace.shared.frontmostApplication
  let event = NSAppleEventDescriptor(
    eventClass: AEEventClass(kCoreEventClass), eventID: AEEventID(kAEReopenApplication),
    targetDescriptor: NSAppleEventDescriptor(processIdentifier: pid),
    returnID: AEReturnID(kAutoGenerateReturnID), transactionID: AETransactionID(kAnyTransactionID))
  for _ in 0..<10 {
    if !((attribute(app, "AXWindows") as? [AXUIElement]) ?? []).isEmpty { break }
    _ = try? event.sendEvent(options: [.noReply], timeout: 5)
    Thread.sleep(forTimeInterval: 0.3)
    if NSWorkspace.shared.frontmostApplication?.processIdentifier == pid { front?.activate() }
    Thread.sleep(forTimeInterval: 1.5)
  }
}

let arguments = CommandLine.arguments
guard arguments.count >= 3, let pid = pid_t(arguments[2]) else {
  FileHandle.standardError.write("usage: drive tree <pid> | drive open <pid> | drive run <pid> <plan.json> <rounds> <gap-seconds>\n".data(using: .utf8)!)
  exit(2)
}
guard AXIsProcessTrusted() else {
  FileHandle.standardError.write("Grant Accessibility access to this terminal in System Settings > Privacy & Security.\n".data(using: .utf8)!)
  exit(1)
}
let app = AXUIElementCreateApplication(pid)

switch arguments[1] {
case "open":
  reopen(pid, app)
  exit(((attribute(app, "AXWindows") as? [AXUIElement]) ?? []).isEmpty ? 1 : 0)
case "tree":
  for window in (attribute(app, "AXWindows") as? [AXUIElement]) ?? [] {
    print(window == attribute(app, "AXMainWindow").map({ $0 as! AXUIElement }) ? "main window:" : "other window:")
    var visited = Set<AXUIElement>()
    dump(window, depth: 1, visited: &visited)
  }
  exit(0)
case "run":
  break
default:
  exit(2)
}

let plan = try JSONDecoder().decode(Plan.self, from: Data(contentsOf: URL(fileURLWithPath: arguments[3])))
let rounds = Int(arguments[4])!
let gap = Double(arguments[5])!
guard let window = attribute(app, "AXMainWindow").map({ $0 as! AXUIElement }) ?? (attribute(app, "AXWindows") as? [AXUIElement])?.first else {
  FileHandle.standardError.write("The app has no open window. Run `drive open <pid>` first.\n".data(using: .utf8)!)
  exit(1)
}

let actions: [(String, () -> Void)] = plan.steps.map { step in
  guard let element = first(in: window, where: { attribute($0, "AXRole") as? String == step.role && labelled($0, step.label) }) else {
    FileHandle.standardError.write("No \(step.role) labelled \"\(step.label)\". Inspect the tree with `drive tree <pid>`.\n".data(using: .utf8)!)
    exit(1)
  }
  switch step.action {
  case "select":
    let container = attribute(element, "AXParent") as! AXUIElement
    return (step.name, { AXUIElementSetAttributeValue(container, "AXSelectedRows" as CFString, [element] as CFArray) })
  case "press":
    return (step.name, { AXUIElementPerformAction(element, "AXPress" as CFString) })
  default:
    FileHandle.standardError.write("Unknown action \(step.action); use select or press.\n".data(using: .utf8)!)
    exit(1)
  }
}

var titleChangedAt = 0.0
var observer: AXObserver?
AXObserverCreate(pid, { _, _, _, _ in
  titleChangedAt = milliseconds()
  CFRunLoopStop(CFRunLoopGetCurrent())
}, &observer)
AXObserverAddNotification(observer!, window, kAXTitleChangedNotification as CFString, nil)
CFRunLoopAddSource(CFRunLoopGetCurrent(), AXObserverGetRunLoopSource(observer!), .defaultMode)

actions.last!.1()
Thread.sleep(forTimeInterval: gap)
print("step\tuptime_ms\ttitle_changed_ms")
for _ in 0..<rounds {
  for (name, act) in actions {
    titleChangedAt = 0
    let start = milliseconds()
    act()
    if titleChangedAt == 0 { CFRunLoopRunInMode(.defaultMode, 1, false) }
    let changed = titleChangedAt == 0 ? "" : String(format: "%.1f", titleChangedAt - start)
    print("\(name)\t\(String(format: "%.1f", start))\t\(changed)")
    fflush(stdout)
    let resume = Date().addingTimeInterval(gap)
    while Date() < resume { CFRunLoopRunInMode(.defaultMode, resume.timeIntervalSinceNow, false) }
  }
}
