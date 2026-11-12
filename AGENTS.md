# AGENTS.md

Instructions for any coding agent (Claude Code, Codex, Cursor, …) working in this repo.

## What this is

**Port Assassin v2**: a native macOS (26+) menu bar + window app that lists listening ports, searches them, and stops the owning process. It works as the user by default, and with sudo (password via stdin) to see and stop root/system processes. The UI uses Liquid Glass. Full spec and task list: `PLAN.md`.

The old Go/Wails version lives on `main` and `feature/setup`. This branch (`v2-swift`) is a clean rewrite.

## Stack

- Swift 6.4, Swift 6 language mode, SwiftPM only. **No Xcode project and no third-party dependencies.**
- SwiftUI with macOS 26 Liquid Glass APIs (`glassEffect`, `GlassEffectContainer`, `glassEffectID`, `.buttonStyle(.glass)`).
- Swift Testing (`import Testing`). Don't use XCTest.
- System tools only: `/usr/sbin/lsof`, `/bin/ps`, `/bin/kill`, `/usr/bin/sudo`. **No Rust/backend** unless the Phase 3 CLI is started.

## Commands

The machine has Command Line Tools only (no Xcode). Always use the scripts. They add `--build-system native` and the CLT `Testing` framework paths.

| Task | Command |
|---|---|
| Build | `Scripts/build.sh` |
| Test (all) | `Scripts/test.sh` |
| Test (one suite) | `Scripts/test.sh --filter SudoSession` |
| Build `.app` | `Scripts/bundle.sh` → `build/Port Assassin.app` |
| Run app | `Scripts/run.sh` |

Plain `swift build` / `swift test` will fail here. That's expected; use the scripts.

## Layout

```
Sources/PortKit/       pure logic: parsing, scanning, sudo, killing, search (no SwiftUI/AppKit)
Sources/PortAssassin/  SwiftUI app: stores (@Observable) + Views/
Tests/PortKitTests/    Swift Testing; Fixtures/ holds lsof/ps samples and fake-sudo.sh
Scripts/               build/test/bundle/run
Resources/Info.plist   bundle metadata (LSUIElement, min OS 26.0)
```

## Hard rules

1. **Security of the sudo password**
   - All privileged execution goes through `SudoSession.run(_: PrivilegedCommand)`. Never call `/usr/bin/sudo` anywhere else.
   - Never use a shell (`sh -c`) and never build a command from user input.
   - The password goes to sudo on **stdin only**. It must never appear in argv, environment, `print`, `Logger`/`os_log`, error messages, fixtures or test names.
   - Never auto-retry a failed authentication.
   - Tests use `Fixtures/fake-sudo.sh`, never the real sudo.
2. `PortKit` imports only Foundation, Darwin, Security and LocalAuthentication. No SwiftUI or AppKit.
3. Use strict concurrency. Stores are `@MainActor @Observable`, `SudoSession` is an `actor`, and model types are `Sendable` value types.
4. Glass belongs to navigation and controls (sidebar, toolbar, hover actions, sheets, popover), not to content rows. Everything must stay legible with Reduce Transparency and Increase Contrast, and Reduce Motion disables shake and morph animations.
5. Keep files focused (< ~300 lines). No force unwraps outside tests.
6. Defaults and exact copy live in `PLAN.md` §3–§5. Don't invent new values; change the spec first.

## Workflow

- Follow `PLAN.md` task order. Use TDD: write the failing test, watch it fail, implement, watch it pass, commit.
- Mark tests that spawn real processes with `.tags(.integration)`. They use `nc -l 127.0.0.1 <free port>` and must clean up in `defer`.
- Commits use Conventional Commits: `feat(portkit): …`, `feat(app): …`, `fix: …`, `test: …`, `docs: …`.
- **Definition of done** for a task:
  - `Scripts/test.sh` is green, with real output checked.
  - `Scripts/build.sh` succeeds.
  - For UI tasks, the plan's manual checks pass via `Scripts/run.sh`.
  - The plan checkbox is ticked.
