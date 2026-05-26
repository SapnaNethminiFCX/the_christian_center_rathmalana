# Sprint 7: Progress Tracking & Student Learning Experience

**Goal:** Students can track their learning progress — mark subjects complete, see real progress bars, and resume from where they left off.
**Estimated effort:** M
**Depends on:** Sprint 4 (student must have approved enrollment), Sprint 6 (course must have subjects)
**Status:** Not started

---

## Branch(es)
- `feature/progress-tracking` — mark complete, access tracking, progress aggregates, student dashboard

---

## Features

### Mark Subject Complete
**What to integrate:**
- "Mark Complete" button in subject viewer → `POST /progress/subjects/:id/complete`
- Idempotent — safe to call multiple times
- Pass `courseId` and `semesterId` in request body

**UI changes needed:**
- "Mark Complete" button: idle → loading → "Completed ✓" (disabled)
- Subject row in sidebar shows completion indicator (checkmark)
- Already-completed subjects show completed state on page load

**Error states to handle:**
- `403 ENROLLMENT_REQUIRED` → toast "You need an approved enrollment to track progress"

---

### Auto-Complete at 90% Video Playback
**What to integrate:**
- YouTube embed progress tracking — fire `POST /progress/subjects/:id/complete` automatically when playback reaches 90%
- Use YouTube IFrame API `onStateChange` + `getCurrentTime` / `getDuration`

**UI changes needed:**
- No visible button change needed — triggers same backend call as manual "Mark Complete"
- Small toast: "Subject marked complete automatically"

---

### Track Last Accessed Subject
**What to integrate:**
- On every subject page open → `POST /progress/subjects/:id/access`
- Fire on mount, not on every re-render

**UI changes needed:**
- No visible change — background call only
- Powers the "Continue learning" resume feature

---

### Course Progress Display
**What to integrate:**
- Course progress bar uses real `completionPercent` from `GET /me/progress/courses/:courseId`
- Load on course viewer open
- Refresh after each "Mark Complete" action

**UI changes needed:**
- Progress bar percentage replaced with real API value
- "X of Y subjects completed" text uses real `completedCount` and `totalSubjects`
- Progress updates in real-time after marking a subject complete (re-fetch)

---

### Continue Learning (Student Dashboard)
**What to integrate:**
- "Continue" button in dashboard → navigate to `lastAccessedSubjectId` from progress API
- Load per-course progress on dashboard mount

**UI changes needed:**
- "Continue Learning" card shows real course title, real progress %
- Button links to `/my-courses/:courseId/:subjectId` using `lastAccessedSubjectId`
- If no subjects accessed yet → link to first subject

---

### Admin Course Progress View
**What to integrate:**
- Admin course detail page → student progress table from `GET /admin/progress/courses/:courseId`
- Paginated list of enrolled students with their completion %

**UI changes needed:**
- Progress table in admin course detail: student name, completion %, last accessed date
- Pagination using `nextCursor`

---

## Checklist
- [x] "Mark Complete" button → `POST /progress/subjects/:id/complete`
- [x] Completed state persists on page reload (loaded from `GET /me/progress/courses/:courseId` which returns `completedSubjectIds`)
- [x] Track access on subject open → `POST /progress/subjects/:id/access`
- [x] Course progress bar uses `GET /me/progress/courses/:courseId`
- [x] Progress re-fetches after marking complete
- [x] YouTube 90% threshold auto-complete (YouTube IFrame API)
- [x] "Continue Learning" dashboard card links to `lastAccessedSubjectId`
- [x] Admin course progress table from `GET /admin/progress/courses/:courseId`
- [ ] Test: open subject → mark complete → verify progress bar updates
- [ ] Test: reopen course → continues from last subject
