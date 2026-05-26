# Integration Plan v01
**Date:** 2026-05-12
**Scope:** Backend API integration — slp-backend v1.0
**Status:** Active

---

## 1. Overview

The EduPath frontend is a fully-built UI-first Next.js 14 app running off mock data in `src/lib/mock/`. This plan covers replacing all mock data with real API calls to `slp-backend` via the proxy at `/api/v1/*`.

**Signup is already integrated** (`feature/signup-api-integration`, merged to `main`).

Integration is done in phases: auth first (unblocks everything), then admin flows, then student flows, then content management, then progress and notifications.

---

## 2. Authentication Strategy

The backend uses **Firebase Auth** — stateless Bearer tokens, no custom session endpoint.

**Flow:**
```
Firebase signInWithEmailAndPassword(email, password)
  → result.user.getIdToken()
  → store token in memory + Redux sessionSlice
  → attach to every request: Authorization: Bearer <token>
  → Firebase SDK auto-refreshes token before 1h expiry
  → onIdTokenChanged listener updates stored token on refresh
```

**Token storage:** Redux `sessionSlice` (in-memory). No localStorage for the token — use Firebase SDK's built-in persistence.

**Logout:** `signOut(auth)` + `POST /auth/logout` to revoke refresh tokens + clear Redux session.

**Packages to install:**
```bash
npm install firebase
```

**Env variables required (already in `.env`):**
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
```
→ Get these from the backend team's Firebase project settings.

---

## 3. CORS & Proxy

Already configured in `next.config.mjs`:
```js
source: '/api/v1/:path*'
destination: `${process.env.NEXT_PUBLIC_API_BASE_URL}/:path*`
```
All fetch calls use `NEXT_PUBLIC_API_PREFIX` (`/api/v1`) — no direct cross-origin requests.

---

## 4. Feature Areas

---

### Feature: Login

**Current state:** Mock — `LoginForm` calls `completeSignIn()` which seeds Redux with hardcoded `STUDENT`, `ADMIN`, `SUPERADMIN` mock users.
**Pages affected:** `src/components/auth/LoginForm.tsx`
**UI changes needed:**
- Remove role toggle (role comes from Firebase custom claims, not a UI selector)
- Remove mock user seeding
- Show inline errors for wrong password, account suspended, not found
- Loading state on submit button

**Firebase call:**
```js
signInWithEmailAndPassword(auth, email, password)
result.user.getIdToken() // → store as Bearer token
```

**Get profile after login:**
```
GET /me
Authorization: Bearer <token>
```
**Response:**
```json
{
  "uid": "...", "email": "...", "role": "student",
  "roles": ["student"], "status": "approved",
  "firstName": "...", "lastName": "...",
  "profilePhotoUrl": null,
  "createdAt": "...", "updatedAt": "..."
}
```

**Error states:**
| Firebase error | UI treatment |
|---|---|
| `auth/wrong-password` | Inline on password field |
| `auth/user-not-found` | Inline on email field |
| `auth/user-disabled` | Form-level banner (suspended) |
| `auth/too-many-requests` | Form-level banner |

---

### Feature: Route Guards

**Current state:** Any URL is publicly accessible.
**Pages affected:** All layout files — `src/app/admin/layout.tsx`, `src/app/super-admin/layout.tsx`, `src/app/(student)/layout.tsx`
**UI changes needed:** Redirect unauthenticated users to `/login`; redirect wrong-role users to their own dashboard.

**Logic:**
```
/admin/*       → role must be admin | super_admin → else → /login
/super-admin/* → role must be super_admin → else → /login
/dashboard/*   → role must be student → else → /login
```

No API call needed — use Firebase `onAuthStateChanged` + `GET /me` role claim.

---

### Feature: Logout

**Current state:** No real logout — mock only.
**Pages affected:** `src/components/layout/UserMenu.tsx`

**API call:**
```
POST /auth/logout
Authorization: Bearer <token>
Body: none
```
**Response:** `{ "message": "Logged out successfully." }`

Then: `signOut(auth)` → clear Redux session → redirect to `/login`.

---

### Feature: Password Reset

**Current state:** "Forgot password?" link has no action.
**Pages affected:** `src/components/auth/LoginForm.tsx`
**UI changes needed:** Add a password reset form/modal or page.

**API call:**
```
POST /auth/password-reset
Body: { "email": "user@example.com" }
```
**Response:** `{ "message": "If an account exists..." }` (always 200)

---

### Feature: Registration Approval Queue (Admin)

**Current state:** Mock data from `src/lib/mock/registrations.ts`.
**Pages affected:** `src/app/admin/registrations/page.tsx`, `src/app/super-admin/registrations/page.tsx`
**UI changes needed:**
- Replace mock list with paginated API data
- Add search/filter params to API call
- Approve/reject actions hit real endpoints
- Bulk approve hits real endpoint
- Show real submitted-at timestamps

**List:**
```
GET /admin/registrations?status=pending&limit=25&q={search}
Authorization: Bearer <token>
```
**Response:**
```json
{
  "items": [{ "id": "reg-001", "firstName": "...", "lastName": "...", "email": "...", "status": "pending", "submittedAt": "..." }],
  "nextCursor": null, "total": 12
}
```

**Approve:**
```
POST /admin/registrations/{id}/approve
Authorization: Bearer <token>
Body: none
```

**Reject:**
```
POST /admin/registrations/{id}/reject
Authorization: Bearer <token>
Body: { "reason": "optional" }
```

**Bulk approve:**
```
POST /admin/registrations/bulk-approve
Body: { "registrationIds": ["reg-001", "reg-002"] }
```
**Response:** `{ "approved": [...], "failed": [...] }`

**Error states:** `409 INVALID_STATE` → toast "Already processed"

---

### Feature: User Profile

**Current state:** Profile pages show hardcoded mock data.
**Pages affected:** `src/app/(student)/profile/page.tsx`, admin profile areas
**UI changes needed:**
- Load real profile on mount
- Edit form PATCHes to `/me`
- Avatar upload (if implemented) sets `profilePhotoUrl`

**Get profile:**
```
GET /me
Authorization: Bearer <token>
```

**Update profile:**
```
PATCH /me
Body: { "firstName": "...", "lastName": "...", "profilePhotoUrl": "..." }
```
**Response:** Updated user object (same shape as GET /me)

**Change password:**
```
POST /me/change-password
Body: { "newPassword": "NewPass@2026" }
```

---

### Feature: Course Catalog (Public + Student)

**Current state:** `FEATURED_COURSES` and `src/lib/mock/courses.ts`.
**Pages affected:** `src/app/(public)/courses/page.tsx`, `src/app/(public)/courses/[courseId]/page.tsx`, `src/app/(student)/dashboard/page.tsx`
**UI changes needed:**
- Replace mock course arrays with paginated API data
- Course cover: use `coverImageUrl` from API (fallback to gradient if null)
- Show real `semesterCount`, published date
- Search bar hits `?q=` param

**List courses:**
```
GET /courses?limit=20&q={search}
Authorization: Bearer <token> (optional for public)
```
**Response:**
```json
{
  "items": [{
    "id": "...", "title": "...", "description": "...",
    "coverImageUrl": "...", "state": "published",
    "semesterCount": 3, "createdByName": "...", "publishedAt": "..."
  }],
  "nextCursor": null, "total": 6
}
```

**Get course detail:**
```
GET /courses/{id}
```
**Response:** Course object with nested `semesters → subjects → attachments`

---

### Feature: Student Enrollments

**Current state:** Mock enrollment data.
**Pages affected:** `src/app/(student)/my-courses/page.tsx`, course detail pages
**UI changes needed:**
- "Enroll" button → POST to enroll, show pending state after
- My courses page → list from API with real states
- Withdraw button on pending enrollments

**Enroll:**
```
POST /courses/{id}/enroll
Authorization: Bearer <token>
Body: none
```
**Response:** `{ "id": "enr-...", "courseId": "...", "state": "pending", ... }`

**List enrollments:**
```
GET /me/enrollments?limit=20
```
**Response:**
```json
{
  "items": [{ "id": "enr-abc", "courseId": "...", "courseTitle": "...", "state": "approved", "approvedAt": "..." }],
  "nextCursor": null, "total": 2
}
```

**Withdraw:**
```
POST /enrollments/{id}/withdraw
```

**Error states:**
| Code | UI |
|---|---|
| `409 ENROLLMENT_EXISTS` | Button disabled / "Already enrolled" |
| `422 COURSE_NOT_PUBLISHED` | Toast error |

---

### Feature: Admin Enrollment Queue

**Current state:** Mock `src/lib/mock/registrations.ts`.
**Pages affected:** `src/app/admin/enrollments/page.tsx`
**UI changes needed:** Same pattern as registration queue — real data, approve/reject actions.

**List:**
```
GET /admin/enrollments?status=pending&limit=20
```

**Approve / Reject:** Same pattern as registration queue endpoints.

---

### Feature: Course Management (Admin)

**Current state:** Mock `ADMIN_COURSES_SEED`.
**Pages affected:** `src/app/admin/courses/page.tsx`, `src/app/admin/courses/[courseId]/...`
**UI changes needed:**
- Course list from API with real status, enrollment counts
- Create course form → POST
- Edit course metadata → PATCH
- State actions: publish / unpublish / archive
- Delete with confirm → DELETE

**Create:**
```
POST /courses
Body: { "title": "...", "description": "...", "coverImageUrl": "..." }
```

**Update:**
```
PATCH /courses/{id}
Body: { "title": "...", "description": "...", "coverImageUrl": "..." }
```

**Publish:**
```
POST /courses/{id}/publish
```
**Error states:**
| Code | UI |
|---|---|
| `409 INVALID_STATE` | Toast "Already published" |
| `422 EMPTY_SEMESTER` | Toast with message |
| `422 NO_SEMESTERS` | Toast with message |

---

### Feature: Semester, Subject & Lesson Management

**Current state:** Mock `COURSE_VIEWER_SEMESTERS`.
**Pages affected:** `src/app/admin/courses/[courseId]/semesters/...`
**UI changes needed:**
- Semester tree loads from `GET /courses/{id}` response
- Add semester → POST, updates tree
- Edit semester name → PATCH
- Delete semester → DELETE (with confirm)
- Same pattern for subjects and lessons
- Lesson form: title, video URL (any provider), description

**Add semester:**
```
POST /courses/{id}/semesters
Body: { "name": "...", "sortOrder": 1 }
```

**Add subject:**
```
POST /semesters/{id}/subjects
Body: { "title": "...", "description": "...", "youtubeVideoUrl": "...", "sortOrder": 1 }
```

**Add lesson:**
```
POST /subjects/{id}/lessons
Body: { "title": "...", "url": "...", "description": "..." }
```

---

### Feature: Attachments

**Current state:** Mock attachment data in subject objects.
**Pages affected:** Course viewer, subject editor
**UI changes needed:**
- Upload form → multipart/form-data POST
- Download button → GET signed URL → open in new tab
- Delete attachment → DELETE with confirm

**Upload:**
```
POST /subjects/{id}/attachments
Content-Type: multipart/form-data
file: <PDF/DOC/DOCX, max 25MB>
```

**Download URL:**
```
GET /attachments/{id}/download-url
```
**Response:** `{ "downloadUrl": "...", "expiresAt": "..." }`

**Error states:**
| Code | UI |
|---|---|
| `415 UNSUPPORTED_MEDIA_TYPE` | Inline file error |
| `400 FILE_TOO_LARGE` | Inline file error |
| `403 ENROLLMENT_REQUIRED` | Toast for students |

---

### Feature: Progress Tracking

**Current state:** Hardcoded `progress` values on mock course objects.
**Pages affected:** `src/app/(student)/my-courses/[courseId]/[subjectId]/page.tsx`, dashboard
**UI changes needed:**
- "Mark Complete" button → POST to mark complete
- Video player tracks 90% threshold → auto POST
- Progress bar uses real `completionPercent` from API
- "Continue learning" resumes from `lastAccessedSubjectId`
- Subject access tracked on every open → POST

**Mark complete:**
```
POST /progress/subjects/{id}/complete
Body: { "courseId": "...", "semesterId": "..." }
```

**Track access:**
```
POST /progress/subjects/{id}/access
Body: { "courseId": "...", "semesterId": "..." }
```

**Get progress:**
```
GET /me/progress/courses/{courseId}
```
**Response:**
```json
{
  "courseId": "...", "totalSubjects": 10,
  "completedCount": 4, "completionPercent": 40.0,
  "lastAccessedSubjectId": "sub-004"
}
```

---

### Feature: Notifications

**Current state:** Mock `src/lib/mock/notifications.ts`.
**Pages affected:** `src/app/(student)/notifications/page.tsx`, `NotificationBell` component
**UI changes needed:**
- Bell badge count from unread notifications API
- Notification list from API with real categories and timestamps
- Mark read on click
- Mark all read button

**List notifications:**
```
GET /me/notifications?read=false&limit=20
```

**Mark read:**
```
POST /me/notifications/{id}/read
```

**Mark all read:**
```
POST /me/notifications/read-all
```
**Response:** `{ "markedCount": 3 }`

---

### Feature: User Management (Admin)

**Current state:** Mock `src/lib/mock/students.ts`.
**Pages affected:** `src/app/admin/students/page.tsx`, student detail pages
**UI changes needed:**
- Student list from API with real status, enrollment counts
- Suspend / Reactivate actions hit real endpoints
- Student detail with real enrollment history

**List users:**
```
GET /users?status=approved&role=student&limit=25&q={search}
```

**Suspend:**
```
POST /users/{uid}/suspend
Body: { "reason": "..." }
```

**Reactivate:**
```
POST /users/{uid}/reactivate
```

---

### Feature: Admin Management (Super Admin)

**Current state:** Mock `src/lib/mock/admins.ts`.
**Pages affected:** `src/app/super-admin/admins/page.tsx`, `src/app/super-admin/admins/[adminId]/...`
**UI changes needed:**
- Admin list from real API
- Create admin form → POST (firstName, lastName, email, initialPassword)
- Suspend / Reactivate → real endpoints
- Delete → real soft-delete endpoint
- Promote student to admin → POST

**List admins:**
```
GET /super-admin/admins?limit=25&q={search}
```

**Create admin:**
```
POST /super-admin/admins
Body: { "firstName": "...", "lastName": "...", "email": "...", "initialPassword": "..." }
```

**Suspend:**
```
POST /super-admin/admins/{uid}/suspend
Body: { "reason": "..." }
```

**Delete:**
```
DELETE /super-admin/admins/{uid}
```
**Response:** `204 No Content`

**Promote:**
```
POST /super-admin/users/{uid}/make-admin
Body: none
```

---

### Feature: Audit Log

**Current state:** Mock `src/lib/mock/audit.ts`.
**Pages affected:** `src/app/admin/audit-log/page.tsx`, `src/app/super-admin/audit-log/page.tsx`
**UI changes needed:**
- Load from API with real pagination
- Date range filter uses `from` / `to` ISO params
- Category filter uses `category` param
- Search uses `actorUid` or text search

**Get audit log:**
```
GET /audit-log?from=2026-05-01&to=2026-05-12&category=Approvals&limit=20
```
**Response:**
```json
{
  "items": [{
    "id": "...", "when": "...",
    "actor": { "uid": "...", "email": "..." },
    "action": "registration.approved",
    "category": "enrollment",
    "ip": "...", "targetType": "registration", "targetId": "reg-001"
  }],
  "nextCursor": null, "total": 142
}
```

---

## 5. Dependency Map

```
Firebase Config Keys (from backend team)
  └── Sprint 1: Login + Token + Guards
        └── Sprint 2: Registration Approval + Profile
              └── Sprint 3: Course Catalog (public data)
                    └── Sprint 4: Enrollments
                          ├── Sprint 5: Course Management (admin)
                          │     └── Sprint 6: Structure + Attachments
                          └── Sprint 7: Progress Tracking
                                └── Sprint 8: Notifications + User/Admin Mgmt + Audit Log
```

---

## 6. Risks & Notes

| Risk | Mitigation |
|---|---|
| Firebase config keys not yet shared | Blocks Sprint 1 entirely — chase this ASAP |
| Backend `POST /auth/login` endpoint does not exist | Login is via Firebase SDK directly — no backend endpoint needed |
| `GET /admin/progress/courses/:id` not tested | Test with real enrollment data before Sprint 7 |
| File upload (attachments) requires multipart — not yet tested | Spike in Sprint 6 |
| Dual-role admins (student promoted to admin) | UI needs to handle `roles: ["student","admin"]` — dashboard routing differs |
