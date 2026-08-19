# Efficient Codex workflow

Use one well-scoped development task, one pull request, and normally one Codex
session. Stay in that session for implementation, tests, and fixes belonging to
the same task. Start a new session for a new independent task after the prior
pull request is complete.

Start with `AGENTS.md` and `docs/PROJECT_STATUS.md`, then read only the
authoritative documents relevant to the task. Inspect the relevant code rather
than scanning the repository. Keep prompts narrow and acceptance-oriented; do
not copy project history into them. Repository state, tests, migrations, ADRs,
and the status snapshot are the project memory.

Avoid speculative refactoring and future-phase infrastructure. Keep final
responses concise: do not paste full changed files. Do not hard-code current
OpenAI model names, credit prices, or Fast-mode multipliers in repository docs;
those values can change.

## Recommended lifecycle

```text
fresh session
  -> AGENTS.md
  -> PROJECT_STATUS.md
  -> task-specific docs/code
  -> implement
  -> targeted tests
  -> full required checks
  -> update PROJECT_STATUS if state changed
  -> PR
  -> end session
```
