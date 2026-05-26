# Sprint 5 (V2): Enrollment Refactor + Course Content V2 (Semester Dates · Subject Images · Per-subject Progress)

**Goal:** Move enrollment to the V2 paths (`/enrollments*`), pivot the contract to `{ courseId, batchId }`, surface per-batch progress, and finish the V2 course content layer — `openDate` / `endDate` on Semesters and PNG/JPG image gallery on Subjects.
**Estimated effort:** L
**Depends on:** Sprint 4 (Batches must exist before enrollment requires `batchId`)
**Status:** Not started

---

## Branches

- `feature/v2-enrollment-paths` — `useEnrollments` rewrite to V2 paths + `batchId`
- `feature/v2-semester-dates` — `openDate` / `endDate` on semesters; auto-disable styling
- `feature/v2-subject-images` — image gallery upload + display
- `feature/v2-per-subject-progress` — `GET /me/progress/subjects/:subjectId`

> Four branches. Enrollment must merge first because it touches every page that uses an enrollment record.

---

## Current State

- `useEnrollments.ts` calls V1 paths: `GET /me/enrollments`, `POST /courses/:id/enroll`, `POST /enrollments/:id/withdraw`
- `useAdminEnrollmentQueue.ts` calls V1 admin paths: `GET /admin/enrollments`, approve, reject
- Semester forms accept `name`, `number` only — no dates
- Subject forms accept `name`, `description`, attachments (PDF/DOCX) — no images
- `useProgress.ts` covers `/me/progress/courses/:id`, `/progress/subjects/:id/complete`, `/access`
- Enrollment ID format is `${userUid}_${courseId}`

---

## Features

### 1. Enrollment hooks rewrite (paths + batchId)

**What to change:**

| V1 (current) | V2 (target) |
|--------------|-------------|
| `GET /me/enrollments` | `GET /enrollments/mine` |
| `POST /courses/:id/enroll` | `POST /enrollments` body `{ courseId, batchId }` |
| `POST /enrollments/:id/withdraw` | (unchanged) |
| `GET /admin/enrollments` | `GET /enrollments` |
| `POST /admin/enrollments/:id/approve` | `POST /enrollments/:id/approve` |
| `POST /admin/enrollments/:id/reject` | `POST /enrollments/:id/reject` |

- Enrollment `id` format changes from `${uid}_${courseId}` to `${uid}_${batchId}`. The hook surfaces the new ID; callers that cached old IDs are broken — log out flow already happens for V1 sessions
- `Enrollment` type gets `batchId: string`, `batchName: string`, `roleRequestId: string | null`
- Error mapping: `422 BATCH_CLOSED` → inline "This intake has closed. View next intake."; `409 ALREADY_ENROLLED` (changed semantics — same `{userUid, batchId}` already exists)

**Files:**
- `src/application/hooks/useEnrollments.ts` (rewrite)
- `src/application/hooks/useAdminEnrollmentQueue.ts` (path updates only)

**UI changes:**
- `(student)/my-courses/page.tsx` — cards now show "Bible Foundations · 2026 Intake 01"; click opens course detail filtered to that batch
- `(public)/courses/[courseId]/page.tsx` — "Apply for this intake" button now POSTs `/enrollments`
- `admin/enrollments/page.tsx` — filter chip for `batchId`; column shows `batchName`
- Withdraw still works against the new ID

---

### 2. Semester dates

**What to integrate:**
- Semester editor adds two date inputs: `openDate` (required) and `endDate` (optional)
- `POST /courses/:id/semesters` and `PATCH /semesters/:id` now send these fields
- Validation: `endDate >= openDate` if both present
- Auto-disable: server flips `status` to `disabled` after `endDate`; client renders `.sem-dates.disabled` chip + "Closed" pill on subject list

**API:**
- `POST /courses/:id/semesters` (existing; V2 contract change)
- `PATCH /semesters/:id` (existing; V2 accepts dates)

**UI changes:**
- Semester header in admin shows `.sem-dates` badge (`2026-07-01 → 2026-09-30`)
- Student-facing course viewer (`(student)/my-courses/[courseId]/page.tsx`) shows `.sem-dates.disabled` when `status === "disabled"`
- Subject items inside a disabled semester show `.subject.disabled` with "Closed" pill — clicks are noop with a toast

**Files:**
- `src/components/course/SemesterForm.tsx`
- `src/components/course/CourseStructureEditor.tsx`
- `src/app/(student)/my-courses/[courseId]/page.tsx`

---

### 3. Subject image gallery

**What to integrate:**
- New uploader on the subject editor: drop zone for PNG/JPG, max 10 MB each
- `POST /subjects/:id/images` multipart upload (1-N images)
- Subject `imageUrls[]` displayed as a thumbnail grid; reorder via drag (V2 stretch — skip on first cut)
- Delete an image via existing `DELETE /attachments/:id` (image is just a typed attachment per data model)

**API:**
- `POST /subjects/:id/images` (NEW V2)
- `DELETE /attachments/:id` (existing)

**UI changes:**
- Subject editor gets two side-by-side rows: "Images" (the new gallery) and "Attachments" (the V1 PDF/DOCX row)
- Student-facing subject view (`(student)/my-courses/[courseId]/[subjectId]/page.tsx`) renders the image carousel above the description
- 415 / 413 errors surface inline

**Files:**
- `src/components/course/SubjectImageGallery.tsx` (NEW)
- `src/components/course/CourseStructureEditor.tsx`
- `src/app/(student)/my-courses/[courseId]/[subjectId]/page.tsx`

---

### 4. Per-subject progress

**What to integrate:**
- New `GET /me/progress/subjects/:subjectId` endpoint
- `useProgress.ts` adds `useSubjectProgress(subjectId)` returning `{ status, completedAt, lastAccessedAt }`
- Subject page shows progress chip ("Not started" / "In progress" / "Completed"); used by the "Mark complete" button to know its initial state without re-fetching the parent course aggregate

**API:**
- `GET /me/progress/subjects/:subjectId` (NEW V2)

**UI changes:**
- Subject page header: progress chip + completion timestamp
- After Mark Complete → chip flips to Completed without a parent refetch

**Files:**
- `src/application/hooks/useProgress.ts`
- `src/app/(student)/my-courses/[courseId]/[subjectId]/page.tsx`

---

### 5. Batch-scoped admin progress (small)

`GET /admin/progress/courses/:courseId` now accepts `?batchId=` — already integrated path; just add the filter chip on the admin progress view.

---

## Files touched

```
src/application/hooks/useEnrollments.ts                                  (rewrite paths + types)
src/application/hooks/useAdminEnrollmentQueue.ts                         (path updates)
src/application/hooks/useProgress.ts                                     (add subject hook)
src/components/course/SemesterForm.tsx                                   (NEW or existing)
src/components/course/SubjectImageGallery.tsx                            (NEW)
src/components/course/CourseStructureEditor.tsx
src/app/(student)/my-courses/page.tsx
src/app/(student)/my-courses/[courseId]/page.tsx
src/app/(student)/my-courses/[courseId]/[subjectId]/page.tsx
src/app/(public)/courses/[courseId]/page.tsx                              (POST /enrollments)
src/app/admin/enrollments/page.tsx                                       (batch filter)
src/domain/types/Enrollment.ts                                           (batchId, roleRequestId)
src/domain/types/Semester.ts                                             (openDate, endDate)
src/domain/types/Subject.ts                                              (imageUrls)
src/messages/en.json
```

---

## Tests (per FR-T-001)

**Unit:**
- `useEnrollments.test.ts` — V2 paths, `batchId` round-trips, `BATCH_CLOSED` handled
- `useProgress.test.ts` — `useSubjectProgress` returns the right shape; `markComplete` updates local state

**Integration (RTL):**
- `enroll-flow.test.tsx` — student picks batch → POST /enrollments → my-courses lists the new card
- `subject-images.test.tsx` — uploader rejects > 10 MB; uploads two images; deletes one

**E2E (Playwright):**
- `student-enroll.spec.ts` — public catalogue → course detail → batch selected → "Apply" → My Courses shows the pending enrollment with batch name
- `semester-disabled.spec.ts` — Admin sets endDate in past → student-facing semester shows Closed pill and subject is non-clickable

---

## Checklist

- [ ] All enrollment hooks switched to V2 paths
- [ ] Enrollment body sends `batchId`
- [ ] `BATCH_CLOSED` shows inline error with next-intake link
- [ ] My Courses cards show batch name
- [ ] Admin enrollment queue has batch filter + column
- [ ] Semester forms accept `openDate` and `endDate`
- [ ] Past-endDate semester renders `.sem-dates.disabled` and locks the subject list
- [ ] Subject editor image gallery uploads via `POST /subjects/:id/images`
- [ ] Student-facing subject view renders the image carousel
- [ ] `GET /me/progress/subjects/:subjectId` powers the subject progress chip
- [ ] Admin progress view supports `?batchId=` filter
- [ ] Tests written and green
