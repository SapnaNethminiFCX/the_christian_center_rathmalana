# Spec: Full Backend Integration — EduPath Frontend
**Version:** v01
**Date:** 2026-05-12
**Status:** Active

---

## 1. Overview

EduPath (`slp-web`) is a fully built Next.js 14 App Router frontend running entirely on in-memory mock data under `src/lib/mock/`. This spec covers replacing every mock with real API calls to `slp-backend` (REST, base `/api/v1`), along with all UI updates needed so forms, tables, and components correctly reflect real data shapes, error states, and field names from the backend.

**Signup is already integrated** and merged to `main` (`feature/signup-api-integration`). This spec covers everything from login onwards.

---

## 2. Scope

### In scope
- Firebase Auth SDK setup and login for all three roles (student, admin, super_admin)
- Token storage, auto-refresh, and attaching Bearer token to every authenticated request
- Route guards protecting all role-gated pages
- All 56 API endpoint integrations (see Section 5)
- UI updates per endpoint — field names, pagination, error states, real data shapes
- Replacing all `src/lib/mock/` imports with real API responses
- Inline and form-level error handling for every API error code

### Out of scope
- Backend development
- Push / email notifications (beyond in-app display)
- Unit and integration tests
- `src/ui_structure/` design handoff (reference only)
- Firebase Cloud Messaging

---

## 3. Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-001 | Firebase SDK initialised with env config keys from backend team | MUST |
| FR-002 | Login with email + password via Firebase Auth for all roles | MUST |
| FR-003 | Firebase ID token stored in Redux and attached to all API requests as Bearer | MUST |
| FR-004 | Token auto-refreshes before 1h expiry via `onIdTokenChanged` | MUST |
| FR-005 | Route guards protect `/admin/*`, `/super-admin/*`, `/(student)/*` by role | MUST |
| FR-006 | Logout calls Firebase `signOut` + `POST /auth/logout` + clears Redux session | MUST |
| FR-007 | Failed login attempts tracked via `POST /auth/track-failure` (locks after 10 attempts) | SHOULD |
| FR-008 | Password reset flow via `POST /auth/password-reset` from login page | SHOULD |
| FR-009 | Admin can list, approve, reject, and bulk-approve student registrations | MUST |
| FR-010 | All users can view and edit their profile via `GET /me` and `PATCH /me` | MUST |
| FR-011 | All users can change password via `POST /me/change-password` | MUST |
| FR-012 | Public course catalog loads from API (published courses only for public/student) | MUST |
| FR-013 | Course detail loads real semester → subject → lesson → attachment tree | MUST |
| FR-014 | Student can enroll in a published course; button reflects pending/approved state | MUST |
| FR-015 | Student can list and withdraw pending enrollments | MUST |
| FR-016 | Admin can approve and reject enrollment requests with optional reason | MUST |
| FR-017 | Admin can create, edit, publish, unpublish, archive, and delete courses | MUST |
| FR-018 | Admin can manage semesters and subjects within a course | MUST |
| FR-019 | Admin can manage lessons within a subject | MUST |
| FR-020 | Admin can upload (PDF/DOC/DOCX ≤25MB), download (signed URL), and delete attachments | MUST |
| FR-021 | Student can mark a subject complete manually; auto-complete fires at 90% video playback | MUST |
| FR-022 | Subject last-accessed timestamp tracked to power "Continue learning" resume | MUST |
| FR-023 | Course progress percentage loads from API and updates after marking complete | MUST |
| FR-024 | Admin can view per-student progress table for any course | SHOULD |
| FR-025 | Notification bell shows real unread count; list shows real notifications | MUST |
| FR-026 | Notifications can be marked read individually or all at once | MUST |
| FR-027 | Admin can list, suspend, and reactivate student accounts | MUST |
| FR-028 | Super admin can list, create, suspend, reactivate, and delete admin accounts | MUST |
| FR-029 | Super admin can promote a student account to admin role (dual-role) | SHOULD |
| FR-030 | Audit log loads from API with date range, category, and search filters | SHOULD |

---

## 4. UI / UX Requirements

### Pages & Components Affected

**Authentication**
- `src/components/auth/LoginForm.tsx` — remove mock role toggle; add real Firebase login; inline field errors per error code; loading state on submit; redirect by role from `GET /me` response
- All layout files (`admin/layout.tsx`, `super-admin/layout.tsx`, `(student)/layout.tsx`) — add `onAuthStateChanged` check with loading skeleton; redirect unauthenticated users to `/login`
- `src/components/layout/UserMenu.tsx` — real logout (Firebase `signOut` + API call)

**Registration Queue**
- `src/app/admin/registrations/page.tsx` + super-admin mirror — replace mock list with paginated API; add real timestamps; real total count in header; reject modal needs optional reason textarea; bulk-approve partial failure toast

**Profile**
- `src/app/(student)/profile/page.tsx` and admin profile areas — pre-fill from `GET /me`; save only changed fields via `PATCH /me`; disable Save button when no changes detected

**Course Catalog**
- `src/components/ui/CourseCover.tsx` — accept `imageUrl` prop; render `<img>` when present, fall back to gradient
- `src/app/(public)/courses/page.tsx` — paginated API list; search sends `?q=`; add next/prev pagination controls
- `src/app/(public)/courses/[courseId]/page.tsx` — real semester/subject tree; real lesson list

**Enrollments**
- Enroll button on course detail — POST; show "Pending approval" after; disabled if already enrolled
- `src/app/(student)/my-courses/page.tsx` — real enrollment cards with state badges (Pending / Approved / Rejected / Withdrawn); withdrawal only on `pending` state; show rejection reason

**Course Management (Admin)**
- `src/app/admin/courses/page.tsx` — real course list with state, updatedAt, enrollment count; pagination
- Course editor pages — create form POSTs; edit PATCHes; conditional publish/unpublish/archive buttons based on current `state`

**Course Structure Editor**
- Semester/subject tree — real CRUD; inline name editing; sort order field
- Lesson form (new component needed) — title, video URL (any provider), optional description
- Attachment upload — `multipart/form-data`; file type + size validation before upload; progress indicator; download opens signed URL in new tab

**Progress**
- Course viewer — progress bar uses real `completionPercent`; "Mark Complete" button → POST → "Completed ✓"; sidebar shows checkmark on completed subjects
- `src/app/(student)/dashboard/page.tsx` — "Continue learning" navigates to real `lastAccessedSubjectId`

**Notifications**
- `NotificationBell` — real unread count badge
- `src/app/(student)/notifications/page.tsx` — real list; mark read on click; "Mark all read" button

**User & Admin Management**
- Students page — real API list with search, status filter, pagination; suspend/reactivate use real UIDs
- Admins page (super admin) — replace `ADMINS_SEED` mock; create form wired to real endpoint; delete calls API

**Audit Log**
- `src/components/admin/AuditLogTable.tsx` — replace mock data; date range dropdown sends ISO `from`/`to` params; category chips send `category` param; add pagination

### New Components Needed
- `src/infrastructure/firebase/firebaseConfig.ts` — Firebase app initialisation
- `src/infrastructure/firebase/getToken.ts` — always-fresh token helper
- `src/infrastructure/api/request.ts` — base fetch wrapper that attaches Bearer token and handles 401
- Lesson form component for subject editor
- Pagination component (next/prev using `nextCursor`)

### State Changes
- `sessionSlice` — add real `uid`, `role`, `roles`, `status`, `firstName`, `lastName`, `profilePhotoUrl`; remove hardcoded mock user seeding
- `uiSlice` — no changes needed
- New loading/error states per page (replace static mock renders with loading skeletons + error boundaries)

---

## 5. API / Data Requirements

### Endpoints Consumed

| Feature Area | Endpoint | Auth Required |
|---|---|---|
| Login | Firebase `signInWithEmailAndPassword` | — |
| Get profile | `GET /me` | Bearer |
| Update profile | `PATCH /me` | Bearer |
| Change password | `POST /me/change-password` | Bearer |
| Logout | `POST /auth/logout` | Bearer |
| Password reset | `POST /auth/password-reset` | None |
| Track failure | `POST /auth/track-failure` | None |
| List registrations | `GET /admin/registrations` | Admin |
| Approve registration | `POST /admin/registrations/:id/approve` | Admin |
| Reject registration | `POST /admin/registrations/:id/reject` | Admin |
| Bulk approve | `POST /admin/registrations/bulk-approve` | Admin |
| List courses | `GET /courses` | Optional |
| Get course | `GET /courses/:id` | Optional |
| Create course | `POST /courses` | Admin |
| Update course | `PATCH /courses/:id` | Admin |
| Publish/Unpublish/Archive | `POST /courses/:id/{action}` | Admin |
| Delete course | `DELETE /courses/:id` | Admin |
| Semester CRUD | `POST`, `PATCH`, `DELETE /semesters` | Admin |
| Subject CRUD | `POST`, `PATCH`, `DELETE /subjects` | Admin |
| Lesson CRUD | `GET`, `POST`, `PATCH`, `DELETE /lessons` | Student/Admin |
| Upload attachment | `POST /subjects/:id/attachments` | Admin |
| Download attachment | `GET /attachments/:id/download-url` | Student/Admin |
| Delete attachment | `DELETE /attachments/:id` | Admin |
| Enroll | `POST /courses/:id/enroll` | Student |
| List enrollments | `GET /me/enrollments` | Student |
| Withdraw | `POST /enrollments/:id/withdraw` | Student |
| Enrollment queue | `GET /admin/enrollments` | Admin |
| Approve/Reject enrollment | `POST /admin/enrollments/:id/{action}` | Admin |
| Mark complete | `POST /progress/subjects/:id/complete` | Student |
| Track access | `POST /progress/subjects/:id/access` | Student |
| Course progress | `GET /me/progress/courses/:courseId` | Student |
| Subject progress | `GET /me/progress/subjects/:subjectId` | Student |
| Admin progress | `GET /admin/progress/courses/:courseId` | Admin |
| Notifications | `GET /me/notifications` | All |
| Mark read | `POST /me/notifications/:id/read` | All |
| Mark all read | `POST /me/notifications/read-all` | All |
| List users | `GET /users` | Admin |
| Get user | `GET /users/:uid` | Admin |
| Suspend/Reactivate user | `POST /users/:uid/{action}` | Admin |
| List admins | `GET /super-admin/admins` | Super Admin |
| Create admin | `POST /super-admin/admins` | Super Admin |
| Suspend/Reactivate admin | `POST /super-admin/admins/:uid/{action}` | Super Admin |
| Delete admin | `DELETE /super-admin/admins/:uid` | Super Admin |
| Promote to admin | `POST /super-admin/users/:uid/make-admin` | Super Admin |
| Audit log | `GET /audit-log` | Admin/Super Admin |

### Key Request / Response Shapes

**Login → Get Profile**
```json
// GET /me response
{
  "uid": "firebase-uid",
  "email": "user@example.com",
  "role": "student",
  "roles": ["student"],
  "status": "approved",
  "firstName": "Viruli",
  "lastName": "Weerasinghe",
  "profilePhotoUrl": null,
  "createdAt": "2026-05-01T08:00:00.000Z"
}
```

**Create Course**
```json
// POST /courses body
{ "title": "...", "description": "...", "coverImageUrl": "https://..." }
// Response: full course object, state: "draft"
```

**Enroll**
```json
// POST /courses/:id/enroll — no body
// Response
{ "id": "enr-uid_courseId", "courseId": "...", "state": "pending", "createdAt": "..." }
```

**Mark Complete**
```json
// POST /progress/subjects/:id/complete
{ "courseId": "course-abc", "semesterId": "sem-001" }
// Response
{ "subjectId": "...", "state": "completed", "completedAt": "...", "completionPercent": 40.0 }
```

**Paginated list shape (all list endpoints)**
```json
{ "items": [...], "nextCursor": "abc123" | null, "total": 47 }
```

**Error envelope (all errors)**
```json
{
  "error": { "code": "EMAIL_EXISTS", "message": "...", "details": { "field": ["msg"] } },
  "requestId": "uuid"
}
```

### Error States to Handle

| Code | HTTP | UI Treatment |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Inline per field using `details` map |
| `INVALID_YOUTUBE_ID` | 400 | Inline on YouTube URL field |
| `FILE_TOO_LARGE` | 400 | Inline on upload area |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | Inline on upload area |
| `TOKEN_EXPIRED` / `TOKEN_REVOKED` | 401 | Redirect to `/login` |
| `FORBIDDEN` | 403 | Toast "You don't have permission" |
| `ENROLLMENT_REQUIRED` | 403 | Inline prompt to enroll |
| `*_NOT_FOUND` | 404 | Toast + redirect or empty state |
| `EMAIL_EXISTS` / `COURSE_TITLE_EXISTS` | 409 | Inline on relevant field |
| `ENROLLMENT_EXISTS` | 409 | Enroll button → "Already enrolled" |
| `INVALID_STATE` | 409 | Toast with server message |
| `ALREADY_SUSPENDED` / `ALREADY_ACTIVE` | 409 | Toast |
| `NO_SEMESTERS` / `EMPTY_SEMESTER` | 422 | Toast with actionable message |
| `RESUBMIT_TOO_EARLY` | 429 | Toast with 24h wait message |
| `INTERNAL_ERROR` | 500 | Toast "Something went wrong. Try again." |
| Network failure | — | Toast "Could not reach the server" |

---

## 6. Acceptance Criteria

- [ ] Student, admin, and super admin can log in with real credentials and are redirected to their correct dashboard
- [ ] Wrong password and unknown email show inline errors on the correct field
- [ ] Suspended account shows a form-level banner, not an inline field error
- [ ] Accessing any role-gated page without auth redirects to `/login`
- [ ] Token auto-refreshes silently; user is never unexpectedly logged out mid-session
- [ ] Logout clears the session and redirects to `/login`
- [ ] Admin registration queue shows real pending registrations with real timestamps
- [ ] Approving a registration enables that student to sign in
- [ ] Student profile pre-fills from API; edits save only changed fields
- [ ] Public catalog shows only published courses with real cover images
- [ ] Course detail shows real semester/subject/lesson tree
- [ ] Enroll button shows "Pending approval" after submission; disabled if already enrolled
- [ ] Admin approves enrollment → student sees approved badge on their course
- [ ] Admin can create → add semesters → add subjects → publish a course end-to-end
- [ ] Publishing with no subjects returns a clear `422` error message in the UI
- [ ] Admin can upload a PDF attachment; student with approved enrollment can download it
- [ ] Student without enrollment cannot download attachments (403 handled gracefully)
- [ ] Progress bar shows real percentage; updates immediately after marking a subject complete
- [ ] "Continue learning" navigates to the real last-accessed subject
- [ ] Notification bell badge shows real unread count; decrements when notifications are read
- [ ] Admin can suspend and reactivate a student; suspended student cannot log in
- [ ] Super admin can create, suspend, and delete an admin account
- [ ] Audit log shows real entries; date range and category filters work correctly

---

## 7. Open Questions

| # | Question | Owner | Status |
|---|---|---|---|
| 1 | Firebase project config keys — when will these be shared with the frontend team? | Backend team | **Blocking Sprint 1** |
| 2 | Course cover image — is there a dedicated upload endpoint, or is `coverImageUrl` a manually entered URL? | Backend team | Open |
| 3 | Dual-role admin (promoted from student) — which dashboard do they land on after login? | Product | Open |
| 4 | Audit log response field: is it `actor.uid` (nested) or `actorUid` (flat)? API doc shows inconsistency between sections 15 and 17 | Backend team | Open |
| 5 | `POST /auth/track-failure` — should frontend call this after every Firebase `auth/wrong-password` error, or only after confirmed server-side failures? | Backend team | Open |
