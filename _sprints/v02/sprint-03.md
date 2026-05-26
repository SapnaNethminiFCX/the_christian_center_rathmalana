# Sprint 3 (V2): Role Requests — Bible School Approval Pathway

**Goal:** Wire the new Member → Student approval flow. Members apply via `POST /role-requests`; admins review in a queue; once approved the requester gains the `student` role. Replaces V1's `/admin/registrations` flow without breaking deep-links.
**Estimated effort:** M
**Depends on:** Sprint 1 (multi-role session, route guards). Independent of Sprint 2.
**Status:** Not started

---

## Branches

- `feature/v2-role-requests-member` — Member home callout, "Request Student access" form, `/my-requests` page
- `feature/v2-role-requests-admin` — Admin queue rewrite (replaces `useRegistrationQueue`); approve / reject with note

---

## Current State

- `useRegistrationQueue.ts` calls V1's `/admin/registrations` (which no longer exists in V2). Will be **rewritten** as `useRoleRequestQueue.ts`
- `/admin/registrations/page.tsx` is the current admin page — keep the URL, replace the component
- `(authed)/apply/student/page.tsx` already exists as a UI-only mock — wire it
- `(authed)/apply/student/pending/page.tsx` shows a waiting screen — repurpose it as the post-submit landing
- `(authed)/my-requests/page.tsx` is a UI-only mock — wire it
- `MEMBER_NAV` already includes "My Requests"

---

## Features

### 1. Member apply for Student role

**What to integrate:**
- "Request Student access" form on `/apply/student` posts `POST /role-requests { requestedRole: "student" }`
- After 201 → redirect to `/apply/student/pending` with the new request ID in `searchParams`
- 409 `ROLE_REQUEST_PENDING` → inline message + link to `/my-requests`

**API:**
- `POST /role-requests` (NEW V2)

**UI changes:**
- Strip the V1 "expected wait time" copy — V2 SLA is 24 hours, single CTA, single submit button
- Pending page shows the submitted request's status badge (Pending / Approved / Rejected) — polls `GET /role-requests/mine` every 30s while open OR refreshes on focus

---

### 2. Member home pending callout

**What to integrate:**
- Member home (`/home`) reads `useRoleRequests()` — a new hook that fetches `GET /role-requests/mine` and exposes `{ pending, approved, rejected, latest }`
- If `latest.status === "pending"` → `.pending-callout` "Your Student request is being reviewed. We'll notify you when it's decided."
- If `latest.status === "rejected"` → `.role-banner` with decision note + "Request again" CTA
- If user has `student` role already → hide the request UI; show "You're a Student" success state instead

**API:**
- `GET /role-requests/mine` (NEW V2)

---

### 3. "My Requests" page

**What to integrate:**
- New `/my-requests` route (already exists in nav, now wired to backend)
- Lists own role requests AND own cell-join requests (added in Sprint 6)
- For role requests: `requestedRole`, `status`, `createdAt`, `decisionByName`, `decisionNote`, `decidedAt`
- Filter chips: "All / Pending / Approved / Rejected"
- Empty state: "No requests yet. Apply for Student access to start."

**API:**
- `GET /role-requests/mine` (NEW V2)

**UI changes:**
- `<RequestTimelineItem>` re-usable component; renders status chip and decision note

---

### 4. Admin role-requests queue

**What to integrate:**
- Rewrite `src/app/admin/registrations/page.tsx` as the role-requests queue
- New hook `useRoleRequestQueue.ts` (replaces `useRegistrationQueue.ts`):
  - `GET /role-requests?status={status}&search=&limit=20&cursor=` for list
  - `POST /role-requests/:id/approve { note }` for approval
  - `POST /role-requests/:id/reject { note }` for rejection
- Filter chips: Pending (default) / Approved / Rejected
- Search box → `?search=` (partial match on name / email)
- Approve dialog: optional welcome note textarea ("Welcome! You can now browse and apply for courses.")
- Reject dialog: required reason textarea
- Same approve / reject UX patterns as V1 — but no bulk-approve (V2 doesn't have an endpoint for it)
- Update sidebar label from "Registrations" to "Role Requests" (already done in i18n keys)

**API:**
- `GET /role-requests` (NEW V2, admin scope)
- `GET /role-requests/:id` (NEW V2)
- `POST /role-requests/:id/approve` (NEW V2)
- `POST /role-requests/:id/reject` (NEW V2)

**UI changes:**
- Column order: Requester · Email · Submitted · Status · Action
- Approver name and decision note from approved/rejected rows are shown in the row's expanded detail
- Show "Approved by Ushani Amanda on 2026-05-15" in the row footer when applicable
- Pagination via `nextCursor`; preserve cursor in URL searchParams so refresh keeps the page

---

### 5. Member-side notifications

**No code change here** — backend already emits `role.requested`, `role.granted`, `role.rejected` events that fan out to the notification system. Sprint 2's notification preferences govern whether email / push are sent. In-app notification still appears in the bell.

---

### 6. Migration / decommission of V1 registration UI

**What to remove / archive:**
- Delete `useRegistrationQueue.ts` (replaced by `useRoleRequestQueue.ts`)
- Delete `bulk-approve` logic (no V2 equivalent)
- Keep the URL `/admin/registrations` and `/super-admin/registrations` so prior emails / bookmarks still work — the page just renders the new component
- Sidebar nav now points at the same URL but labels it "Role Requests" (via `nav.roleRequests` translation key, already in `RoleNav.ts`)

---

## Files touched

```
src/app/(authed)/apply/student/page.tsx
src/app/(authed)/apply/student/pending/page.tsx
src/app/(authed)/my-requests/page.tsx
src/app/(authed)/home/page.tsx
src/app/admin/registrations/page.tsx                        (component replaced; URL kept)
src/app/super-admin/registrations/page.tsx                  (same)
src/application/hooks/useRoleRequestQueue.ts                (NEW; replaces useRegistrationQueue)
src/application/hooks/useRoleRequests.ts                    (NEW; member-side hook)
src/application/hooks/useRegistrationQueue.ts               (DELETE)
src/components/role-requests/RoleRequestRow.tsx             (NEW)
src/components/role-requests/RequestTimelineItem.tsx        (NEW)
src/messages/en.json                                        (member.applyStudent.*, admin.roleRequests.*)
```

---

## Tests (per FR-T-001)

**Unit:**
- `useRoleRequests.test.ts` — pending callout fires correctly; ignores cells when filtering by `requestedRole`
- `useRoleRequestQueue.test.ts` — optimistic approve / reject; rolls back on 409

**Integration (RTL):**
- `apply-student.test.tsx` — happy path posts and redirects; second submit gets `ROLE_REQUEST_PENDING` → inline error
- `admin-queue.test.tsx` — approve with note → row moves to "Approved"; reject without reason → form blocks submit

**E2E (Playwright):**
- `role-request-flow.spec.ts` — Member submits → admin approves → member receives notification → member's home shows "Student" role chip

---

## Checklist

- [ ] `POST /role-requests` wired from `/apply/student`
- [ ] 409 surfaces inline with link to `/my-requests`
- [ ] Member home shows pending callout / rejected banner / success state
- [ ] `/my-requests` lists own role requests with decision info
- [ ] Admin queue replaces V1 component at the same URL
- [ ] `GET /role-requests` paginated + filterable + searchable
- [ ] Approve dialog with optional note → grants student role
- [ ] Reject dialog with required reason → notifies member
- [ ] V1 `useRegistrationQueue` deleted
- [ ] Sidebar label is "Role Requests" in all three locales
- [ ] Tests written and green
