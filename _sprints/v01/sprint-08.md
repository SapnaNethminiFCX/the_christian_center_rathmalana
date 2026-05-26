# Sprint 8: Notifications, User Management, Admin Management, Audit Log & Dashboards

**Goal:** Wire up the final feature set — real-time notifications, admin user/admin management, live audit log, and real-data admin / super-admin dashboards.
**Estimated effort:** L
**Depends on:** Sprint 1 (auth), Sprint 2 (users exist in the system), Sprint 7 (progress data for student dashboard)
**Status:** Not started

---

## Branch(es)
- `feature/notifications` — notification list, mark read, bell badge count
- `feature/user-management` — admin: list/suspend/reactivate students
- `feature/admin-management` — super admin: list/create/suspend/reactivate/delete/promote admins
- `feature/audit-log` — real audit log with API filters
- `feature/dashboards` — admin & super-admin dashboard widgets wired to real APIs *(do last — depends on most other branches landing first)*

> Five separate branches — each can be reviewed and merged independently.

---

## Features

### Notifications
**What to integrate:**
- Notification bell badge shows count of unread notifications from `GET /me/notifications?read=false`
- Notifications page loads full list from API
- Click notification → mark as read → `POST /me/notifications/:id/read`
- "Mark all as read" button → `POST /me/notifications/read-all`
- Refetch unread count after marking read

**UI changes needed:**
- Bell badge: replace hardcoded count with real unread count
- Notifications list: real titles, bodies, categories, timestamps
- Category icon based on `category` field (`enrollment_approved`, `registration_approved`, etc.)
- Unread notifications highlighted; read notifications muted
- `markedCount` from mark-all response shown in success toast

**Error states to handle:**
- `404` on single mark-read → toast "Notification not found"

---

### User Management (Admin — Student Accounts)
**What to integrate:**
- Students list page → `GET /users?role=student&limit=25`
- Search → `?q=` param
- Status filter → `?status=` param (approved, suspended, pending_approval)
- Student detail page → `GET /users/:uid`
- Suspend student → `POST /users/:uid/suspend` with optional reason
- Reactivate student → `POST /users/:uid/reactivate`

**UI changes needed:**
- Student list table with real data (name, email, status, enrollment count, joined date)
- Pagination using `nextCursor`
- Suspend button → confirm dialog with optional reason field
- Reactivate button → confirm dialog
- Student detail: real profile, real enrollment history with course titles and states
- Status badge reflects real `status` from API

**Error states to handle:**
- `409 ALREADY_SUSPENDED` → toast "Student is already suspended"
- `409 ALREADY_ACTIVE` → toast "Student is already active"
- `404` → toast "Student not found"

---

### Admin Management (Super Admin)
**What to integrate:**
- Admin list → `GET /super-admin/admins?limit=25`
- Create admin → `POST /super-admin/admins` (firstName, lastName, email, initialPassword)
- Admin detail → `GET /super-admin/admins/:uid`
- Suspend admin → `POST /super-admin/admins/:uid/suspend`
- Reactivate admin → `POST /super-admin/admins/:uid/reactivate`
- Delete admin → `DELETE /super-admin/admins/:uid`
- Promote student to admin → `POST /super-admin/users/:uid/make-admin`

**UI changes needed:**
- Admin list table with real data (currently uses mock `ADMINS_SEED`)
- `createdAt` column from real API
- Create admin form already built — wire to real endpoint
- Suspend/Reactivate already wired to mock — update to real UIDs from API
- Delete confirm dialog → `204` removes from list
- Promote to admin: input or search for student UID to promote

**Error states to handle:**
- `409 EMAIL_EXISTS` → inline on email field in create form
- `409 ALREADY_SUSPENDED` / `ALREADY_ACTIVE` → toast
- `409 INVALID_ROLE` on promote → toast "Only students can be promoted"
- `404 USER_NOT_FOUND` → toast

---

### Audit Log
**What to integrate:**
- Audit log table → `GET /audit-log?limit=20`
- Date range filter (already has dropdown) → sends `from` and `to` ISO dates
- Category filter chips → sends `category` param
- Search → sends `actorUid` or text via API params
- Pagination using `nextCursor`

**UI changes needed:**
- Replace mock `AUDIT_SEED` with real API data
- Real actor email + action + category + IP + timestamp
- Date range dropdown now uses actual ISO `from`/`to` params:
  - Last 7 days → `from = now - 7d`
  - Last 30 days → `from = now - 30d`
  - Last 90 days → `from = now - 90d`
  - All time → no `from`/`to`
- Pagination controls (currently no pagination on audit log)
- Total count in page header from `total` field

**Error states to handle:**
- `403` → toast "Insufficient permissions to view audit log"

---

### Admin & Super-Admin Dashboards
**What to integrate (uses endpoints already brought in by other Sprint 8 branches + earlier sprints):**

**Admin dashboard (`/admin/dashboard`):**
- Pending registrations count → from `useRegistrationQueue` (Sprint 2)
- Pending enrollments count → from `useAdminEnrollmentQueue` (Sprint 4)
- Total courses → `GET /courses?limit=1` (read `total` field)
- Total students → `GET /users?role=student&limit=1` (read `total`, this sprint)
- Recent audit activity (last 5 items) → `GET /audit-log?limit=5` (this sprint)
- Recent enrollments approved (last 5) → `GET /admin/enrollments?status=approved&limit=5` (Sprint 4)

**Super-admin dashboard (`/super-admin/dashboard`):**
- All admin tiles above PLUS:
- Total admins → `GET /super-admin/admins?limit=1` (read `total`, this sprint)
- Suspended student count → `GET /users?role=student&status=suspended&limit=1` (this sprint)
- System-wide notifications snapshot (optional)

**UI changes needed:**
- Replace mock stat tiles with real counts
- Replace mock "recent activity" list with real audit log entries
- Skeleton loaders on each tile while data fetches
- Each tile becomes a link to the relevant management page
- Optional: small chart (last 7 days of registrations / enrollments) if backend exposes a daily aggregation endpoint — *otherwise skip*

**Error states to handle:**
- Per-tile silent failure: if one stat 500s, others still render; failed tile shows "—"

---

## Checklist
- [x] Notification bell badge from `GET /me/notifications?read=false`
- [x] Notification list from API
- [x] Mark single notification read
- [x] Mark all notifications read
- [x] Unread count refreshes after marking read
- [x] Student list → `GET /users?role=student`
- [x] Student search and status filter
- [x] Student detail → `GET /users/:uid`
- [x] Suspend student → `POST /users/:uid/suspend`
- [x] Reactivate student → `POST /users/:uid/reactivate`
- [x] Admin list → `GET /super-admin/admins` (replace mock)
- [x] Create admin form wired to real endpoint
- [x] Suspend admin → real endpoint with UID from API
- [x] Reactivate admin → real endpoint
- [x] Delete admin → `DELETE /super-admin/admins/:uid`
- [x] Promote student to admin → `POST /super-admin/users/:uid/make-admin`
- [x] Audit log → `GET /audit-log` replaces mock
- [x] Date range filter sends ISO `from`/`to` params
- [x] Category filter sends `category` param
- [x] Audit log pagination
- [x] Admin dashboard tiles (registrations, enrollments, courses, students) wired to real counts
- [x] Admin dashboard "Recent activity" pulls from `GET /audit-log?limit=5`
- [x] Super-admin dashboard adds admins + suspended-students tiles
- [x] Dashboard tile click navigates to the relevant management page
- [x] Skeleton loaders while dashboard tiles fetch
- [x] Per-tile silent failure (one 500 doesn't break others)
- [x] Test full notification flow: admin approves enrollment → student sees notification
- [x] Test admin dashboard reflects live counts (create registration → tile increments)
