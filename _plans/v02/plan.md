# Integration Plan v02
**Date:** 2026-05-19
**Scope:** TCCR `tccr-backend` v2.3.0 integration on top of the V1 codebase
**Status:** Active

---

## 1. Overview

The frontend already calls **~46 V1 endpoints**. V2 brings:
- **~57 net-new endpoints** (federated auth, role requests, batches, cells, cell reports, analytics, FCM, audit-per-user, role mutation, subject images, providers link/unlink, notification preferences)
- **~6 contract-changed endpoints** (registration response, enrollment paths, course list response)
- **3 V1 endpoints removed** (`/admin/registrations*` — replaced by role requests)

Eight sprints deliver the integration feature-wise. Sprint 1 builds the auth foundation so every later sprint can lean on `useRoles()`, the union route guards, and the locale-aware request wrapper. Sprints 2–8 are deliberately ordered so each one unblocks the next: profile + FCM → role requests → batches & enrollment → course content V2 → cell groups → cell reports → analytics + role mutation.

---

## 2. Endpoint Delta from V1

### 2.1 Endpoints to **keep as-is** (29)

```
GET    /me                                    [already integrated]
POST   /auth/logout
POST   /me/change-password
GET    /me/notifications
POST   /me/notifications/:id/read
POST   /me/notifications/read-all
GET    /users
GET    /users/:uid
POST   /users/:uid/suspend
POST   /users/:uid/reactivate
GET    /courses
GET    /courses/:id
POST   /courses                               [admin]
PATCH  /courses/:id
POST   /courses/:id/publish
POST   /courses/:id/unpublish
POST   /courses/:id/archive
DELETE /courses/:id
GET    /courses/:id/semesters
PATCH  /semesters/:id
DELETE /semesters/:id
GET    /semesters/:id/subjects
POST   /semesters/:id/subjects
PATCH  /subjects/:id
DELETE /subjects/:id
GET    /subjects/:id/lessons
POST   /subjects/:id/lessons
PATCH  /lessons/:id
DELETE /lessons/:id
POST   /subjects/:id/attachments
GET    /attachments/:id/download-url
DELETE /attachments/:id
POST   /progress/subjects/:id/complete
POST   /progress/subjects/:id/access
GET    /me/progress/courses/:courseId
GET    /admin/progress/courses/:courseId
GET    /super-admin/admins
POST   /super-admin/admins
POST   /super-admin/admins/:uid/suspend
POST   /super-admin/admins/:uid/reactivate
POST   /super-admin/users/:uid/make-admin
GET    /audit-log                             [partial in V1]
```

### 2.2 Endpoints with **contract changes** (V2 response / request shape differs)

| Endpoint | V1 → V2 Change | Sprint |
|----------|----------------|:------:|
| `POST /auth/register` | Response was `{ uid, status: "pending_approval", … }` → V2 is `{ uid, message: "Registration successful." }`; user is **active immediately** | 1 |
| `GET /me` | V1 returned `role: "student"`; V2 returns `roles: ["member","student"]`, `providers: [...]`, `preferredLanguage`, `notificationPreferences` | 1 |
| `PATCH /me` | V2 accepts `preferredLanguage` | 2 |
| `GET /courses` | Each item now includes `batchCount` and `status` (was `state`) | 4 |
| `POST /courses/:id/semesters` | V2 requires `openDate`; accepts optional `endDate` | 5 |
| `POST /semesters/:id/subjects` | V2 accepts `imageUrls[]` | 5 |
| `GET /users` | V2 accepts `?batchId=` filter | 8 |

### 2.3 Endpoints with **path changes**

| V1 Path | V2 Path | Notes | Sprint |
|---------|---------|-------|:------:|
| `GET /me/enrollments` | `GET /enrollments/mine` | Renamed for consistency | 5 |
| `POST /courses/:courseId/enroll` | `POST /enrollments` | Body now `{ courseId, batchId }` | 5 |
| `GET /admin/enrollments` | `GET /enrollments` | Same auth scope, new path | 5 |
| `POST /admin/enrollments/:id/approve` | `POST /enrollments/:id/approve` | — | 5 |
| `POST /admin/enrollments/:id/reject` | `POST /enrollments/:id/reject` | — | 5 |

### 2.4 Endpoints **removed**

```
GET  /admin/registrations            → replaced by GET /role-requests
POST /admin/registrations/:id/approve → replaced by POST /role-requests/:id/approve
POST /admin/registrations/:id/reject  → replaced by POST /role-requests/:id/reject
POST /admin/registrations/bulk-approve → no V2 equivalent (per-request approval only)
```

`useRegistrationQueue.ts` is **renamed and rewritten** as `useRoleRequestQueue.ts` in Sprint 3. The URL `/admin/registrations` is kept (the page is just rewritten) so existing bookmarks / notification deep-links continue to resolve.

### 2.5 Endpoints **new** in V2 (63 total — listed by sprint)

**Sprint 1 — Auth (5)**
```
POST   /auth/federated/google
POST   /auth/federated/apple
POST   /auth/password-reset
POST   /auth/password-reset/verify
POST   /auth/track-failure
```

**Sprint 2 — Profile / FCM / Preferences (8)**
```
POST   /me/avatar
POST   /me/providers/link
DELETE /me/providers/:provider
POST   /me/fcm-token
DELETE /me/fcm-token
PATCH  /me/notifications/preferences
```

**Sprint 3 — Role Requests (6)**
```
POST   /role-requests
GET    /role-requests/mine
GET    /role-requests
GET    /role-requests/:id
POST   /role-requests/:id/approve
POST   /role-requests/:id/reject
```

**Sprint 4 — Batches (6) + Course Restore (1)**
```
GET    /courses/:id/batches
POST   /courses/:id/batches
GET    /batches/:id
PATCH  /batches/:id
POST   /batches/:id/open
POST   /batches/:id/close
POST   /courses/:id/restore
```

**Sprint 5 — Enrollment + Subject Images + Per-subject Progress (3)**
```
POST   /subjects/:id/images
GET    /me/progress/subjects/:subjectId
(plus path-change refactors from 2.3)
```

**Sprint 6 — Cell Groups (12)**
```
GET    /cells
GET    /cells/mine
POST   /cells
GET    /cells/:id
PATCH  /cells/:id
POST   /cells/:id/archive
POST   /cells/:id/members
DELETE /cells/:id/members/:uid
POST   /cells/:id/join-requests
GET    /cells/:id/join-requests
POST   /cells/:id/join-requests/:rid/approve
POST   /cells/:id/join-requests/:rid/reject
```

**Sprint 7 — Cell Reports (5)**
```
POST   /cells/:id/report-photos
GET    /cells/:id/reports
POST   /cells/:id/reports
GET    /cells/:id/reports/:rid
POST   /cells/:id/reports/:rid/void
```

**Sprint 8 — Analytics (6) + Audit per-user (1) + Role Mutation (1) + Health (2) + Super Admin (2)**
```
GET    /analytics/cells/weekly
GET    /analytics/attendance
GET    /analytics/meeting-types
GET    /analytics/growth
GET    /analytics/participation
GET    /analytics/:chart/export
GET    /users/:uid/audit-log
PATCH  /users/:uid/roles
GET    /healthz
GET    /readyz
GET    /super-admin/admins/:uid
DELETE /super-admin/admins/:uid
```

---

## 3. Packages to Install

```bash
# Sprint 1
# Firebase is already installed. Federated providers ship with the same SDK.

# Sprint 2
npm install firebase                  # already there
# (FCM via firebase/messaging — same package)

# Sprint 4
npm install zod react-hook-form @hookform/resolvers
# Batch + Semester + Subject forms need real validation; profile change passwords ditto

# Sprint 6
npm install uuid
# X-Idempotency-Key for cell reports

# Sprint 8
# Charts stay hand-rolled SVG — no recharts. Optional: papaparse for CSV import preview only (not needed if CSV is download-only).

# Testing
npm install -D vitest @testing-library/react @testing-library/user-event
npm install -D @playwright/test
# Per FR-T-001 — each sprint adds the test bricks it needs
```

---

## 4. Cross-Cutting Infrastructure (built in Sprint 1, used everywhere)

### 4.1 `apiRequest` wrapper

Extend `src/infrastructure/api/request.ts`:
- Always pull the current Firebase ID token from `tokenService` (in-memory) and attach `Authorization: Bearer ...`
- Always attach `Accept-Language` from the active locale slice
- Optional `X-Idempotency-Key` argument forwarded to header when provided
- Map V2 error codes to typed errors so call sites can `catch (e instanceof ApiRequestError && e.code === "ROLE_REQUEST_PENDING")`
- 401 on a valid token → call `tokenService.refresh()` and retry once; second 401 → sign out

### 4.2 `useRoles()` hook

```ts
function useRoles() {
  const roles = useAppSelector(s => s.session.user?.roles ?? []);
  const activeRole = useAppSelector(s => s.session.activeRole);
  const effective = roles.includes("super_admin") ? [...roles, "admin"] : roles;
  return {
    roles,
    effective,
    activeRole,
    primary: activeRole ?? defaultPrimary(roles),
    isMember:     effective.includes("member"),
    isStudent:    effective.includes("student"),
    isLeader:     effective.includes("leader"),
    isG12:        effective.includes("g12"),
    isAdmin:      effective.includes("admin"),
    isSuperAdmin: effective.includes("super_admin"),
    can: (required: Role[]) => required.some(r => effective.includes(r)),
  };
}
```

### 4.3 `<RoleGuard>` and route-group `layout.tsx`

```tsx
<RoleGuard allowAny={["leader", "g12", "admin", "super_admin"]}>
  {children}
</RoleGuard>
```

`super_admin → [super_admin, admin]` expansion is built into `useRoles().effective`.

### 4.4 Inactivity timer

Sprint 1 ships `useInactivityTimer({ minutes: 30, onTimeout })` that watches `mousemove`, `keydown`, `scroll`, `touchstart`, and `<video> playing` events. Mounted once in `AppShell`. On timeout → toast + signOut + redirect to `/login?reason=inactive`.

### 4.5 `tokenService`

```ts
let cachedToken: string | null = null;
let lastFetchedAt = 0;
export const tokenService = {
  get: async () => {
    const user = auth.currentUser;
    if (!user) return null;
    if (!cachedToken || Date.now() - lastFetchedAt > 50 * 60 * 1000) {
      cachedToken = await user.getIdToken();
      lastFetchedAt = Date.now();
    }
    return cachedToken;
  },
  refresh: async () => {
    const user = auth.currentUser;
    if (!user) return null;
    cachedToken = await user.getIdToken(true);
    lastFetchedAt = Date.now();
    return cachedToken;
  },
  clear: () => { cachedToken = null; lastFetchedAt = 0; },
};
```

Firebase's `onIdTokenChanged` listener calls `tokenService.refresh()` so we never miss a rotation.

---

## 5. UI Changes — Pages That Get Touched

Listed here at a glance; sprint files cover details.

| Page / Component | Sprint | Change |
|------------------|:------:|--------|
| `LoginForm.tsx` | 1 | Real Google + Apple buttons; lockout countdown; OTP forgot-password modal real |
| `RegisterForm.tsx` | 1 | `preferredLanguage` field; success message + redirect to login (no approval banner) |
| `sessionSlice.ts` | 1 | `roles: Role[]`, `activeRole`, `preferredLanguage` |
| `AuthGuard.tsx` | 1 | Switch to union role match; consume `useRoles().can()` |
| `AppShell.tsx` | 1 | Mount `useInactivityTimer`; mount `LanguageSwitcher` (already done) |
| `(student)/profile/page.tsx` + admin variants | 2 | Avatar upload, linked accounts, prefs, preferred language |
| `(authed)/home/page.tsx` | 3 | Student-request callout + status pill |
| `(authed)/my-requests/page.tsx` | 3 | New page — role + cell-join requests timeline |
| `admin/registrations/page.tsx` | 3 | Renamed component to RoleRequestsQueue; same URL |
| `admin/courses/[courseId]/page.tsx` | 4 | Batches sub-tree |
| `admin/courses/[courseId]/batches/new` & `[batchId]` | 4 | New pages — batch CRUD |
| `(public)/courses/page.tsx` | 4 | Open-intakes cards |
| `(student)/browse-courses/page.tsx` | 4 / 5 | Show batches, batch picker on enroll |
| `admin/courses/[courseId]/semesters/...` editor | 5 | `openDate` + `endDate` inputs |
| Subject editor | 5 | Image gallery uploader |
| `(student)/my-courses/page.tsx` | 5 | Batch name on card; new enrollment ID format |
| `(authed)/my-cells/...` | 6 | Read-only list + detail |
| `(leader)/cells/...` | 6 | Full Cells module |
| `(leader)/cells/[id]/reports/new` | 7 | Multi-step report form |
| `(leader)/cells/[id]/reports/[reportId]` | 7 | Report viewer + Void dialog |
| `(leader)/leader/analytics/page.tsx` | 8 | Charts wired to real API |
| `(g12)/g12/analytics/page.tsx` | 8 | Charts + network scope |
| `admin/analytics/page.tsx` (NEW) | 8 | Org scope |
| `admin/users/[uid]/roles` dialog | 8 | `PATCH /users/:uid/roles` |
| `admin/users/[uid]/audit/page.tsx` | 8 | `GET /users/:uid/audit-log` |

---

## 6. Risks & Mitigation

See spec §7. Plan-level call-outs:

- **Sprint 4 → Sprint 5 dependency.** Batches must be live before enrollment is refactored. If batch backend slips, ship Sprint 4 first and stub `batchId` from `/courses/:id` (use first open batch) in Sprint 5 so My-Courses doesn't break.
- **Sprint 6 → Sprint 7 dependency.** Cell roster must exist before cell-report attendance can pre-populate. Cell-report sprint is feature-flagged via the role guard — only Leader/G12 can navigate to it — so the dependency is naturally serialised.
- **Backend release cadence.** If the backend ships `/analytics/*` last, Sprint 8 can split: analytics ships separately from role mutation / audit timeline.

---

## 7. Sequencing Summary

```
Sprint 1 — Auth foundation   ── blocks everything
   │
   ├─ Sprint 2 — Profile / FCM / Prefs
   │
   ├─ Sprint 3 — Role requests (Member → Student path)
   │       │
   │       └─ Sprint 4 — Batches & Course restore
   │              │
   │              └─ Sprint 5 — Enrollment refactor + Course content V2
   │
   ├─ Sprint 6 — Cell Groups module
   │       │
   │       └─ Sprint 7 — Cell Reports module
   │
   └─ Sprint 8 — Analytics, Audit, Role Mutation, Polish
```

Sprints 2, 3, and 6 can be developed in parallel once Sprint 1 lands. Sprint 8 is the integration capstone and lands last.
