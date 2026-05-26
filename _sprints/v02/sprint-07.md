# Sprint 7 (V2): Cell Reports — Multi-step Form, Photo Upload, Idempotency, Void

**Goal:** Build the cell-meeting reporting flow Leaders / G12s use every week. Multi-step form with `tccr-screens-cells.jsx` parity; photo upload first (1-10 photos) then the report itself with `X-Idempotency-Key`; void dialog. Members get a read-only viewer.
**Estimated effort:** L
**Depends on:** Sprint 6 (cells must exist + roster must load for attendance pre-population)
**Status:** Not started

---

## Branches

- `feature/v2-cell-report-form` — multi-step form, photo uploader, attendance from roster, idempotency hook
- `feature/v2-cell-report-viewer` — Members + Admin view past reports (read-only)
- `feature/v2-cell-report-void` — Void dialog and audit handling
- `feature/v2-offline-queue` — 24-hour offline-retry queue (Service Worker + IndexedDB) — *stretch goal*

---

## Current State

- `(leader)/cells/[cellId]/reports/new/page.tsx` exists as UI-only multi-step layout
- `(leader)/cells/[cellId]/reports/[reportId]/page.tsx` exists as UI-only viewer
- No API hooks for cell reports

---

## Features

### 1. Multi-step cell-report form

**What to integrate:**
- Wire `(leader)/cells/[cellId]/reports/new/page.tsx` to the API
- Layout per `tccr-screens-cells.jsx → ReportForm`: `.report-form` with sticky `.report-steps` sidebar
- Steps (from spec FR-CR-003..013):
  1. **Basics** — date (defaults today), `didMeet` toggle, `language`
  2. **Conditional skip** — if `didMeet=false`, jump to "No-meet reason" step then submit
  3. **Logistics** — location, timeStarted, timeEnded, leaderPresent (`.rf-yesno`), conductedByIfAbsent
  4. **Discussion** — subjectDiscussed, otherSubjectReason, cellType, g12LeaderUid (Typeahead)
  5. **Attendance** — `.att-list` with members from `GET /cells/:id`; tap × removes present chips; leftover = absent; "Add walk-in" appends `{ isNew: true, status: "present", name }`
  6. **Engagement** — contactedAbsentees (`.rf-yesno`), absenteeNotes, additionalVisitors, childrenCount
  7. **Wrap-up** — satisfactionRate (`.rf-stars` 1-6), additionalInfo, photo uploader
- Validation per step before "Next" enables

**API:**
- `GET /cells/:id` (already added in Sprint 6) — for attendance pre-population
- `POST /cells/:id/report-photos` (NEW V2) — multipart, returns `{ photoUrls[] }`
- `POST /cells/:id/reports` (NEW V2) — multipart with `data` JSON string + the same `photoUrls[]` in the JSON

**Files:**
- `src/components/cells/ReportForm.tsx` (rewrite from prototype)
- `src/components/cells/ReportFormSteps.tsx` (sticky sidebar)
- `src/components/cells/PhotoUploader.tsx` (NEW)
- `src/components/cells/AttendanceList.tsx` (NEW)
- `src/application/hooks/useCellReports.ts` (NEW)
- `src/application/hooks/useIdempotencyKey.ts` (NEW — generates a fresh UUID per submit)

---

### 2. Photo upload (separate endpoint)

**What to integrate:**
- The `.rf-card` final step has a drag-drop / picker for 1-10 photos
- Client-side validation: JPEG/PNG, max 5 MB each, max 10 files
- Display preview thumbnails; "Replace" / "Remove" per thumbnail
- On form submit:
  1. If photos selected, `POST /cells/:id/report-photos` (multipart with `photos[]`) → receive `photoUrls[]`
  2. Stash `photoUrls[]` in form state
  3. Then `POST /cells/:id/reports` with the URLs in the JSON `data.photoUrls`

**API:**
- `POST /cells/:id/report-photos` (NEW V2)

**UI changes:**
- "Uploading photos…" progress indicator before "Filing report…"
- 413 `FILE_TOO_LARGE` → inline error
- 415 `UNSUPPORTED_MEDIA_TYPE` → inline error
- 400 → "Try again with fewer than 10 photos"

---

### 3. Idempotency key

**What to integrate:**
- `useIdempotencyKey()` generates one UUID per **submit attempt** (not per mount) and persists it until the request resolves
- `apiRequest` accepts an `idempotencyKey` option (added in Sprint 1) → sends `X-Idempotency-Key` header
- If the request times out or 5xx-fails, the same key is reused on retry — server returns the existing report (200 OK)
- After 201/200 success, drop the key so the next submit gets a fresh one

**File:**
- `src/application/hooks/useIdempotencyKey.ts` (NEW)

---

### 4. Report viewer (Members + Admin)

**What to integrate:**
- `(authed)/my-cells/[cellId]/reports/[reportId]/page.tsx` — read-only viewer for Members
- `(leader)/cells/[cellId]/reports/[reportId]/page.tsx` — same component, plus "Void" CTA if owner
- Reports list at `(authed)/my-cells/[cellId]/page.tsx` "Reports" tab and `(leader)/cells/[cellId]/page.tsx` Reports tab → `GET /cells/:id/reports?from=&to=&voided=false`
- Render: `.report-card` per item; `.cd-tabs` for tab switching
- "Voided" reports rendered with greyscale + ribbon

**API:**
- `GET /cells/:id/reports` (NEW V2)
- `GET /cells/:id/reports/:rid` (NEW V2)

---

### 5. Void report dialog

**What to integrate:**
- Void button visible to owning Leader, G12, Super Admin (Admin cannot per SRS §9.3)
- Dialog asks for required reason (free-text)
- `POST /cells/:id/reports/:rid/void { reason }` → on success the report row flips to Voided
- 409 `REPORT_ALREADY_VOIDED` → toast

**API:**
- `POST /cells/:id/reports/:rid/void` (NEW V2)

**UI changes:**
- Use the `.void-dialog` styling from the prototype (`tccr-screens-cells.jsx → VoidDialog`)

---

### 6. Offline queue (stretch goal — flag this branch)

**What to integrate:**
- If `navigator.onLine === false` when submitting, store the form payload (including the idempotency key) in IndexedDB
- A Service Worker syncs the queue on `online` event, retrying for up to 24 hours
- Multiple retries with the same idempotency key are safe by definition

> Per NFR-AVA-004. This is a stretch goal — ship the synchronous flow first, then add the queue.

**Files:**
- `public/sw-cell-reports.js` (NEW — service worker)
- `src/infrastructure/offline/reportsQueue.ts` (NEW)

---

## Files touched

```
src/components/cells/ReportForm.tsx                                     (rewrite)
src/components/cells/ReportFormSteps.tsx                                (NEW)
src/components/cells/PhotoUploader.tsx                                  (NEW)
src/components/cells/AttendanceList.tsx                                 (NEW)
src/components/cells/VoidDialog.tsx                                     (NEW)
src/application/hooks/useCellReports.ts                                 (NEW)
src/application/hooks/useIdempotencyKey.ts                              (NEW)
src/app/(leader)/cells/[cellId]/reports/new/page.tsx                    (wire)
src/app/(leader)/cells/[cellId]/reports/[reportId]/page.tsx             (wire)
src/app/(authed)/my-cells/[cellId]/page.tsx                             (Reports tab)
src/app/(authed)/my-cells/[cellId]/reports/[reportId]/page.tsx          (NEW, read-only)
src/app/admin/cells/[cellId]/reports/[reportId]/page.tsx                (NEW)
src/domain/types/CellReport.ts                                          (NEW)
src/domain/types/AttendanceEntry.ts                                     (NEW)
src/messages/en.json                                                    (leader.report.*, member.cellReport.*)
public/sw-cell-reports.js                                               (NEW, stretch)
src/infrastructure/offline/reportsQueue.ts                              (NEW, stretch)
```

---

## Tests (per FR-T-001)

**Unit:**
- `useIdempotencyKey.test.ts` — same key across one submit, fresh key on the next
- `attendance-utils.test.ts` — toggling presence flips status; walk-ins serialise correctly

**Integration (RTL):**
- `ReportForm.test.tsx` — fill all steps → submit → `POST /cells/:id/report-photos` then `POST /cells/:id/reports` → success page
- `ReportForm.test.tsx` (negative) — `didMeet=false` skips to no-meet step; required fields blocked
- `VoidDialog.test.tsx` — void with reason → row flips to Voided

**E2E (Playwright):**
- `report-flow.spec.ts` — Leader files a report with 2 photos and 5 members → Member can view it in their My Cells tab
- `idempotency.spec.ts` — submit, server returns 502 once, second attempt with same key returns existing report (200)

---

## Checklist

- [ ] Multi-step form with sticky sidebar, mirrors prototype layout
- [ ] Attendance list pre-populated from cell roster
- [ ] Walk-ins added with `isNew: true`
- [ ] `didMeet=false` shortcut works (skips meeting steps)
- [ ] Photo upload step uploads via `POST /cells/:id/report-photos`
- [ ] Validation per file: JPEG/PNG, ≤5 MB, ≤10 files
- [ ] `useIdempotencyKey` generates a fresh UUID per submit
- [ ] `POST /cells/:id/reports` includes `X-Idempotency-Key` header
- [ ] Same key retry returns existing report (200)
- [ ] Report viewer renders all fields including photo gallery
- [ ] Void dialog with required reason → `POST .../void`
- [ ] Voided reports rendered as such; admin/leader cannot re-void
- [ ] (Stretch) Offline queue persists submission in IndexedDB and replays on `online`
- [ ] Tests written and green
