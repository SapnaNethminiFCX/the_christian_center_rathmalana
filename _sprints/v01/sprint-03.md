# Sprint 3: Course Catalog & Public Pages

**Goal:** Replace mock course data on all public and student-facing catalog pages with real API data.
**Estimated effort:** M
**Depends on:** Sprint 1 (token for student views), Sprint 2 (approved student needed)
**Status:** Not started

---

## Branch(es)
- `feature/course-catalog-integration` — public catalog, course detail, student catalog

---

## Features

### Public Course Listing
**What to integrate:**
- Landing page featured courses section from real API (limit 4 published)
- Public `/courses` page loads paginated published courses
- Search bar sends `?q=` param to API

**UI changes needed:**
- Course cover: use `coverImageUrl` from API; if null fall back to existing `CourseCover` gradient component
- Show real `semesterCount` instead of hardcoded lessons count
- Show real `publishedAt` date on course cards
- Pagination controls on `/courses` page using `nextCursor`
- Empty state when no courses match search

**Error states to handle:**
- API unavailable → show existing mock data as fallback with error toast

---

### Course Detail Page (Public + Student)
**What to integrate:**
- `GET /courses/:id` returns full course with semester/subject tree
- Replace `COURSE_VIEWER_SEMESTERS` mock with real nested data
- Public view: show course overview, semester list
- Student view (enrolled): full subject access including video and attachments

**UI changes needed:**
- Semester/subject sidebar populates from real API tree
- Subject title, description, YouTube video ID all from API
- Attachment list from real attachment objects
- Breadcrumb uses real course/semester/subject titles

**Error states to handle:**
- `404 COURSE_NOT_FOUND` → redirect to `/courses` with toast
- `403 ENROLLMENT_REQUIRED` → show "Enroll to access content" prompt

---

### Student Course Catalog (Dashboard)
**What to integrate:**
- Dashboard "Continue learning" section loads student's active enrollments
- Course cards link to correct course viewer pages
- Course cover uses real `coverImageUrl`

**UI changes needed:**
- Replace `STUDENT_IN_PROGRESS` mock with real enrollment + progress data
- Replace `STUDENT_ENROLLED_NOT_STARTED` mock with real API data
- Progress bar percentage from `completionPercent` (integrated properly in Sprint 7 — use 0% for now)

---

## Checklist
- [x] Replace `FEATURED_COURSES` mock on landing page with `GET /courses?limit=4`
- [x] Replace courses list mock with paginated `GET /courses` on `/courses` page
- [x] Add search input wired to `?q=` param (300ms debounce)
- [x] Course detail loads from `GET /courses/:id`
- [x] Course viewer sidebar uses real semester/subject tree
- [x] Cover image: use API URL or fall back to gradient component
- [ ] Student dashboard loads enrollments from `GET /me/enrollments` *(deferred to Sprint 4)*
- [ ] Test public course catalog without auth
- [ ] Test course detail page with enrolled student
- [ ] Test 404 on non-existent course
