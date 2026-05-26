# Spec: TCCR Phase 2 — V2 Backend Integration
**Version:** v02
**Date:** 2026-05-19
**Status:** Active
**Supersedes:** `_specs/v01-integration/spec.md` (V1 baseline — kept for reference)

---

## 1. Overview

The Phase 1 codebase (EduPath / CMP) shipped as a single-purpose Course Management Portal with V1 backend (`slp-backend` v1.x). About **51 of the V1 API endpoints are already integrated** into the live React/Next.js code (signup, login, course CRUD, enrollments, progress, notifications, admin user management, super-admin admin management).

Phase 2 re-baselines the product as **TCCR** — the Bible-School module retains all the V1 surfaces, plus a brand-new **Cell Groups** module, federated sign-in, multi-role identity, intake-batches under each course, analytics, audit timelines, and tri-lingual i18n (`si` / `ta` / `en`). The corresponding backend release is **`tccr-backend` v2.3.0** (TCCR API Reference, 17 May 2026) which exposes **112 endpoints** at `https://api.tccr.lk/api/v1`.

This spec covers integrating the **~61 net-new or contract-changed V2 endpoints** and refactoring the existing V1 integrations whose contracts moved (registration approval flow, enrollment paths, role model). UI work follows the V2 blueprint and `tccr-screens-*.jsx` prototypes already in `src/ui_structure/v2/`.

---

## 2. Scope

### In scope
- **Auth overhaul**: registration is now self-service (every signup creates an active Member — no admin approval queue); add Google + Apple federated sign-in; provider link/unlink; failure tracking with 10-strike lockout; 30-minute web inactivity timeout
- **Multi-role identity**: replace scalar `role` with `roles: Role[]`; `activeRole` switcher with per-user localStorage persistence; `super_admin ⊃ admin` inheritance; role union match in route guards
- **Role requests** (NEW): Member → Student approval pathway (`POST /role-requests`), admin queue, decision flow, member-side "My Requests"
- **Batches** (NEW): intake cohorts under each course; admin creates / opens / closes / patches; enrollment now requires `{ courseId, batchId }`
- **Cell Groups module** (NEW): cells list, my-cells, create cell, member roster, direct add/remove, member-initiated join requests, admin approve/reject
- **Cell Reports** (NEW): multi-step report form, photo upload, attendance from roster, idempotency, void
- **Analytics** (NEW): 5 chart endpoints + CSV export — Leader / G12 / Admin / Super Admin scoped dashboards reading pre-aggregated snapshots
- **Audit log V2**: keep org-wide log; add per-user audit timeline (`GET /users/:uid/audit-log`)
- **Profile V2**: avatar upload, FCM token register/deregister, per-channel notification preferences, linked-provider chip stack
- **Role mutation** (NEW): `PATCH /users/:uid/roles` with caller-scoped add/remove rules; last-super-admin guard
- **Subject images** (NEW): PNG/JPG cover gallery alongside PDF/DOCX attachments
- **Semester dates** (NEW): `openDate` + `endDate`; auto-disable after `endDate`
- **Course restore** (NEW): `POST /courses/:id/restore` from archive → draft
- **Locale-aware backend**: every authenticated request sends `Accept-Language`; notifications and emails render in the recipient's `preferredLanguage`
- **All V1 endpoint path changes**: `/me/enrollments` → `/enrollments/mine`, `/courses/:id/enroll` → `POST /enrollments`, `/admin/enrollments` → `/enrollments`, `/admin/registrations` removed entirely (replaced by role requests)
- **Test instructions per sprint**: each developed feature includes a unit / integration / e2e test brief

### Out of scope (deferred / handled elsewhere)
- Backend implementation (`tccr-backend` is delivered by the platform team)
- Native mobile cell-report PWA work (web-first; mobile flow noted but not built here)
- Push notification delivery infrastructure (FCM token registration is on the client; server-side fanout lives in the backend)
- Recharts dependency — V2 charts stay hand-rolled SVG per CLAUDE.md
- i18n catalogue translation work for `si` / `ta` (the keys are scaffolded; native speakers fill in the strings)
- Playwright / Storybook setup beyond what each sprint specifies

---

## 3. Functional Requirements

Numbered to map back to SRS FR codes where they exist; sprint files cite these IDs in their feature scopes.

### Auth & Identity
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-A-001 | Member registration creates an **active Member immediately** — no `pending_approval` status, no admin queue | MUST |
| FR-A-002 | Google sign-in via Firebase `signInWithPopup` → `POST /auth/federated/google` exchanges ID token for Firebase custom token | MUST |
| FR-A-003 | Apple sign-in via Firebase `signInWithPopup` → `POST /auth/federated/apple`; Apple identity token discarded after exchange | MUST |
| FR-A-004 | Authenticated user can link or unlink Google / Apple from profile; cannot unlink the last sign-in method | MUST |
| FR-A-005 | Failed login attempts call `POST /auth/track-failure`; after 10 failures in 15 min the account is locked for 15 min; lock clears automatically | MUST |
| FR-A-006 | Password reset is a 2-step OTP flow: `POST /auth/password-reset` → 6-digit code → `POST /auth/password-reset/verify` → Firebase reset email | MUST |
| FR-A-007 | Firebase ID token lives in memory only (no localStorage) and is refreshed via `user.getIdToken()` before every authed request | MUST |
| FR-A-008 | After 30 minutes of inactivity, the user is signed out automatically with a toast | MUST |
| FR-A-009 | `Accept-Language` header is attached to every authed request based on the active locale | MUST |
| FR-A-010 | Logout calls Firebase `signOut`, `POST /auth/logout`, `DELETE /me/fcm-token` (best-effort), clears Redux session, removes localStorage `edupath.activeRole.{uid}` | MUST |

### Multi-Role & Authorization
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-R-001 | `sessionSlice` stores `roles: Role[]` (not scalar); `Role` union = `member \| student \| leader \| g12 \| admin \| super_admin` | MUST |
| FR-R-002 | `useRoles()` hook returns `{ roles, effective, primary, isMember, isStudent, isLeader, isG12, isAdmin, isSuperAdmin, can(required[]) }`; `effective` expands `super_admin → [super_admin, admin]` | MUST |
| FR-R-003 | `<RoleGuard allowAny={[...]}>` wraps role-restricted regions; route-group `layout.tsx` uses union match | MUST |
| FR-R-004 | `activeRole` persisted at `localStorage.edupath.activeRole.{uid}`; defaults to highest assigned role at login | MUST |
| FR-R-005 | TopNav surfaces "Switch to X" pill for dual-role users; switching navigates to that role's dashboard | MUST |

### Profile, Avatar, Preferences, FCM
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-P-001 | Profile page loads from `GET /me`, includes `preferredLanguage`, `roles[]`, `providers[]`, `notificationPreferences` | MUST |
| FR-P-002 | `PATCH /me` saves only changed fields (first name, last name, preferred language, profile photo URL) | MUST |
| FR-P-003 | Avatar upload via `POST /me/avatar` (multipart, 2 MB max, JPEG/PNG); preview before save | MUST |
| FR-P-004 | FCM token registered via `POST /me/fcm-token` after every login and on token rotation; deregistered on logout | MUST |
| FR-P-005 | Notification preferences UI toggles `email` and `push`; essential notifications still deliver in-app regardless | MUST |
| FR-P-006 | Linked-accounts chips show `password` / `google.com` / `apple.com`; "Link Google" / "Link Apple" / "Unlink" actions wired | MUST |

### Role Requests (Bible School Path)
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-RR-001 | Member can submit `POST /role-requests` with `{ requestedRole: "student" }`; member home shows pending callout when one exists | MUST |
| FR-RR-002 | "My Requests" page lists own role requests with reviewer name and decision note via `GET /role-requests/mine` | MUST |
| FR-RR-003 | Admin role-requests queue lists pending / approved / rejected requests with filters and pagination | MUST |
| FR-RR-004 | Approve grants `student` role; reject sets `status: rejected` with optional note; requestor is notified in their preferred language | MUST |
| FR-RR-005 | Repeated pending request → `409 ROLE_REQUEST_PENDING` shown inline | MUST |

### Batches & Course Enrollment V2
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-B-001 | Admin can list / create / patch / open / close batches for any course | MUST |
| FR-B-002 | A course must have ≥1 batch and ≥1 semester (each with ≥1 subject) to publish | MUST |
| FR-B-003 | Public course catalogue displays open batches as "intake cards"; student picks a batch when applying | MUST |
| FR-B-004 | Enrollment is now `POST /enrollments` with `{ courseId, batchId }`; the V1 path `POST /courses/:id/enroll` no longer exists | MUST |
| FR-B-005 | Enrollment ID format changes to `${userUid}_${batchId}`; client must use the new ID for withdraw / detail | MUST |
| FR-B-006 | Student-side enrollment list calls `GET /enrollments/mine`; admin queue calls `GET /enrollments` (path changed from `/admin/enrollments`) | MUST |
| FR-B-007 | Closed batch returns `422 BATCH_CLOSED` → inline "This intake has closed" with link to next open batch | MUST |
| FR-B-008 | Past intakes auto-close server-side; client displays past batches as "Closed" disabled chips | MUST |

### Course Content V2
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-C-001 | Semester forms add `openDate` (required) and `endDate` (optional); display as `.sem-dates` badge | MUST |
| FR-C-002 | Past `endDate` → semester is auto-disabled by backend nightly sweep; client renders `.sem-dates.disabled` and locks the subject list | MUST |
| FR-C-003 | Subject editor adds an image gallery (PNG/JPG ≤10 MB) via `POST /subjects/:id/images`; existing attachment row keeps PDF/DOCX | MUST |
| FR-C-004 | Admin can restore an archived course via `POST /courses/:id/restore`; the course returns to `draft` state | MUST |
| FR-C-005 | Public course detail shows the image gallery above the subject description; carousel is keyboard-navigable | SHOULD |

### Cell Groups Module
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-CG-001 | Member sees "My Cells" page listing cells they belong to (read-only) via `GET /cells/mine` | MUST |
| FR-CG-002 | Member can browse active cells via `GET /cells` and apply to join via `POST /cells/:id/join-requests` | MUST |
| FR-CG-003 | Leader / G12 can create cells (`POST /cells`), edit (`PATCH /cells/:id`), archive (`POST /cells/:id/archive`) | MUST |
| FR-CG-004 | Leader / G12 / Admin can add members directly (`POST /cells/:id/members`) and remove members (`DELETE /cells/:id/members/:uid`) | MUST |
| FR-CG-005 | Admin sees the cell join-request queue per cell and can approve / reject | MUST |
| FR-CG-006 | Cell detail page shows roster, recent reports, and (for owning leader) the "File Report" CTA | MUST |

### Cell Reports Module
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-CR-001 | Multi-step report form mirrors `tccr-screens-cells.jsx` (steps sidebar + form atoms) | MUST |
| FR-CR-002 | Photos are uploaded **first** via `POST /cells/:id/report-photos` (1–10 files, 5 MB each); returned URLs are inlined into `photoUrls[]` when filing the report | MUST |
| FR-CR-003 | Every `POST /cells/:id/reports` includes a fresh `X-Idempotency-Key: <uuid>`; same key returns the existing report with `200 OK` | MUST |
| FR-CR-004 | Attendance list pre-populates from `GET /cells/:id` roster; leader removes "present" chips, remaining = absent | MUST |
| FR-CR-005 | If `didMeet = false` only `noMeetReason` is sent; all meeting fields are hidden | MUST |
| FR-CR-006 | Members can view their cell's past reports (read-only) but cannot file or void | MUST |
| FR-CR-007 | Void dialog calls `POST /cells/:id/reports/:rid/void` with reason; report stays visible flagged "Voided" | MUST |
| FR-CR-008 | Submission Service Worker queues offline reports up to 24h and retries with the same idempotency key | SHOULD |

### Analytics
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-AN-001 | Leader sees `cells/weekly`, `attendance`, `meeting-types` scoped to own cells | MUST |
| FR-AN-002 | G12 sees `cells/weekly`, `attendance`, `meeting-types`, `growth`, `participation` for own network | MUST |
| FR-AN-003 | Admin / Super Admin see org-wide scope on every chart | MUST |
| FR-AN-004 | "Export CSV" downloads from `GET /analytics/:chart/export` with the same filter params | MUST |
| FR-AN-005 | All chart responses must render in <2 s (NFR-PER-003); skeleton on initial load only | MUST |

### Audit Log
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-AU-001 | Admin / Super Admin audit log page replaces V1 mock with `GET /audit-log` (date / category / actor / target filters; cursor pagination) | MUST |
| FR-AU-002 | User detail page (`/admin/users/:uid` / super-admin equivalent) shows a per-user audit timeline via `GET /users/:uid/audit-log` | MUST |

### Role Mutation & User Directory V2
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-U-001 | User directory shows multi-role chips (RoleBadgeStack); filter chips for `member`, `student`, `leader`, `g12`, `admin` | MUST |
| FR-U-002 | Admin can add/remove `student`, `leader`, `g12` via `PATCH /users/:uid/roles`; cannot touch `admin` or `super_admin` | MUST |
| FR-U-003 | Super Admin can add/remove any role except creating another super_admin on others or demoting the last super_admin (`409 LAST_SUPER_ADMIN`) | MUST |
| FR-U-004 | G12 can promote a `leader` to `g12` via the same endpoint, scoped to their network | MUST |
| FR-U-005 | Admin cannot modify their own roles (`FR-ADM-008`) | MUST |
| FR-U-006 | `?batchId=` filter added to `GET /users` so admin can see all enrolees per intake | SHOULD |

### Localisation
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-L-001 | `preferredLanguage` is read on login and pushed into the locale slice; `Accept-Language` header is attached to every request | MUST |
| FR-L-002 | Notifications and password-reset emails arrive in the recipient's `preferredLanguage` (backend honours `localeRendered` field) | MUST |
| FR-L-003 | All V2 surfaces use `useTranslations()` — no hardcoded UI strings | MUST |
| FR-L-004 | `<html lang="...">` syncs with active locale so script-specific fonts (Noto Sans Sinhala / Tamil) apply | MUST (already shipped, fix branch merged) |

### Testing
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-T-001 | Each sprint includes at least: (a) one Vitest unit test per new utility, hook, or pure function; (b) one Playwright / RTL integration test per critical happy path; (c) one negative-path test (validation error, permission denied, conflict) | MUST |
| FR-T-002 | Test files live alongside source under `tests/` mirroring the source tree | MUST |

---

## 4. UI / UX Requirements

The V2 prototype already lives under `src/ui_structure/v2/project/`. The exact screen list per sprint follows that bundle. UI changes called out by sprint:

- **Login / Register** — already wired to `auth.login` / `auth.register` translation keys; sprint 1 adds Google + Apple buttons (already present in markup but currently `onClick={toast}` only), inline lockout countdown, OTP modal
- **Member Home (`/home`)** — sprint 3 turns the "Become a Student" tile into a real form posting to `/role-requests` and shows live status from `/role-requests/mine`
- **Profile** — sprint 2 adds: avatar upload widget, linked-accounts chip stack with Link/Unlink, notification preferences toggle, preferred-language dropdown
- **Browse Courses** — sprint 4 switches to "Open Intakes" view, each course card lists open Batches
- **My Courses** — sprint 5 shows batch name alongside course title; uses new enrollment ID
- **Admin Courses** — sprint 4 adds Batches sub-tree (list, create, open, close); sprint 5 adds Subject image-gallery
- **Cells, Cell detail, Reports** — sprint 6 & 7 build from `tccr-screens-cells.jsx`
- **Analytics dashboards** — sprint 8 builds SVG-based charts per `tccr-screens-cells.jsx` analytics blocks
- **Audit log** — sprint 8 swaps mock for API; user-detail timeline is new
- **User Directory / Role Requests** — sprint 3 & 8 add chip stacks and PATCH-roles dialog

---

## 5. Endpoint Coverage

| Group | Endpoints | V1 Done | V2 New / Changed | Sprint |
|-------|----------:|:-------:|:----------------:|:------:|
| Auth | 7 | 2 | 5 | 1 |
| Profile / Me | 11 | 3 | 8 | 2 |
| Users (Admin) | 6 | 4 | 2 | 8 |
| Role Requests | 6 | 0 | 6 | 3 |
| Courses | 9 | 6 | 3 | 4 |
| Batches | 6 | 0 | 6 | 4 |
| Semesters | 4 | 3 | 1 | 5 |
| Subjects & Lessons | 8 | 8 | 0 (V2 adds image field on POST) | 5 |
| Attachments & Images | 4 | 3 | 1 | 5 |
| Enrollments | 6 | 4 (old paths) | 6 (paths/contract changed) | 5 |
| Progress | 5 | 4 | 1 | 5 |
| Cell Groups | 12 | 0 | 12 | 6 |
| Cell Reports | 5 | 0 | 5 | 7 |
| Analytics | 6 | 0 | 6 | 8 |
| Notifications | 3 | 3 | 0 (server adds `localeRendered`) | 2 |
| Audit Log | 2 | 1 | 1 | 8 |
| Super-Admin Mgmt | 7 | 5 | 2 | 8 |
| Health | 2 | 0 | 2 | 8 |
| **Total** | **109** | **46** | **63** | — |

> The doc cites "112 endpoints" — the table rounds because some sub-resources (e.g. `GET /me/notifications` + `read` + `read-all`) are counted together in groups. The full enumeration is in the sprint files.

---

## 6. Out-of-Band Decisions

These call-outs deviate from the strictest reading of the API doc or the V1 codebase. They are documented here so reviewers don't flag them as bugs:

1. **Federated tokens are never persisted.** Google / Apple ID tokens come in via `signInWithPopup`, are passed to `POST /auth/federated/*`, then dropped. The backend returns a Firebase custom token which we exchange via `signInWithCustomToken`.
2. **`localStorage` holds only `activeRole` and `locale` — never auth tokens.** Firebase manages its own session under its own keys; we don't shadow it.
3. **`activeRole` and `roles[]` are different things.** `roles[]` is server truth; `activeRole` is a local UI preference for which dashboard to land on.
4. **V1 `/admin/registrations` is removed, not renamed.** The Member → Student approval flow moves to `/role-requests`. The existing `useRegistrationQueue` hook is repurposed as `useRoleRequestQueue` and the page-level component is renamed inside the same `/admin/registrations` route URL (to preserve back-link compatibility); the navigation label is "Role Requests".
5. **Enrollment IDs change shape.** From `${uid}_${courseId}` to `${uid}_${batchId}`. Any cached IDs from a V1 session will not work — the LoginForm clears all such cache on first V2 login.
6. **Charts are hand-rolled SVG.** No `recharts` dependency, per CLAUDE.md.
7. **Cell-report photos upload first, then report.** The doc lists `POST /cells/:id/report-photos` as a separate endpoint (§14.0) but Section 14.2 says photos can also be sent inline via multipart. The client uses the **two-step path** (photos first, URLs second) — it's simpler to give live preview and per-photo error handling.
8. **i18n key changes are tracked, not enforced.** Sprints add English keys with `// TODO si/ta` markers. The translation pipeline (`next-intl`) merges in fallback English when `si`/`ta` keys are missing, so missing keys don't break the build.

---

## 7. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|:----------:|:------:|------------|
| Firebase web SDK doesn't expose Apple's `signInWithPopup` cleanly on Sri Lankan domains | M | H | Sprint 1 has a 1-day spike; fallback is to show "Coming soon" on Apple button and ship Google only |
| Backend `/analytics/*` not returning <2 s during real load | L | H | Frontend assumes pre-aggregation; if a chart times out, skeleton stays and we show "Refresh" without retrying automatically |
| FCM token registration fires before service worker is ready | M | M | Wrap in `navigator.serviceWorker.ready` promise + queue; retry on next focus |
| Cell-report idempotency key gets reused across distinct submissions | M | H | Hook generates a fresh UUID **per submit**, not per form-mount |
| 30-min inactivity timer collides with long video playback | M | M | Reset timer on `<video>` playback events and any document `mousemove` / `keydown` / `scroll` |
| Translation keys added but `si.json` / `ta.json` not updated → user sees English | H | L | `mergeWithFallback` already merges to English; CI lints for missing keys at release time only |

---

## 8. References

- `Version_02__API_Reference 1 (1).md` — paste of the API doc (treated as canonical for endpoint shapes)
- `.claude/TCCR_Web_Frontend_Blueprint_v2_0.md` — UI / data-flow blueprint
- `src/ui_structure/v2/project/` — visual prototype (HTML + JSX)
- `_specs/v01-integration/spec.md` — V1 spec (reference only)
- `_plans/v02/plan.md` — companion plan with sequencing and endpoint deltas
- `_sprints/v02/sprint-{01..08}.md` — feature breakdown
