# Sprint 6: Course Structure — Semesters, Subjects, Lessons & Attachments

**Goal:** Admins can build out a full course structure (semesters, subjects, lessons) and upload attachments through the course editor.
**Estimated effort:** L
**Depends on:** Sprint 5 (course must exist before adding structure)
**Status:** Not started

---

## Branch(es)
- `feature/course-structure-management` — semester, subject, lesson CRUD
- `feature/attachments` — file upload, download, delete

> Split: structure management can be tested independently from file upload.

---

## Features

### Semester Management
**What to integrate:**
- Course editor tree loads semesters from `GET /courses/:id` (included in response)
- Add semester → `POST /courses/:id/semesters`
- Edit semester name/order → `PATCH /semesters/:id`
- Delete semester → `DELETE /semesters/:id` (with confirm)

**UI changes needed:**
- Semester rows in course tree are real API-backed
- Inline edit on semester name
- Sort order input or drag handle
- Delete confirm: "This will also delete all subjects in this semester"
- Optimistic UI: add semester appears in tree immediately, rolls back on error

**Error states to handle:**
- `404` on PATCH/DELETE → toast "Semester no longer exists — refresh"

---

### Subject Management
**What to integrate:**
- Add subject → `POST /semesters/:id/subjects`
- Edit subject → `PATCH /subjects/:id`
- Delete subject → `DELETE /subjects/:id` (with confirm)

**UI changes needed:**
- Subject form: title (required), description (required), YouTube video URL (required), sort order
- Validate YouTube URL format in UI before sending
- `INVALID_YOUTUBE_ID` error shown inline on URL field
- Subject rows in tree link to subject editor

**Error states to handle:**
- `400 INVALID_YOUTUBE_ID` → inline error on video URL field

---

### Lesson Management
**What to integrate:**
- List lessons for a subject → `GET /subjects/:id/lessons`
- Add lesson → `POST /subjects/:id/lessons`
- Edit lesson → `PATCH /lessons/:id`
- Delete lesson → `DELETE /lessons/:id`

**UI changes needed:**
- Lesson list under each subject in the course viewer
- Add lesson form: title (required), video URL (any provider — YouTube, Vimeo, etc.), description (optional)
- Lessons ordered by `order` field
- Soft-deleted lessons excluded from list

**Error states to handle:**
- `404` subject not found → redirect to course editor

---

### Attachment Upload
**What to integrate:**
- Upload form in subject editor → `POST /subjects/:id/attachments` (multipart/form-data)
- Accept PDF, DOC, DOCX only (max 25MB)
- Show upload progress if possible

**UI changes needed:**
- File picker restricted to PDF/DOC/DOCX in the `accept` attribute
- File size validation in UI before upload (25MB limit)
- Upload progress indicator or spinner
- Attachment appears in list after successful upload
- File name, type, size displayed in attachment row

**Error states to handle:**
- `415 UNSUPPORTED_MEDIA_TYPE` → inline error "Only PDF, DOC, DOCX allowed"
- `400 FILE_TOO_LARGE` → inline error "File must be under 25MB"

---

### Attachment Download
**What to integrate:**
- Download button → `GET /attachments/:id/download-url`
- Open signed URL in new browser tab

**UI changes needed:**
- Download button on each attachment row
- Short loading state while fetching URL
- URL expires in 15 min — don't cache it

**Error states to handle:**
- `403 ENROLLMENT_REQUIRED` → toast "Enroll in this course to download attachments"

---

### Attachment Delete
**What to integrate:**
- Delete button → confirm dialog → `DELETE /attachments/:id`

**UI changes needed:**
- Confirm dialog: "This permanently removes the file"
- Attachment removed from list after `204`

---

## Checklist
- [x] Semester list loads from `GET /courses/:id` response
- [x] Add semester → `POST /courses/:id/semesters`
- [x] Edit semester → `PATCH /semesters/:id`
- [x] Delete semester with confirm → `DELETE /semesters/:id`
- [x] Add subject → `POST /semesters/:id/subjects`
- [x] Edit subject → `PATCH /subjects/:id`
- [x] Delete subject with confirm → `DELETE /subjects/:id`
- [x] Lesson list → `GET /subjects/:id/lessons`
- [x] Add lesson → `POST /subjects/:id/lessons`
- [x] Edit lesson → `PATCH /lessons/:id`
- [x] Delete lesson → `DELETE /lessons/:id`
- [x] Attachment upload (multipart) → `POST /subjects/:id/attachments`
- [x] File type and size validation before upload
- [x] Attachment download → `GET /attachments/:id/download-url`
- [x] Attachment delete → `DELETE /attachments/:id`
- [ ] Test full course build: create course → add semester → add subject → add lesson → publish
