# Sprint 4 (V2): Batches & Course Lifecycle V2

**Goal:** Add the intake-cohort (Batch) layer under each Course. Admin creates, opens, and closes batches; the public catalogue surfaces open intakes; and the course-restore action joins publish / unpublish / archive in the course lifecycle.
**Estimated effort:** L
**Depends on:** Sprint 1 (admin role-guarded routes). Independent of Sprints 2 / 3.
**Status:** Not started

---

## Branches

- `feature/v2-batches-admin` — admin Batches sub-tree (list, create, open, close, edit)
- `feature/v2-course-restore` — restore from archive
- `feature/v2-public-intake-cards` — public catalogue surfaces open batches

---

## Current State

- `useCourses.ts` covers V1 course CRUD + publish/unpublish/archive/delete
- `admin/courses/[courseId]/page.tsx` has the V1 course detail editor
- `(public)/courses/page.tsx` shows the published catalogue (no batch concept)
- `(student)/browse-courses/page.tsx` shows the student-facing catalogue (no batch concept)
- The Course type doesn't carry `batchCount` yet

---

## Features

### 1. Batches admin sub-tree

**Routes (NEW):**
- `admin/courses/[courseId]/batches/page.tsx` — list batches with state chip (Draft / Open / Closed)
- `admin/courses/[courseId]/batches/new/page.tsx` — create batch form
- `admin/courses/[courseId]/batches/[batchId]/page.tsx` — edit batch + open/close actions
- Same set mirrored under `super-admin/courses/[courseId]/batches/...`

**What to integrate:**
- New hook `useBatches.ts`:
  - `GET /courses/:id/batches` for the list
  - `POST /courses/:id/batches` for create
  - `GET /batches/:id` for detail
  - `PATCH /batches/:id` for edit
  - `POST /batches/:id/open` and `POST /batches/:id/close`
- Date fields use `react-hook-form` + Zod validation
- Validation: `intakeEnd > intakeStart`; if `scheduledOpenAt` is set, must be in the future
- After Create / Open / Close — invalidate the list and refetch

**API:**
- `GET /courses/:id/batches` (NEW V2)
- `POST /courses/:id/batches` (NEW V2)
- `GET /batches/:id` (NEW V2)
- `PATCH /batches/:id` (NEW V2)
- `POST /batches/:id/open` (NEW V2)
- `POST /batches/:id/close` (NEW V2)

**UI changes:**
- Course detail page gets a new "Intakes (Batches)" panel below the semester tree (`.batches` from `tccr-additions.css`)
- Each batch row shows: name, scheduled open, intake window, capacity, state, action menu
- Closed batches render with `.closed` style class
- "Open now" / "Close intake" buttons; both require confirm
- 422 `BATCH_CLOSED` and 409 `INVALID_STATE` → inline error + toast

**Files:**
- `src/application/hooks/useBatches.ts` (NEW)
- `src/app/admin/courses/[courseId]/batches/page.tsx` (NEW)
- `src/app/admin/courses/[courseId]/batches/new/page.tsx` (NEW)
- `src/app/admin/courses/[courseId]/batches/[batchId]/page.tsx` (NEW)
- (super-admin mirrors)
- `src/components/course/BatchRow.tsx` (NEW)
- `src/components/course/BatchForm.tsx` (NEW)

---

### 2. Course restore from archive

**What to integrate:**
- Add Restore action on the archived state in the admin course detail page
- `POST /courses/:id/restore` → course returns to `draft`; surface a banner saying "Course restored to Draft — re-publish to make it visible"

**API:**
- `POST /courses/:id/restore` (NEW V2)

**UI changes:**
- `useCourses.ts` adds `restoreCourse(courseId)`
- Restore button appears next to Delete on archived courses
- 409 `INVALID_STATE` → toast "Only archived courses can be restored"

---

### 3. Public catalogue — open-intake cards

**What to integrate:**
- `(public)/courses/page.tsx` switches the card layout to show "Open intakes:" sub-section under each course
- Each card calls `GET /courses/:id/batches?state=open&limit=3` lazily (one batched call per row using `Promise.all`) to populate batch chips
- Clicking a batch chip deep-links to `/courses/:id?batch=<batchId>` so the student lands on the right intake

**API:**
- `GET /courses` (existing)
- `GET /courses/:id/batches?state=open` (NEW V2)

**UI changes:**
- Card footer now displays `Open intakes (2)` with chip strip
- If `batchCount === 0` → "No open intakes" + disabled "Apply" button on the detail page

---

### 4. Course detail — intake picker

**What to integrate:**
- `(public)/courses/[courseId]/page.tsx` reads `?batch=<id>` and pre-selects that batch in the intake picker
- Adds an "Intake selector" panel above the semester tree:
  - List of open batches
  - Selected batch is highlighted; intake start / end dates and capacity shown
  - "Apply to this batch" button — but the actual enroll POST is in Sprint 5

**Note:** The actual `POST /enrollments` wiring lands in Sprint 5. This sprint only adds the picker UI and stores the selected `batchId` in component state.

---

### 5. Type updates

- `Course` type adds `batchCount: number`
- `Batch` type added to `src/domain/types/`
- `useCourses` reads the new `batchCount` field and shows it on admin / super-admin course list

---

## Files touched

```
src/application/hooks/useBatches.ts                                        (NEW)
src/application/hooks/useCourses.ts                                        (add restoreCourse, batchCount)
src/app/admin/courses/[courseId]/page.tsx                                  (batches panel)
src/app/admin/courses/[courseId]/batches/page.tsx                          (NEW)
src/app/admin/courses/[courseId]/batches/new/page.tsx                      (NEW)
src/app/admin/courses/[courseId]/batches/[batchId]/page.tsx                (NEW)
src/app/super-admin/courses/[courseId]/page.tsx                            (mirror)
src/app/super-admin/courses/[courseId]/batches/...                          (mirror)
src/app/(public)/courses/page.tsx                                          (open intakes)
src/app/(public)/courses/[courseId]/page.tsx                               (intake picker)
src/components/course/BatchRow.tsx                                         (NEW)
src/components/course/BatchForm.tsx                                        (NEW)
src/components/course/CourseDetailHeader.tsx                               (Restore button)
src/domain/types/Batch.ts                                                  (NEW)
src/domain/types/Course.ts                                                 (batchCount)
src/messages/en.json                                                       (admin.batches.*, course.intakes.*)
```

---

## Tests (per FR-T-001)

**Unit:**
- `useBatches.test.ts` — open / close optimistic + rollback on 409
- `BatchForm.test.tsx` (pure) — Zod refuses `intakeEnd <= intakeStart`

**Integration (RTL):**
- `batches-admin.test.tsx` — create a batch → row appears with Draft state → click Open → state flips to Open
- `course-restore.test.tsx` — restore from archive → button changes to Re-publish

**E2E (Playwright):**
- `intake-flow.spec.ts` — admin creates batch → open the batch → public catalog shows "1 open intake"

---

## Checklist

- [ ] Batches list page (`/admin/courses/:id/batches`) — paginated, filterable by state
- [ ] Create-batch form: validates dates, capacity optional
- [ ] Edit-batch form: blocks date changes when approved enrollments exist (422)
- [ ] Open / Close actions with confirm and 409 handling
- [ ] Course detail page shows Restore button on archived courses
- [ ] Restore returns course to Draft with a banner
- [ ] Public catalog cards show "Open intakes" chips
- [ ] Course detail intake picker — selected batch stored in component state
- [ ] `Batch` type added under domain
- [ ] `Course.batchCount` rendered on admin lists
- [ ] Tests written and green
