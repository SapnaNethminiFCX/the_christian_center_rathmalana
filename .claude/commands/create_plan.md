# /create_plan — Create an Integration Plan

## Instructions

1. Check existing folders under `_plans/` to find the highest version number. Start at `v01` if none exist.
2. Create folder `_plans/v{N}/`.
3. Write `_plans/v{N}/plan.md` following the structure below.

## Rules

- The UI is already built — this plan is about **integration only**.
- For every feature area: describe the current mock state, required UI changes when integrating, and the exact request/response shape from the API.
- Do not rewrite or redesign existing UI — only note what must change to work with real data.
- Use the API reference document provided in the project for all endpoint details.
- Note feature dependencies (e.g., login must come before approval queue).

## Plan Template Structure

```
# Integration Plan v{N}
**Date:** {today}
**Scope:** Backend API integration — slp-backend v1.0

## 1. Overview
Brief summary of integration approach and strategy.

## 2. Authentication Strategy
How Firebase Auth tokens are obtained, stored, refreshed, and attached to requests.

## 3. Environment & Setup
- Required packages to install
- Env variables needed
- Proxy / CORS configuration

## 4. Feature Areas

### Feature: {Name}
**Current state:** Mock data from `src/lib/mock/...`
**Pages affected:** `src/app/...`
**UI changes needed:** (fields, inputs, dynamic data, error states)
**Request:**
{json body}
**Response:**
{json shape}
**Error states to handle:** (codes + UI treatment)

(repeat for each feature area)

## 5. Dependency Map
Which features must be done before others and why.

## 6. Risks & Notes
Known issues, blockers, or decisions pending.
```

Write the plan based on the actual current codebase and the API reference in the project context. Cover all feature areas from auth through audit log.
