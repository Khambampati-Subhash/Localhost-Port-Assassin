# SKILLS.md

Which skills and agents to use for which job in this repo (Claude Code; other agents can treat these as checklists).

| When | Use |
|---|---|
| New feature or behaviour change not covered in `PLAN.md` | `superpowers:brainstorming` → update spec → `superpowers:writing-plans` |
| Implementing `PLAN.md` tasks | `superpowers:subagent-driven-development` (default) or `superpowers:executing-plans` |
| Writing any code | `superpowers:test-driven-development` |
| A test fails or behaviour is odd | `superpowers:systematic-debugging` before changing code |
| Before saying "done" | `superpowers:verification-before-completion` (run `Scripts/test.sh` and read the output) |
| Any change to `SudoSession`, `PrivilegedCommand`, `PasswordVault`, `AuthStore` | `security-review`, plus a reviewer subagent |
| End of a task or phase | `superpowers:requesting-code-review` / `code-review` |
| Receiving review feedback | `superpowers:receiving-code-review` |
| UI polish (glass, spacing, colour, accessibility) | `ui-ux-pro-max:ui-ux-pro-max` (SwiftUI stack) |
| Launching the app to check a change | `run` (wraps `Scripts/run.sh`) |
| Cleanup after a feature | `simplify` |
| Merging `v2-swift` | `superpowers:finishing-a-development-branch` |
| Broad codebase search | `Explore` subagent |
