# Port Assassin v2 — Spec & Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Status:** spec approved 2026-11-12. **Do not implement until the user says go.**

**Goal:** A native macOS menu bar + window app that shows every listening port, lets you search them, and stops the process behind any of them, including root/system processes after the user enters their sudo password, with a Liquid Glass UI.

**Architecture:** One SwiftPM package. `PortKit` (library, no UI) runs the system tools `/usr/sbin/lsof`, `/bin/ps` and `/bin/kill`, either directly as the user or via `/usr/bin/sudo -S` with the password on stdin. It parses their output into `Listener` values. The `PortAssassin` executable (SwiftUI) polls `PortKit`, renders the glass UI and holds the unlocked sudo session in memory. A script wraps the binary into an ad-hoc-signed `.app`.

**Tech Stack:** Swift 6.4 (strict concurrency), SwiftUI (macOS 26+ Liquid Glass: `glassEffect`, `GlassEffectContainer`, `.buttonStyle(.glass)`), Swift Testing, ServiceManagement (`SMAppService.mainApp` for launch at login). **No Rust and no third-party dependencies.** The system tools plus sudo cover everything a backend would do. Rust is reserved for a possible later CLI (see Roadmap).

**Spec:** Part 1 of this file.

---

# Part 1 — Spec

## 1. Problem & audience

Developers hit "port already in use" constantly. Today the fix is `sudo lsof -i :8080`, then `kill <pid>`. Without sudo, `lsof` shows only your own processes (verified 2026-11-12: 9 listeners visible, all owned by the current user), and root-owned listeners are invisible. Port Assassin replaces that terminal loop with a glanceable, searchable, one-click UI.

**Success criteria**
1. Opening the menu bar popover shows current listeners in < 300 ms (user mode).
2. Typing `8080` and pressing Kill frees the port and confirms it's free.
3. After entering the sudo password once, root/system listeners appear and can be stopped. The password is **never stored**: no Keychain, files or UserDefaults. It lives only in memory while unlocked and never appears in argv, env, logs or crash output.
4. Builds and tests with **Command Line Tools only** (no Xcode required).

## 2. Environment facts (verified 2026-11-12)

| Fact | Consequence |
|---|---|
| macOS 27.2.1, CLT SDK 27.2, Swift 6.4.2, no Xcode | SwiftPM only. `glassEffect` compiles with CLT (verified). |
| `swift build` default build system fails ("Unknown error parsing property list") | Always pass `--build-system native` (wrapped in scripts). |
| `swift test` can't find `Testing` by default | `Scripts/test.sh` adds `-F`/`-rpath` for `/Library/Developer/CommandLineTools/Library/Developer/Frameworks` and `…/Developer/usr/lib` (verified passing). |
| User is not in the `admin` group (Jamf-managed), but uses `sudo` with their password | Privilege model = **sudo with password via stdin**. No privileged helper (`SMAppService.daemon` needs admin approval). No `with administrator privileges` AppleScript (needs an admin account). |
| `lsof -F` output format (sample below) | One parser for both user and admin mode. |
| Mac App Store sandbox forbids inspecting or killing other processes | Distribute outside the App Store (ad-hoc now, Developer ID later). |

Sample `lsof -nP -iTCP -sTCP:LISTEN -iUDP -FpcuLRftPnT` (real output, trimmed):
```
p4534
R1
cnginx
u502
Lvenkatanagasatyasubhash.khambampati
f6
tIPv4
PTCP
n*:8080
TST=LISTEN
TQR=0
TQS=0
p1160
R1
cidentityservicesd
u502
Lvenkatanagasatyasubhash.khambampati
f7
tIPv4
PUDP
n*:*
```
`p`=pid, `R`=ppid, `c`=command (truncated to 9+ chars by lsof), `u`=uid, `L`=login, `f`=fd, `t`=IPv4/IPv6, `P`=TCP/UDP, `n`=address:port, `T`=TCP state. UDP `*:*` = unbound socket and must be dropped.

## 3. Privilege model

Two modes, shown as a badge in the UI:

- **User mode** (default, no password): runs `lsof`, `ps` and `kill(2)` as the user. Shows and stops only the user's processes. A banner says *"System ports hidden — Unlock to see all."*
- **Admin mode** (after Unlock): every scan and kill runs through `SudoSession`.

**`SudoSession` rules (security-critical)**
1. Executes only `PrivilegedCommand` cases, which map to absolute paths `/usr/sbin/lsof`, `/bin/ps` and `/bin/kill`. No shell, no user-controlled executable, and argument arrays only.
2. Invocation: `/usr/bin/sudo -S -k -p "" -- <path> <args…>`. Password + `"\n"` is written to stdin, then stdin is closed. `-k` means sudo never reuses a cached timestamp, so every call is authenticated by the password we hold.
3. Unlock validates first with `/usr/bin/sudo -S -k -p "" -v`.
4. Error mapping from exit code ≠ 0 + stderr:
   - `incorrect password` / `Sorry, try again` → `.incorrectPassword`
   - `is not in the sudoers file` / `may not run sudo` → `.notPermitted`
   - `not allowed to execute` → `.commandNotAllowed`
   - no exit within 10 s → `.timedOut` (process terminated)
   - anything else → `.failed(stderr)`
5. **Never auto-retry** a failed authentication (repeated failures can lock the account). One user action = at most one auth attempt.
6. The password is never in argv, environment, `os_log`, `print`, error messages or test fixtures. It's held as `[UInt8]` inside the actor and overwritten with zeros on `lock()` (best effort: copies made by the `SecureField` String can't be zeroed. This is documented, not hidden).
7. **Auto-lock:** after `autoLockMinutes` (default 15, range 1–120) with no privileged *user action* (polling doesn't count), on screen lock (`com.apple.screenIsLocked` distributed notification), on system sleep (`NSWorkspace.willSleepNotification`) and on app quit.
8. **Polling cost:** each admin poll = 2 sudo calls (lsof + ps). Sudo logs each call to the unified log, which IT can see on managed Macs. So admin-mode polling defaults to **10 s** (range 5–60), user mode to **2 s** (range 1–30). Polling runs only while the window or popover is visible. ⌘R refreshes on demand.

**No password storage (decided 2026-11-12):** the password is never persisted, with no Keychain, Touch ID "remember", files, UserDefaults or state restoration. Every unlock means typing it again. The only copy lives inside the `SudoSession` actor while unlocked, and quitting, locking or auto-lock wipes it.

## 4. Data model & behaviour

**Listener** = one (protocol, port, pid) triple. IPv4 and IPv6 sockets with the same triple merge into one listener with several addresses.

**Exposure:** `.loopback` if every address is `127.0.0.1`, `[::1]` or `localhost`. Otherwise `.network` (e.g. `*`, `0.0.0.0`, `[::]`, a LAN IP), shown as a "Network" badge.

**Enrichment** (one `ps -axww -o pid=,uid=,lstart=,args=` call with `LC_ALL=C`): full command line, start time, uid. Working directory is fetched lazily when the inspector opens: `lsof -a -p <pid> -d cwd -Fn`.

**Category** (sidebar filter), first match wins:
1. `.container`: command contains `com.docker`, `docker`, `vpnkit`, `OrbStack` or `colima`.
2. `.database`: command or args contain `postgres`, `mysqld`, `mariadbd`, `redis-server`, `mongod`, `clickhouse`, `cassandra`; or port ∈ {5432, 3306, 6379, 27017, 9042, 8123}.
3. `.devServer`: command ∈ {`node`, `bun`, `deno`, `python`, `python3`, `ruby`, `java`, `go`, `cargo`, `php`, `dotnet`, `nginx`, `caddy`, `ollama`}, or args contain `vite`, `next`, `webpack`, `uvicorn`, `gunicorn`, `flask`, `rails`, `spring`, `gradle`.
4. `.system`: uid == 0, or args start with `/System/`, `/usr/libexec/`, `/usr/sbin/` or `/sbin/`.
5. `.app`: args contain `.app/Contents/MacOS/`.
6. `.other`.

**Framework label** (shown on the card): the first matching keyword from rules 2–3, displayed with fixed names, e.g. `vite` → "Vite", `next` → "Next.js", `java`+`spring` → "Spring", `postgres` → "PostgreSQL", `redis-server` → "Redis", `ollama` → "Ollama". Otherwise nil.

**Search grammar:** whitespace-separated tokens, all must match (AND), case-insensitive.

| Token | Matches |
|---|---|
| `8080` (digits) | port whose decimal string **starts with** the token (`80` → 80, 8000, 8080) |
| `3000-3999` | port in inclusive range |
| `:8080` | port **exactly** 8080 |
| `pid:123` | pid == 123 |
| `user:root` | user name equals |
| `tcp` / `udp` | protocol |
| `cat:db` / `cat:dev` / `cat:docker` / `cat:sys` / `cat:app` | category |
| `net` / `local` | exposure |
| anything else | substring of command, args, framework label or cwd |

Results sort by: exact port match first, then port ascending.

**Kill flow:**
1. `KillPolicy` classifies risk:
   - `.blocked`: pid ≤ 1; pid == own pid; command ∈ {`launchd`, `kernel_task`, `WindowServer`, `loginwindow`}. No kill button.
   - `.caution`: category `.system` or uid == 0. Confirmation dialog names the process and its consequences.
   - `.safe`: everything else. A single confirm, which can be turned off in Settings ("Confirm before stopping dev servers", default on).
2. Send `SIGTERM`. Poll every 200 ms whether the pid still exists, for up to `grace` (default 3 s).
3. Still alive → send `SIGKILL` and wait up to 1 s.
4. Rescan the port and return:
   - `.freed`
   - `.portTakenBy(Listener)`: something respawned it, e.g. launchd KeepAlive or nodemon.
   - `.stillRunning`
5. `ESRCH` at any point = the process already exited, and the flow continues to step 4. `EPERM` in user mode = `KillError.needsAdmin`, and the UI offers Unlock.

## 5. UI (Liquid Glass, macOS 26+)

Glass belongs to the **navigation and controls layer** floating above content (Apple HIG). Content rows are plain, and hover and selection controls are glass.

- **Main window:** `NavigationSplitView`.
  - **Sidebar:** categories with live counts (All, Dev Servers, Databases, Containers, Apps, System, Other). At the bottom, a privilege badge ("User mode" / "Admin · locks in 12 min") with a Lock/Unlock glass button.
  - **Toolbar:** `.searchable` field (placeholder `Port, range, process…  e.g. 3000-3999 node`), refresh, unlock.
  - **List:** rows with a large monospaced port, framework SF Symbol, process name, pid, user, address chips, a "Network" badge, uptime. Hover shows a `GlassEffectContainer` holding **Open** (`http://localhost:<port>`, TCP only), **Copy** (menu: URL, `curl` command, `kill <pid>`, pid) and **Stop**.
  - **Row changes:** inserted and removed rows animate with `glassEffectID` morph transitions.
  - **Inspector** (`.inspector`): full args (selectable), cwd with Reveal in Finder and Open in Terminal, ppid, start time, all addresses, a **Stop** button and a **Force Kill** button that skips the grace period.
- **Menu bar** (`MenuBarExtra`, `.window` style):
  - **Icon and count:** SF Symbol `bolt.horizontal.circle` plus the dev-server count.
  - **Popover (glass):**
    - Search field.
    - "Free port…" field: type a port, press Return, confirm, and its owner is killed.
    - Top 8 listeners, dev servers first.
    - Footer: "Open Port Assassin" and "Quit".
- **Unlock sheet (glass card):**
  - Lock symbol and the text *"Enter your Mac password to see and stop processes owned by other users and the system."*
  - Controls: `SecureField`, Cancel / Unlock. Footnote: *"Your password is kept in memory only until the app locks. It's never saved."*
  - Errors: incorrect password → inline red text + horizontal shake. Not permitted → *"Your account can't use sudo on this Mac. Ask your IT admin."*
- **States:** loading skeleton; empty ("No ports listening" / "No matches for …"); error banner with Retry.
- **Keyboard:** ⌘F search, ⌘R refresh, ⌫ stop selected (with confirm), ⌘U unlock, ⌘L lock, ⌘, settings.
- **Accessibility:** every control has a VoiceOver label; Reduce Transparency and Increase Contrast must look correct (verify manually; the system glass adapts, but custom tints must not drop contrast below 4.5:1); Reduce Motion disables shake and morph.
- **Settings:**
  - Refresh intervals (user mode and admin mode).
  - Auto-lock minutes.
  - "Confirm before stopping dev servers".
  - Launch at login (`SMAppService.mainApp`).
- **Activation:** the app runs as an accessory (`LSUIElement` = true, menu bar only) and switches to `.regular` while the main window is open.

## 6. Out of scope for Phase 1 (YAGNI)

Port watching/notifications, pinned ports, Docker container name mapping, global hotkey, per-process connections view, history, CLI, auto-update, notarization. See Roadmap.

---

# Part 2 — Implementation Plan (Phase 1)

## Global Constraints

- Min macOS **26.0** (`platforms: [.macOS(.v26)]`, `LSMinimumSystemVersion` 26.0). Swift tools version **6.2**, Swift 6 language mode.
- Bundle id `com.khambampati.portassassin`, display name **Port Assassin**, executable `PortAssassin`.
- **No third-party dependencies. No Rust.**
- Every build/test goes through `Scripts/build.sh`, `Scripts/test.sh` or `Scripts/run.sh` (they add `--build-system native` and the CLT framework paths).
- `PortKit` must not import SwiftUI or AppKit.
- Privileged execution only via `SudoSession` + `PrivilegedCommand`. The password never appears in argv, env, logs or fixtures. Tests never call the real `/usr/bin/sudo`.
- Tool paths: `/usr/sbin/lsof`, `/bin/ps`, `/bin/kill`, `/usr/bin/sudo`.
- Defaults: user poll 2 s, admin poll 10 s, auto-lock 15 min, kill grace 3 s, SIGKILL wait 1 s, sudo timeout 10 s, kill poll 200 ms.

## Review Focus

1. **Wrong or changed password:** exactly one sudo attempt per user action, a clear inline error. Never a retry loop (account lockout). → Task 4 test `incorrectPasswordIsNotRetried`.
2. **Password leakage:** the password must not appear in `CommandResult`, error descriptions or the argv of the spawned process. → Task 4 test `passwordNeverInArgvOrErrors`.
3. **Process exits or respawns between scan and kill** (`ESRCH`, launchd KeepAlive, nodemon). Must report `.freed` / `.portTakenBy`, never crash or claim success wrongly. → Task 5 tests `alreadyExitedCountsAsFreed`, `respawnReportsNewOwner`.
4. **Same port, several sockets/pids** (IPv4+IPv6 duplicates; nginx master+workers sharing a port; UDP `*:*`). Duplicates merge, multi-pid shows multiple rows, unbound UDP is dropped. → Task 1 tests `mergesIPv4AndIPv6`, `keepsSeparatePidsOnSamePort`, `dropsUnboundUDP`.
5. **Killing something critical** (pid 1, WindowServer, own pid, root daemons). Blocked or caution, never one click. → Task 5 test `killPolicyBlocksCriticalProcesses`.

## File Structure

```
Package.swift
Scripts/build.sh            # swift build --build-system native -c release
Scripts/test.sh             # swift test with CLT Testing paths
Scripts/bundle.sh           # wraps binary into build/Port Assassin.app, ad-hoc codesign
Scripts/run.sh              # bundle.sh && open the app
Resources/Info.plist        # LSUIElement, bundle id, min OS
Sources/PortKit/
  Models.swift              # Listener, ProcessRecord, TransportProtocol, Exposure, ListenerCategory
  CommandRunner.swift       # CommandRunner protocol, CommandResult, ProcessCommandRunner
  LsofParser.swift          # lsof -F text -> [RawSocket], [Int32: LsofProcess]
  PsParser.swift            # ps text -> [Int32: PsRow]
  ListenerBuilder.swift     # merge sockets + ps rows -> [Listener]
  Classifier.swift          # category + framework label
  SearchQuery.swift         # token parser + matching + sort
  PrivilegedCommand.swift   # allowlisted commands -> path + args
  SudoSession.swift         # actor; validate/run/lock; SudoError
  PortScanner.swift         # scan(mode:) using runner or sudo
  ProcessKiller.swift       # KillPolicy, terminate flow, KillOutcome, KillError
Sources/PortAssassin/
  PortAssassinApp.swift     # @main, WindowGroup, MenuBarExtra, Settings
  AppSettings.swift         # @AppStorage-backed values
  ListenerStore.swift       # @Observable; polling, selection, filtering
  AuthStore.swift           # @Observable; unlock/lock/auto-lock
  Views/MainWindow.swift    # NavigationSplitView + toolbar + search
  Views/SidebarView.swift
  Views/ListenerRow.swift
  Views/InspectorView.swift
  Views/UnlockSheet.swift
  Views/MenuBarPopover.swift
  Views/SettingsView.swift
  Views/KillConfirmation.swift
Tests/PortKitTests/
  Fixtures/lsof-listen.txt  # real-format sample incl. IPv4+IPv6 dup, UDP *:*, 2 pids same port
  Fixtures/ps.txt
  Fixtures/fake-sudo.sh     # mimics sudo -S: reads 1 line, compares to $FAKE_SUDO_PASSWORD
  LsofParserTests.swift
  PsParserTests.swift
  ListenerBuilderTests.swift
  ClassifierTests.swift
  SearchQueryTests.swift
  SudoSessionTests.swift
  PortScannerTests.swift    # integration: real nc listener
  ProcessKillerTests.swift  # integration: real nc listener
```

---

### Task 1: Package scaffold, scripts, models, lsof parsing

**Files:**
- Create: `Package.swift`, `.gitignore` (already exists; verify it covers `.build/` and `build/`), `Scripts/build.sh`, `Scripts/test.sh`, `Sources/PortKit/Models.swift`, `Sources/PortKit/LsofParser.swift`, `Sources/PortKit/ListenerBuilder.swift`, a placeholder `Sources/PortAssassin/PortAssassinApp.swift` (`@main` with empty `WindowGroup`)
- Test: `Tests/PortKitTests/LsofParserTests.swift`, `Tests/PortKitTests/ListenerBuilderTests.swift`, `Tests/PortKitTests/Fixtures/lsof-listen.txt`

**Interfaces:**
- Produces:
  - `enum TransportProtocol: String, Sendable { case tcp, udp }`
  - `enum Exposure: Sendable { case loopback, network }`
  - `enum ListenerCategory: String, CaseIterable, Sendable { case devServer, database, container, app, system, other }`
  - `struct RawSocket: Equatable, Sendable { pid: Int32; fd: Int32; proto: TransportProtocol; isIPv6: Bool; address: String; port: UInt16 }`
  - `struct LsofProcess: Equatable, Sendable { pid: Int32; ppid: Int32; command: String; uid: UInt32; user: String }`
  - `struct ProcessRecord: Hashable, Sendable { pid, ppid: Int32; uid: UInt32; user, command: String; arguments: String?; startedAt: Date?; cwd: String? }`
  - `struct Listener: Identifiable, Hashable, Sendable { id: String /* "\(proto):\(port):\(pid)" */; port: UInt16; proto: TransportProtocol; addresses: [String] /* sorted, unique */; exposure: Exposure; process: ProcessRecord; category: ListenerCategory; framework: String? }`
  - `enum LsofParser { static func parse(_ output: String) -> (sockets: [RawSocket], processes: [Int32: LsofProcess]) }`
  - `enum ListenerBuilder { static func build(sockets: [RawSocket], processes: [Int32: LsofProcess], ps: [Int32: PsRow]) -> [Listener] }`. In Task 1, pass `ps: [:]`; `PsRow` is defined in Task 2, so declare a minimal `struct PsRow` stub here and complete it in Task 2. Category = `.other`, framework = nil until Task 3.

- [ ] **Step 1:** Write `Package.swift` (tools 6.2, `.macOS(.v26)`, library `PortKit`, executable `PortAssassin` depending on `PortKit`, test target `PortKitTests` with `resources: [.copy("Fixtures")]`). Write `Scripts/test.sh`:
  ```bash
  #!/bin/bash
  set -euo pipefail
  F=/Library/Developer/CommandLineTools/Library/Developer/Frameworks
  L=/Library/Developer/CommandLineTools/Library/Developer/usr/lib
  exec swift test --build-system native \
    -Xswiftc -F -Xswiftc "$F" -Xlinker -F -Xlinker "$F" \
    -Xlinker -rpath -Xlinker "$F" -Xlinker -rpath -Xlinker "$L" "$@"
  ```
  `Scripts/build.sh` = `swift build --build-system native -c release "$@"`. `chmod +x Scripts/*.sh`.
- [ ] **Step 2: Fixture.** Create `lsof-listen.txt` in the §2 format containing: nginx pid 4534 on `*:8080` IPv4 **and** `[::]:8080` IPv6 (same pid); a second pid 4535 also on `*:8080` IPv4; node pid 900 on `127.0.0.1:5173`; UDP pid 1160 `*:*` (unbound); UDP pid 1315 IPv6 `*:52879`.
- [ ] **Step 3: Failing tests.**
  - `parsesProcessFields`: pid 4534 → command `nginx`, ppid 1, uid 502.
  - `parsesIPv6Bracketed`: `[::]:8080` → address `[::]`, port 8080, isIPv6.
  - `dropsUnboundUDP`: no socket with pid 1160.
  - `mergesIPv4AndIPv6`: `build` gives exactly one listener with id `tcp:8080:4534`, addresses `["*", "[::]"]`, exposure `.network`.
  - `keepsSeparatePidsOnSamePort`: listeners for 8080 have pids {4534, 4535}.
  - `loopbackExposure`: 5173 → `.loopback`.
  - `emptyInput`: `parse("")` returns empty collections.
- [ ] **Step 4:** Run `Scripts/test.sh`. Expected: FAIL (types missing).
- [ ] **Step 5:** Implement. Parsing is line-based on the first character. A `p` line starts a new process, an `f` line starts a new socket, and `n` splits on the **last** `:`. Skip any socket whose port isn't a valid `UInt16` (this covers `*`). Ignore unknown field letters.
- [ ] **Step 6:** Run `Scripts/test.sh`. Expected: all pass. Also run `Scripts/build.sh`. Expected: `Build complete!`
- [ ] **Step 7: Commit.** `feat(portkit): package scaffold, models, lsof parser`

### Task 2: Command runner, ps enrichment, user-mode scanner

**Files:**
- Create: `Sources/PortKit/CommandRunner.swift`, `Sources/PortKit/PsParser.swift`, `Sources/PortKit/PortScanner.swift`
- Modify: `Sources/PortKit/ListenerBuilder.swift` (use `PsRow`)
- Test: `PsParserTests.swift`, `PortScannerTests.swift`, `Fixtures/ps.txt`

**Interfaces:**
- Consumes: Task 1 types.
- Produces:
  - `struct CommandResult: Sendable { exitCode: Int32; stdout: String; stderr: String }`
  - `protocol CommandRunner: Sendable { func run(_ path: String, _ args: [String], stdin: Data?, environment: [String: String]?, timeout: Duration) async throws -> CommandResult }`
  - `struct ProcessCommandRunner: CommandRunner` (Foundation `Process`; on timeout, terminate the process and throw `CommandError.timedOut`)
  - `struct PsRow: Equatable, Sendable { pid: Int32; uid: UInt32; startedAt: Date?; arguments: String }`
  - `enum PsParser { static func parse(_ output: String) -> [Int32: PsRow] }`
  - `enum PrivilegeMode: Sendable { case user }` (Task 4 adds `case admin(SudoSession)`)
  - `struct PortScanner: Sendable { init(runner: CommandRunner = ProcessCommandRunner()); func scan(mode: PrivilegeMode) async throws -> [Listener]; func workingDirectory(pid: Int32, mode: PrivilegeMode) async throws -> String? }`

- [ ] **Step 1:** Create a `ps.txt` fixture in `ps -axww -o pid=,uid=,lstart=,args=` format with `LC_ALL=C`, e.g. `  4534   502 Thu Nov 12 23:17:01 2026     nginx: master process /opt/homebrew/bin/nginx`. Include a single-digit day (`Nov  2`) row.
- [ ] **Step 2: Failing tests.**
  - `parsesLstartAndArgs`: date components 2026-11-12 23:17:01 local time; args keeps internal spaces.
  - `parsesSingleDigitDay`.
  - `scanFindsOwnListener` (integration, `.tags(.integration)`): spawn `/usr/bin/nc -l 127.0.0.1 <free port>`, where the free port comes from binding a socket to port 0, reading the port, then closing it. Wait 300 ms, `scan(mode: .user)`. Expect a listener on that port with `process.pid == nc.processIdentifier` and `arguments` containing `nc`. Terminate nc in `defer`.
- [ ] **Step 3:** Run `Scripts/test.sh`. Expected: FAIL.
- [ ] **Step 4:** Implement.
  - **lstart parsing:** `lstart` is a fixed 24 characters. Parse it with `DateFormatter` set to `en_US_POSIX` and format `EEE MMM d HH:mm:ss yyyy`, after collapsing double spaces.
  - **`scan`:** run lsof with args `["-nP", "-iTCP", "-sTCP:LISTEN", "-iUDP", "-FpcuLRftPnT"]`. lsof exits 1 when it finds nothing, so treat exit 1 with empty stdout as empty. Then run ps with `LC_ALL=C`, then call `ListenerBuilder`.
- [ ] **Step 5:** Run `Scripts/test.sh`. Expected: pass.
- [ ] **Step 6: Commit.** `feat(portkit): ps enrichment and user-mode scanner`

### Task 3: Classifier and search

**Files:**
- Create: `Sources/PortKit/Classifier.swift`, `Sources/PortKit/SearchQuery.swift`
- Modify: `ListenerBuilder.swift` (set `category`, `framework`)
- Test: `ClassifierTests.swift`, `SearchQueryTests.swift`

**Interfaces:**
- Produces:
  - `enum Classifier { static func classify(_ p: ProcessRecord, port: UInt16) -> (ListenerCategory, framework: String?) }`
  - `struct SearchQuery: Equatable, Sendable { static func parse(_ text: String) -> SearchQuery; func matches(_ l: Listener) -> Bool; func sorted(_ ls: [Listener]) -> [Listener] }`

- [ ] **Step 1: Failing classifier tests.** Implement the §4 rules exactly, in order.
  - `node … vite` → `(.devServer, "Vite")`
  - `postgres` on 5432 → `(.database, "PostgreSQL")`
  - an unknown binary on 6379 → `.database`
  - `com.docker.backend` → `.container`
  - uid 0 `/usr/libexec/sshd-keygen-wrapper` → `.system`
  - `/Applications/Slack.app/Contents/MacOS/Slack` → `.app`
  - **Order test:** `docker` + port 5432 → `.container` (rule 1 wins).
- [ ] **Step 2: Failing search tests.** One `@Test(arguments:)` table covering every row of the §4 grammar, plus these:
  - `"80"` matches ports 80, 8000 and 8080 but not 180.
  - `":80"` matches only port 80.
  - `"3000-3999 node"` is an AND of both tokens.
  - An empty query matches everything.
  - `"user:root"` doesn't match a uid-502 process.
  - Sort: for query `"80"`, port 80 comes before 8000.
  - A reversed range `"3999-3000"` is treated as `3000-3999`.
- [ ] **Step 3:** Run `Scripts/test.sh`. Expected: FAIL. Then implement, then run again. Expected: PASS.
- [ ] **Step 4: Commit.** `feat(portkit): classification and search grammar`

### Task 4: Sudo session (security-critical)

**Files:**
- Create: `Sources/PortKit/PrivilegedCommand.swift`, `Sources/PortKit/SudoSession.swift`
- Modify: `PortScanner.swift` (add `case admin(SudoSession)` to `PrivilegeMode`; admin mode routes lsof/ps through `SudoSession`)
- Test: `SudoSessionTests.swift`, `Fixtures/fake-sudo.sh`

**Interfaces:**
- Consumes: `CommandRunner`, `CommandResult`.
- Produces:
  - `enum PrivilegedCommand: Sendable { case lsof([String]); case ps([String]); case kill(signal: Int32, pid: Int32); var path: String; var arguments: [String] }`
  - `enum SudoError: Error, Equatable, Sendable { case incorrectPassword, notPermitted, commandNotAllowed, timedOut, locked, failed(String) }`
  - `actor SudoSession { init(password: String, runner: CommandRunner = ProcessCommandRunner(), sudoPath: String = "/usr/bin/sudo"); func validate() async throws; func run(_ cmd: PrivilegedCommand) async throws -> CommandResult; func lock(); var isLocked: Bool { get } }`

- [ ] **Step 1:** Write `fake-sudo.sh`. It records its argv to `$FAKE_SUDO_ARGV_FILE`, reads one line from stdin, and compares it to `$FAKE_SUDO_PASSWORD`. On a mismatch it prints `Sorry, try again.` and `sudo: 1 incorrect password attempt` to stderr and exits 1. If `$FAKE_SUDO_MODE=notsudoer`, it prints `user is not in the sudoers file.` and exits 1. Otherwise it `exec`s the args after `--`, or exits 0 for `-v`. Tests pass `sudoPath:` pointing to it and the env vars via a test runner wrapper.
- [ ] **Step 2: Failing tests.**
  - `validateSucceedsWithCorrectPassword`
  - `incorrectPasswordMapsError`: throws `.incorrectPassword`.
  - `incorrectPasswordIsNotRetried`: the argv file shows exactly **one** invocation.
  - `notSudoerMapsError`: throws `.notPermitted`.
  - `runUsesAbsolutePathAndFlags`: argv == `["-S", "-k", "-p", "", "--", "/bin/kill", "-15", "4242"]` for `.kill(signal: 15, pid: 4242)`.
  - `passwordNeverInArgvOrErrors`: with password `"hunter2-SECRET"`, the argv file, `CommandResult.stdout/stderr` and `String(describing:)` of every thrown error contain no `SECRET`.
  - `lockedSessionThrows`: after `lock()`, `run` throws `.locked`.
  - `stdinClosedAfterPassword`: `.lsof(["-v"])` completes and doesn't hang (timeout 10 s).
- [ ] **Step 3:** Run `Scripts/test.sh --filter SudoSession`. Expected: FAIL.
- [ ] **Step 4:** Implement per §3 rules 1–6.
  - Store the password as `[UInt8]`.
  - `lock()` overwrites it with zeros and empties it.
  - Pass stdin as `Data(password + [0x0A])`.
  - Map stderr by **lowercased substring**.
  - `PrivilegedCommand.path` is a `switch` returning a constant; never read paths from input.
- [ ] **Step 5:** Wire up `PortScanner.scan(mode: .admin(session))`: it runs the same lsof/ps args via `session.run(.lsof(…))` / `.ps(…)`.
- [ ] **Step 6:** Run `Scripts/test.sh`. Expected: all pass. Then grep: `grep -rn "print(\|os_log\|Logger" Sources/PortKit/SudoSession.swift` → expect no output.
- [ ] **Step 7: Commit.** `feat(portkit): sudo session with stdin password and allowlisted commands`

### Task 5: Kill policy and terminate flow

**Files:**
- Create: `Sources/PortKit/ProcessKiller.swift`
- Test: `ProcessKillerTests.swift`

**Interfaces:**
- Consumes: `PortScanner`, `PrivilegeMode`, `SudoSession.run(.kill…)`, `Listener`.
- Produces:
  - `enum KillRisk: Equatable, Sendable { case safe; case caution(String); case blocked(String) }`
  - `enum KillPolicy { static func risk(for l: Listener, ownPID: Int32 = getpid()) -> KillRisk }`
  - `enum KillOutcome: Equatable, Sendable { case freed; case portTakenBy(Listener); case stillRunning }`
  - `enum KillError: Error, Equatable, Sendable { case needsAdmin; case blocked(String) }`
  - `struct ProcessKiller: Sendable { init(scanner: PortScanner, grace: Duration = .seconds(3), pollInterval: Duration = .milliseconds(200)); func stop(_ l: Listener, mode: PrivilegeMode, force: Bool = false) async throws -> KillOutcome }`

- [ ] **Step 1: Failing tests.**
  - `killPolicyBlocksCriticalProcesses`: pid 1, own pid and `WindowServer` → `.blocked`; uid 0 → `.caution`; a node dev server → `.safe`.
  - `stopFreesPort` (integration): spawn nc on a free port, scan, `stop` → `.freed`, and a rescan has no listener on that port.
  - `alreadyExitedCountsAsFreed`: kill nc yourself first, then call `stop` with the stale `Listener` → `.freed`.
  - `respawnReportsNewOwner`: after stopping nc #1, a test helper starts nc #2 on the same port inside the grace window → `.portTakenBy` with nc #2's pid.
  - `ignoresSIGTERMThenForceKills`: spawn `/bin/sh -c 'trap "" TERM; exec nc -l 127.0.0.1 PORT'`. Expect `.freed` within ≈ 3–4.5 s.
  - `blockedThrows`: `stop` on a `.blocked` listener throws `.blocked`.
- [ ] **Step 2:** Run `Scripts/test.sh --filter ProcessKiller`. Expected: FAIL.
- [ ] **Step 3:** Implement the §4 kill flow.
  - In user mode, send signals with Darwin `kill(pid, sig)`. `errno == EPERM` → throw `.needsAdmin`. `ESRCH` → go to rescan.
  - In admin mode, use `session.run(.kill(…))`. Check existence with `kill(pid, 0)`, where `EPERM` still means "exists".
  - `force: true` skips the grace period.
- [ ] **Step 4:** Run `Scripts/test.sh`. Expected: pass.
- [ ] **Step 5: Commit.** `feat(portkit): kill policy and graceful terminate flow`

### Task 6: App shell, bundling, stores

**Files:**
- Create: `Resources/Info.plist`, `Scripts/bundle.sh`, `Scripts/run.sh`, `Sources/PortAssassin/AppSettings.swift`, `ListenerStore.swift`, `AuthStore.swift`
- Modify: `Sources/PortAssassin/PortAssassinApp.swift`

**Interfaces:**
- Consumes: `PortScanner`, `ProcessKiller`, `SudoSession`, `SearchQuery`, `KillPolicy`.
- Produces:
  - `@MainActor @Observable final class ListenerStore { var listeners: [Listener]; var query: String; var category: ListenerCategory?; var selection: Listener.ID?; var lastError: String?; var filtered: [Listener] { get }; func counts() -> [ListenerCategory: Int]; func refresh() async; func startPolling(); func stopPolling(); func stop(_ l: Listener, force: Bool) async -> KillOutcome? }`
  - `@MainActor @Observable final class AuthStore { var mode: PrivilegeMode; var isUnlocked: Bool; var lockDeadline: Date?; var unlockError: String?; func unlock(password: String) async; func lock(); func noteUserAction() }`

- [ ] **Step 1:** Write `Info.plist`: `CFBundleIdentifier` `com.khambampati.portassassin`, `CFBundleName`/`CFBundleDisplayName` `Port Assassin`, `CFBundleExecutable` `PortAssassin`, `LSMinimumSystemVersion` `26.0`, `LSUIElement` true, `CFBundleShortVersionString` `2.0.0`.
- [ ] **Step 2:** Write `bundle.sh`. It runs `Scripts/build.sh`, creates `build/Port Assassin.app/Contents/{MacOS,Resources}`, copies the binary and plist, then runs `codesign --force --sign - --timestamp=none "build/Port Assassin.app"`. `run.sh` = `bundle.sh && open "build/Port Assassin.app"`.
- [ ] **Step 3:** Implement the stores.
  - **Polling:** a `Task` loop sleeps `userPollSeconds` or `adminPollSeconds` from `AppSettings`. Polling runs only while `visibleSurfaces > 0`; the views call `startPolling()`/`stopPolling()` via `onAppear`/`onDisappear`.
  - **`AuthStore` auto-lock:** follows §3 rule 7. Observe `com.apple.screenIsLocked` on `DistributedNotificationCenter` and `NSWorkspace.willSleepNotification`. A 30 s timer checks `lockDeadline`.
  - **No persistence:** `unlock` passes the password straight to `SudoSession(password:)` and keeps no other reference. On `lock()`, call `session.lock()` and drop the session.
- [ ] **Step 4:** Write `PortAssassinApp.swift`: `WindowGroup(id: "main")`, `MenuBarExtra(…, systemImage: "bolt.horizontal.circle") { … }.menuBarExtraStyle(.window)`, `Settings`. Inject the stores via `.environment`. Switch the activation policy to `.regular` when the main window appears and to `.accessory` when it disappears.
- [ ] **Step 5:** Run `Scripts/run.sh`. Expected: the app launches, a menu bar icon appears, and there's no Dock icon until the window opens. Run `Scripts/test.sh`: still green.
- [ ] **Step 6: Commit.** `feat(app): app shell, bundling script, listener and auth stores`

### Task 7: Main window with Liquid Glass

**Files:**
- Create: `Views/MainWindow.swift`, `SidebarView.swift`, `ListenerRow.swift`, `InspectorView.swift`, `KillConfirmation.swift`

**Interfaces:**
- Consumes: `ListenerStore`, `AuthStore`, `KillPolicy.risk`.

- [ ] **Step 1:** Build the §5 main window.
  - **Sidebar:** categories with `counts()`, plus the privilege badge with a countdown from `lockDeadline`.
  - **Search:** `.searchable(text: $store.query, prompt: "Port, range, process…  e.g. 3000-3999 node")`.
  - **Rows:** each row's hover actions sit in a `GlassEffectContainer` with buttons using `.buttonStyle(.glass)`. Rows carry `.glassEffectID(listener.id, in: namespace)`, and the list animates on `listeners` changes. With Reduce Motion on, use no animation.
  - **Toolbar:** refresh (⌘R) and unlock/lock (⌘U/⌘L) buttons. Delete stops the selected row (⌫).
- [ ] **Step 2:** Build the §5 inspector.
  - Load cwd lazily with `scanner.workingDirectory`.
  - Reveal in Finder via `NSWorkspace.shared.activateFileViewerSelecting`.
  - Open in Terminal via `NSWorkspace.shared.open([url], withApplicationAt: Terminal.app)`.
- [ ] **Step 3:** Build `KillConfirmation`.
  - `.safe` → a simple confirm (skipped when the setting is off). `.caution(reason)` → a destructive confirm that names the process and the reason. `.blocked` → the button is disabled with a tooltip giving the reason.
  - **Outcome toasts:** "Port 8080 is free", "Port 8080 was re-taken by node (pid 123)", "Couldn't stop nginx".
  - `KillError.needsAdmin` → present the unlock sheet.
- [ ] **Step 4:** Run `Scripts/run.sh` with `python3 -m http.server 8765` running in another terminal. Expected: 8765 appears under Dev Servers, searching `:8765` filters to it, Stop → toast "Port 8765 is free", and the row morphs out.
- [ ] **Step 5:** Turn on System Settings › Accessibility › Display › Reduce Transparency, then Increase Contrast. Expected: everything stays legible and controls stay visible.
- [ ] **Step 6: Commit.** `feat(app): liquid glass main window, inspector, kill confirmation`

### Task 8: Unlock sheet and admin mode end-to-end

**Files:**
- Create: `Views/UnlockSheet.swift`
- Modify: `MainWindow.swift`, `AuthStore.swift` (if needed)

- [ ] **Step 1:** Build the §5 unlock sheet: glass card, `SecureField` (Return submits; the field is cleared after every attempt), inline errors, shake with `phaseAnimator` (off with Reduce Motion), and the not-permitted copy exactly as in §5. The Unlock button is disabled while a request is in flight, so double Returns can't send two attempts (Review Focus 1).
- [ ] **Step 2:** Manual verification:
  - **(a)** Wrong password → "Incorrect password", one attempt. Check with `log show --last 2m --predicate 'process == "sudo"' | grep -c incorrect`, which should print 1.
  - **(b)** Correct password → root listeners appear (e.g. `mDNSResponder`, `launchd` sockets), and the badge shows "Admin · locks in 15 min".
  - **(c)** Stop a root-owned test listener: `sudo nc -l 127.0.0.1 9999` → caution confirm → `.freed`.
  - **(d)** Lock the screen → the app returns to User mode.
  - **(e)** Quit and relaunch → back in User mode, and Unlock asks for the password again.
  - **(f)** `pgrep -lf hunter` while unlocked with a test password prints nothing.
- [ ] **Step 3: Commit.** `feat(app): unlock sheet and admin mode`

### Task 9: Menu bar popover

**Files:**
- Create: `Views/MenuBarPopover.swift`

- [ ] **Step 1:** Build the §5 popover.
  - Search field bound to its own query (independent of the window).
  - "Free port…" field: digits only, Return → finds listeners with exactly that port → same kill confirmation → toast inline.
  - Top 8 listeners (dev servers first, then by port), each with Open and Stop.
  - Footer buttons: Open Port Assassin (`openWindow(id: "main")`) and Quit.
  - Menu bar label: SF Symbol plus the dev-server count (hidden when 0).
- [ ] **Step 2:** Manual verification: start `python3 -m http.server 8765`, type `8765` in Free port, press Return and confirm → "Port 8765 is free".
- [ ] **Step 3: Commit.** `feat(app): menu bar popover with free-port action`

### Task 10: Settings, launch at login, README, final verification

**Files:**
- Create: `Views/SettingsView.swift`, `README.md`

- [ ] **Step 1:** Build `SettingsView`: steppers for the poll intervals and auto-lock (ranges from §3), the confirm toggle, a launch-at-login toggle (`SMAppService.mainApp.register()`/`unregister()` with status shown).
- [ ] **Step 2:** Write `README.md`: what the app is, a screenshot placeholder path `docs/screenshot.png`, requirements (macOS 26+, CLT), `Scripts/run.sh`, a privilege explanation (user vs admin, how the password is handled) and the limitations from §3.
- [ ] **Step 3: Final verification.** Run `Scripts/test.sh` → all tests pass (paste the counts). Run `Scripts/bundle.sh` → `.app` produced. Run `codesign -dv "build/Port Assassin.app"` → `Signature=adhoc`. Run `grep -rnE 'SecItem|Keychain|LAContext|UserDefaults|AppStorage' Sources | grep -i pass`. Expected: no output (the password is never persisted). Repeat the Task 7 and Task 8 manual checks.
- [ ] **Step 4:** Run the `security-review` skill on `SudoSession.swift`, `AuthStore.swift`, `UnlockSheet.swift`, and a final whole-branch review via `superpowers:requesting-code-review`.
- [ ] **Step 5: Commit.** `feat(app): settings, launch at login, README`

---

# Roadmap (not in this plan, each phase gets its own spec → plan)

- **Phase 2 — Power features:**
  - Watch a port: notify when it's taken or freed (`UNUserNotificationCenter`).
  - Pinned ports.
  - Docker container names for ports (`docker ps --format json`).
  - Global hotkey via Carbon `RegisterEventHotKey`, which needs no Accessibility permission.
  - Per-process established connections.
  - Port history log.
- **Phase 3 — Distribution:**
  - Developer ID signing + notarization.
  - Sparkle updates.
  - Homebrew cask.
  - Optional `pa` CLI. **Rust is used only if the CLI is built**, sharing nothing with the app except the documented lsof format.
- **Not planned:** Mac App Store (sandbox forbids the core feature); `SMAppService.daemon` privileged helper (needs admin approval this user doesn't have).
