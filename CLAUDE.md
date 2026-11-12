# CLAUDE.md

Read `AGENTS.md` (rules, commands), `PLAN.md` (spec + tasks), `SKILLS.md` (which skill when).

- Don't implement until the user says go; then work task-by-task from `PLAN.md`.
- Never store the sudo password (memory only), and never put it in argv, env, logs, or tests.
- Run `Scripts/test.sh` before saying anything is done.
