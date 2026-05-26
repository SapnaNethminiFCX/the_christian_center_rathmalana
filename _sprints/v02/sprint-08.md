# Sprint 8 (V2): Analytics, Audit Log V2, Role Mutation, User Directory & Final Polish

**Goal:** Ship the last seven V2 surfaces. Five SVG analytics charts + CSV export, org-wide and per-user audit log, the `PATCH /users/:uid/roles` mutation with caller-scoped permission UI, V2 user directory with role-chip stack, health probes for the admin status page, and a polish pass for accessibility, dark-mode, and i18n coverage.
**Estimated effort:** XL
**Depends on:** Sprint 1 (auth), Sprint 5 (Cell reports are the data source for analytics — analytics endpoints work even without reports but the UI assumes reports exist for sensible empty states), Sprint 6 (cells), Sprint 7 (cell reports). Lands last.
**Status:** Not started

---

## Branches

- `feature/v2-analytics-charts` — 5 chart endpoints + Leader / G12 / Admin / Super Admin dashboards
- `feature/v2-analytics-export` — CSV export from each chart
- `feature/v2-audit-org-and-user` — org-wide audit log + per-user audit timeline
- `feature/v2-role-mutation-and-directory` — `PATCH /users/:uid/roles`, RoleBadgeStack, user filter chips
- `feature/v2-super-admin-mgmt-completion` — `GET /super-admin/admins/:uid`, `DELETE /super-admin/admins/:uid`
- `feature/v2-health-and-status` — admin status page reading `/healthz` and `/readyz`
- `feature/v2-i18n-pipeline` — final translation pass: every V2 key has SI / TA entry (placeholder accepted)

> Seven branches. Big sprint — designed to be split across two iterations if needed.

---

## Current State

- Charts in V1 were illustrative placeholders; no analytics API was integrated
- `GET /audit-log` had a partial integration in V1 (just listed entries); filters were mock
- `PATCH /users/:uid/roles` doesn't exist client-side; V1 admin user management was suspend/reactivate only
- User directory shows scalar `role` in V1; V2 needs `roles[]` chip stack
- `RoleBadgeStack` component exists in `src/components/ui/` from the UI prototype phase
- `super-admin/admins/[adminId]` page exists; uses `GET /users/:uid` instead of `GET /super-admin/admins/:uid` — fine for now, but we should switch

---

## Features

### 1. Analytics charts (5 endpoints + dashboards)

**What to integrate:**
- New `useAnalytics.ts` hook with one function per chart:
  - `useCellsWeekly({ weeks })` → `GET /analytics/cells/weekly?weeks=12`
  - `useAttendance({ from, to })` → `GET /analytics/attendance?from=2026-W01&to=2026-W18`
  - `useMeetingTypes()` → `GET /analytics/meeting-types`
  - `useGrowth({ weeks })` → `GET /analytics/growth`
  - `useParticipation()` → `GET /analytics/participation`
- All return `{ data, scope, isLoading, error }`
- Dashboards consume these:
  - `(leader)/leader/analytics/page.tsx` — Weekly attendance + Cells weekly + Meeting types
  - `(g12)/g12/analytics/page.tsx` — adds Growth + Participation
  - `admin/analytics/page.tsx` (NEW) — org-wide scope on all five
  - `super-admin/analytics/page.tsx` (NEW) — same shape, org-wide

**Charts (hand-rolled SVG per CLAUDE.md — no recharts):**
- Line chart for weekly trends (`.chart-card` + `.legend`)
- Bar chart for meeting-types breakdown
- KPI mini-cards (`.kpi-mini` from `tccr-additions.css`)
- Empty state: "Not enough data yet — file a few cell reports to start seeing trends"

**API:**
- `GET /analytics/cells/weekly` (NEW V2)
- `GET /analytics/attendance` (NEW V2)
- `GET /analytics/meeting-types` (NEW V2)
- `GET /analytics/growth` (NEW V2)
- `GET /analytics/participation` (NEW V2)

**Files:**
- `src/application/hooks/useAnalytics.ts` (NEW)
- `src/components/analytics/LineChart.tsx` (NEW)
- `src/components/analytics/BarChart.tsx` (NEW)
- `src/components/analytics/KpiMini.tsx` (NEW)
- `src/components/analytics/ChartCard.tsx` (NEW)

---

### 2. CSV export

**What to integrate:**
- "Export CSV" button on each chart card
- Fetch `GET /analytics/:chart/export?<same filters>` with `Accept: text/csv`
- Browser download via `Blob` + `URL.createObjectURL`
- Filename: `analytics-{chart}-{periodKey}.csv`

**API:**
- `GET /analytics/:chart/export` (NEW V2)

**UI changes:**
- Disable the button while download is in flight; toast on success / failure

---

### 3. Audit log — org-wide

**What to integrate:**
- Replace V1 mock in `admin/audit-log/page.tsx` and `super-admin/audit-log/page.tsx`
- `useAuditLog({ filters })` calls `GET /audit-log?actorUid=&action=&category=&targetType=&targetId=&from=&to=&limit=20&cursor=`
- Filter chips: category (auth, enrollment, cell, role), date range presets, search by actor UID / email
- Pagination using `nextCursor`
- 403 → toast "Insufficient permissions"

**API:**
- `GET /audit-log` (existing path; V2 contract may have new actions like `cell_report.filed`)

**UI changes:**
- Audit row shows: timestamp, actor (avatar + email), action (humanised), target (type + clickable ID), requestId (copyable)
- Compact mode for the dashboard "Recent activity" tile

---

### 4. Audit log — per user

**What to integrate:**
- New per-user audit page reachable from the user directory: `admin/users/[uid]/audit/page.tsx`
- `useUserAuditLog(uid)` calls `GET /users/:uid/audit-log` (same query params as org-wide)
- Renders as a timeline (`.audit-timeline` from `tccr-additions.css`) — date-grouped

**API:**
- `GET /users/:uid/audit-log` (NEW V2)

**Files:**
- `src/app/admin/users/[uid]/audit/page.tsx` (NEW)
- `src/app/super-admin/users/[uid]/audit/page.tsx` (NEW)
- `src/components/audit/UserAuditTimeline.tsx` (NEW)

---

### 5. Role mutation — `PATCH /users/:uid/roles`

**What to integrate:**
- User detail page gets a "Manage roles" button
- Dialog renders a checkbox per role with caller-scoped permissions:
  - `super_admin` viewer can toggle: `student`, `leader`, `g12`, `admin` (NOT another super_admin on others; NOT demote last super_admin)
  - `admin` viewer can toggle: `student`, `leader`, `g12` (NOT `admin` or `super_admin`)
  - `g12` viewer can toggle: `g12` only (promote a `leader` to `g12`), scoped to their network
- "Save" computes the diff and calls `PATCH /users/:uid/roles { add: [...], remove: [...] }`
- Errors: 403 `FORBIDDEN` → toast; 409 `LAST_SUPER_ADMIN` → modal-level error

**API:**
- `PATCH /users/:uid/roles` (NEW V2)

**UI changes:**
- `<ManageRolesDialog>` component renders disabled checkboxes for roles the caller can't touch
- "Admin cannot modify their own roles" — when looking at own profile via admin route, button is hidden (FR-ADM-008)
- Diff preview before save: "+ Leader, − Student"

**Files:**
- `src/components/admin/ManageRolesDialog.tsx` (NEW)
- `src/app/admin/users/[uid]/page.tsx` (NEW or refactor)
- `src/app/super-admin/users/[uid]/page.tsx` (NEW)

---

### 6. V2 user directory

**What to integrate:**
- Rewrite `admin/students/page.tsx` as the V2 user directory at `admin/users/page.tsx`
- `GET /users?roles=&status=&search=&batchId=&limit=&cursor=` (V2 adds `batchId` filter)
- Filter chips: role (member / student / leader / g12 / admin), status (approved / suspended), batch dropdown when `?courseId=` is set
- Each row renders the `RoleBadgeStack` component (already exists)
- Row actions: View profile · Manage roles · Suspend / Reactivate · View audit
- Pagination with `nextCursor`

**API:**
- `GET /users` (existing; `?batchId=` is new)
- `POST /users/:uid/suspend` (existing)
- `POST /users/:uid/reactivate` (existing)

**Migration notes:**
- Keep `admin/students` URL forwarding to `/admin/users` for back-compat
- `admin/students/[studentId]/page.tsx` becomes `admin/users/[uid]/page.tsx`

---

### 7. Super-admin admin management (small completions)

**What to integrate:**
- `GET /super-admin/admins/:uid` — direct fetch instead of going through `/users/:uid`
- `DELETE /super-admin/admins/:uid` — soft-delete with confirm dialog

**API:**
- `GET /super-admin/admins/:uid` (existing; just switching the source)
- `DELETE /super-admin/admins/:uid` (NEW path-wise — V1 had no delete-admin)

**UI changes:**
- Admin detail page already has a "Delete admin" button — wire it
- 409 → toast

---

### 8. Health probe surface

**What to integrate:**
- Admin status page at `super-admin/system-status/page.tsx` (NEW) — for super admins to monitor backend health
- Polls `GET /healthz` and `GET /readyz` every 60s
- Renders a status-light grid: API Gateway, Firestore, Storage (from `readyz` detailed response)

**API:**
- `GET /healthz` (NEW V2)
- `GET /readyz` (NEW V2)

**Files:**
- `src/app/super-admin/system-status/page.tsx` (NEW)
- `src/application/hooks/useHealthProbe.ts` (NEW)

---

### 9. i18n final pass

**What to integrate:**
- Walk every V2 string added across sprints 1-7 and confirm `en.json` has the key
- Add empty-string placeholders for missing `si.json` / `ta.json` keys so the fallback works without warnings
- Lint script: a Node script that diffs keys between `en.json` and `si.json` / `ta.json` and prints missing keys
- CI step calls the lint script; warning-level only (doesn't fail the build, but visible)
- Add `<ScriptOptimisedText>` wrapper for user-generated SI/TA text where line-height matters (cell-report viewer, course descriptions)

**Files:**
- `scripts/i18n-diff.js` (NEW)
- `src/components/i18n/ScriptOptimisedText.tsx` (NEW)
- `package.json` adds `"i18n:diff": "node scripts/i18n-diff.js"`

---

### 10. Polish pass (small)

- Dark mode audit: every page renders correctly in `theme-dark`
- Accessibility: every interactive element has an aria-label; tab order makes sense in the cell-report multi-step form
- Performance: lazy-load the chart components on dashboards; first-render < 200ms on 3G fast
- Empty states: every list page has a friendly empty state with a primary CTA
- Error boundaries: page-level `<ErrorBoundary>` around each route group catches sub-tree exceptions

---

## Files touched

```
src/application/hooks/useAnalytics.ts                                   (NEW)
src/application/hooks/useAuditLog.ts                                    (rewrite)
src/application/hooks/useUserAuditLog.ts                                (NEW)
src/application/hooks/useHealthProbe.ts                                 (NEW)
src/components/analytics/{LineChart,BarChart,ChartCard,KpiMini}.tsx     (NEW)
src/components/audit/UserAuditTimeline.tsx                              (NEW)
src/components/admin/ManageRolesDialog.tsx                              (NEW)
src/components/i18n/ScriptOptimisedText.tsx                             (NEW)
src/app/(leader)/leader/analytics/page.tsx                              (wire)
src/app/(g12)/g12/analytics/page.tsx                                    (wire)
src/app/admin/analytics/page.tsx                                        (NEW)
src/app/admin/audit-log/page.tsx                                        (wire)
src/app/admin/users/page.tsx                                            (NEW; rewrites /admin/students)
src/app/admin/users/[uid]/page.tsx                                      (NEW)
src/app/admin/users/[uid]/audit/page.tsx                                (NEW)
src/app/super-admin/audit-log/page.tsx                                  (wire)
src/app/super-admin/users/[uid]/page.tsx                                (NEW)
src/app/super-admin/users/[uid]/audit/page.tsx                          (NEW)
src/app/super-admin/system-status/page.tsx                              (NEW)
src/app/admin/students/page.tsx                                         (redirect to /admin/users)
scripts/i18n-diff.js                                                    (NEW)
package.json                                                            (i18n:diff script)
src/messages/en.json                                                    (admin.analytics.*, admin.audit.*, admin.roles.*)
```

---

## Tests (per FR-T-001)

**Unit:**
- `useAnalytics.test.ts` — every endpoint returns expected shape; scope derived from caller's role
- `i18n-diff.test.js` — given fixtures, reports missing keys
- `ManageRolesDialog.test.tsx` (logic) — diff computation correct; super-admin self-edit disabled

**Integration (RTL):**
- `analytics-page.test.tsx` — renders all five charts for G12 viewer; only three for Leader
- `audit-log.test.tsx` — filters apply; pagination cursors work
- `manage-roles-dialog.test.tsx` — toggling adds to diff; 403 surfaces inline

**E2E (Playwright):**
- `role-mutation.spec.ts` — admin promotes member to student → student logs in → has student dashboard
- `analytics-export.spec.ts` — click Export → file downloads with correct name
- `audit-trail.spec.ts` — every approve/reject in earlier sprints leaves an entry visible in the org-wide log

---

## Checklist

- [ ] All 5 analytics endpoints wired
- [ ] Leader / G12 / Admin / Super Admin analytics dashboards render correct scope
- [ ] CSV export works for each chart
- [ ] Org-wide audit log replaces V1 mock with full filter set
- [ ] Per-user audit timeline page accessible from user directory
- [ ] `PATCH /users/:uid/roles` dialog respects caller-scoped permissions
- [ ] `LAST_SUPER_ADMIN` blocks the demote with a clear error
- [ ] V2 user directory at `/admin/users` with role chip stacks + batch filter
- [ ] `/admin/students` redirects to `/admin/users`
- [ ] `DELETE /super-admin/admins/:uid` wired with confirm
- [ ] Admin status page polls `/healthz` + `/readyz`
- [ ] `scripts/i18n-diff.js` runs in CI (warning only)
- [ ] `ScriptOptimisedText` wraps user-generated SI/TA content
- [ ] Dark mode audit pass complete
- [ ] All V2 surfaces have empty states + error boundaries
- [ ] Tests written and green

---

## Acceptance criteria for V2 launch

- All 8 sprints' checklists complete
- All ~109 endpoints from `Version_02__API_Reference 1 (1).md` mapped to a hook or one-shot call site
- No call site reads `user.role` scalar; every role check is `useRoles().can([...])` or `<RoleGuard>`
- No call site reads `localStorage` for auth tokens
- Every authed request sends `Accept-Language`
- Every form mutation has a Vitest unit test + RTL integration test + at least one negative-path case
- One end-to-end happy path per role (Member, Student, Leader, G12, Admin, Super Admin) green in Playwright
- The TCCR Web Frontend Blueprint v2.0 is fully reflected in the live UI
