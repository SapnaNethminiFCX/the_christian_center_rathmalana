# /spec — Create a Specification Document

Create a specification document for: **$ARGUMENTS**

## Instructions

1. Check existing folders under `_specs/` to find the highest version number. Start at `v01` if none exist.
2. Derive a short topic slug from the argument (e.g., "login flow" → `login-flow`).
3. Create the folder `_specs/v{N}-{topic-slug}/`.
4. Write `_specs/v{N}-{topic-slug}/spec.md` with the structure below.

## Spec Template Structure

```
# Spec: {Title}
**Version:** v{N}
**Date:** {today}
**Status:** Draft

## 1. Overview
What this feature is and why it exists.

## 2. Scope
### In scope
- ...
### Out of scope
- ...

## 3. Functional Requirements
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-001 | ... | MUST |

## 4. UI / UX Requirements
- Pages affected
- New components needed
- State changes

## 5. API / Data Requirements
- Endpoints consumed
- Request / response shapes
- Error states to handle

## 6. Acceptance Criteria
- [ ] ...

## 7. Open Questions
- ...
```

Fill every section based on the current codebase and the API reference at `.claude/CMP_Web_Frontend_Blueprint.md.md`. Do not leave placeholder text — write real content for the given topic.
