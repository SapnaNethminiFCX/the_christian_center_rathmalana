# /commit_message — Generate a Commit Message

## Instructions

1. Run `git diff --staged` to see all staged changes.
2. Analyse the changes and generate a commit message following the rules below.
3. Present the message ready to copy — do not commit automatically.

## Format

```
<type>(<scope>): <subject>

[optional body]

Co-Authored-By: Claude Sonnet 4.6 (1M context) <noreply@anthropic.com>
```

## Type Reference

| Type | When to use |
|------|-------------|
| `feat` | New feature or API integration |
| `fix` | Bug fix |
| `style` | UI polish, dark mode, spacing — no logic change |
| `refactor` | Code restructure without behaviour change |
| `chore` | Config, env, dependency, gitignore changes |
| `docs` | Documentation, spec, plan, sprint files |
| `test` | Adding or updating tests |
| `perf` | Performance improvement |
| `ci` | CI/CD pipeline changes |

## Rules

- Subject line: imperative mood, max 72 chars, no trailing period.
- Scope: the area changed — e.g., `auth`, `courses`, `enrollment`, `ui`, `config`.
- Body: only add if the WHY is non-obvious. Explain why, not what.
- Never reference issue numbers or PR numbers in the subject line.
- Keep it factual — describe what changed, not the process of changing it.

## Examples

```
feat(auth): integrate Firebase login with token storage and route guards

fix(enrollment): show inline error when course is not published

style(dark-mode): fix queue card count visibility in dark theme

chore(env): add NEXT_PUBLIC_API_PREFIX to .env template

docs(sprints): add v01 sprint planning files for integration phase
```
