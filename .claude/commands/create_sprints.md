# /create_sprints — Create Sprint Planning Documents

## Instructions

1. Check existing folders under `_sprints/` to find the highest version number. Start at `v01` if none exist.
2. Create folder `_sprints/v{N}/`.
3. Create one file per sprint: `sprint-01.md` through `sprint-08.md`.

## Rules

- **Signup is already done** — do NOT create a sprint for signup.
- Start Sprint 1 with login (Firebase Auth + token storage + route guards).
- Sprints are **feature-focused** — do not list specific endpoint paths.
- UI update tasks must be **included within each sprint**, not in a separate sprint.
- Each sprint that touches a new feature must specify a new branch name.
- If a sprint is large enough to need two features with separate branches, list both branches and note where to split.
- Maximum 8 sprints.

## Sprint File Template

```markdown
# Sprint {N}: {Title}

**Goal:** One sentence describing what this sprint delivers.
**Estimated effort:** S / M / L
**Depends on:** Sprint {X} (if applicable)

## Branch(es)
- `feature/{slug-1}` — covers: ...
- `feature/{slug-2}` — covers: ... (if sprint needs a split)

## Features

### {Feature Name}
**What to integrate:**
- ...

**UI changes needed:**
- ...

**Error states to handle:**
- ...

## Checklist
- [ ] Task 1
- [ ] Task 2
```

Generate all 8 sprint files using the project's API reference and the recommended integration order:
Signup ✅ → Login + Token + Guards → Registration Approval → Student Login → Course Catalog → Enrollments → Course Management → Structure Management → Progress → Notifications + User/Admin Management + Audit Log
