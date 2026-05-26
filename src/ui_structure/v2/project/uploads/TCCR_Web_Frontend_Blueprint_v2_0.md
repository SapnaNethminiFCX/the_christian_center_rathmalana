# TCCR — Web Frontend Blueprint
## The Christian Center Rathmalana · `tccr-web`
### React · Next.js 14 · Redux Toolkit · RTK Query · Tailwind CSS · Clean Architecture · i18n (si / ta / en)

**Version:** 2.0.0
**Date:** 15 May 2026
**Organisation:** Future CX Lanka (Pvt) Ltd
**Status:** Release Baseline
**Supersedes:** CMP Web Frontend Blueprint v1.0.1 (07 May 2026)

> **V2 Re-baseline.** The CMP web portal becomes the **Bible School module** of TCCR. The Web client now also drives **Cell Groups**, **Analytics**, **Role Requests**, **Tri-lingual UI (Sinhala / Tamil / English)**, **Google + Apple federated sign-in**, and **per-user audit-log views**. Roles are now an **additive array** (`roles[]`) — every authenticated user is at minimum a `member`. Backwards-compatible: every V1 page is preserved (URLs may move but functionality is preserved); no V1 contract is broken. See §1.2 for the V1 → V2 change summary.

---

## Table of Contents

1. [Overview, Goals & V1 → V2 Changes](#1-overview-goals--v1--v2-changes)
2. [Technology Stack](#2-technology-stack)
3. [Clean Architecture — Principles & Layers](#3-clean-architecture--principles--layers)
4. [Project Directory Structure](#4-project-directory-structure)
5. [Routing Architecture](#5-routing-architecture)
6. [Authentication, Federated Sign-In & Route Guards](#6-authentication-federated-sign-in--route-guards)
7. [Roles Model & RBAC on the Client](#7-roles-model--rbac-on-the-client)
8. [State Management (Redux Toolkit)](#8-state-management-redux-toolkit)
9. [API Layer — RTK Query](#9-api-layer--rtk-query)
10. [Internationalisation (Sinhala / Tamil / English)](#10-internationalisation-sinhala--tamil--english)
11. [Component Architecture](#11-component-architecture)
12. [Page Specifications — All Roles](#12-page-specifications--all-roles)
    - 12.1 [Public Pages](#121-public-pages)
    - 12.2 [Member Pages — NEW V2](#122-member-pages--new-v2)
    - 12.3 [Student Pages](#123-student-pages)
    - 12.4 [Leader Pages — NEW V2](#124-leader-pages--new-v2)
    - 12.5 [G12 Leader Pages — NEW V2](#125-g12-leader-pages--new-v2)
    - 12.6 [Admin Pages](#126-admin-pages)
    - 12.7 [Super Admin Pages](#127-super-admin-pages)
    - 12.8 [Shared / Common Pages](#128-shared--common-pages)
13. [UI Component Library (Tailwind Design System)](#13-ui-component-library-tailwind-design-system)
14. [Form Handling Strategy](#14-form-handling-strategy)
15. [Notifications & Real-Time Updates](#15-notifications--real-time-updates)
16. [Error Handling Strategy](#16-error-handling-strategy)
17. [Performance Optimisation](#17-performance-optimisation)
18. [Accessibility (WCAG 2.1 AA)](#18-accessibility-wcag-21-aa)
19. [Environment Configuration](#19-environment-configuration)
20. [Testing Strategy](#20-testing-strategy)
21. [Build, CI/CD & Deployment](#21-build-cicd--deployment)
22. [Feature Flags](#22-feature-flags)
23. [Migration Plan (V1 → V2 Web Client)](#23-migration-plan-v1--v2-web-client)
24. [Appendix A — Domain Types](#appendix-a--domain-types-representative)
25. [Appendix B — Custom Hooks Reference](#appendix-b--custom-hooks-reference)
26. [Appendix C — SRS Requirement Traceability](#appendix-c--srs-requirement-traceability)

---

## 1. Overview, Goals & V1 → V2 Changes

`tccr-web` is the server-rendered React web frontend for **The Christian Center Rathmalana (TCCR)** platform. It serves all six user classes — **Member**, **Student**, **Leader**, **G12 Leader**, **Admin**, **Super Admin** — through a single, role-aware application. It communicates exclusively with the `tccr-backend` REST API (Base URL `https://api.tccr.lk/api/v1`) over HTTPS. **No business logic is implemented client-side**; the frontend is a pure presentation layer.

The mobile app (`tccr-mobile`, React Native) is the **preferred surface for cell-report entry**; the web client provides the same Cell Groups capabilities for desktop/admin use, plus all administrative, authoring and analytics workflows.

### 1.1 Design Constraints (from SRS v2.0)

| Constraint | Specification | SRS Ref |
|-----------|--------------|---------|
| Stack | React 18, Next.js 14 (App Router), Redux Toolkit, RTK Query, Tailwind CSS 3 | §2.5, §3.6 |
| Auth client | Firebase JS SDK — **Auth only** (no direct Firestore access) | §2.5 |
| Federated providers | Google + Apple (in addition to Email/Password) | FR-AUTH-003/004 |
| Languages | **Sinhala (si)**, **Tamil (ta)**, **English (en)** with English fallback; no missing keys at release | FR-I18N-001 to 005, NFR-USA-004, NFR-LOC-001 |
| Min viewport | 360 px wide | §2.4.2 |
| Browsers | Latest two major versions of Chrome, Edge, Firefox, Safari (desktop + Android Chrome + iOS Safari) | NFR-POR-002, §2.4.2 |
| Rendering | SSR for public/catalog pages; CSR for authenticated dashboards | (carry-forward) |
| API contract | Consumes `tccr-contracts` OpenAPI 3.1 spec (renamed from `slp-contracts`) | (V2 rename) |
| No horizontal scroll | Required on all mobile viewports | §2.4.2 |
| Inactivity timeout | Auto sign-out after 30 minutes of inactivity (web only) | FR-AUTH-008 |
| WCAG | 2.1 Level AA compliance (SHOULD) | NFR-USA-001/002 |
| Analytics latency | All `/analytics/*` reads render under 2 s (snapshots only) | NFR-PER-003 |

### 1.2 V1 (CMP) → V2 (TCCR) Change Summary

The table below mirrors §2 of the TCCR Architecture Overview but is scoped to client-side impact.

| # | Area | V1 (CMP web) | V2 (TCCR web) | Frontend Impact |
|---|------|-------------|---------------|-----------------|
| 1 | Product name | CMP — single portal | TCCR — Bible School + Cell Groups | Re-brand strings, route groups, design tokens |
| 2 | Roles model | `role: string` (scalar) | `roles: string[]` (additive union) | `useRole()` hook rewritten; `AuthGuard` accepts `requiredAnyRole[]`; `super_admin` inherits `admin` |
| 3 | Registration outcome | `pending_approval` Student | Active **Member**, signed in immediately | Replaces "awaiting approval" screen with "Welcome / Become a Student" path |
| 4 | Sign-in | Email + Password only | + **Google OAuth** + **Apple Sign-In** | Two new federated buttons on `/login` and `/register`; provider linking screen in profile |
| 5 | Course hierarchy | Course → Semester → Subject → Lesson | Course → **Batch** → Semester → Subject → Lesson | Catalog detail page now shows batches with intake windows; enrollment form picks a Batch |
| 6 | Semester lifecycle | static `number` only | `openDate` + `endDate`; auto-disable after `endDate` | Semester accordion shows date badges; disabled banner when past `endDate` |
| 7 | Subject media | PDF + DOCX | PDF + DOCX + **PNG/JPG** lesson images | `AttachmentUploader` accepts images; `SubjectEditor` gains image gallery |
| 8 | Enrollment | linked to Course | linked to **Course + Batch**; first-time enrollment couples role grant with enrollment | "Apply to Enroll" form mandates Batch selection; admin queue shows one decision approves both |
| 9 | Cell Groups | did not exist | full module | New role areas: Leader, G12; new pages: `/cells`, `/cells/[id]`, `/cells/new`, cell-report list & viewer |
| 10 | Analytics | none | weekly/monthly dashboards; CSV export | New `/analytics` pages scoped to caller's role (Leader / G12 / Admin / Super Admin) |
| 11 | Audit log | global (Super Admin only) | global **+ per-user timeline** (Admin + Super Admin) | New "Activity" tab on user-detail page; new global page accessible to Admin |
| 12 | Localisation | none | si / ta / en with per-user `preferredLanguage` | New `@tccr/i18n` integration; `LanguageSwitcher` in TopNav and on registration |
| 13 | Provider linking | n/a | Link/unlink Google and Apple (FR-AUTH-010) | Profile page gains "Linked accounts" section |
| 14 | FCM tokens | n/a on web | Web FCM token registration optional (browser push) | `POST /me/fcm-token` after sign-in if user opts in to browser push |
| 15 | Notification opt-out | none | per-channel (`email`, `push`) | Profile page gains "Notification preferences" section |
| 16 | Pending-approval status | was the post-registration screen | does not exist for Member; only `role_requests` carry `pending/approved/rejected` state | "My Requests" page replaces "Pending Approval" screen |
| 17 | Identity claims | `{role}` custom claim | `{roles[], preferredLanguage}` custom claims | `firebaseAuth.ts` reads `roles[]` and `preferredLanguage` from token claims |

### 1.3 Goals

- Deliver a single web frontend that fluently serves all six TCCR roles without per-role builds.
- Preserve **every V1 page** as a recognisable counterpart in V2; admins and students should never feel they've lost a screen.
- Make **language switching first-class** — every UI string, every notification, every date and number format goes through the i18n resolver.
- Make Cell Groups usable on desktop while acknowledging mobile is the cell-report entry workhorse.
- Make Analytics dashboards readable on a 360 px phone screen without horizontal scroll.
- Ship **zero direct Firestore reads** from the browser — backend REST API is the only data plane.

### 1.4 Architectural Principles

- **Presentation only.** The web client renders state and dispatches user intent; it never grants itself access or mutates persistent data without server confirmation.
- **Clean Architecture.** Strict separation between domain types, data access (RTK Query), application logic (slices, hooks), and UI rendering (components, pages).
- **SSR for public/SEO-relevant pages**, CSR for all authenticated dashboards.
- **Roles as union, not hierarchy** — `roles[]` membership is checked by union match. The only special case is `super_admin` ⊃ `admin`.
- **Locale-aware by default.** No UI string lives in component source; everything goes through `t()`.
- **Shared contracts.** TypeScript types imported from `tccr-contracts`; no local duplication of API shapes.
- **Additive evolution.** New V2 features ship as new endpoints/routes; deprecated V1 paths are removed in Phase 3 only after clients migrate.

---

## 2. Technology Stack

| Package | Version (target) | Purpose | V2 Note |
|---------|:----------------:|---------|---------|
| `react` | 18.x | UI rendering | — |
| `next` | 14.x (App Router) | SSR/SSG, file-system routing, image optimisation | — |
| `@reduxjs/toolkit` | 2.x | State management — slices, thunks, entity adapters | — |
| `react-redux` | 9.x | React bindings for Redux | — |
| `@reduxjs/toolkit/query` | (bundled) | Server-state management, caching, auto-invalidation | — |
| `tailwindcss` | 3.x | Utility-first CSS framework | — |
| `@tailwindcss/forms` | latest | Form input base styles | — |
| `@tailwindcss/typography` | latest | Prose typography styles | — |
| `firebase` | 10.x | **Auth only** — email/password + Google + Apple providers; ID token | **V2:** federated providers added |
| `react-hook-form` | 7.x | Performant form state management | — |
| `zod` | 3.x | Schema validation (shared with `tccr-contracts`) | — |
| `@hookform/resolvers` | 3.x | Zod resolver for React Hook Form | — |
| `next-intl` | 3.x | i18n key resolution, ICU MessageFormat, date/number formatting | **NEW V2** |
| `next-themes` | latest | Light/dark theme management | — |
| `lucide-react` | latest | Icon library | — |
| `clsx` | latest | Conditional class name utility | — |
| `tailwind-merge` | latest | Merge Tailwind classes without conflicts | — |
| `date-fns` | 3.x | Date formatting utilities; per-locale formatters loaded for si/ta/en | — |
| `axios` | 1.x | HTTP client (used inside RTK Query base query) | — |
| `recharts` | 2.x | Analytics charts (line, bar, donut) | **NEW V2** |
| `uuid` | 9.x | `clientReqId` / `X-Idempotency-Key` generation for cell reports | **NEW V2** |
| `@testing-library/react` | 14.x | Component testing | — |
| `jest` | 29.x | Unit test runner | — |
| `msw` | 2.x | API mocking for integration tests | — |
| `playwright` | latest | E2E testing | — |
| `eslint` | 8.x + Next.js config | Linting + i18n key parity check | — |
| `prettier` | 3.x | Code formatting | — |
| `typescript` | 5.x | Type safety | — |

---

## 3. Clean Architecture — Principles & Layers

The frontend follows a **Clean Architecture** approach adapted for a Next.js/React application. Layers have strict dependency rules: inner layers never depend on outer layers.

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                           │
│   Next.js Pages / App Router · React Components · Layouts       │
│   Role-aware UI · Forms · Feedback · Navigation · i18n         │
├─────────────────────────────────────────────────────────────────┤
│                    APPLICATION LAYER                            │
│   Redux Slices · RTK Query Endpoints · Custom Hooks             │
│   Use-case orchestration · State transformations · Selectors   │
├─────────────────────────────────────────────────────────────────┤
│                    INFRASTRUCTURE LAYER                         │
│   API Client (Axios + RTK Query base query)                     │
│   Firebase Auth SDK (Email/Pwd, Google, Apple) · Token mgmt    │
│   i18n loader · Locale resolver · Error normalisation          │
├─────────────────────────────────────────────────────────────────┤
│                    DOMAIN LAYER (shared)                        │
│   TypeScript types from tccr-contracts                          │
│   Zod schemas · Enums · Constants · Business type guards       │
└─────────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

#### Domain Layer — `src/domain/`
- TypeScript interfaces and types **re-exported** from `tccr-contracts`
- Enums for `Role`, `UserStatus`, `CourseStatus`, `BatchState`, `SemesterStatus`, `EnrollmentStatus`, `ProgressStatus`, `RoleRequestStatus`, `CellType`, `CellState`, `CellReportLanguage`
- Zod validation schemas shared with the backend
- Pure utility functions (no I/O, no side-effects)
- **Rule:** Zero dependencies on React, Redux, Next.js, or i18n libraries

#### Infrastructure Layer — `src/infrastructure/`
- `apiClient.ts` — Axios instance with base URL, auth header injection, locale header injection (`Accept-Language`), token refresh, error normalisation
- `firebaseAuth.ts` — Firebase Auth initialisation, helpers for email/password + Google + Apple sign-in, custom-token exchange, provider link/unlink
- `tokenService.ts` — Secure in-memory token storage (no `localStorage` for tokens)
- `i18nLoader.ts` — Loads namespace JSON for current locale
- RTK Query `baseQuery` with Firebase ID token + locale header injection
- **Rule:** No React components or Redux logic here

#### Application Layer — `src/application/`
- Redux slices (`authSlice`, `uiSlice`, `notificationSlice`, `localeSlice`)
- RTK Query API definitions (`authApi`, `usersApi`, `roleRequestsApi`, `coursesApi`, `batchesApi`, `enrollmentsApi`, `progressApi`, `cellsApi`, `cellReportsApi`, `analyticsApi`, `notificationsApi`, `auditApi`)
- Custom React hooks (`useAuth`, `useRoles`, `useHasRole`, `useLocale`, `useCellScope`, etc.)
- **Rule:** No direct DOM manipulation; no Tailwind classes

#### Presentation Layer — `src/app/` + `src/components/`
- Next.js App Router pages and layouts
- React components (UI primitives, feature components, page components)
- Tailwind CSS utility classes
- `next-intl` `<NextIntlClientProvider>` wrapping
- **Rule:** No direct API calls or Axios imports; all data via hooks/RTK Query

---

## 4. Project Directory Structure

```
tccr-web/
├── src/
│   ├── app/                                # Next.js 14 App Router
│   │   ├── [locale]/                       # Locale-prefixed routes — /si/..., /ta/..., /en/...
│   │   │   │
│   │   │   ├── (public)/                   # Route group — no auth required
│   │   │   │   ├── page.tsx                # Landing
│   │   │   │   ├── login/page.tsx
│   │   │   │   ├── register/page.tsx
│   │   │   │   ├── forgot-password/page.tsx
│   │   │   │   ├── reset-password/page.tsx
│   │   │   │   └── courses/                # Public catalogue (SSR)
│   │   │   │       ├── page.tsx
│   │   │   │       └── [courseId]/
│   │   │   │           └── page.tsx
│   │   │   │
│   │   │   ├── (authed)/                   # Shared shell — any authenticated user
│   │   │   │   ├── layout.tsx              # Common layout: TopNav + LocaleSwitcher + NotificationBell
│   │   │   │   ├── home/page.tsx           # Member home — Bible School + Cell Groups entry tiles
│   │   │   │   ├── profile/                # Universal profile
│   │   │   │   │   ├── page.tsx            # Profile + preferred language + linked accounts + notif prefs
│   │   │   │   │   └── change-password/page.tsx
│   │   │   │   ├── notifications/page.tsx  # In-app notification centre
│   │   │   │   ├── my-cells/               # Read-only cell view (Member)
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [cellId]/page.tsx
│   │   │   │   ├── my-requests/page.tsx    # Member: status of role requests
│   │   │   │   └── apply/                  # Member: become a Student
│   │   │   │       └── [courseId]/
│   │   │   │           └── page.tsx        # Pick Course + Batch + submit role request
│   │   │   │
│   │   │   ├── (student)/                  # Role: student (additive)
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── dashboard/page.tsx      # Student dashboard — enrolled courses, progress
│   │   │   │   ├── my-courses/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [courseId]/
│   │   │   │   │       ├── page.tsx
│   │   │   │   │       └── [subjectId]/
│   │   │   │   │           └── page.tsx
│   │   │   │   └── enrollments/page.tsx    # Additional-enrollment requests
│   │   │   │
│   │   │   ├── (leader)/                   # Role: leader OR g12
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── cells/
│   │   │   │   │   ├── page.tsx            # My cells list
│   │   │   │   │   ├── new/page.tsx
│   │   │   │   │   └── [cellId]/
│   │   │   │   │       ├── page.tsx        # Cell detail (members, reports)
│   │   │   │   │       ├── edit/page.tsx
│   │   │   │   │       ├── members/page.tsx
│   │   │   │   │       └── reports/
│   │   │   │   │           ├── new/page.tsx
│   │   │   │   │           └── [reportId]/page.tsx
│   │   │   │   └── analytics/page.tsx      # Leader-scoped analytics
│   │   │   │
│   │   │   ├── (g12)/                      # Role: g12 (in addition to leader)
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── network/page.tsx        # Leaders + cells in network
│   │   │   │   ├── analytics/page.tsx      # G12-scope analytics + participation per leader
│   │   │   │   └── promote/page.tsx        # Promote Leader → G12
│   │   │   │
│   │   │   ├── (admin)/                    # Role: admin OR super_admin
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── dashboard/page.tsx
│   │   │   │   ├── users/
│   │   │   │   │   ├── page.tsx            # User directory (search + filter by roles[])
│   │   │   │   │   └── [uid]/
│   │   │   │   │       ├── page.tsx        # User profile
│   │   │   │   │       ├── roles/page.tsx  # Manage roles (add/remove)
│   │   │   │   │       └── audit/page.tsx  # Per-user audit timeline — NEW V2
│   │   │   │   ├── role-requests/page.tsx  # Unified role + enrollment approval queue
│   │   │   │   ├── enrollments/page.tsx    # Already-student enrollment queue
│   │   │   │   ├── courses/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── new/page.tsx
│   │   │   │   │   └── [courseId]/
│   │   │   │   │       ├── page.tsx        # Course editor
│   │   │   │   │       ├── batches/        # NEW V2
│   │   │   │   │       │   ├── page.tsx
│   │   │   │   │       │   ├── new/page.tsx
│   │   │   │   │       │   └── [batchId]/page.tsx
│   │   │   │   │       └── semesters/
│   │   │   │   │           └── [semesterId]/
│   │   │   │   │               └── subjects/
│   │   │   │   │                   ├── new/page.tsx
│   │   │   │   │                   └── [subjectId]/page.tsx
│   │   │   │   ├── cells/page.tsx          # Org-wide cell registry (admin view)
│   │   │   │   ├── analytics/page.tsx      # Org-wide analytics
│   │   │   │   └── audit-log/page.tsx      # Global audit log
│   │   │   │
│   │   │   └── (super-admin)/              # Role: super_admin only
│   │   │       ├── layout.tsx
│   │   │       ├── admins/
│   │   │       │   ├── page.tsx
│   │   │       │   ├── new/page.tsx
│   │   │       │   └── [uid]/page.tsx
│   │   │       └── settings/page.tsx       # System settings (FR-SADM-007)
│   │   │
│   │   ├── api/
│   │   │   └── health/route.ts
│   │   │
│   │   ├── error.tsx                       # Global error boundary
│   │   ├── not-found.tsx
│   │   ├── layout.tsx                      # Root layout (providers, fonts, locale wrapper)
│   │   └── globals.css                     # Tailwind + custom properties + script-specific fonts
│   │
│   ├── components/                         # Presentation layer
│   │   ├── ui/                             # Design system primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Textarea.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Checkbox.tsx
│   │   │   ├── Radio.tsx
│   │   │   ├── Switch.tsx
│   │   │   ├── DatePicker.tsx
│   │   │   ├── TimePicker.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Drawer.tsx
│   │   │   ├── Tabs.tsx
│   │   │   ├── Tooltip.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Spinner.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Pagination.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── DateRangePicker.tsx
│   │   │   └── LanguageSwitcher.tsx        # NEW V2 — si / ta / en toggle
│   │   │
│   │   ├── layout/
│   │   │   ├── RootLayout.tsx
│   │   │   ├── AuthedShell.tsx             # Shared shell with TopNav + side rail
│   │   │   ├── MemberLayout.tsx
│   │   │   ├── StudentLayout.tsx
│   │   │   ├── LeaderLayout.tsx
│   │   │   ├── G12Layout.tsx
│   │   │   ├── AdminLayout.tsx
│   │   │   ├── SuperAdminLayout.tsx
│   │   │   ├── Sidebar.tsx                 # Role-aware navigation items
│   │   │   ├── TopNav.tsx
│   │   │   ├── MobileNav.tsx
│   │   │   ├── NotificationBell.tsx
│   │   │   └── RoleSwitcher.tsx            # NEW V2 — when user has >1 role
│   │   │
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx               # Email + password + Google + Apple buttons
│   │   │   ├── RegisterForm.tsx            # V2 fields: phone, gender, DoB, preferredLanguage
│   │   │   ├── ForgotPasswordForm.tsx
│   │   │   ├── ResetPasswordForm.tsx
│   │   │   ├── GoogleSignInButton.tsx      # NEW V2
│   │   │   ├── AppleSignInButton.tsx       # NEW V2
│   │   │   ├── AuthGuard.tsx
│   │   │   └── RoleGuard.tsx
│   │   │
│   │   ├── course/
│   │   │   ├── CourseCard.tsx
│   │   │   ├── CourseList.tsx
│   │   │   ├── CourseDetail.tsx
│   │   │   ├── CourseEditor.tsx
│   │   │   ├── CourseStatusBadge.tsx
│   │   │   ├── BatchAccordion.tsx          # NEW V2
│   │   │   ├── BatchEditor.tsx             # NEW V2
│   │   │   ├── BatchStateBadge.tsx         # NEW V2
│   │   │   ├── SemesterAccordion.tsx       # V2: shows openDate / endDate
│   │   │   ├── SemesterDateBadge.tsx       # NEW V2
│   │   │   ├── SubjectItem.tsx
│   │   │   ├── SubjectEditor.tsx           # V2: image gallery support
│   │   │   ├── SubjectImageGallery.tsx     # NEW V2 — PNG/JPG
│   │   │   ├── AttachmentUploader.tsx      # V2: accepts PNG/JPG too
│   │   │   ├── YouTubePlayer.tsx
│   │   │   └── CourseProgressRing.tsx
│   │   │
│   │   ├── role-requests/                  # NEW V2 — replaces enrollment/registration components
│   │   │   ├── RoleRequestForm.tsx
│   │   │   ├── RoleRequestStatusBadge.tsx
│   │   │   ├── RoleRequestQueue.tsx        # Admin approval queue
│   │   │   ├── RoleRequestDetail.tsx
│   │   │   └── BulkApproveBar.tsx
│   │   │
│   │   ├── enrollment/
│   │   │   ├── EnrollButton.tsx
│   │   │   ├── EnrollmentStatusBadge.tsx
│   │   │   ├── EnrollmentQueue.tsx
│   │   │   └── AdditionalEnrollmentForm.tsx # NEW V2 — already-student path
│   │   │
│   │   ├── progress/
│   │   │   ├── ProgressCard.tsx
│   │   │   ├── SubjectCompletionToggle.tsx
│   │   │   └── CourseProgressSummary.tsx
│   │   │
│   │   ├── user/                           # NEW V2 — was student/admin
│   │   │   ├── UserTable.tsx
│   │   │   ├── UserFilters.tsx
│   │   │   ├── UserStatusBadge.tsx
│   │   │   ├── UserDetail.tsx
│   │   │   ├── UserRolesBadgeStack.tsx     # NEW V2 — renders multi-role
│   │   │   ├── ManageRolesForm.tsx         # NEW V2 — add/remove roles dialog
│   │   │   └── UserAuditTimeline.tsx       # NEW V2 — per-user audit log
│   │   │
│   │   ├── cells/                          # NEW V2
│   │   │   ├── CellCard.tsx
│   │   │   ├── CellList.tsx
│   │   │   ├── CellDetail.tsx
│   │   │   ├── CellEditor.tsx
│   │   │   ├── CellMembersPanel.tsx
│   │   │   ├── CellTypeBadge.tsx
│   │   │   ├── CellStateBadge.tsx
│   │   │   ├── MemberPicker.tsx            # Search users → add to cell
│   │   │   ├── ReportList.tsx
│   │   │   ├── ReportCard.tsx
│   │   │   ├── ReportViewer.tsx
│   │   │   ├── ReportForm.tsx              # Multi-step entry form
│   │   │   ├── AttendanceEditor.tsx
│   │   │   ├── SatisfactionInput.tsx
│   │   │   └── VoidReportDialog.tsx
│   │   │
│   │   ├── analytics/                      # NEW V2
│   │   │   ├── WeeklyCellsChart.tsx        # Line/bar — cellCount, activeCells
│   │   │   ├── AttendanceChart.tsx
│   │   │   ├── MeetingTypeDonut.tsx
│   │   │   ├── GrowthChart.tsx
│   │   │   ├── ParticipationTable.tsx
│   │   │   ├── DashboardKPICards.tsx
│   │   │   ├── PeriodSelector.tsx          # Weeks selector / month range
│   │   │   └── ExportCsvButton.tsx
│   │   │
│   │   ├── audit/                          # NEW V2 (was super-admin only in V1)
│   │   │   ├── AuditLogTable.tsx
│   │   │   ├── AuditEntryRow.tsx
│   │   │   └── AuditFilters.tsx
│   │   │
│   │   ├── notifications/
│   │   │   ├── NotificationList.tsx
│   │   │   ├── NotificationItem.tsx
│   │   │   └── NotificationPreferencesForm.tsx # NEW V2 — per-channel opt-out
│   │   │
│   │   └── i18n/                            # NEW V2
│   │       ├── LocalisedDate.tsx
│   │       ├── LocalisedTime.tsx
│   │       ├── LocalisedNumber.tsx
│   │       └── ScriptOptimisedText.tsx     # Wraps Sinhala/Tamil text with proper line-height
│   │
│   ├── domain/
│   │   ├── types/
│   │   │   ├── user.ts
│   │   │   ├── roleRequest.ts              # NEW V2
│   │   │   ├── course.ts
│   │   │   ├── batch.ts                    # NEW V2
│   │   │   ├── semester.ts
│   │   │   ├── subject.ts
│   │   │   ├── lesson.ts
│   │   │   ├── enrollment.ts
│   │   │   ├── progress.ts
│   │   │   ├── cell.ts                     # NEW V2
│   │   │   ├── cellReport.ts               # NEW V2
│   │   │   ├── analytics.ts                # NEW V2
│   │   │   ├── notification.ts
│   │   │   ├── audit.ts
│   │   │   └── pagination.ts
│   │   ├── enums/
│   │   │   ├── Role.ts                     # NEW V2 — additive
│   │   │   ├── UserStatus.ts
│   │   │   ├── CourseStatus.ts
│   │   │   ├── BatchState.ts               # NEW V2
│   │   │   ├── SemesterStatus.ts
│   │   │   ├── EnrollmentStatus.ts
│   │   │   ├── ProgressStatus.ts
│   │   │   ├── RoleRequestStatus.ts        # NEW V2
│   │   │   ├── CellType.ts                 # NEW V2
│   │   │   ├── CellState.ts                # NEW V2
│   │   │   └── Locale.ts                   # NEW V2 — 'si' | 'ta' | 'en'
│   │   ├── schemas/
│   │   │   ├── auth.schemas.ts
│   │   │   ├── course.schemas.ts
│   │   │   ├── batch.schemas.ts            # NEW V2
│   │   │   ├── roleRequest.schemas.ts      # NEW V2
│   │   │   ├── enrollment.schemas.ts
│   │   │   ├── cell.schemas.ts             # NEW V2
│   │   │   └── cellReport.schemas.ts       # NEW V2
│   │   └── utils/
│   │       ├── roleUtils.ts                # NEW V2 — union match, super_admin inheritance
│   │       ├── courseUtils.ts
│   │       ├── batchUtils.ts               # NEW V2 — isBatchOpen()
│   │       ├── semesterUtils.ts            # NEW V2 — isSemesterDisabled()
│   │       ├── cellUtils.ts                # NEW V2
│   │       ├── progressUtils.ts
│   │       └── dateUtils.ts                # locale-aware formatters
│   │
│   ├── infrastructure/
│   │   ├── api/
│   │   │   ├── apiClient.ts                # Axios + Accept-Language header (NEW V2)
│   │   │   ├── baseQuery.ts                # RTK Query base query
│   │   │   └── errorHandler.ts
│   │   ├── auth/
│   │   │   ├── firebaseConfig.ts
│   │   │   ├── firebaseAuth.ts             # email/pwd + Google + Apple (NEW V2)
│   │   │   └── tokenService.ts
│   │   ├── i18n/                           # NEW V2
│   │   │   ├── config.ts
│   │   │   ├── loader.ts
│   │   │   └── formats.ts                  # Date / number format presets per locale
│   │   └── storage/
│   │       └── sessionStorage.ts
│   │
│   ├── application/
│   │   ├── store/
│   │   │   ├── index.ts
│   │   │   ├── rootReducer.ts
│   │   │   └── middleware.ts
│   │   ├── slices/
│   │   │   ├── authSlice.ts                # V2: stores roles[] + preferredLanguage
│   │   │   ├── uiSlice.ts
│   │   │   ├── notificationSlice.ts
│   │   │   └── localeSlice.ts              # NEW V2
│   │   ├── api/
│   │   │   ├── baseApi.ts
│   │   │   ├── authApi.ts                  # V2: federated endpoints
│   │   │   ├── usersApi.ts                 # V2: roles[] mgmt + audit per user
│   │   │   ├── roleRequestsApi.ts          # NEW V2
│   │   │   ├── coursesApi.ts
│   │   │   ├── batchesApi.ts               # NEW V2
│   │   │   ├── enrollmentsApi.ts
│   │   │   ├── progressApi.ts
│   │   │   ├── cellsApi.ts                 # NEW V2
│   │   │   ├── cellReportsApi.ts           # NEW V2
│   │   │   ├── analyticsApi.ts             # NEW V2
│   │   │   ├── notificationsApi.ts
│   │   │   └── auditApi.ts                 # V2: per-user endpoint
│   │   └── hooks/
│   │       ├── useAuth.ts
│   │       ├── useRoles.ts                 # NEW V2 — replaces useRole()
│   │       ├── useHasRole.ts               # NEW V2
│   │       ├── useLocale.ts                # NEW V2
│   │       ├── useCellScope.ts             # NEW V2 — resolves leader vs g12 vs admin view
│   │       ├── useCourseProgress.ts
│   │       ├── useNotifications.ts
│   │       ├── useConfirmDialog.ts
│   │       ├── useDebounce.ts
│   │       ├── useIdempotencyKey.ts        # NEW V2 — generates uuid for cell-report POST
│   │       └── usePagination.ts
│   │
│   ├── lib/
│   │   ├── cn.ts
│   │   ├── constants.ts
│   │   └── config.ts
│   │
│   ├── messages/                           # NEW V2 — i18n translation files
│   │   ├── en.json
│   │   ├── si.json
│   │   └── ta.json
│   │
│   ├── i18n.ts                             # NEW V2 — next-intl config entry
│   └── middleware.ts                       # Next.js middleware — locale + auth
│
├── public/
│   ├── icons/
│   ├── images/
│   └── fonts/                              # Sinhala + Tamil web fonts (NEW V2)
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env.local
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── jest.config.ts
├── playwright.config.ts
└── package.json
```

---

## 5. Routing Architecture

### 5.1 Route Groups and Access Levels

Next.js 14 App Router **route groups** (parenthesised folders) define access tiers without affecting the URL path. **V2 adds locale prefix** as a dynamic segment (`/[locale]/...`) so URLs are `/si/dashboard`, `/ta/cells`, `/en/courses`.

| URL Pattern | Route Group | Auth Required | Required Roles |
|------------|-------------|:-------------:|----------------|
| `/[locale]` | `(public)` | No | — |
| `/[locale]/login` | `(public)` | No | — |
| `/[locale]/register` | `(public)` | No | — |
| `/[locale]/forgot-password` | `(public)` | No | — |
| `/[locale]/reset-password` | `(public)` | No | — |
| `/[locale]/courses` | `(public)` | No | — (SSR) |
| `/[locale]/courses/[courseId]` | `(public)` | No | — (SSR) |
| `/[locale]/home` | `(authed)` | Yes | any |
| `/[locale]/profile` | `(authed)` | Yes | any |
| `/[locale]/profile/change-password` | `(authed)` | Yes | any |
| `/[locale]/notifications` | `(authed)` | Yes | any |
| `/[locale]/my-cells` | `(authed)` | Yes | any (read-only) |
| `/[locale]/my-cells/[cellId]` | `(authed)` | Yes | member of cell |
| `/[locale]/my-requests` | `(authed)` | Yes | any |
| `/[locale]/apply/[courseId]` | `(authed)` | Yes | `member` (no `student` yet) |
| `/[locale]/dashboard` | `(student)` | Yes | `student` (or `+`) |
| `/[locale]/my-courses` | `(student)` | Yes | `student`+ |
| `/[locale]/my-courses/[courseId]` | `(student)` | Yes | `student`+ |
| `/[locale]/my-courses/[courseId]/[subjectId]` | `(student)` | Yes | `student`+ |
| `/[locale]/enrollments` | `(student)` | Yes | `student`+ — additional-enrollment requests |
| `/[locale]/cells` | `(leader)` | Yes | `leader` ∪ `g12` ∪ `admin` ∪ `super_admin` |
| `/[locale]/cells/new` | `(leader)` | Yes | `leader`+ |
| `/[locale]/cells/[cellId]` | `(leader)` | Yes | own cell or admin+ |
| `/[locale]/cells/[cellId]/edit` | `(leader)` | Yes | own cell or admin+ |
| `/[locale]/cells/[cellId]/members` | `(leader)` | Yes | own cell or admin+ |
| `/[locale]/cells/[cellId]/reports/new` | `(leader)` | Yes | `leader` ∪ `g12` ∪ `super_admin` (NOT `admin`) |
| `/[locale]/cells/[cellId]/reports/[reportId]` | `(leader)` | Yes | member of cell or admin+ |
| `/[locale]/analytics` | `(leader)` | Yes | `leader`+ (scope inferred) |
| `/[locale]/network` | `(g12)` | Yes | `g12`+ |
| `/[locale]/promote` | `(g12)` | Yes | `g12`+ |
| `/[locale]/dashboard` (admin variant) | `(admin)` | Yes | `admin` ∪ `super_admin` |
| `/[locale]/users` | `(admin)` | Yes | admin+ |
| `/[locale]/users/[uid]` | `(admin)` | Yes | admin+ |
| `/[locale]/users/[uid]/roles` | `(admin)` | Yes | admin+ |
| `/[locale]/users/[uid]/audit` | `(admin)` | Yes | admin+ |
| `/[locale]/role-requests` | `(admin)` | Yes | admin+ |
| `/[locale]/courses` (admin variant) | `(admin)` | Yes | admin+ |
| `/[locale]/courses/new` | `(admin)` | Yes | admin+ |
| `/[locale]/courses/[courseId]` (admin editor) | `(admin)` | Yes | admin+ |
| `/[locale]/courses/[courseId]/batches/*` | `(admin)` | Yes | admin+ |
| `/[locale]/cells` (admin org view) | `(admin)` | Yes | admin+ |
| `/[locale]/audit-log` | `(admin)` | Yes | admin+ |
| `/[locale]/admins` | `(super-admin)` | Yes | `super_admin` only |
| `/[locale]/admins/new` | `(super-admin)` | Yes | `super_admin` only |
| `/[locale]/admins/[uid]` | `(super-admin)` | Yes | `super_admin` only |
| `/[locale]/settings` | `(super-admin)` | Yes | `super_admin` only |

> **Routing notes.**
> - Where two route groups define the same URL (`/dashboard` for student vs admin), Next.js disambiguates at the route-group level. The shell layout (selected by RootLayout based on `useRoles()`) renders the appropriate variant.
> - "Required Roles" is **union match**: a user holding `["member","leader"]` can access any `(authed)` and `(leader)` page.
> - `super_admin` inherits `admin`; the union check expands `super_admin` to `[super_admin, admin]`.
> - Cell-report **creation** (`/cells/[id]/reports/new`) excludes plain `admin` per RBAC matrix in SRS §9.3.

### 5.2 Next.js Middleware — `src/middleware.ts`

The middleware runs at the Edge before every request. It performs **two tasks**:

1. **Locale resolution** — extracts/redirects the `[locale]` segment.
2. **Auth check** — verifies an `__session` cookie exists for protected paths.

```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';

const LOCALES = ['si', 'ta', 'en'] as const;
const DEFAULT_LOCALE = 'en';

const intlMiddleware = createIntlMiddleware({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'always', // every URL starts with /si, /ta or /en
});

const PROTECTED_PATTERNS = [
  /^\/(si|ta|en)\/(home|profile|notifications|my-cells|my-requests|apply|dashboard|my-courses|enrollments|cells|analytics|network|promote|users|role-requests|courses\/new|courses\/[^/]+\/(?!$)|audit-log|admins|settings)/,
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Stage 1 — locale resolution (handled by next-intl)
  const intlResponse = intlMiddleware(request);

  // Stage 2 — protected route check
  const isProtected = PROTECTED_PATTERNS.some(p => p.test(pathname));
  if (!isProtected) return intlResponse;

  const token = request.cookies.get('__session')?.value;
  if (!token) {
    const url = request.nextUrl.clone();
    const locale = pathname.split('/')[1] || DEFAULT_LOCALE;
    url.pathname = `/${locale}/login`;
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return intlResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/health).*)'],
};
```

### 5.3 Role-Based Redirect After Login

After Firebase `onAuthStateChanged` fires, the client fetches `GET /me` (which returns full profile including `roles[]` and `preferredLanguage`). The `AuthGuard` component then performs:

```
1. Apply user's preferredLanguage as active locale (redirect if URL locale ≠ profile).
2. Determine landing route from roles[] using this priority order:
     super_admin → /admin-dashboard
     admin       → /admin-dashboard
     g12         → /cells (with G12 widgets visible)
     leader      → /cells
     student     → /dashboard (student)
     member      → /home
3. If `?redirect=` query param exists and the user has access to it, use that instead.
```

---

## 6. Authentication, Federated Sign-In & Route Guards

### 6.1 Firebase Auth Integration — V2 (Email/Pwd + Google + Apple)

Authentication uses the Firebase JS SDK. **No Firestore client access.** V2 adds **Google** and **Apple** federated sign-in (FR-AUTH-003 / FR-AUTH-004). The Firebase ID token is forwarded as `Authorization: Bearer <token>` on every API call. OAuth tokens from Google/Apple are **discarded after exchange** (NFR-SEC-006); only the Firebase ID token is persisted in memory.

```typescript
// src/infrastructure/auth/firebaseAuth.ts
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth, signInWithEmailAndPassword, signOut as fbSignOut,
  onAuthStateChanged, signInWithPopup,
  GoogleAuthProvider, OAuthProvider,
  signInWithCustomToken, linkWithCredential, unlink,
  User,
} from 'firebase/auth';
import { firebaseConfig } from './firebaseConfig';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

// ----- Email / Password (FR-AUTH-002) -----
export async function signInWithPassword(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return { user: cred.user, idToken: await cred.user.getIdToken() };
}

// ----- Google federated sign-in (FR-AUTH-003) -----
export async function signInWithGoogle(): Promise<{ idToken: string }> {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  // GoogleAuthProvider.credentialFromResult exposes the Google ID token
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const googleIdToken = credential?.idToken;
  if (!googleIdToken) throw new Error('Google ID token unavailable');
  // POST to backend; backend creates/verifies user and returns Firebase custom token
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/federated/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: googleIdToken }),
  });
  if (!res.ok) throw new Error('Federated sign-in failed');
  const { firebaseToken } = await res.json();
  // Discard Google token; only Firebase token retained (NFR-SEC-006)
  const finalCred = await signInWithCustomToken(auth, firebaseToken);
  return { idToken: await finalCred.user.getIdToken() };
}

// ----- Apple federated sign-in (FR-AUTH-004) -----
export async function signInWithApple(): Promise<{ idToken: string }> {
  const provider = new OAuthProvider('apple.com');
  provider.addScope('email');
  provider.addScope('name');
  const result = await signInWithPopup(auth, provider);
  const credential = OAuthProvider.credentialFromResult(result);
  const appleIdToken = credential?.idToken;
  if (!appleIdToken) throw new Error('Apple identity token unavailable');
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/federated/apple`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: appleIdToken }),
  });
  if (!res.ok) throw new Error('Federated sign-in failed');
  const { firebaseToken } = await res.json();
  const finalCred = await signInWithCustomToken(auth, firebaseToken);
  return { idToken: await finalCred.user.getIdToken() };
}

// ----- Provider linking (FR-AUTH-010) -----
export async function linkGoogleProvider(): Promise<void> {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const cred = GoogleAuthProvider.credentialFromResult(result);
  if (cred && auth.currentUser) await linkWithCredential(auth.currentUser, cred);
}

export async function unlinkProvider(providerId: 'google.com' | 'apple.com'): Promise<void> {
  if (!auth.currentUser) throw new Error('Not signed in');
  await unlink(auth.currentUser, providerId);
}

// ----- Session helpers -----
export async function signOut() { await fbSignOut(auth); }

export function subscribeToAuthState(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken(forceRefresh);
}
```

### 6.2 Token Service (In-Memory)

ID tokens are stored **in memory only** to prevent XSS token theft. The Firebase SDK handles token refresh transparently. Tokens are never written to `localStorage`.

```typescript
// src/infrastructure/auth/tokenService.ts
let _idToken: string | null = null;

export const tokenService = {
  set: (token: string) => { _idToken = token; },
  get: () => _idToken,
  clear: () => { _idToken = null; },
};
```

### 6.3 RTK Query Base Query with Token + Locale Injection

```typescript
// src/infrastructure/api/baseQuery.ts
import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getIdToken } from '../auth/firebaseAuth';
import { config } from '@/lib/config';
import { store } from '@/application/store';

export const baseQuery = fetchBaseQuery({
  baseUrl: config.apiBaseUrl,
  prepareHeaders: async (headers) => {
    const token = await getIdToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    headers.set('Content-Type', 'application/json');

    // NEW V2 — propagate locale so backend renders notifications in user's language
    const locale = store.getState().locale.current || 'en';
    headers.set('Accept-Language', locale);
    return headers;
  },
});
```

### 6.4 AuthGuard Component (V2)

Now accepts **`requiredAnyRole: Role[]`** (union match) rather than a single role.

```typescript
// src/components/auth/AuthGuard.tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/application/store';
import { selectAuthStatus, selectCurrentUser } from '@/application/slices/authSlice';
import { hasAnyRole } from '@/domain/utils/roleUtils';
import { Spinner } from '@/components/ui/Spinner';
import type { Role } from '@/domain/enums/Role';

interface AuthGuardProps {
  children: React.ReactNode;
  /** If provided, user must hold AT LEAST ONE of these roles (super_admin always passes admin checks) */
  requiredAnyRole?: Role[];
}

export function AuthGuard({ children, requiredAnyRole }: AuthGuardProps) {
  const router = useRouter();
  const status = useAppSelector(selectAuthStatus);
  const user = useAppSelector(selectCurrentUser);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }
    if (status === 'authenticated' && requiredAnyRole && user) {
      if (!hasAnyRole(user.roles, requiredAnyRole)) {
        router.replace('/home'); // safe default — every user has Member
      }
    }
  }, [status, user, requiredAnyRole, router]);

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (status === 'unauthenticated') return null;
  return <>{children}</>;
}
```

### 6.5 RoleGuard Component (Conditional UI)

```typescript
// src/components/auth/RoleGuard.tsx
'use client';
import { useRoles } from '@/application/hooks/useRoles';
import { hasAnyRole } from '@/domain/utils/roleUtils';
import type { Role } from '@/domain/enums/Role';

interface RoleGuardProps {
  allowAny: Role[];           // union match
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGuard({ allowAny, children, fallback = null }: RoleGuardProps) {
  const { roles } = useRoles();
  return hasAnyRole(roles, allowAny) ? <>{children}</> : <>{fallback}</>;
}
```

### 6.6 Inactivity Timeout (FR-AUTH-008)

The web client signs the user out after **30 minutes of inactivity**. A timer is reset on `mousedown`, `keydown`, `scroll`, `touchstart`. On expiry → `logoutThunk` → redirect to `/login`. Mobile is not subject to this constraint (its session lasts until refresh-token expiry).

```typescript
// src/application/hooks/useInactivityTimer.ts
'use client';
import { useEffect } from 'react';
import { useAppDispatch } from '@/application/store';
import { logoutThunk } from '@/application/slices/authSlice';

const TIMEOUT_MS = 30 * 60 * 1000;

export function useInactivityTimer() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => dispatch(logoutThunk()), TIMEOUT_MS);
    };
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [dispatch]);
}
```

### 6.7 Failed-Login Tracking (FR-AUTH-009)

On every failed email/password sign-in, the client `POST`s `/auth/track-failure { email }`. After 5 consecutive failures in 15 minutes the backend locks the account for 15 minutes; the client shows the localised lockout message returned in the response. The Google/Apple sign-in flows are exempt — only password-based attempts are tracked.

---

## 7. Roles Model & RBAC on the Client

### 7.1 The Six Roles (V2)

Roles are **additive**. A user holds an array `roles[]` from the union below; every authenticated user has `member` at minimum.

```typescript
// src/domain/enums/Role.ts
export type Role =
  | 'member'        // default — every registered user
  | 'student'       // approved learner (Bible School)
  | 'leader'        // cell-group leader
  | 'g12'           // senior leader overseeing leaders
  | 'admin'         // staff
  | 'super_admin';  // platform owner

export const ALL_ROLES = ['member','student','leader','g12','admin','super_admin'] as const;
```

### 7.2 RBAC Matrix (Source of Truth — SRS §9.3)

| Action | Member | Student | Leader | G12 | Admin | Super Admin |
|--------|:------:|:-------:|:------:|:---:|:-----:|:-----------:|
| View home | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Edit own profile | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Submit student-role request | ✓ | — | — | — | — | — |
| View Bible School catalogue | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Submit additional enrollment | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| Access enrolled Subjects / Lessons | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| View own Cell Groups (read-only) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create Cell Group | — | — | ✓ | ✓ | ✓ | ✓ |
| Add / remove cell members | — | — | ✓ | ✓ | ✓ | ✓ |
| File Cell Report | — | — | ✓ | ✓ | — | ✓ |
| Void Cell Report | — | — | ✓ | ✓ | ✓ | ✓ |
| View Leader-scoped analytics | — | — | ✓ | ✓ | ✓ | ✓ |
| View G12-scoped analytics | — | — | — | ✓ | ✓ | ✓ |
| View org-wide analytics | — | — | — | — | ✓ | ✓ |
| Approve student-role + enrollment | — | — | — | — | ✓ | ✓ |
| Promote Member → Leader / G12 | — | — | — | G12 only | ✓ | ✓ |
| Create / edit Course, Batch, Semester, Subject | — | — | — | — | ✓ | ✓ |
| View per-user audit log | — | — | — | — | ✓ | ✓ |
| Create / manage Admin accounts | — | — | — | — | — | ✓ |
| Configure system settings | — | — | — | — | — | ✓ |

### 7.3 Role Utilities

```typescript
// src/domain/utils/roleUtils.ts
import type { Role } from '@/domain/enums/Role';

/** Expand super_admin to include admin (inheritance per SRS §9.2). */
export function effectiveRoles(roles: Role[]): Role[] {
  return roles.includes('super_admin') && !roles.includes('admin')
    ? [...roles, 'admin']
    : roles;
}

/** Union match: returns true if user has at least one of the required roles. */
export function hasAnyRole(userRoles: Role[], required: Role[]): boolean {
  const effective = effectiveRoles(userRoles);
  return required.some(r => effective.includes(r));
}

/** Pretty-print roles in display order. */
const ORDER: Role[] = ['super_admin','admin','g12','leader','student','member'];
export function sortRoles(roles: Role[]): Role[] {
  return [...roles].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
}

/** The "highest" role for shell/landing-page selection. */
export function primaryRole(roles: Role[]): Role {
  return sortRoles(roles)[0] ?? 'member';
}
```

### 7.4 `useRoles()` Hook

```typescript
// src/application/hooks/useRoles.ts
import { useAppSelector } from '@/application/store';
import { selectCurrentUser } from '@/application/slices/authSlice';
import { effectiveRoles, hasAnyRole, primaryRole } from '@/domain/utils/roleUtils';
import type { Role } from '@/domain/enums/Role';

export function useRoles() {
  const user = useAppSelector(selectCurrentUser);
  const roles: Role[] = user?.roles ?? [];
  const effective = effectiveRoles(roles);
  return {
    roles,
    effective,
    primary: primaryRole(roles),
    isMember:      effective.includes('member'),
    isStudent:     effective.includes('student'),
    isLeader:      effective.includes('leader'),
    isG12:         effective.includes('g12'),
    isAdmin:       effective.includes('admin'),       // super_admin inherits admin
    isSuperAdmin:  effective.includes('super_admin'),
    can: (required: Role[]) => hasAnyRole(roles, required),
  };
}
```

---

## 8. State Management (Redux Toolkit)

### 8.1 Store Configuration

```typescript
// src/application/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { rootReducer } from './rootReducer';
import { baseApi } from '@/application/api/baseApi';

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefault) =>
    getDefault({ serializableCheck: false }).concat(baseApi.middleware),
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

### 8.2 Auth Slice (V2)

V2 stores `roles[]` and `preferredLanguage` in addition to the V1 fields. The login thunk now branches on whether `signInWithPassword`, `signInWithGoogle`, or `signInWithApple` was invoked, but all converge on the same `/me` fetch.

```typescript
// src/application/slices/authSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  signInWithPassword, signInWithGoogle, signInWithApple,
  signOut as fbSignOut, getIdToken,
} from '@/infrastructure/auth/firebaseAuth';
import { tokenService } from '@/infrastructure/auth/tokenService';
import type { UserProfile } from '@/domain/types/user';
import type { Locale } from '@/domain/enums/Locale';

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: UserProfile | null;
  status: AuthStatus;
  error: string | null;
}

const initialState: AuthState = { user: null, status: 'idle', error: null };

async function fetchMe(idToken: string, locale: Locale): Promise<UserProfile> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/me`, {
    headers: { Authorization: `Bearer ${idToken}`, 'Accept-Language': locale },
  });
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
}

export const loginWithPasswordThunk = createAsyncThunk(
  'auth/loginPassword',
  async (
    { email, password, locale }: { email: string; password: string; locale: Locale },
    { rejectWithValue }
  ) => {
    try {
      const { idToken } = await signInWithPassword(email, password);
      tokenService.set(idToken);
      return await fetchMe(idToken, locale);
    } catch (err: any) {
      // FR-AUTH-009 — record the failure so backend can lock after 5
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/track-failure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      }).catch(() => {});
      return rejectWithValue(err.message);
    }
  }
);

export const loginWithGoogleThunk = createAsyncThunk(
  'auth/loginGoogle',
  async ({ locale }: { locale: Locale }, { rejectWithValue }) => {
    try {
      const { idToken } = await signInWithGoogle();
      tokenService.set(idToken);
      return await fetchMe(idToken, locale);
    } catch (err: any) { return rejectWithValue(err.message); }
  }
);

export const loginWithAppleThunk = createAsyncThunk(
  'auth/loginApple',
  async ({ locale }: { locale: Locale }, { rejectWithValue }) => {
    try {
      const { idToken } = await signInWithApple();
      tokenService.set(idToken);
      return await fetchMe(idToken, locale);
    } catch (err: any) { return rejectWithValue(err.message); }
  }
);

export const logoutThunk = createAsyncThunk('auth/logout', async () => {
  // POST /auth/logout to revoke refresh tokens server-side
  try {
    const token = await getIdToken();
    if (token) {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } finally {
    await fbSignOut();
    tokenService.clear();
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<UserProfile>) => {
      state.user = action.payload;
      state.status = 'authenticated';
    },
    clearAuth: (state) => { state.user = null; state.status = 'unauthenticated'; state.error = null; },
    setStatus: (state, action: PayloadAction<AuthStatus>) => { state.status = action.payload; },
  },
  extraReducers: (b) => {
    const setLoading = (s: AuthState) => { s.status = 'loading'; s.error = null; };
    const setOk      = (s: AuthState, a: any) => { s.user = a.payload; s.status = 'authenticated'; };
    const setFail    = (s: AuthState, a: any) => { s.status = 'unauthenticated'; s.error = a.payload as string; };
    [loginWithPasswordThunk, loginWithGoogleThunk, loginWithAppleThunk].forEach(t => {
      b.addCase(t.pending, setLoading).addCase(t.fulfilled, setOk).addCase(t.rejected, setFail);
    });
    b.addCase(logoutThunk.fulfilled, (s) => { s.user = null; s.status = 'unauthenticated'; });
  },
});

export const { setUser, clearAuth, setStatus } = authSlice.actions;
export const selectCurrentUser = (s: { auth: AuthState }) => s.auth.user;
export const selectAuthStatus  = (s: { auth: AuthState }) => s.auth.status;
export const selectUserRoles   = (s: { auth: AuthState }) => s.auth.user?.roles ?? [];
export default authSlice.reducer;
```

### 8.3 Locale Slice (NEW V2)

```typescript
// src/application/slices/localeSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Locale } from '@/domain/enums/Locale';

interface LocaleState { current: Locale; }
const initialState: LocaleState = { current: 'en' };

const localeSlice = createSlice({
  name: 'locale',
  initialState,
  reducers: {
    setLocale: (state, action: PayloadAction<Locale>) => { state.current = action.payload; },
  },
});

export const { setLocale } = localeSlice.actions;
export const selectLocale = (s: { locale: LocaleState }) => s.locale.current;
export default localeSlice.reducer;
```

### 8.4 UI Slice & Notification Slice

Carried forward from V1 unchanged except notifications now have `localeRendered` and the unread count is derived directly from the API (RTK Query polled endpoint), so the `notificationSlice` is now slim and mostly stores transient UI state (selection, drawer open).

```typescript
// src/application/slices/uiSlice.ts (unchanged from V1; toasts + confirmDialog)
// src/application/slices/notificationSlice.ts (slimmed — see §15)
```

---

## 9. API Layer — RTK Query

### 9.1 Base API

```typescript
// src/application/api/baseApi.ts
import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '@/infrastructure/api/baseQuery';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: [
    'Me', 'User', 'AuditLog',
    'Course', 'Batch', 'Semester', 'Subject', 'Lesson', 'Attachment',
    'Enrollment', 'RoleRequest', 'Progress',
    'Cell', 'CellMembers', 'CellReport',
    'AnalyticsCells', 'AnalyticsAttendance', 'AnalyticsMeetingTypes',
    'AnalyticsGrowth', 'AnalyticsParticipation',
    'Notification', 'NotificationPreferences',
  ],
  endpoints: () => ({}),
});
```

### 9.2 Auth API (NEW V2 endpoints surfaced)

Most auth flows go through Firebase directly (see §6.1). Only these auxiliary endpoints sit in RTK Query:

```typescript
// src/application/api/authApi.ts
import { baseApi } from './baseApi';

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    requestPasswordReset: builder.mutation<void, { email: string }>({
      query: (body) => ({ url: '/auth/password-reset', method: 'POST', body }),
    }),
    verifyPasswordResetOtp: builder.mutation<void, { email: string; otp: string }>({
      query: (body) => ({ url: '/auth/password-reset/verify', method: 'POST', body }),
    }),
    changePassword: builder.mutation<void, { currentPassword: string; newPassword: string }>({
      query: (body) => ({ url: '/me/change-password', method: 'POST', body }),
    }),
    registerFcmToken: builder.mutation<void, { token: string; platform: 'web' }>({
      query: (body) => ({ url: '/me/fcm-token', method: 'POST', body }),
    }),
    deleteFcmToken: builder.mutation<void, { token: string }>({
      query: (body) => ({ url: '/me/fcm-token', method: 'DELETE', body }),
    }),
  }),
});

export const {
  useRequestPasswordResetMutation,
  useVerifyPasswordResetOtpMutation,
  useChangePasswordMutation,
  useRegisterFcmTokenMutation,
  useDeleteFcmTokenMutation,
} = authApi;
```

### 9.3 Users API (V2 — roles[] + per-user audit)

```typescript
// src/application/api/usersApi.ts
import { baseApi } from './baseApi';
import type { UserProfile, PaginatedResponse } from '@/domain/types/user';
import type { AuditLogEntry } from '@/domain/types/audit';
import type { Role } from '@/domain/enums/Role';

export interface UpdateRolesDto { add?: Role[]; remove?: Role[]; }

export const usersApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getMe: b.query<UserProfile, void>({
      query: () => '/me',
      providesTags: ['Me'],
    }),
    updateMe: b.mutation<UserProfile, Partial<UserProfile>>({
      query: (body) => ({ url: '/me', method: 'PATCH', body }),
      invalidatesTags: ['Me'],
    }),
    updateNotificationPreferences: b.mutation<{ email: boolean; push: boolean }, { email: boolean; push: boolean }>({
      query: (body) => ({ url: '/me/notifications/preferences', method: 'PATCH', body }),
      invalidatesTags: ['Me', 'NotificationPreferences'],
    }),
    linkProvider: b.mutation<{ providers: string[] }, { provider: 'google' | 'apple'; idToken: string }>({
      query: (body) => ({ url: '/me/providers/link', method: 'POST', body }),
      invalidatesTags: ['Me'],
    }),
    unlinkProvider: b.mutation<{ providers: string[] }, 'google' | 'apple'>({
      query: (provider) => ({ url: `/me/providers/${provider}`, method: 'DELETE' }),
      invalidatesTags: ['Me'],
    }),

    // Admin user management
    getUsers: b.query<PaginatedResponse<UserProfile>, {
      search?: string; roles?: string; status?: string;
      courseId?: string; batchId?: string;
      limit?: number; cursor?: string;
    }>({
      query: (params) => ({ url: '/users', params }),
      providesTags: ['User'],
    }),
    getUser: b.query<UserProfile, string>({
      query: (uid) => `/users/${uid}`,
      providesTags: (_, __, uid) => [{ type: 'User', id: uid }],
    }),
    updateUserRoles: b.mutation<{ uid: string; roles: Role[] }, { uid: string; body: UpdateRolesDto }>({
      query: ({ uid, body }) => ({ url: `/users/${uid}/roles`, method: 'PATCH', body }),
      invalidatesTags: (_, __, { uid }) => [{ type: 'User', id: uid }, 'User', 'AuditLog'],
    }),
    suspendUser: b.mutation<UserProfile, { uid: string; reason?: string }>({
      query: ({ uid, reason }) => ({ url: `/users/${uid}/suspend`, method: 'POST', body: { reason } }),
      invalidatesTags: (_, __, { uid }) => [{ type: 'User', id: uid }, 'User'],
    }),
    reactivateUser: b.mutation<UserProfile, string>({
      query: (uid) => ({ url: `/users/${uid}/reactivate`, method: 'POST' }),
      invalidatesTags: (_, __, uid) => [{ type: 'User', id: uid }, 'User'],
    }),
    getUserAuditLog: b.query<PaginatedResponse<AuditLogEntry>, {
      uid: string; action?: string; from?: string; to?: string;
      limit?: number; cursor?: string;
    }>({
      query: ({ uid, ...params }) => ({ url: `/users/${uid}/audit-log`, params }),
      providesTags: (_, __, { uid }) => [{ type: 'AuditLog', id: uid }],
    }),
  }),
});

export const {
  useGetMeQuery, useUpdateMeMutation,
  useUpdateNotificationPreferencesMutation,
  useLinkProviderMutation, useUnlinkProviderMutation,
  useGetUsersQuery, useGetUserQuery,
  useUpdateUserRolesMutation,
  useSuspendUserMutation, useReactivateUserMutation,
  useGetUserAuditLogQuery,
} = usersApi;
```

### 9.4 Role Requests API (NEW V2)

```typescript
// src/application/api/roleRequestsApi.ts
import { baseApi } from './baseApi';
import type { RoleRequest, PaginatedResponse } from '@/domain/types/roleRequest';

export const roleRequestsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    // Member
    submitRoleRequest: b.mutation<RoleRequest, { requestedRole: 'student'; courseId: string; batchId: string }>({
      query: (body) => ({ url: '/role-requests', method: 'POST', body }),
      invalidatesTags: ['RoleRequest', 'Me'],
    }),
    getMyRoleRequests: b.query<PaginatedResponse<RoleRequest>, void>({
      query: () => '/role-requests/mine',
      providesTags: ['RoleRequest'],
    }),

    // Admin queue
    getRoleRequests: b.query<PaginatedResponse<RoleRequest>, {
      status?: 'pending' | 'approved' | 'rejected';
      courseId?: string; batchId?: string; search?: string;
      limit?: number; cursor?: string;
    }>({
      query: (params) => ({ url: '/role-requests', params }),
      providesTags: ['RoleRequest'],
    }),
    getRoleRequest: b.query<RoleRequest, string>({
      query: (id) => `/role-requests/${id}`,
      providesTags: (_, __, id) => [{ type: 'RoleRequest', id }],
    }),
    approveRoleRequest: b.mutation<
      { roleRequestId: string; enrollmentId: string; userRoles: string[] },
      { id: string; note?: string }
    >({
      query: ({ id, note }) => ({ url: `/role-requests/${id}/approve`, method: 'POST', body: { note } }),
      invalidatesTags: ['RoleRequest', 'Enrollment', 'User', 'AuditLog'],
    }),
    rejectRoleRequest: b.mutation<RoleRequest, { id: string; note: string }>({
      query: ({ id, note }) => ({ url: `/role-requests/${id}/reject`, method: 'POST', body: { note } }),
      invalidatesTags: ['RoleRequest', 'AuditLog'],
    }),
  }),
});

export const {
  useSubmitRoleRequestMutation,
  useGetMyRoleRequestsQuery,
  useGetRoleRequestsQuery,
  useGetRoleRequestQuery,
  useApproveRoleRequestMutation,
  useRejectRoleRequestMutation,
} = roleRequestsApi;
```

### 9.5 Courses, Batches, Semesters, Subjects, Lessons

```typescript
// src/application/api/coursesApi.ts (selected; full file mirrors API §6)
import { baseApi } from './baseApi';
import type {
  Course, CreateCourseDto, UpdateCourseDto, PaginatedResponse,
  CourseWithSemesters,
} from '@/domain/types/course';

export const coursesApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getCourses: b.query<PaginatedResponse<Course>, { search?: string; status?: 'draft'|'published'|'archived'; limit?: number; cursor?: string }>({
      query: (params) => ({ url: '/courses', params }),
      providesTags: ['Course'],
    }),
    getCourseById: b.query<CourseWithSemesters, string>({
      query: (id) => `/courses/${id}`,
      providesTags: (_, __, id) => [{ type: 'Course', id }],
    }),
    createCourse: b.mutation<Course, CreateCourseDto>({
      query: (body) => ({ url: '/courses', method: 'POST', body }),
      invalidatesTags: ['Course'],
    }),
    updateCourse: b.mutation<Course, { id: string; body: UpdateCourseDto }>({
      query: ({ id, body }) => ({ url: `/courses/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_, __, { id }) => [{ type: 'Course', id }, 'Course'],
    }),
    publishCourse: b.mutation<Course, string>({
      query: (id) => ({ url: `/courses/${id}/publish`, method: 'POST' }),
      invalidatesTags: (_, __, id) => [{ type: 'Course', id }, 'Course'],
    }),
    unpublishCourse: b.mutation<Course, string>({
      query: (id) => ({ url: `/courses/${id}/unpublish`, method: 'POST' }),
      invalidatesTags: (_, __, id) => [{ type: 'Course', id }, 'Course'],
    }),
    archiveCourse: b.mutation<Course, string>({
      query: (id) => ({ url: `/courses/${id}/archive`, method: 'POST' }),
      invalidatesTags: (_, __, id) => [{ type: 'Course', id }, 'Course'],
    }),
    deleteCourse: b.mutation<void, string>({
      query: (id) => ({ url: `/courses/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Course'],
    }),
  }),
});
```

```typescript
// src/application/api/batchesApi.ts — NEW V2
import { baseApi } from './baseApi';
import type { Batch, CreateBatchDto, UpdateBatchDto, PaginatedResponse } from '@/domain/types/batch';

export const batchesApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getBatchesForCourse: b.query<PaginatedResponse<Batch>, { courseId: string; state?: 'draft'|'open'|'closed'; limit?: number; cursor?: string }>({
      query: ({ courseId, ...params }) => ({ url: `/courses/${courseId}/batches`, params }),
      providesTags: ['Batch'],
    }),
    getBatch: b.query<Batch, string>({
      query: (id) => `/batches/${id}`,
      providesTags: (_, __, id) => [{ type: 'Batch', id }],
    }),
    createBatch: b.mutation<Batch, { courseId: string; body: CreateBatchDto }>({
      query: ({ courseId, body }) => ({ url: `/courses/${courseId}/batches`, method: 'POST', body }),
      invalidatesTags: ['Batch', 'Course'],
    }),
    updateBatch: b.mutation<Batch, { id: string; body: UpdateBatchDto }>({
      query: ({ id, body }) => ({ url: `/batches/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_, __, { id }) => [{ type: 'Batch', id }, 'Batch'],
    }),
    closeBatch: b.mutation<Batch, string>({
      query: (id) => ({ url: `/batches/${id}/close`, method: 'POST' }),
      invalidatesTags: (_, __, id) => [{ type: 'Batch', id }, 'Batch'],
    }),
  }),
});

export const {
  useGetBatchesForCourseQuery, useGetBatchQuery,
  useCreateBatchMutation, useUpdateBatchMutation, useCloseBatchMutation,
} = batchesApi;
```

Semesters, Subjects and Lessons follow identical patterns; their queries provide tags `Semester`, `Subject`, `Lesson`. Subject/Lesson endpoints also include `POST /subjects/:id/attachments` (PDF/DOCX) and **`POST /subjects/:id/images`** (PNG/JPG — **NEW V2**).

### 9.6 Enrollments API

```typescript
// src/application/api/enrollmentsApi.ts
import { baseApi } from './baseApi';
import type { Enrollment, PaginatedResponse } from '@/domain/types/enrollment';

export const enrollmentsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getMyEnrollments: b.query<PaginatedResponse<Enrollment>, { status?: string; limit?: number; cursor?: string }>({
      query: (params) => ({ url: '/enrollments/mine', params }),
      providesTags: ['Enrollment'],
    }),
    // V2 — already-Student additional enrollment (no role grant needed)
    requestAdditionalEnrollment: b.mutation<Enrollment, { courseId: string; batchId: string }>({
      query: (body) => ({ url: '/enrollments', method: 'POST', body }),
      invalidatesTags: ['Enrollment'],
    }),
    withdrawEnrollment: b.mutation<Enrollment, string>({
      query: (id) => ({ url: `/enrollments/${id}/withdraw`, method: 'POST' }),
      invalidatesTags: ['Enrollment'],
    }),
    // Admin
    getEnrollments: b.query<PaginatedResponse<Enrollment>, {
      userId?: string; courseId?: string; batchId?: string; status?: string;
      search?: string; limit?: number; cursor?: string;
    }>({
      query: (params) => ({ url: '/enrollments', params }),
      providesTags: ['Enrollment'],
    }),
    approveEnrollment: b.mutation<Enrollment, { id: string; note?: string }>({
      query: ({ id, note }) => ({ url: `/enrollments/${id}/approve`, method: 'POST', body: { note } }),
      invalidatesTags: ['Enrollment', 'AuditLog'],
    }),
    rejectEnrollment: b.mutation<Enrollment, { id: string; reason: string }>({
      query: ({ id, reason }) => ({ url: `/enrollments/${id}/reject`, method: 'POST', body: { reason } }),
      invalidatesTags: ['Enrollment', 'AuditLog'],
    }),
  }),
});

export const {
  useGetMyEnrollmentsQuery,
  useRequestAdditionalEnrollmentMutation,
  useWithdrawEnrollmentMutation,
  useGetEnrollmentsQuery,
  useApproveEnrollmentMutation,
  useRejectEnrollmentMutation,
} = enrollmentsApi;
```

### 9.7 Progress API (V2 — `batchId` added)

```typescript
// src/application/api/progressApi.ts
import { baseApi } from './baseApi';
import type {
  SubjectProgress, CourseProgressAggregate, AdminCourseProgress, PaginatedResponse,
} from '@/domain/types/progress';

export const progressApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    markSubjectComplete: b.mutation<SubjectProgress, {
      subjectId: string; courseId: string; semesterId: string; batchId: string;
    }>({
      query: ({ subjectId, ...body }) => ({
        url: `/progress/subjects/${subjectId}/complete`, method: 'POST', body,
      }),
      invalidatesTags: ['Progress'],
    }),
    recordSubjectAccess: b.mutation<SubjectProgress, {
      subjectId: string; courseId: string; semesterId: string; batchId: string;
    }>({
      query: ({ subjectId, ...body }) => ({
        url: `/progress/subjects/${subjectId}/access`, method: 'POST', body,
      }),
      invalidatesTags: ['Progress'],
    }),
    getCourseProgress: b.query<CourseProgressAggregate, string>({
      query: (courseId) => `/me/progress/courses/${courseId}`,
      providesTags: (_, __, courseId) => [{ type: 'Progress', id: courseId }],
    }),
    getSubjectProgress: b.query<SubjectProgress, string>({
      query: (subjectId) => `/me/progress/subjects/${subjectId}`,
      providesTags: (_, __, subjectId) => [{ type: 'Progress', id: `subject-${subjectId}` }],
    }),
    getAdminCourseProgress: b.query<
      PaginatedResponse<AdminCourseProgress> & { courseName: string; totalSubjects: number },
      { courseId: string; batchId?: string; limit?: number; cursor?: string }
    >({
      query: ({ courseId, ...params }) => ({ url: `/admin/progress/courses/${courseId}`, params }),
      providesTags: (_, __, { courseId }) => [{ type: 'Progress', id: `admin-${courseId}` }],
    }),
  }),
});

export const {
  useMarkSubjectCompleteMutation, useRecordSubjectAccessMutation,
  useGetCourseProgressQuery, useGetSubjectProgressQuery, useGetAdminCourseProgressQuery,
} = progressApi;
```

### 9.8 Cells API (NEW V2)

```typescript
// src/application/api/cellsApi.ts
import { baseApi } from './baseApi';
import type { CellGroup, CellGroupDetail, CreateCellDto, UpdateCellDto, PaginatedResponse } from '@/domain/types/cell';

export const cellsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getCells: b.query<PaginatedResponse<CellGroup>, {
      search?: string; type?: string; area?: string; state?: 'active'|'archived';
      leaderUid?: string; limit?: number; cursor?: string;
    }>({
      query: (params) => ({ url: '/cells', params }),
      providesTags: ['Cell'],
    }),
    getMyCells: b.query<CellGroup[], void>({
      query: () => '/cells/mine',
      providesTags: ['Cell'],
    }),
    getCell: b.query<CellGroupDetail, string>({
      query: (id) => `/cells/${id}`,
      providesTags: (_, __, id) => [{ type: 'Cell', id }, { type: 'CellMembers', id }],
    }),
    createCell: b.mutation<CellGroup, CreateCellDto>({
      query: (body) => ({ url: '/cells', method: 'POST', body }),
      invalidatesTags: ['Cell'],
    }),
    updateCell: b.mutation<CellGroup, { id: string; body: UpdateCellDto }>({
      query: ({ id, body }) => ({ url: `/cells/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_, __, { id }) => [{ type: 'Cell', id }, 'Cell'],
    }),
    archiveCell: b.mutation<CellGroup, string>({
      query: (id) => ({ url: `/cells/${id}/archive`, method: 'POST' }),
      invalidatesTags: (_, __, id) => [{ type: 'Cell', id }, 'Cell'],
    }),
    addCellMembers: b.mutation<{ added: string[]; memberCount: number }, { id: string; userUids: string[] }>({
      query: ({ id, userUids }) => ({ url: `/cells/${id}/members`, method: 'POST', body: { userUids } }),
      invalidatesTags: (_, __, { id }) => [{ type: 'Cell', id }, { type: 'CellMembers', id }],
    }),
    removeCellMember: b.mutation<{ removed: string; memberCount: number }, { id: string; uid: string }>({
      query: ({ id, uid }) => ({ url: `/cells/${id}/members/${uid}`, method: 'DELETE' }),
      invalidatesTags: (_, __, { id }) => [{ type: 'Cell', id }, { type: 'CellMembers', id }],
    }),
  }),
});

export const {
  useGetCellsQuery, useGetMyCellsQuery, useGetCellQuery,
  useCreateCellMutation, useUpdateCellMutation, useArchiveCellMutation,
  useAddCellMembersMutation, useRemoveCellMemberMutation,
} = cellsApi;
```

### 9.9 Cell Reports API (NEW V2 — Idempotent)

The `POST /cells/:id/reports` endpoint **requires** an `X-Idempotency-Key` header per FR-CR-015 / NFR-AVA-004. The client generates a UUID v4 when the form opens and sends the same key on retry; the server returns the existing report (`200 OK`) instead of creating a duplicate.

```typescript
// src/application/api/cellReportsApi.ts
import { baseApi } from './baseApi';
import type { CellReport, CreateCellReportDto, PaginatedResponse } from '@/domain/types/cellReport';

export const cellReportsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getCellReports: b.query<PaginatedResponse<CellReport>, {
      cellId: string; from?: string; to?: string; voided?: boolean;
      limit?: number; cursor?: string;
    }>({
      query: ({ cellId, ...params }) => ({ url: `/cells/${cellId}/reports`, params }),
      providesTags: (_, __, { cellId }) => [{ type: 'CellReport', id: cellId }],
    }),
    getCellReport: b.query<CellReport, { cellId: string; reportId: string }>({
      query: ({ cellId, reportId }) => `/cells/${cellId}/reports/${reportId}`,
      providesTags: (_, __, { reportId }) => [{ type: 'CellReport', id: reportId }],
    }),
    fileCellReport: b.mutation<CellReport, { cellId: string; body: CreateCellReportDto; idempotencyKey: string }>({
      query: ({ cellId, body, idempotencyKey }) => ({
        url: `/cells/${cellId}/reports`,
        method: 'POST',
        body,
        headers: { 'X-Idempotency-Key': idempotencyKey },
      }),
      invalidatesTags: (_, __, { cellId }) => [
        { type: 'CellReport', id: cellId }, { type: 'Cell', id: cellId },
        'AnalyticsCells', 'AnalyticsAttendance', 'AnalyticsMeetingTypes',
      ],
    }),
    voidCellReport: b.mutation<CellReport, { cellId: string; reportId: string; reason: string }>({
      query: ({ cellId, reportId, reason }) => ({
        url: `/cells/${cellId}/reports/${reportId}/void`, method: 'POST', body: { reason },
      }),
      invalidatesTags: (_, __, { cellId, reportId }) => [
        { type: 'CellReport', id: cellId }, { type: 'CellReport', id: reportId },
      ],
    }),
  }),
});

export const {
  useGetCellReportsQuery, useGetCellReportQuery,
  useFileCellReportMutation, useVoidCellReportMutation,
} = cellReportsApi;
```

```typescript
// src/application/hooks/useIdempotencyKey.ts
import { useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a stable idempotency key for the lifetime of the form mount.
 * Reset() must be called after a successful submission to allow a fresh report next time.
 */
export function useIdempotencyKey() {
  const ref = useRef<string>(uuidv4());
  return {
    key: ref.current,
    reset: () => { ref.current = uuidv4(); },
  };
}
```

### 9.10 Analytics API (NEW V2)

All analytics endpoints serve pre-aggregated snapshots; the server returns within 2 s per NFR-PER-003.

```typescript
// src/application/api/analyticsApi.ts
import { baseApi } from './baseApi';
import type {
  WeeklyCellsResponse, AttendanceResponse, MeetingTypesResponse,
  GrowthResponse, ParticipationResponse,
} from '@/domain/types/analytics';

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getWeeklyCells: b.query<WeeklyCellsResponse, { weeks?: number }>({
      query: (params) => ({ url: '/analytics/cells/weekly', params }),
      providesTags: ['AnalyticsCells'],
    }),
    getAttendance: b.query<AttendanceResponse, { from?: string; to?: string }>({
      query: (params) => ({ url: '/analytics/attendance', params }),
      providesTags: ['AnalyticsAttendance'],
    }),
    getMeetingTypes: b.query<MeetingTypesResponse, { period?: string }>({
      query: (params) => ({ url: '/analytics/meeting-types', params }),
      providesTags: ['AnalyticsMeetingTypes'],
    }),
    getGrowth: b.query<GrowthResponse, { weeks?: number }>({
      query: (params) => ({ url: '/analytics/growth', params }),
      providesTags: ['AnalyticsGrowth'],
    }),
    getParticipation: b.query<ParticipationResponse, void>({
      query: () => '/analytics/participation',
      providesTags: ['AnalyticsParticipation'],
    }),
    // FR-ANL-005 — CSV export via direct fetch (forced download)
    exportAnalyticsCsv: b.mutation<Blob, { chart: string; params: Record<string, string> }>({
      query: ({ chart, params }) => ({
        url: `/analytics/${chart}/export`,
        params,
        responseHandler: (res) => res.blob(),
      }),
    }),
  }),
});

export const {
  useGetWeeklyCellsQuery, useGetAttendanceQuery, useGetMeetingTypesQuery,
  useGetGrowthQuery, useGetParticipationQuery,
  useExportAnalyticsCsvMutation,
} = analyticsApi;
```

### 9.11 Notifications API (V2 — `unreadCount` server-supplied)

```typescript
// src/application/api/notificationsApi.ts
import { baseApi } from './baseApi';
import type { Notification, PaginatedResponse } from '@/domain/types/notification';

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getNotifications: b.query<PaginatedResponse<Notification> & { unreadCount: number },
      { read?: boolean; limit?: number; cursor?: string }>({
      query: (params) => ({ url: '/me/notifications', params }),
      providesTags: ['Notification'],
    }),
    markNotificationRead: b.mutation<Notification, string>({
      query: (id) => ({ url: `/me/notifications/${id}/read`, method: 'POST' }),
      invalidatesTags: ['Notification'],
    }),
    markAllNotificationsRead: b.mutation<void, void>({
      query: () => ({ url: '/me/notifications/read-all', method: 'POST' }),
      invalidatesTags: ['Notification'],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = notificationsApi;
```

### 9.12 Audit API (V2 — both global & per-user)

```typescript
// src/application/api/auditApi.ts
import { baseApi } from './baseApi';
import type { AuditLogEntry, PaginatedResponse } from '@/domain/types/audit';

export const auditApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getAuditLog: b.query<PaginatedResponse<AuditLogEntry>, {
      actorUid?: string; action?: string; category?: string;
      targetType?: string; targetId?: string;
      from?: string; to?: string; limit?: number; cursor?: string;
    }>({
      query: (params) => ({ url: '/audit-log', params }),
      providesTags: ['AuditLog'],
    }),
  }),
});
export const { useGetAuditLogQuery } = auditApi;
```

### 9.13 Super-Admin Endpoints

`useGetAdminsQuery`, `useCreateAdminMutation`, `useSuspendAdminMutation`, `useReactivateAdminMutation`, `useDeleteAdminMutation`, `useMakeStudentAdminMutation` all wrap `/super-admin/admins/*` exactly as in V1. The only mutation in shape is that the User returned now has `roles: ["admin"]` (array, not scalar).

---

## 10. Internationalisation (Sinhala / Tamil / English)

### 10.1 Library Choice & Architecture

`next-intl` (App Router compatible) is the chosen i18n library. Locale flows through:

1. **URL prefix** (`/si`, `/ta`, `/en`) — bookmark-friendly, SEO-friendly, allows public pages to render server-side in the right language.
2. **User profile** (`preferredLanguage`) — once signed in, the user's profile language always wins over URL on next navigation (redirect).
3. **Device locale** — for new visitors, `navigator.language` decides initial redirect (with fallback to `en` for unsupported locales).
4. **`Accept-Language` header** — propagated to every API call so the backend renders notifications in the same language.

### 10.2 Translation File Layout

```
src/messages/
├── en.json          # Authoritative — single source of truth
├── si.json          # Sinhala (සිංහල)
└── ta.json          # Tamil (தமிழ்)
```

```json
// src/messages/en.json (sample)
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "confirm": "Confirm",
    "loading": "Loading…",
    "empty": "Nothing here yet.",
    "error.generic": "Something went wrong. Please try again."
  },
  "nav": {
    "home": "Home",
    "bibleSchool": "Bible School",
    "cellGroups": "Cell Groups",
    "myCourses": "My Courses",
    "myCells": "My Cells",
    "notifications": "Notifications",
    "profile": "Profile",
    "signOut": "Sign Out"
  },
  "auth": {
    "login.title": "Welcome back to TCCR",
    "login.email": "Email address",
    "login.password": "Password",
    "login.submit": "Sign in",
    "login.google": "Continue with Google",
    "login.apple": "Continue with Apple",
    "login.noAccount": "Don't have an account?",
    "login.register": "Register",
    "register.title": "Create your TCCR account",
    "register.success": "Welcome to TCCR! You can now explore the system.",
    "register.becomeStudent": "Want to enroll in a course? Apply to become a Student."
  },
  "roleRequest": {
    "form.title": "Apply to become a Student",
    "form.pickCourse": "Choose a course",
    "form.pickBatch": "Choose an intake (batch)",
    "form.submit": "Submit application",
    "status.pending": "Pending",
    "status.approved": "Approved",
    "status.rejected": "Rejected",
    "approve.title": "Approve student role and enrollment?",
    "approve.note": "Optional note for the requester",
    "reject.title": "Reject role request",
    "reject.reason": "Reason (sent to the requester)"
  },
  "cell": {
    "list.title": "Cell Groups",
    "type.g12": "G12",
    "type.care": "Care",
    "type.children": "Children",
    "type.outreach": "Outreach",
    "report.title": "Cell Report",
    "report.didMeet": "Did the cell meet?",
    "report.leaderPresent": "Was the leader present?",
    "report.satisfaction": "Satisfaction (1–5)",
    "report.fileButton": "Submit report"
  },
  "analytics": {
    "weeklyCells": "Weekly cell count",
    "attendance": "Attendance trend",
    "meetingTypes": "Meeting type breakdown",
    "growth": "Member growth",
    "participation": "Participation per leader",
    "export": "Export CSV"
  }
}
```

> Sinhala (`si.json`) and Tamil (`ta.json`) follow the **exact same key tree**. CI fails if any key present in `en.json` is missing from `si.json` or `ta.json` (FR-I18N-005 / NFR-USA-004).

### 10.3 Next.js Entry & Provider

```typescript
// src/i18n.ts
import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';
const LOCALES = ['si', 'ta', 'en'] as const;
export default getRequestConfig(async ({ locale }) => {
  if (!LOCALES.includes(locale as any)) notFound();
  return { messages: (await import(`./messages/${locale}.json`)).default };
});
```

```typescript
// src/app/[locale]/layout.tsx
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
export default async function LocaleLayout({
  children, params: { locale },
}: { children: React.ReactNode; params: { locale: string } }) {
  if (!['si','ta','en'].includes(locale)) notFound();
  const messages = await getMessages();
  return (
    <html lang={locale} dir="ltr">
      <body className={`script-${locale}`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

### 10.4 Usage in Components

```typescript
'use client';
import { useTranslations } from 'next-intl';

export function CellListHeader() {
  const t = useTranslations('cell');
  return <h1 className="text-2xl font-semibold">{t('list.title')}</h1>;
}
```

### 10.5 Script-Specific Typography

Sinhala and Tamil scripts have taller line-heights and require dedicated fonts. The `<body>` gains a script class so global CSS adjusts:

```css
/* src/app/globals.css */
:root { --font-sans-en: 'Geist', sans-serif; }

.script-si {
  --font-script: 'Noto Sans Sinhala', 'Iskoola Pota', sans-serif;
  line-height: 1.75;
}
.script-ta {
  --font-script: 'Noto Sans Tamil', 'Latha', sans-serif;
  line-height: 1.75;
}
.script-en {
  --font-script: var(--font-sans-en);
  line-height: 1.5;
}
body { font-family: var(--font-script); }
```

The Noto Sans Sinhala and Tamil web fonts are hosted in `public/fonts/` and `@font-face`'d at boot.

### 10.6 Localised Dates, Numbers and Relative Time

```typescript
// src/components/i18n/LocalisedDate.tsx
'use client';
import { useFormatter, useLocale } from 'next-intl';
import { format } from 'date-fns';
import { si, ta, enGB } from 'date-fns/locale';

const LOCALE_MAP = { si, ta, en: enGB };

export function LocalisedDate({ iso, fmt = 'PP' }: { iso: string; fmt?: string }) {
  const locale = useLocale() as 'si'|'ta'|'en';
  return <span>{format(new Date(iso), fmt, { locale: LOCALE_MAP[locale] })}</span>;
}
```

`useFormatter()` from `next-intl` is used for numbers, currencies and relative times to follow the user's locale conventions automatically (NFR-LOC-002).

### 10.7 Language Switcher

```typescript
// src/components/ui/LanguageSwitcher.tsx
'use client';
import { useRouter, usePathname } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/application/store';
import { setLocale, selectLocale } from '@/application/slices/localeSlice';
import { useUpdateMeMutation } from '@/application/api/usersApi';
import type { Locale } from '@/domain/enums/Locale';

const LOCALES: { value: Locale; label: string }[] = [
  { value: 'si', label: 'සිංහල' },
  { value: 'ta', label: 'தமிழ்' },
  { value: 'en', label: 'English' },
];

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const current = useAppSelector(selectLocale);
  const [updateMe] = useUpdateMeMutation();

  const change = async (next: Locale) => {
    dispatch(setLocale(next));
    // Re-route to the same path under the new locale prefix
    const segs = pathname.split('/');
    segs[1] = next;
    router.replace(segs.join('/'));
    // Persist on profile for next session (signed-in only)
    try { await updateMe({ preferredLanguage: next }).unwrap(); } catch {}
  };

  return (
    <div className="flex gap-1 rounded-md border p-1">
      {LOCALES.map(l => (
        <button
          key={l.value}
          onClick={() => change(l.value)}
          className={`rounded px-2 py-1 text-sm ${current === l.value ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
          aria-pressed={current === l.value}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
```

### 10.8 Key-Parity CI Check

A small Node script runs in CI:

```bash
npm run check-i18n
# Fails if any key in messages/en.json is missing from messages/si.json or messages/ta.json
```

---

## 11. Component Architecture

The component library carries forward all V1 primitives unchanged and adds V2-specific feature components. Below is a representative sample; the directory layout in §4 is the authoritative list.

### 11.1 Design System Utility (carry-forward)

```typescript
// src/lib/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
```

### 11.2 Button (carry-forward, with i18n loading label)

Identical to V1. The `loading` indicator's screen-reader label now goes through `t('common.loading')`.

### 11.3 UserRolesBadgeStack (NEW V2)

Renders multi-role users as a stack of badges.

```typescript
// src/components/user/UserRolesBadgeStack.tsx
import { Badge } from '@/components/ui/Badge';
import { useTranslations } from 'next-intl';
import { sortRoles } from '@/domain/utils/roleUtils';
import type { Role } from '@/domain/enums/Role';

const ROLE_VARIANT: Record<Role, any> = {
  super_admin: 'error', admin: 'info', g12: 'warning',
  leader: 'success', student: 'default', member: 'outline',
};

export function UserRolesBadgeStack({ roles }: { roles: Role[] }) {
  const t = useTranslations('roles');
  return (
    <div className="flex flex-wrap gap-1">
      {sortRoles(roles).map(r => (
        <Badge key={r} variant={ROLE_VARIANT[r]}>{t(r)}</Badge>
      ))}
    </div>
  );
}
```

### 11.4 BatchAccordion (NEW V2)

Shows batches under a course on the public catalogue and admin editor. Each batch row displays:
- Name
- Intake window dates (`intakeStart` → `intakeEnd`) via `<LocalisedDate>`
- State badge (`draft` / `open` / `closed`)
- `[Apply to Enroll]` button (Member-only, visible when state is `open` and member doesn't already have a pending request)

### 11.5 SemesterAccordion (V2 — date badges)

Same as V1 but each semester row shows the `openDate`/`endDate` range, and a "Disabled" badge appears when `endDate` has passed and the viewer is not pre-enrolled.

### 11.6 ReportForm (NEW V2 — Mobile-First Cell-Report Entry)

Multi-step form designed to be completable in under 3 minutes (NFR-USA-003). Steps:

1. **Did the cell meet? (yes/no)** — if no, jump to reason → submit.
2. **Meeting basics** — date (default today), location, start/end time, language.
3. **Subject discussed** — radio `sunday_sermon` | `other`; if other, free-text reason.
4. **Attendance** — pre-populated from cell's `members` roster, each row toggleable Present / Absent / New; add ad-hoc names button.
5. **Visitors & children** — numeric inputs (default 0).
6. **Follow-up** — "Were absentees contacted?" + notes.
7. **Satisfaction** — 1–5 star rating.
8. **Additional info** — free text.

The form mounts a stable `idempotencyKey` via `useIdempotencyKey()`. On submit:

```typescript
const { key, reset } = useIdempotencyKey();
const [fileReport, { isLoading }] = useFileCellReportMutation();

const onSubmit = async (form: CreateCellReportDto) => {
  try {
    await fileReport({ cellId, body: form, idempotencyKey: key }).unwrap();
    reset();
    dispatch(addToast({ type: 'success', message: t('cell.report.success') }));
    router.push(`/${locale}/cells/${cellId}`);
  } catch (err: any) {
    dispatch(addToast({ type: 'error', message: err?.data?.error?.message ?? t('common.error.generic') }));
  }
};
```

If the network drops mid-submission, RTK Query retries automatically; the same `idempotencyKey` ensures the server treats the retry as the original.

### 11.7 Analytics Chart Components (NEW V2)

All charts use **Recharts** (small bundle, accessible by default). Each chart wraps `<ResponsiveContainer>` so it works at 360 px width. Each accepts `data` already shaped by the API and renders < 2 s end-to-end (NFR-PER-003) because data is snapshot-backed.

- `WeeklyCellsChart` — `<LineChart>` with `cellCount` and `activeCells` series.
- `AttendanceChart` — `<BarChart>` stacked: present / absent / visitors / children / new.
- `MeetingTypeDonut` — `<PieChart>` with four slices (g12 / care / children / outreach).
- `GrowthChart` — `<LineChart>` with `memberGrowth` and `participationRate` (dual axis).
- `ParticipationTable` — sortable table of `leaderName`, `cellCount`, `averageAttendance`.

### 11.8 YouTubePlayer (carry-forward)

Unchanged from V1. Embeds via the YouTube IFrame API; calls `onThresholdReached` at ≥90 % playback. Used inside the Subject viewer; on play it fires `useRecordSubjectAccessMutation` so `lastAccessedAt` advances (FR-LRN-007).

### 11.9 ConfirmDialog, EmptyState, Toast (carry-forward — i18n strings)

All take their text props from translation keys; no hardcoded English remains in the source.


---

## 12. Page Specifications — All Roles

> **Notation.** Every page below assumes the `/[locale]/` prefix (`/si`, `/ta`, or `/en`). Routes shown without it are abbreviated. **FR** references map to SRS v2.0 functional requirements. **NEW V2** flags pages that did not exist in V1.

---

### 12.1 Public Pages

#### `/` — Landing Page
- **Rendering:** SSG
- **Content:** Hero (TCCR brand), two module tiles (Bible School, Cell Groups), language switcher above the fold, CTAs Register / Login.
- **Data:** Static.
- **FR:** — (marketing)

#### `/login` — Login Page (Amended V2)
- **Rendering:** CSR
- **Fields:** Email, Password
- **Sign-in buttons:** "Continue with Google" · "Continue with Apple" · "Sign in" (email/password)
- **Actions:**
  - Email/password → `loginWithPasswordThunk` → on success redirect by primary role (see §5.3); on failure call `/auth/track-failure` (FR-AUTH-009)
  - Google → `loginWithGoogleThunk`
  - Apple → `loginWithAppleThunk`
- **Links:** "Register" · "Forgot password?"
- **Validation (client):** Email format; password non-empty
- **Error states:** `AUTH_LOCKED` shows "Account locked for 15 minutes" toast; `FEDERATED_TOKEN_INVALID` shows "Federated sign-in failed; try email/password"
- **FR:** FR-AUTH-002, FR-AUTH-003, FR-AUTH-004, FR-AUTH-009

#### `/register` — Registration Page (Amended V2)
- **Rendering:** CSR
- **Fields:** First Name, Last Name, Email, Password, Confirm Password, Phone (E.164), Gender (radio: male/female/other), Date of Birth, Preferred Language (auto-detected from URL/device, editable)
- **Password rules displayed inline:** min 8 chars, ≥ 1 letter, ≥ 1 number (FR-AUTH-007 — relaxed from V1)
- **Federated sign-up buttons:** Same as `/login`. Federated sign-up auto-fills name from provider.
- **Actions:** Submit → `POST /auth/register` → **immediate sign-in as Member** (V2 change) → redirect to `/home` with welcome banner "Want to enroll in a course? [Apply to become a Student]" (FR-AUTH-001)
- **Validation:** Zod schema from `tccr-contracts` (`registerMemberSchema`)
- **FR:** FR-AUTH-001, FR-AUTH-005, FR-AUTH-007, FR-I18N-002, FR-I18N-004

#### `/forgot-password` & `/reset-password`
- **Two-step flow:** request OTP → verify OTP → backend dispatches Firebase password-reset email
- **Endpoints:** `POST /auth/password-reset`, `POST /auth/password-reset/verify`
- **FR:** FR-AUTH-006

#### `/courses` — Public Course Catalogue
- **Rendering:** SSR (ISR revalidation every 60 s)
- **Data:** `getCoursesQuery` (`status=published`)
- **Layout:** Responsive grid (1/2/3 cols).
- **Components:** `CourseCard` (name, description summary, cover image, semester count, batch count badge if open batches exist).
- **Empty state:** localised "No courses available."
- **FR:** FR-MEM-002, FR-CRS-007

#### `/courses/[courseId]` — Public Course Detail (Amended V2)
- **Rendering:** SSR
- **Data:** `getCourseByIdQuery` (404 if `draft`/`archived`); `getBatchesForCourseQuery(courseId, { state: 'open' })`
- **Sections:**
  1. Course header (cover, name, description)
  2. **Batches block (NEW V2)** — list of upcoming open batches with `intakeStart` / `intakeEnd` (`<LocalisedDate>`), capacity, "Apply to Enroll" CTA (route to `/apply/[courseId]?batchId=...`)
  3. Semester / Subject outline — titles only; content gated to approved enrolled Students
- **CTAs:**
  - Anonymous visitor → "Register to apply"
  - Member (no enrollment) → "Apply to Enroll" → `/apply/[courseId]`
  - Approved Student in this course → "Continue learning"
- **FR:** FR-MEM-002, FR-MEM-003, FR-CRS-002, FR-CRS-007

---

### 12.2 Member Pages — NEW V2

All pages in `(authed)` route group, no extra role required.

#### `/home` — Member Home (NEW V2)
- **Rendering:** CSR
- **Layout:** Two prominent module tiles + secondary widgets.
- **Tiles:**
  1. **Bible School** — "Browse courses" → `/courses`; if Student: "My Courses" → `/dashboard`
  2. **Cell Groups** — if Leader/G12: "My Cells" → `/cells`; else read-only "My Cell Groups" → `/my-cells`
- **Widgets:**
  - Latest 3 notifications
  - Pending role requests count (if any)
  - "Want to enroll? Apply to become a Student" CTA (only if user does NOT yet have `student` role)
- **FR:** FR-MEM-001

#### `/apply/[courseId]` — Become a Student (NEW V2)
- **Rendering:** CSR
- **Prerequisite:** Member must not have a pending role request for the same course (else show inline "Application already in progress").
- **Form fields:**
  - Course (display only; from URL)
  - Batch (`<Select>` populated by `getBatchesForCourseQuery(courseId, { state: 'open' })`; only future-window batches shown)
  - Optional "Note to admin" (free text, 200 chars)
- **Submit:** `useSubmitRoleRequestMutation` → POST `/role-requests` → on success, redirect to `/my-requests` with toast
- **Error states:** `ROLE_REQUEST_PENDING` → toast "You already have a pending request for this course"; `BATCH_CLOSED` → reload batches and show "That batch has closed"
- **FR:** FR-MEM-003, FR-ENR-001

#### `/my-requests` — My Role Requests (NEW V2)
- **Rendering:** CSR
- **Data:** `useGetMyRoleRequestsQuery`
- **List columns:** Course name, Batch name, Status badge, Submitted date, Decided date, Decision note (rejected), Approver name (approved)
- **Empty state:** localised "You haven't submitted any applications yet."
- **FR:** FR-MEM-004

#### `/my-cells` — Cells I Belong To (Read-Only) (NEW V2)
- **Rendering:** CSR
- **Data:** `useGetMyCellsQuery`
- **List items:** Cell name, type badge, area, leader name, "View" link
- **Empty state:** "You're not currently a member of any cell group."
- **FR:** FR-MEM-006, FR-CG-005

#### `/my-cells/[cellId]` — Cell View (Read-Only) (NEW V2)
- **Rendering:** CSR
- **Data:** `useGetCellQuery`, `useGetCellReportsQuery({ cellId, voided: false, limit: 10 })`
- **Sections:**
  1. Cell metadata (name, type, area, leader, G12 leader)
  2. Members list (avatars + names)
  3. **Past reports list** — read-only; clicking opens `/my-cells/[cellId]/reports/[reportId]` (read-only viewer)
- **FR:** FR-MEM-006

#### `/profile` — Universal Profile (Amended V2)
- **Rendering:** CSR
- **Sections:**
  1. Profile photo upload + preview
  2. Display name, phone, gender, DoB (edit inline; `useUpdateMeMutation`)
  3. **Preferred Language (NEW V2)** — select `si`/`ta`/`en`; on change calls `setLocale` action + persists via `PATCH /me`
  4. **Linked accounts (NEW V2)** — list of `providers[]` with "Link Google" / "Link Apple" buttons (FR-AUTH-010) and "Unlink" actions (disabled when only one provider remains)
  5. **Notification preferences (NEW V2)** — switches: `email`, `push`; calls `PATCH /me/notifications/preferences`
  6. Change password link → `/profile/change-password`
- **FR:** FR-MEM-005, FR-AUTH-010, FR-NOT-006, FR-I18N-003

#### `/profile/change-password`
- Current password + new password; calls `POST /me/change-password`
- **FR:** FR-AUTH-006

#### `/notifications` — Notification Centre
- **Rendering:** CSR
- **List:** Newest first; unread items highlighted with left accent border. Each item renders title and body **already in the user's locale** (`localeRendered` field shown discreetly as a tooltip).
- **Actions:** "Mark all read" button; per-item "Mark as read"
- **Empty state:** localised "No notifications yet."
- **FR:** FR-NOT-001

---

### 12.3 Student Pages

Wrapped in `<AuthGuard requiredAnyRole={['student']} />`.

#### `/dashboard` (student) — Student Dashboard
- **Rendering:** CSR
- **Sections:**
  - Enrolled courses with progress ring (% completion) **scoped to current Batch**
  - "Continue Learning" card pulling `lastAccessedSubjectId` from `CourseProgressAggregate`
  - Unread notifications badge
- **Data:** `useGetMyEnrollmentsQuery({ status: 'active' })`, then `useGetCourseProgressQuery(courseId)` per course
- **Empty state:** "Browse the course catalogue to get started" with link to `/courses`
- **FR:** FR-STU-001, FR-LRN-004

#### `/my-courses` — Enrolled Courses List
- **Rendering:** CSR
- **List items:** Course title, cover image, **Batch name**, enrollment state badge, progress percentage, "Continue" button
- **Filters:** By status (Active / Pending / Completed / Withdrawn)
- **FR:** FR-STU-001

#### `/my-courses/[courseId]` — Course Viewer
- **Rendering:** CSR
- **Layout:** Left sidebar (semester/subject navigation, with **disabled badges** when semester `endDate` passed) + right content panel
- **Sidebar:** Collapsible `SemesterAccordion`; subjects with completion tick marks
- **Content panel:** Subject title, description, **lesson cover images carousel (NEW V2)**, lesson list, `YouTubePlayer`, attachments list
- **"Mark as Complete" button:** Calls `useMarkSubjectCompleteMutation`; button changes to "Completed ✓"
- **Progress bar:** Updates via RTK Query cache invalidation
- **Breadcrumb:** Home → My Courses → [Course] → [Subject]
- **FR:** FR-STU-002, FR-STU-003, FR-LRN-001 to FR-LRN-005

#### `/my-courses/[courseId]/[subjectId]` — Subject / Lesson Page
- **Rendering:** CSR
- **Full-page view:** Large `YouTubePlayer` (aspect-video), description, **lesson images gallery (NEW V2)**, attachment cards
- **Auto-complete logic:** `YouTubePlayer.onThresholdReached` + all attachments opened → dispatch `markSubjectComplete`
- **Access logging:** On mount, fires `useRecordSubjectAccessMutation` to advance `lastAccessedAt` (FR-LRN-007 carry-forward)
- **Gating:** If parent semester `endDate` has passed AND enrollment was created after `endDate`, redirect to `/dashboard` with toast "This semester has closed" (FR-STU-005, FR-LRN-005)
- **Navigation:** Previous / Next subject buttons
- **FR:** FR-STU-002, FR-LRN-001, FR-LRN-003, FR-LRN-005

#### `/enrollments` — Additional Enrollment Requests (NEW V2)
- **Rendering:** CSR
- **Description:** For users who already hold `student` role and want to enroll in another course (FR-STU-004). No role grant needed.
- **Form:** Course → Batch → Submit
- **List:** Existing enrollments with status (pending / active / rejected / withdrawn) and a "Withdraw" action where applicable
- **Endpoint:** `POST /enrollments` (already-student path); `POST /enrollments/:id/withdraw`
- **FR:** FR-STU-004, FR-ENR-001, FR-ENR-006

---

### 12.4 Leader Pages — NEW V2

All wrapped in `<AuthGuard requiredAnyRole={['leader','g12','admin','super_admin']} />`. Cell-report **creation** is further restricted at the route level (excludes plain `admin`).

#### `/cells` — Cell Groups List
- **Rendering:** CSR
- **Scope:** Leader → own cells; G12 → network cells; Admin → all (filterable)
- **Data:** `useGetCellsQuery` (scope inferred server-side from caller's roles)
- **Table columns:** Name, type badge, area, leader name, member count, report count, state, Actions (View / Edit / Archive)
- **Filters:** Search, type (g12/care/children/outreach), area, state (active/archived)
- **CTA:** `[+ New Cell]` button → `/cells/new`
- **FR:** FR-LDR-001, FR-CG-006

#### `/cells/new` — Create Cell Group
- **Form fields:** Name, Type (radio), Area (free text), G12 Leader reference (`MemberPicker` searching users with `g12` role)
- **Submit:** `useCreateCellMutation` → redirect to `/cells/[newId]`
- **FR:** FR-LDR-001, FR-CG-001, FR-CG-002

#### `/cells/[cellId]` — Cell Detail
- **Rendering:** CSR
- **Sections:**
  1. Header — name, type, area, leader, G12 leader, member count, report count, state
  2. Tabs: **Members**, **Reports**, **Activity** (audit timeline)
  3. Members tab — list with avatars; "Add Members" button opens `MemberPicker` modal; per-row remove
  4. Reports tab — `ReportList` (most recent first); "File New Report" CTA (only for Leader/G12 of the cell or Super Admin — FR-CR-001)
- **Actions in header:** Edit, Archive
- **FR:** FR-LDR-002, FR-LDR-003, FR-LDR-004, FR-CG-002, FR-CG-004

#### `/cells/[cellId]/edit` — Edit Cell
- Same fields as create. PATCH `/cells/:id`.

#### `/cells/[cellId]/members` — Manage Members
- Dedicated full-page member management (also accessible from Detail tab). Add/remove triggers `useAddCellMembersMutation` / `useRemoveCellMemberMutation`. `memberCount` updates atomically.
- **FR:** FR-LDR-002, FR-CG-004, FR-CG-007

#### `/cells/[cellId]/reports/new` — File Cell Report
- **Rendering:** CSR
- **Component:** `<ReportForm>` (see §11.6)
- **Idempotency:** Mounted with `useIdempotencyKey()`; sent as `X-Idempotency-Key` header on submit
- **Pre-fills:**
  - `filledByUid` (server-side; not editable — FR-CR-002)
  - `date` defaults to today (FR-CR-003)
  - `cellType` defaults to parent cell's type (FR-CR-008)
  - `attendance` pre-populated from parent cell's `members[]` (FR-CR-010)
- **Conditional fields:** Hidden when `didMeet=false`; only `noMeetReason` required
- **Submit:** `useFileCellReportMutation` → on `201 Created` toast + redirect to `/cells/[cellId]`; on `200 OK` (idempotent replay) shows "Already submitted" success toast
- **FR:** FR-CR-001 through FR-CR-015, NFR-USA-003

#### `/cells/[cellId]/reports/[reportId]` — Report Viewer
- **Rendering:** CSR
- **Read-only display** of all report fields, formatted nicely with section grouping (attendance shown as a table)
- **Void button:** Visible to Leader, G12, Admin, Super Admin (FR-CR-014); opens `VoidReportDialog` requesting a reason; calls `useVoidCellReportMutation`. Once voided, page shows a red "VOIDED" banner with the reason and cannot be re-voided (`REPORT_ALREADY_VOIDED`).
- **FR:** FR-CR-014, FR-LDR-004

#### `/analytics` — Leader Analytics
- **Rendering:** CSR
- **Scope:** Auto-resolved to Leader's own cells
- **Charts:**
  - `WeeklyCellsChart` — past 12 weeks (configurable via `PeriodSelector`)
  - `AttendanceChart` — past 8 weeks
  - `MeetingTypeDonut` — current period
- **Export CSV button:** Each chart card has an export icon → `useExportAnalyticsCsvMutation`
- **FR:** FR-LDR-005, FR-ANL-001, FR-ANL-005

---

### 12.5 G12 Leader Pages — NEW V2

Wrapped in `<AuthGuard requiredAnyRole={['g12','admin','super_admin']} />`.

#### `/network` — G12 Network
- **Rendering:** CSR
- **Data:** `useGetCellsQuery({ g12LeaderUid: selfUid })` (or admin view if Admin) + roster of Leaders in network
- **Sections:**
  1. **Leaders in my network** — list of users with `leader` role reporting to this G12 (data from a server-supplied list joined with users)
  2. **Cells in my network** — table grouped by Leader
- **Actions per Leader:** Promote to G12 → opens `PromoteDialog` (FR-G12-003); calls `useUpdateUserRolesMutation({ uid, body: { add: ['g12'] } })`
- **FR:** FR-G12-001, FR-G12-003

#### `/analytics` (G12 variant)
- **Scope:** G12 network
- **Adds to Leader analytics:**
  - `GrowthChart` (member growth, participation rate)
  - `ParticipationTable` (per-Leader)
- **FR:** FR-G12-004, FR-ANL-002, FR-ANL-003

#### `/promote` — Promote Leader → G12 (NEW V2)
- **Description:** Searchable list of Leaders in network with a "Promote to G12" button per row.
- **Action:** Opens confirmation dialog → `useUpdateUserRolesMutation`
- **FR:** FR-G12-003

---

### 12.6 Admin Pages

Wrapped in `<AuthGuard requiredAnyRole={['admin','super_admin']} />`.

#### `/dashboard` (admin) — Admin Dashboard (Amended V2)
- **Rendering:** CSR
- **Stat cards (polled every 30 s):**
  - Pending role requests (count + link to queue)
  - Pending enrollments (count + link)
  - Draft / Published courses
  - Total Members / Students / Leaders / G12 Leaders
  - Cells active this week
- **Quick actions:** "Review Requests", "Create Course", "Manage Users", "Audit Log"
- **FR:** FR-ADM-001

#### `/users` — User Directory (Amended V2)
- **Rendering:** CSR
- **Table columns:** Name, Email, Roles (badge stack — `UserRolesBadgeStack`), Status, Enrollments count, Joined, Actions
- **Filters:**
  - Status (active / suspended)
  - Roles (multi-select: member / student / leader / g12 / admin / super_admin)
  - Enrolled course / batch (dropdowns)
- **Search:** free text on name/email (debounced 300 ms)
- **Pagination:** cursor-based, 25 / page
- **Per-row actions:** View → `/users/[uid]`, Suspend / Reactivate (confirm dialog)
- **FR:** FR-ADM-001

#### `/users/[uid]` — User Profile (Amended V2)
- **Rendering:** CSR
- **Tabs:**
  1. **Profile** — read-only view of all fields; "Suspend / Reactivate" actions
  2. **Roles (NEW V2)** — `ManageRolesForm` showing current `roles[]` as checkboxes; Save → `useUpdateUserRolesMutation` with computed `add[]` / `remove[]`. Disables checkboxes per RBAC rules: `member` can never be removed; `admin` only mutable by `super_admin`; cannot demote last Super Admin (handled server-side, surfaces as `LAST_SUPER_ADMIN` toast).
  3. **Enrollments** — list of enrollments; per-row Approve/Reject if pending; Withdraw if active
  4. **Activity (NEW V2)** — per-user audit timeline via `useGetUserAuditLogQuery` (FR-ADM-005, FR-SADM-005)
- **FR:** FR-ADM-001, FR-ADM-003, FR-ADM-005, FR-ADM-008, FR-SADM-005

#### `/role-requests` — Role Request Approval Queue (NEW V2 — replaces V1 `/registrations`)
- **Rendering:** CSR
- **Auto-refresh:** every 30 s
- **Table columns:** Requester name+email, Course, Batch (with intake window dates), Submitted date, Actions
- **Per-row actions:**
  - Approve (green) → opens approval modal with optional note → `useApproveRoleRequestMutation` → atomic role + enrollment grant → row disappears with fade-out
  - Reject (red) → opens reject modal requiring reason → `useRejectRoleRequestMutation`
- **Bulk approve:** Checkbox column → "Approve Selected" button → sequential `Promise.allSettled` of approve mutations; per-row success/failure reported via toast aggregate
- **Filters:** Status (default `pending`), course, batch, search
- **Error handling:** `BATCH_CLOSED` (422) → row replaced with "Batch closed — cannot approve" inline; `INVALID_STATE` (409) → "Already decided"
- **Empty state:** localised "No pending requests. All caught up ✓"
- **Important:** Admins cannot approve **their own** requests (FR-ADM-008) — approve button disabled with tooltip
- **FR:** FR-ADM-002, FR-ENR-002, FR-ENR-003, FR-ENR-004, FR-ENR-005, FR-SADM-002

#### `/enrollments` — Additional Enrollment Queue (Amended V2)
- **Description:** For requests where requester is **already a Student** seeking to enroll in another course (no role grant component).
- **Rendering:** CSR; polled 30 s
- **Filters:** by course, batch, status
- **Per-row actions:** Approve / Reject (with reason)
- **FR:** FR-ADM-002, FR-ENR-002, FR-ENR-004, FR-ENR-005

#### `/courses` (admin) — Course Management List
- Same as V1 layout, but now also shows **Batches count** and a quick "Manage Batches" link per row.
- **FR:** FR-ADM-004, FR-CRS-001, FR-CRS-007

#### `/courses/new` — Create Course
- Form: Name, Description, Cover image. Submit → `useCreateCourseMutation` → redirect to editor.

#### `/courses/[courseId]` (admin editor) — Course Editor (Amended V2)
- **Rendering:** CSR
- **Tabs / sections:**
  1. **Metadata** — name, description, cover, status (draft/published/archived), publish/unpublish/archive actions
  2. **Batches (NEW V2)** — list of batches with `intakeStart`/`intakeEnd`, state badge, "Create Batch" button → opens inline form
  3. **Semesters** — drag-to-reorder; each row shows `openDate`/`endDate` (`<LocalisedDate>`); "Add Semester" → form with name, number, openDate, endDate
  4. **Subjects per semester** — drag-to-reorder; each shows YouTube ID count + attachment count + image count
- **Publish validation:** disabled until ≥ 1 Batch and every semester has ≥ 1 subject (`NO_SEMESTERS` / `EMPTY_SEMESTER` from server)
- **Archive validation:** disabled if active enrollments exist (server returns `INVALID_STATE`)
- **FR:** FR-ADM-004, FR-CRS-001 through FR-CRS-008

#### `/courses/[courseId]/batches/new` — Create Batch (NEW V2)
- **Form fields:** Name, Intake Start, Intake End (must be after start), Capacity (optional)
- **Submit:** `useCreateBatchMutation`
- **FR:** FR-CRS-002

#### `/courses/[courseId]/batches/[batchId]` — Batch Editor (NEW V2)
- **Form fields:** Name, Intake Start, Intake End, Capacity, State (draft/open/closed)
- **Validation:** "Cannot change dates if approved enrollments exist" — server-enforced; client greys out date fields when `batchCount > 0` is known.
- **Close button:** `useCloseBatchMutation` → state becomes `closed`
- **FR:** FR-CRS-002, FR-ENR-004

#### `/courses/[courseId]/semesters/[semesterId]/subjects/new` — Create Subject (Amended V2)
- **Form fields:**
  - Name (required)
  - Description
  - Order
  - **Cover Images (NEW V2)** — multi-file upload zone accepting `image/png`, `image/jpeg`, max 10 MB each (`POST /subjects/:id/images` after subject created)
  - Attachments — `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, max 25 MB each
- **Two-step submit:** create subject → on success, upload images and attachments in parallel
- **FR:** FR-ADM-006, FR-CRS-005

#### `/cells` (admin) — Org-Wide Cell Registry
- Same component as Leader `/cells` but no scope filter applied; admin sees every cell.

#### `/analytics` (admin) — Org Analytics
- **Scope:** organisation-wide
- **Charts:** All five (`WeeklyCellsChart`, `AttendanceChart`, `MeetingTypeDonut`, `GrowthChart`, `ParticipationTable`)
- **Filters:** cell type, area, period
- **Export:** All charts exportable
- **FR:** FR-ANL-003, FR-ANL-005

#### `/audit-log` — Global Audit Log (Amended V2 — Admin can now access)
- **Rendering:** CSR
- **Table columns:** Timestamp, Actor (email), Action, Category, Target type, Target ID, Request ID
- **Filters:** actor UID, action, category, target type/ID, date range
- **Pagination:** cursor-based, 50 / page
- **No export in V2** (no requirement)
- **FR:** FR-ADM-005, FR-SADM-005

---

### 12.7 Super Admin Pages

Wrapped in `<AuthGuard requiredAnyRole={['super_admin']} />`.

#### `/admins` — Admin Account List
- Same structure as V1: table with Name, Email, Status, Last login, Created, Actions.
- **FR:** FR-SADM-001

#### `/admins/new` — Create Admin
- **Form fields:** First name, Last name, Email, Initial password, Preferred language
- **Submit:** `POST /super-admin/admins` → success toast
- **FR:** FR-SADM-001

#### `/admins/[uid]` — Admin Detail
- **Sections:** Profile, Status, Actions (Suspend/Reactivate/Delete via `ConfirmDialog`), Activity (audit timeline)
- **FR:** FR-SADM-001

#### `/settings` — System Settings (NEW V2)
- **Description:** Configure enrollment open-window defaults, supported languages, notification template overrides.
- **Sections:**
  - **Enrollment defaults** — default batch capacity, default intake length
  - **Languages** — toggle which locales are exposed in `<LanguageSwitcher>` (always at least `en`)
  - **Notification templates** — read-only viewer of localised templates with override per language (writes to a settings collection on the backend; out of scope for this blueprint to detail)
- **FR:** FR-SADM-007

---

### 12.8 Shared / Common Pages

#### `error.tsx` — Global Error Boundary
- Catches unhandled React errors at segment level
- Shows localised "Something went wrong" with a "Try again" button
- Logs to console (stack trace never shown to user)
- Uses `<NextIntlClientProvider>` from parent so translations work even in error state

#### `not-found.tsx` — 404 Page
- Localised "Page not found" with link to `/home` (or `/` for unauthenticated)

## 13. UI Component Library (Tailwind Design System)

### 13.1 Tailwind Configuration

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/features/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // V2 brand — TCCR
        brand: {
          50:  '#eef5ff',
          100: '#d9e8ff',
          200: '#bcd6ff',
          300: '#8ebcff',
          400: '#5b97ff',
          500: '#3674ff',
          600: '#1f54e6',
          700: '#1a42b8',
          800: '#1b3a93',
          900: '#1c3576',
        },
        // Semantic
        success: { 500: '#16a34a', 600: '#15803d' },
        warning: { 500: '#f59e0b', 600: '#d97706' },
        danger:  { 500: '#dc2626', 600: '#b91c1c' },
        info:    { 500: '#0ea5e9', 600: '#0284c7' },
        // Surfaces
        surface: {
          DEFAULT: '#ffffff',
          subtle:  '#f8fafc',
          muted:   '#f1f5f9',
          border:  '#e2e8f0',
        },
        // Role accent colours (used by `<UserRolesBadgeStack />`)
        role: {
          member:      '#64748b',
          student:     '#0ea5e9',
          leader:      '#16a34a',
          g12:         '#9333ea',
          admin:       '#1f54e6',
          super_admin: '#b91c1c',
        },
      },
      fontFamily: {
        // Default Latin
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        // Script-specific (loaded in globals.css; see §10.5)
        sinhala: ['var(--font-noto-sinhala)', 'sans-serif'],
        tamil:   ['var(--font-noto-tamil)',   'sans-serif'],
      },
      borderRadius: {
        sm: '4px', DEFAULT: '6px', md: '8px', lg: '12px', xl: '16px', '2xl': '20px',
      },
      boxShadow: {
        card:  '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 4px 0 rgb(15 23 42 / 0.06)',
        modal: '0 20px 50px -10px rgb(15 23 42 / 0.25)',
      },
      screens: {
        // Mobile-first; desktop variants for sidebar layout
        sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};

export default config;
```

### 13.2 Global Styles & Script Tokens

```css
/* src/styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --font-inter:         'Inter',          'system-ui', sans-serif;
  --font-noto-sinhala:  'Noto Sans Sinhala', sans-serif;
  --font-noto-tamil:    'Noto Sans Tamil',   sans-serif;
}

/* Language-aware root: <html lang="si"> → Sinhala font */
html[lang='si']  body { font-family: var(--font-noto-sinhala); }
html[lang='ta']  body { font-family: var(--font-noto-tamil); }
html[lang='en']  body { font-family: var(--font-inter); }

/* Accessibility: respect reduced-motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after { animation: none !important; transition: none !important; }
}

/* Focus ring — visible on keyboard, hidden on pointer */
*:focus { outline: none; }
*:focus-visible {
  outline: 2px solid theme('colors.brand.500');
  outline-offset: 2px;
  border-radius: 4px;
}
```

### 13.3 Responsive Breakpoint Strategy

| Breakpoint | Width  | Layout Behaviour |
|-----------|:------:|------------------|
| Base (mobile) | < 640px | Sidebar hidden behind hamburger; tables wrap to cards |
| `sm` | 640px+ | 2-column forms, denser typography |
| `md` | 768px+ | Tablet: sidebar collapsible icon-only |
| `lg` | 1024px+ | Desktop: sidebar persistent 240px |
| `xl` | 1280px+ | Wide tables; 3-column dashboards |

The Admin web app targets `lg` and `xl` as primary; mobile is supported for read-only journeys (Members/Students/Leaders use the dedicated mobile app for write-heavy work).

### 13.4 Authenticated Layout Pattern

```tsx
// src/app/[locale]/(authenticated)/layout.tsx
import { Sidebar }     from '@/components/layout/sidebar';
import { Topbar }      from '@/components/layout/topbar';
import { AuthGuard }   from '@/components/auth/auth-guard';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-surface-subtle">
        <Sidebar className="hidden lg:block" />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <main className="flex-1 p-4 md:p-6 lg:p-8" id="main-content">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
```

`<Sidebar />` renders role-filtered navigation entries; each entry is gated by `useHasRole(...)` and links use locale-prefixed paths via `next-intl`'s `Link`.

---

## 14. Form Handling Strategy

### 14.1 Stack — React Hook Form + Zod

| Concern                | Library                       |
|-----------------------|-------------------------------|
| Form state & validation | `react-hook-form`           |
| Schema validation        | `zod` + `@hookform/resolvers/zod` |
| Localised error messages | `next-intl` (errors are message keys, resolved at render) |
| Submission state         | RTK Query mutation result (`isLoading`, `error`) |
| Accessible field component | `<Form.Field>` wrapper |

### 14.2 V2 Registration Form — Reference Example

```tsx
// src/features/auth/components/register-form.tsx
'use client';

import { useForm }         from 'react-hook-form';
import { zodResolver }     from '@hookform/resolvers/zod';
import { z }               from 'zod';
import { useTranslations } from 'next-intl';
import { useRouter }       from 'next/navigation';
import { useRegisterMutation } from '@/features/auth/api';
import { Button }          from '@/components/ui/button';
import { Input }           from '@/components/ui/input';
import { Select }          from '@/components/ui/select';
import { FormField }       from '@/components/ui/form-field';

const schema = z.object({
  firstName: z.string().min(1, 'firstNameRequired').max(64),
  lastName:  z.string().min(1, 'lastNameRequired').max(64),
  email:     z.string().email('emailInvalid'),
  password:  z.string()
              .min(8,  'passwordTooShort')
              .regex(/[A-Z]/, 'passwordNeedsUppercase')
              .regex(/[0-9]/, 'passwordNeedsDigit'),
  phone:     z.string().regex(/^\+?[0-9\s-]{7,}$/, 'phoneInvalid').optional().or(z.literal('')),
  preferredLanguage: z.enum(['en', 'si', 'ta']),
  // FR-AUTH-007 — consent required at registration
  consent: z.literal(true, { errorMap: () => ({ message: 'consentRequired' }) }),
});

type FormData = z.infer<typeof schema>;

export function RegisterForm() {
  const t = useTranslations('auth.register');
  const tErr = useTranslations('errors');
  const router = useRouter();
  const [register, { isLoading }] = useRegisterMutation();

  const { register: rhf, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { preferredLanguage: 'en' },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await register({ ...data, phone: data.phone || undefined }).unwrap();
      router.push('/home');
    } catch {
      // Error surfaced via toast by global RTK Query error handler
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label={t('firstName')} error={errors.firstName && tErr(errors.firstName.message!)}>
          <Input {...rhf('firstName')} autoComplete="given-name" />
        </FormField>
        <FormField label={t('lastName')} error={errors.lastName && tErr(errors.lastName.message!)}>
          <Input {...rhf('lastName')} autoComplete="family-name" />
        </FormField>
      </div>

      <FormField label={t('email')} error={errors.email && tErr(errors.email.message!)}>
        <Input type="email" {...rhf('email')} autoComplete="email" />
      </FormField>

      <FormField label={t('password')} error={errors.password && tErr(errors.password.message!)}>
        <Input type="password" {...rhf('password')} autoComplete="new-password" />
      </FormField>

      <FormField label={t('phoneOptional')} error={errors.phone && tErr(errors.phone.message!)}>
        <Input type="tel" {...rhf('phone')} autoComplete="tel" />
      </FormField>

      <FormField label={t('preferredLanguage')}>
        <Select {...rhf('preferredLanguage')}>
          <option value="en">English</option>
          <option value="si">සිංහල</option>
          <option value="ta">தமிழ்</option>
        </Select>
      </FormField>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" {...rhf('consent')} className="mt-1" />
        <span>{t('consentText')}</span>
      </label>
      {errors.consent && (
        <p className="text-sm text-danger-600">{tErr(errors.consent.message!)}</p>
      )}

      <Button type="submit" loading={isLoading} className="w-full">
        {t('submit')}
      </Button>
    </form>
  );
}
```

### 14.3 Form Design Rules

| Rule | Rationale |
|------|-----------|
| Every input wrapped in `<FormField>` exposing `htmlFor` ↔ `id` ↔ `aria-describedby` for the error | WCAG 2.1 (NFR-USE-002) |
| Submit buttons disabled only via `loading` prop; never via `disabled` (loss of focusability is an a11y anti-pattern) | a11y |
| All validation messages are translation keys; `errors[*].message` holds the key | i18n |
| Submitted dates always sent as `YYYY-MM-DD` (semester dates) or full ISO 8601 (timestamps) | API contract |
| Optional empty strings transformed to `undefined` before submission (Firestore distinguishes missing vs. empty) | data integrity |
| `noValidate` on `<form>` — native validation suppressed; Zod is authoritative | consistency |

---

## 15. Notifications & Real-Time Updates

### 15.1 Polling Strategy

V2 keeps the V1 long-polling approach for in-app notifications (no WebSocket / SSE). Polling intervals are tuned per surface:

| Surface | Endpoint | Interval | Reason |
|---------|----------|:--------:|--------|
| `<NotificationBell />` (header) | `GET /me/notifications?limit=20` | **60s** | Server response carries `unreadCount` — no need to refetch full list every poll |
| Admin `/role-requests` queue | `GET /role-requests?status=pending` | **30s** | Active approval workflow surface |
| Admin `/dashboard` counters | `GET /analytics/cells/weekly` | **300s** (5 min) | Snapshots refresh once per scheduled run |
| Cell Leader `/cells/[id]` | `GET /cells/:id/reports?limit=10` | **120s** | Read-only summary; reports rarely arrive in bursts |

RTK Query's `pollingInterval` is set per `useXyzQuery` call; polling is paused automatically when the browser tab loses focus (`refetchOnFocus: true` re-fetches on return).

### 15.2 NotificationBell Component

```tsx
// src/components/layout/notification-bell.tsx
'use client';

import { useState } from 'react';
import Link         from 'next-intl/link';
import { Bell }     from 'lucide-react';
import { useGetMyNotificationsQuery, useMarkReadMutation, useMarkAllReadMutation }
  from '@/features/notifications/api';
import { LocalisedDate } from '@/components/i18n/localised-date';
import { useTranslations } from 'next-intl';

export function NotificationBell() {
  const t = useTranslations('notifications');
  const [open, setOpen] = useState(false);

  const { data } = useGetMyNotificationsQuery(
    { limit: 20 },
    { pollingInterval: 60_000, refetchOnFocus: true, refetchOnReconnect: true }
  );
  const [markRead]    = useMarkReadMutation();
  const [markAllRead] = useMarkAllReadMutation();

  const unread = data?.unreadCount ?? 0;
  const items  = data?.notifications ?? [];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-md hover:bg-surface-muted"
        aria-label={t('toggleNotifications')}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-danger-500 text-white text-xs flex items-center justify-center"
            aria-live="polite"
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-h-[32rem] overflow-y-auto bg-surface rounded-lg shadow-modal border border-surface-border z-50">
          <div className="flex items-center justify-between p-3 border-b border-surface-border">
            <h3 className="font-semibold">{t('title')}</h3>
            {unread > 0 && (
              <button onClick={() => markAllRead()} className="text-sm text-brand-600 hover:underline">
                {t('markAllRead')}
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="p-6 text-center text-sm text-surface-border">{t('empty')}</p>
          ) : (
            <ul>
              {items.map((n) => (
                <li
                  key={n.id}
                  className={`p-3 border-b border-surface-border ${n.readAt ? '' : 'bg-brand-50/40'}`}
                  onClick={() => !n.readAt && markRead(n.id)}
                >
                  <p className="font-medium text-sm">{n.title}</p>
                  <p className="text-sm text-slate-600">{n.body}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    <LocalisedDate value={n.createdAt} format="relative" />
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
```

### 15.3 Web Push (FCM) — Optional in V2

Web push is **opt-in via feature flag** `NEXT_PUBLIC_FEATURE_FCM_WEB_PUSH`. The primary push target is the mobile app; web is reserved for admin alerts.

```ts
// src/lib/firebase/messaging.ts
'use client';

import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { firebaseApp } from './app';

export async function registerWebPush(): Promise<string | null> {
  if (!(await isSupported())) return null;
  if (Notification.permission === 'denied') return null;

  if (Notification.permission === 'default') {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return null;
  }

  const messaging = getMessaging(firebaseApp);
  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: await navigator.serviceWorker.register('/firebase-messaging-sw.js'),
  });

  onMessage(messaging, (payload) => {
    // In-app toast; bell badge refreshes on next poll
    console.log('[push] foreground message', payload);
  });

  return token;
}
```

The returned token is sent to `POST /me/fcm-token` with `deviceType: 'web'`. When the user signs out, the token is removed via `DELETE /me/fcm-token` (carry-forward V1 behaviour).

---

## 16. Error Handling Strategy

### 16.1 Centralised Parser

All API errors flow through one parser that knows V2 error codes from the API Reference:

```ts
// src/lib/errors/parse-api-error.ts
export type ParsedError = {
  code:    string;
  message: string;          // translated, ready to display
  details?: Record<string, unknown>;
  requestId?: string;
  retryable: boolean;
};

const RETRYABLE_HTTP = new Set([408, 429, 502, 503, 504]);

export function parseApiError(err: unknown, t: (k: string) => string): ParsedError {
  // RTK Query FetchBaseQueryError shape
  if (typeof err === 'object' && err !== null && 'status' in err) {
    const fbq: any = err;
    const code      = fbq.data?.error?.code   ?? 'UNKNOWN';
    const requestId = fbq.data?.error?.requestId;
    const details   = fbq.data?.error?.details;

    return {
      code,
      message:   getStatusMessage(code, fbq.status, t),
      details,
      requestId,
      retryable: typeof fbq.status === 'number' && RETRYABLE_HTTP.has(fbq.status),
    };
  }

  return {
    code: 'UNKNOWN',
    message: t('errors.unknown'),
    retryable: false,
  };
}

function getStatusMessage(code: string, status: number | string, t: (k: string) => string): string {
  // V2-specific codes from TCCR_API_Reference_v2_0.md §3
  const map: Record<string, string> = {
    // Auth
    AUTH_INVALID_CREDENTIALS: 'errors.authInvalidCredentials',
    AUTH_ACCOUNT_LOCKED:      'errors.authAccountLocked',
    FEDERATED_TOKEN_INVALID:  'errors.federatedTokenInvalid',
    SESSION_REVOKED:          'errors.sessionRevoked',
    // Roles / permissions
    FORBIDDEN:                'errors.forbidden',
    INSUFFICIENT_ROLE:        'errors.insufficientRole',
    LAST_SUPER_ADMIN:         'errors.lastSuperAdmin',
    // Courses & batches
    COURSE_NOT_FOUND:         'errors.courseNotFound',
    BATCH_NOT_FOUND:          'errors.batchNotFound',
    BATCH_CLOSED:             'errors.batchClosed',
    SEMESTER_DISABLED:        'errors.semesterDisabled',
    // Enrollment & role requests
    ROLE_REQUEST_PENDING:     'errors.roleRequestPending',
    ROLE_REQUEST_NOT_FOUND:   'errors.roleRequestNotFound',
    ENROLLMENT_DUPLICATE:     'errors.enrollmentDuplicate',
    // Cells
    CELL_NOT_FOUND:           'errors.cellNotFound',
    CELL_REPORT_NOT_FOUND:    'errors.cellReportNotFound',
    REPORT_ALREADY_VOIDED:    'errors.reportAlreadyVoided',
    // Generic
    VALIDATION_FAILED:        'errors.validationFailed',
    RATE_LIMIT_EXCEEDED:      'errors.rateLimit',
    INTERNAL_ERROR:           'errors.internal',
  };

  if (map[code]) return t(map[code]);
  if (status === 401) return t('errors.unauthenticated');
  if (status === 403) return t('errors.forbidden');
  if (status === 404) return t('errors.notFound');
  if (status === 'FETCH_ERROR') return t('errors.network');
  return t('errors.unknown');
}
```

### 16.2 Toast Notification System

```tsx
// src/components/ui/toast.tsx
'use client';

import { create } from 'zustand';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';
type Toast = { id: string; variant: ToastVariant; title: string; description?: string };

type ToastStore = {
  toasts: Toast[];
  push:   (t: Omit<Toast, 'id'>) => void;
  remove: (id: string) => void;
};

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (t) => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 5_000);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

export function ToastRegion() {
  const { toasts, remove } = useToastStore();
  return (
    <div
      className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`p-4 rounded-lg shadow-modal bg-surface border-l-4 ${
            t.variant === 'success' ? 'border-success-500'
              : t.variant === 'error' ? 'border-danger-500'
              : t.variant === 'warning' ? 'border-warning-500'
              : 'border-info-500'
          }`}
          role={t.variant === 'error' ? 'alert' : 'status'}
        >
          <div className="flex justify-between items-start gap-3">
            <div>
              <p className="font-medium">{t.title}</p>
              {t.description && <p className="text-sm text-slate-600 mt-1">{t.description}</p>}
            </div>
            <button onClick={() => remove(t.id)} className="text-slate-400 hover:text-slate-700" aria-label="Dismiss">
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 16.3 Global RTK Query Error Sink

```ts
// src/lib/store/error-middleware.ts
import { isRejectedWithValue, Middleware } from '@reduxjs/toolkit';
import { useToastStore } from '@/components/ui/toast';

export const errorMiddleware: Middleware = () => (next) => (action) => {
  if (isRejectedWithValue(action)) {
    const status = (action.payload as any)?.status;
    const code   = (action.payload as any)?.data?.error?.code;
    // 401 → handled by AuthGuard token expiry path
    if (status !== 401) {
      useToastStore.getState().push({
        variant: 'error',
        title:   'Request failed',
        description: code ?? `HTTP ${status}`,
      });
    }
  }
  return next(action);
};
```

Mounted in `configureStore` alongside `baseApi.middleware`.

---

## 17. Performance Optimisation

### 17.1 Bundle & Code Splitting

| Technique | Implementation |
|-----------|----------------|
| Per-route code splitting | Default Next.js App Router behaviour — each segment under `/[locale]/(authenticated)/...` is its own chunk |
| Route group isolation | `(public)` and `(authenticated)` groups never share bundles |
| Heavy components lazy-loaded | `dynamic(() => import('@/components/analytics/cell-attendance-chart'), { ssr: false })` for Recharts |
| YouTube IFrame lazy-loaded | Inside `<YouTubePlayer>` only after user clicks the thumbnail; saves ~50KB on first paint |
| Icons tree-shaken | `lucide-react` imported by name only |

### 17.2 next/image

All product imagery (course banners, subject images PNG/JPG added in V2, profile photos) uses `next/image`:

```tsx
<Image
  src={subject.imageUrls[0]}
  alt={subject.title}
  width={800}
  height={450}
  sizes="(max-width:768px) 100vw, 50vw"
  className="rounded-lg object-cover"
  priority={isAboveFold}
/>
```

The remote domain for Firebase Storage CDN is whitelisted in `next.config.ts`:

```ts
images: {
  remotePatterns: [
    { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
    { protocol: 'https', hostname: 'storage.googleapis.com' },
  ],
}
```

### 17.3 RTK Query Caching Strategy

| Endpoint pattern             | `keepUnusedDataFor` | Rationale |
|-----------------------------|:-------------------:|-----------|
| `getMe`                      | 600 s (10 min)      | Identity rarely changes; invalidated on profile mutations |
| `getCourses`, `getCourse`    | 300 s               | Catalogue is read-heavy, write-rare |
| `getCellsMine`               | 60 s                | Leader's own cells; modest churn |
| `getCellReports`             | 30 s                | Immutable per report; new reports arrive sparsely |
| `getMyNotifications`         | 0 s (no cache)      | Bell polls every 60 s |
| `getRoleRequests` (admin)    | 30 s                | Approval queue |
| `getAnalyticsCellsWeekly`    | **300 s**           | Snapshot data; rebuilt by scheduled job |
| `getAuditLog`                | 60 s                | Forensic reads, not real-time |
| `getMyProgressForCourse`     | 30 s                | Updated on `access` and `complete` mutations |

Cache invalidation uses Tag-based hooks (see §9.1). Mutations declare `invalidatesTags`; subsequent queries re-fetch automatically.

### 17.4 Web Vitals Targets

| Metric | Target | Validation |
|--------|:------:|------------|
| LCP | ≤ 2.5 s | Lighthouse + RUM via Sentry/Datadog |
| FID / INP | ≤ 200 ms | RUM |
| CLS | ≤ 0.1 | Lighthouse |
| TTFB | ≤ 800 ms | Vercel logs |
| TBT | ≤ 300 ms | Lighthouse CI |

These derive from **NFR-PER-001** (page p95 ≤ 3 s) and **NFR-PER-003** (dashboard ≤ 2 s).

### 17.5 Network Optimisations

- **HTTP/2** end-to-end (Vercel + Cloud Run).
- **Pagination everywhere** — no endpoint returns unbounded lists; default page size 20, max 100.
- **`If-None-Match` / ETag** carried by RTK Query is **not** enabled (backend does not currently emit ETags); plan tracked but deferred.
- **Brotli compression** automatically on Vercel.

---

## 18. Accessibility (WCAG 2.1 AA)

Conforms to **NFR-USE-002** (WCAG 2.1 AA).

### 18.1 Checklist by Surface

| Surface | Requirement |
|---------|-------------|
| All interactive elements | Keyboard-reachable; `Tab` order matches visual order |
| Form errors | Linked via `aria-describedby`; `role="alert"` for submit-time errors |
| Modals (`<Dialog>`) | Focus trapped; `Esc` closes; focus restored on close |
| Tables | `<th scope="col" / scope="row">`; sort buttons announce direction |
| Buttons | Real `<button>` elements; never `<div onClick>` |
| Links | Real `<a>` (via `next-intl/Link`); never `<span onClick>` |
| Images | Meaningful `alt`; decorative images use `alt=""` |
| Icons | When standalone, wrapped in `<button aria-label="...">` |
| Live regions | Toast region (`aria-live="polite"`), bell badge (`aria-live="polite"`), error toasts (`role="alert"`) |
| Color contrast | All text ≥ 4.5:1; large text ≥ 3:1; verified per component via Lighthouse |
| Motion | All animations gated by `prefers-reduced-motion` |
| Language attribute | `<html lang={locale}>` updated by middleware/layout for every request |

### 18.2 Skip-to-Content Link

```tsx
// src/components/layout/skip-link.tsx
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-brand-600 focus:text-white focus:px-4 focus:py-2 focus:rounded"
    >
      Skip to main content
    </a>
  );
}
```

Rendered as the first focusable element in the root layout.

### 18.3 sr-only Utility

`@tailwindcss/forms` provides `sr-only` out of the box; pair it with `focus:not-sr-only` to expose content on focus (used by the skip link).

---

## 19. Environment Configuration

### 19.1 `.env.example`

```bash
# ── API ───────────────────────────────────────────────────────────────
NEXT_PUBLIC_API_BASE_URL=https://api.tccr.lk/api/v1
NEXT_PUBLIC_API_TIMEOUT_MS=30000

# ── Firebase Web SDK ──────────────────────────────────────────────────
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=

# ── OAuth / Federated sign-in ─────────────────────────────────────────
# (Client IDs only — secrets stay server-side / Firebase)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
NEXT_PUBLIC_APPLE_CLIENT_ID=

# ── Sentry / Observability ────────────────────────────────────────────
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_SENTRY_ENV=production

# ── Feature flags ─────────────────────────────────────────────────────
NEXT_PUBLIC_FEATURE_FCM_WEB_PUSH=false
NEXT_PUBLIC_FEATURE_CELL_REPORTS_OFFLINE=false
NEXT_PUBLIC_FEATURE_ANALYTICS_CSV_EXPORT=true
NEXT_PUBLIC_FEATURE_APPLE_SIGN_IN=true
NEXT_PUBLIC_FEATURE_GOOGLE_SIGN_IN=true

# ── App metadata ──────────────────────────────────────────────────────
NEXT_PUBLIC_APP_VERSION=2.0.0
NEXT_PUBLIC_APP_NAME=TCCR
```

### 19.2 Typed Config Loader

```ts
// src/lib/config/index.ts
function required(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
}

export const config = {
  api: {
    baseUrl:   required('NEXT_PUBLIC_API_BASE_URL'),
    timeoutMs: Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS ?? 30_000),
  },
  firebase: {
    apiKey:            required('NEXT_PUBLIC_FIREBASE_API_KEY'),
    authDomain:        required('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
    projectId:         required('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
    storageBucket:     required('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: required('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
    appId:             required('NEXT_PUBLIC_FIREBASE_APP_ID'),
    vapidKey:          process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  },
  oauth: {
    googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    appleClientId:  process.env.NEXT_PUBLIC_APPLE_CLIENT_ID,
  },
  features: {
    fcmWebPush:          process.env.NEXT_PUBLIC_FEATURE_FCM_WEB_PUSH === 'true',
    cellReportsOffline:  process.env.NEXT_PUBLIC_FEATURE_CELL_REPORTS_OFFLINE === 'true',
    analyticsCsvExport:  process.env.NEXT_PUBLIC_FEATURE_ANALYTICS_CSV_EXPORT === 'true',
    appleSignIn:         process.env.NEXT_PUBLIC_FEATURE_APPLE_SIGN_IN === 'true',
    googleSignIn:        process.env.NEXT_PUBLIC_FEATURE_GOOGLE_SIGN_IN === 'true',
  },
  app: {
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0',
    name:    process.env.NEXT_PUBLIC_APP_NAME ?? 'TCCR',
  },
  sentry: {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    env: process.env.NEXT_PUBLIC_SENTRY_ENV ?? 'development',
  },
} as const;
```

---

## 20. Testing Strategy

### 20.1 Pyramid

```
          ╱╲       E2E (Playwright)       ~ 10%
         ╱──╲      Integration (RTK + MSW) ~ 30%
        ╱────╲     Unit (Jest/Vitest)      ~ 60%
       ╱──────╲
```

### 20.2 Unit Tests — Examples

```ts
// src/lib/roles/role-utils.test.ts
import { effectiveRoles, hasAnyRole, sortRoles, primaryRole, Role } from './role-utils';

describe('effectiveRoles', () => {
  it('grants admin when super_admin is present', () => {
    expect(effectiveRoles(['super_admin']).sort()).toEqual(['admin', 'super_admin']);
  });
  it('returns roles unchanged otherwise', () => {
    expect(effectiveRoles(['member', 'leader']).sort()).toEqual(['leader', 'member']);
  });
});

describe('hasAnyRole', () => {
  it('treats super_admin as admin', () => {
    expect(hasAnyRole(['super_admin'], ['admin'])).toBe(true);
  });
  it('returns false for disjoint sets', () => {
    expect(hasAnyRole(['member'], ['admin'])).toBe(false);
  });
});

describe('primaryRole', () => {
  it('picks the highest-privilege role', () => {
    expect(primaryRole(['member', 'student', 'leader'])).toBe('leader');
  });
});
```

### 20.3 Integration — MSW + RTK Query

```ts
// src/features/auth/api.test.ts
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { configureStore } from '@reduxjs/toolkit';
import { authApi } from './api';

const server = setupServer(
  rest.post('https://api.tccr.lk/api/v1/auth/register', (_req, res, ctx) =>
    res(ctx.status(201), ctx.json({
      success: true,
      data: { user: { uid: 'u1', email: 'a@b.c', roles: ['member'] }, customToken: 'ct' },
    }))
  ),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it('registration creates active Member with customToken', async () => {
  const store = configureStore({
    reducer: { [authApi.reducerPath]: authApi.reducer },
    middleware: (gdm) => gdm().concat(authApi.middleware),
  });
  const result = await store.dispatch(
    authApi.endpoints.register.initiate({
      firstName: 'A', lastName: 'B', email: 'a@b.c', password: 'Passw0rd!',
      preferredLanguage: 'en', consent: true,
    })
  );
  expect((result as any).data.user.roles).toEqual(['member']);
  expect((result as any).data.customToken).toBeDefined();
});
```

### 20.4 E2E — Playwright Critical Flows (V2)

| # | Flow | Key Assertions |
|--:|------|----------------|
| 1 | **Registration → active Member** | After submit, user lands on `/home`; bell visible; no "pending approval" screen |
| 2 | **Google sign-in** | `signInWithPopup` mocked; `customToken` exchanged; `/home` reached |
| 3 | **Apple sign-in** | Same as Google with Apple provider; only runs when feature flag enabled |
| 4 | **Member submits role request** | `/apply/[courseId]` form posts; queue card shows "Pending" in `/my-requests` |
| 5 | **Admin approves role request → atomic enrollment** | Approving in `/role-requests` triggers role grant + enrollment in one txn; user appears in `/enrollments` and is granted `student` role; `userIdToken.getIdToken(true)` refresh re-reads new claims |
| 6 | **Cell report with idempotency** | Submit report → identical submission within 5 min returns same `reportId`, no duplicate row in `/cells/[id]` |
| 7 | **Cell report void** | Void action requires reason; report shows `Voided` badge; analytics excludes it |
| 8 | **Language switch persists** | Switch to si, reload, locale persists via `preferredLanguage`; URL prefix `/si/...` |
| 9 | **Semester endDate gates content** | `endDate` in the past → subject page shows "Semester ended"; complete button disabled |
| 10 | **Failed-login tracking** | 5 consecutive bad passwords → 6th attempt blocked with `AUTH_ACCOUNT_LOCKED` |

### 20.5 Test File Locations

```
__tests__/
├── unit/         # Jest/Vitest
├── integration/  # RTK + MSW
└── e2e/          # Playwright specs
    ├── auth.spec.ts
    ├── role-requests.spec.ts
    ├── cells.spec.ts
    ├── analytics.spec.ts
    └── i18n.spec.ts
```

---

## 21. Build, CI/CD & Deployment

### 21.1 Build Commands

```bash
pnpm install --frozen-lockfile
pnpm typecheck            # tsc --noEmit
pnpm lint                 # eslint . --max-warnings 0
pnpm test                 # jest --ci
pnpm test:e2e             # playwright test
pnpm i18n:check           # custom script — i18n key parity (see §21.3)
pnpm build                # next build
pnpm start                # next start
```

### 21.2 CI Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }

      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm i18n:check          # FAIL build if keys missing in si / ta
      - run: pnpm test --coverage
      - run: pnpm build

      - name: Upload coverage
        uses: codecov/codecov-action@v4

  e2e:
    needs: build-and-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm playwright install --with-deps
      - run: pnpm test:e2e
```

### 21.3 i18n Key Parity Check

```ts
// scripts/i18n-check.ts
import fs from 'node:fs';
import path from 'node:path';

const LOCALES = ['en', 'si', 'ta'];
const BASE = path.join('src', 'messages');

function flatten(obj: any, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return typeof v === 'object' && v !== null ? flatten(v, key) : [key];
  });
}

const sets: Record<string, Set<string>> = {};
for (const loc of LOCALES) {
  const json = JSON.parse(fs.readFileSync(path.join(BASE, `${loc}.json`), 'utf-8'));
  sets[loc] = new Set(flatten(json));
}

const en = sets.en;
let failed = false;
for (const loc of LOCALES.filter((l) => l !== 'en')) {
  const missing = [...en].filter((k) => !sets[loc].has(k));
  const extra   = [...sets[loc]].filter((k) => !en.has(k));
  if (missing.length || extra.length) {
    failed = true;
    console.error(`\n[${loc}] missing ${missing.length} keys, extra ${extra.length}`);
    missing.slice(0, 20).forEach((k) => console.error(`  − ${k}`));
    extra.slice(0, 20).forEach((k) => console.error(`  + ${k}`));
  }
}

if (failed) process.exit(1);
console.log('✔ i18n key parity OK across', LOCALES.join(', '));
```

### 21.4 `next.config.ts`

```ts
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'storage.googleapis.com' },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options',        value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy',     value: 'camera=(), microphone=(), geolocation=()' },
        {
          key:   'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://accounts.google.com https://appleid.cdn-apple.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src  'self' https://fonts.gstatic.com",
            "img-src   'self' data: https://firebasestorage.googleapis.com https://storage.googleapis.com https://i.ytimg.com",
            "frame-src https://www.youtube.com https://accounts.google.com https://appleid.apple.com",
            "connect-src 'self' https://api.tccr.lk https://*.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
          ].join('; '),
        },
      ],
    }];
  },
};

export default withNextIntl(config);
```

### 21.5 Deployment Environments

| Environment | URL                         | Branch  | Deploy Target | Firebase Project   |
|-------------|-----------------------------|---------|---------------|--------------------|
| dev         | `dev.tccr.lk`               | `develop` | Vercel Preview | `tccr-dev`         |
| staging     | `staging.tccr.lk`           | `staging` | Vercel Production | `tccr-staging`     |
| production  | `app.tccr.lk` / `tccr.lk`   | `main`    | Vercel Production | `tccr-prod`        |

Promotion is gated: every merge to `staging` requires a green CI; every merge to `main` requires `staging` to have soaked for ≥ 48 hours and an explicit release tag `v2.x.y`.

---

## 22. Feature Flags

V2 ships several capabilities behind env-driven flags so they can be enabled per environment without code redeploys.

```ts
// src/lib/feature-flags.ts
import { config } from '@/lib/config';

export const flags = config.features;

export function isEnabled(flag: keyof typeof flags): boolean {
  return Boolean(flags[flag]);
}
```

| Flag | V1/V2 | Purpose |
|------|:----:|---------|
| `FEATURE_GOOGLE_SIGN_IN`        | V2 | Show / hide the "Continue with Google" button |
| `FEATURE_APPLE_SIGN_IN`         | V2 | Show / hide the "Continue with Apple" button — typically web-disabled on dev |
| `FEATURE_FCM_WEB_PUSH`          | V2 | Register a web FCM token on login; off by default |
| `FEATURE_CELL_REPORTS_OFFLINE`  | V2 | Enable IndexedDB-backed draft queue for cell reports — not GA in V2.0 |
| `FEATURE_ANALYTICS_CSV_EXPORT`  | V2 | Show "Download CSV" on chart toolbars |

Usage example:

```tsx
import { isEnabled } from '@/lib/feature-flags';

{isEnabled('googleSignIn') && <GoogleSignInButton />}
{isEnabled('appleSignIn')  && <AppleSignInButton />}
```

---

## 23. Migration Plan (V1 → V2 Web Client)

The web migration mirrors the backend's three-phase deploy (Architecture Overview §8) so client and server roll forward together.

### 23.1 Phase 1 — Pre-Deploy

- Branch `feature/v2-migration` cuts from `main`.
- Run V2 backend in staging against `tccr-staging` Firebase.
- Wire the web client at `staging.tccr.lk` to that backend.
- Soak: at least 5 calendar days of internal use covering all critical E2E flows from §20.4.

### 23.2 Phase 2 — Cutover

| Step | Action |
|-----:|--------|
| 1 | Backend migrations M1–M7 run (roles array, providers, batches, etc.) |
| 2 | Backend Phase 2 service rollout completes (gateway routes added last) |
| 3 | Web V2 build deployed to `app.tccr.lk` |
| 4 | Custom-claims refresh forced for all active sessions via `auth.signOut()` server-side — users prompted to sign in again. Their saved password / federated identities are unchanged |
| 5 | `<LanguageSwitcher>` exposes all 3 locales |
| 6 | Smoke test runbook executed (admin login, member registration, course list, cell list) |

### 23.3 Phase 3 — Deprecation (4–6 weeks)

| Old URL / Concept (V1) | V2 Replacement |
|-----------------------|----------------|
| `/admin/registrations` | `/admin/role-requests` |
| `pending_approval` Student status banner | Removed — registration creates active Member |
| Role check `user.role === 'admin'` (anywhere lingering) | `useHasRole('admin')` |
| Course detail page with no Batches tab | Course detail with Batches tab |
| Sidebar entry "Registrations" | "Role Requests" |
| Notification text in English only | Locale-rendered per recipient |

After 6 weeks, dead V1 client code paths (`role` scalar reads, old registration screens, English-only template renderers) are removed.

### 23.4 Backout

If Phase 2 surfaces blocking issues:

1. Toggle DNS for `app.tccr.lk` back to the previous Vercel deployment (V1 build retained for 90 days).
2. Backend rolls back gateway routes (V1 endpoints still serve under the additive contract).
3. Postmortem; re-plan Phase 2.

---

## 24. Appendix A — Domain Types

```ts
// src/types/domain.ts

// ── User ─────────────────────────────────────────────────────────────
export type Role =
  | 'member' | 'student' | 'leader' | 'g12' | 'admin' | 'super_admin';

export type Locale = 'en' | 'si' | 'ta';

export type AuthProvider = 'password' | 'google' | 'apple';

export type NotificationChannel = 'email' | 'push';

export interface NotificationPreferences {
  email: boolean;   // FR-NOT-006
  push:  boolean;
}

export interface User {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  photoURL?: string;
  roles: Role[];                             // V2 — array, additive
  providers: AuthProvider[];                 // V2
  preferredLanguage: Locale;                 // V2
  notificationPreferences: NotificationPreferences;  // V2
  status: 'active' | 'suspended';
  createdAt: string;     // ISO 8601
  updatedAt: string;
  lastLoginAt?: string;
}

// ── Role requests (NEW V2) ───────────────────────────────────────────
export type RoleRequestStatus = 'pending' | 'approved' | 'rejected';

export interface RoleRequest {
  id: string;
  userId: string;
  requestedRole: Extract<Role, 'student' | 'leader' | 'g12'>;
  courseId?: string;
  batchId?: string;
  notes?: string;
  status: RoleRequestStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;       // admin uid
  rejectionReason?: string;
}

// ── Courses ──────────────────────────────────────────────────────────
export type CourseStatus = 'draft' | 'published' | 'archived';

export interface Course {
  id: string;
  title:    Record<Locale, string>;
  description: Record<Locale, string>;
  bannerUrl?: string;
  status: CourseStatus;
  semesterCount: number;
  createdAt: string;
  updatedAt: string;
}

// ── Batches (NEW V2) ─────────────────────────────────────────────────
export type BatchStatus = 'open' | 'closed';

export interface Batch {
  id: string;
  courseId: string;
  name: string;              // e.g. "Batch 2026-A"
  openDate: string;          // YYYY-MM-DD
  closeDate?: string;
  capacity?: number;
  enrolledCount: number;
  status: BatchStatus;
  createdAt: string;
  updatedAt: string;
}

// ── Semester ─────────────────────────────────────────────────────────
export interface Semester {
  id: string;
  courseId: string;
  number: number;
  title: Record<Locale, string>;
  openDate: string;          // V2 — YYYY-MM-DD
  endDate?: string;          // V2 — YYYY-MM-DD; auto-disable trigger
  isDisabled: boolean;       // server-computed
  subjectCount: number;
}

// ── Subject ──────────────────────────────────────────────────────────
export interface Subject {
  id: string;
  courseId: string;
  semesterId: string;
  order: number;
  title:       Record<Locale, string>;
  description: Record<Locale, string>;
  videoUrl?: string;         // YouTube
  attachments: Array<{ name: string; url: string; mimeType: string; }>;
  imageUrls: string[];       // V2 — PNG/JPG, max 10MB each
  lessonCount: number;
}

// ── Lesson ───────────────────────────────────────────────────────────
export interface Lesson {
  id: string;
  subjectId: string;
  order: number;
  title:   Record<Locale, string>;
  content: Record<Locale, string>;     // markdown
}

// ── Enrollment ───────────────────────────────────────────────────────
export type EnrollmentStatus = 'active' | 'withdrawn' | 'completed';

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  batchId: string;                  // V2
  roleRequestId?: string;           // V2 — present if first-time enrollment
  status: EnrollmentStatus;
  enrolledAt: string;
  completedAt?: string;
}

// ── Subject Progress ─────────────────────────────────────────────────
export interface SubjectProgress {
  userId: string;
  courseId: string;
  batchId: string;                  // V2
  semesterId: string;
  subjectId: string;
  firstAccessedAt: string;
  completedAt?: string;
}

// ── Cell Group (NEW V2) ──────────────────────────────────────────────
export type CellStatus = 'active' | 'archived';

export interface CellGroup {
  id: string;
  name: string;
  leaderId: string;
  parentLeaderId?: string;          // G12 hierarchy
  memberIds: string[];
  memberCount: number;
  status: CellStatus;
  meetingDay?: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  createdAt: string;
  updatedAt: string;
}

// ── Cell Report (NEW V2) ─────────────────────────────────────────────
export type MeetingType =
  | 'regular' | 'evangelism' | 'discipleship' | 'prayer' | 'social' | 'other';

export interface CellReport {
  id: string;
  cellId: string;
  authorId: string;
  meetingDate: string;              // YYYY-MM-DD
  meetingType: MeetingType;
  attendees: { userId?: string; visitorName?: string; }[];
  visitorCount: number;
  decisions?: number;               // salvation decisions
  notes?: string;
  photoUrls: string[];
  voided: boolean;
  voidReason?: string;
  voidedBy?: string;
  voidedAt?: string;
  clientReqId?: string;             // idempotency
  createdAt: string;
}

// ── Analytics (NEW V2) ───────────────────────────────────────────────
export type SnapshotScope = 'cell' | 'leader' | 'g12' | 'org';
export type SnapshotPeriod = 'weekly' | 'monthly';

export interface AnalyticsSnapshot {
  id: string;
  scope: SnapshotScope;
  scopeId: string;                  // cellId | leaderId | g12Id | 'org'
  period: SnapshotPeriod;
  periodStart: string;
  periodEnd: string;
  attendance: { total: number; members: number; visitors: number; };
  decisions: number;
  meetingsHeld: number;
  meetingsByType: Record<MeetingType, number>;
  newMembers: number;
  computedAt: string;
}

// ── Notification ─────────────────────────────────────────────────────
export interface Notification {
  id: string;
  userId: string;
  type: string;                     // e.g. 'ROLE_REQUEST_APPROVED'
  title: string;                    // already localised by backend
  body: string;
  data?: Record<string, unknown>;
  localeRendered: Locale;           // V2
  readAt?: string;
  createdAt: string;
}

// ── Audit Log ────────────────────────────────────────────────────────
export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  category: 'auth' | 'user' | 'course' | 'enrollment' | 'cell' | 'system';
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  requestId: string;
  timestamp: string;
}

// ── Pagination ───────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  items: T[];
  pageInfo: {
    nextCursor?: string;
    hasMore: boolean;
    totalCount?: number;
  };
}
```

---

## 25. Appendix B — Custom Hooks Reference

| Hook | Module | Purpose |
|------|--------|---------|
| `useAuth()`                | `@/features/auth/hooks`         | Returns `{ user, isAuthenticated, signOut }` |
| `useRoles()`               | `@/features/auth/hooks`         | Returns effective `Role[]` for the current user |
| `useHasRole(role)`         | `@/features/auth/hooks`         | Boolean check; respects `super_admin → admin` inheritance |
| `useHasAnyRole(roles)`     | `@/features/auth/hooks`         | Boolean union match |
| `useLocale()`              | `next-intl`                     | Current locale string |
| `useTranslations(ns?)`     | `next-intl`                     | Namespaced translator |
| `useCellScope()`           | `@/features/cells/hooks`        | Returns `{ scope: 'mine'|'network'|'org', filter }` driven by `useRoles` |
| `useIdempotencyKey()`      | `@/lib/idempotency`             | Stable UUID v4 per submission attempt (see §11 ReportForm) |
| `useInactivityTimer(min)`  | `@/features/auth/hooks`         | Triggers sign-out after N minutes idle (FR-AUTH-008, 30 min default) |
| `useCourseProgress(id)`    | `@/features/progress/hooks`     | Wraps `getMyProgressForCourse`; returns `{ progressMap, percent }` |
| `useNotifications()`       | `@/features/notifications/hooks`| Returns `{ items, unreadCount, markRead, markAllRead }` |
| `useConfirmDialog()`       | `@/components/ui/confirm-dialog`| Imperative confirm prompt; returns a promise |
| `useDebounce(value, ms)`   | `@/lib/hooks`                   | Debounces a value (search inputs) |
| `usePagination(opts)`      | `@/lib/hooks`                   | Cursor pagination state machine |
| `useFeatureFlag(flag)`     | `@/lib/feature-flags`           | Reactive flag boolean for conditional UI |

---

## 26. Appendix C — SRS Requirement Traceability

| SRS / NFR ID | Requirement (short) | Frontend Implementation |
|-------------|---------------------|-------------------------|
| FR-AUTH-001 | Email + password registration creates active Member | `RegisterForm`, `useRegisterMutation`, `/[locale]/(public)/register` |
| FR-AUTH-002 | Email + password sign-in | `LoginForm`, `useLoginMutation` |
| FR-AUTH-003 | Google federated sign-in | `GoogleSignInButton`, `useLoginWithGoogleMutation` |
| FR-AUTH-004 | Apple federated sign-in | `AppleSignInButton`, `useLoginWithAppleMutation` |
| FR-AUTH-005 | Password reset (request + verify) | `/forgot-password`, `/reset-password` pages |
| FR-AUTH-006 | Change password while signed in | `/profile/change-password` |
| FR-AUTH-007 | Explicit consent at registration | `consent` checkbox in `RegisterForm` schema |
| FR-AUTH-008 | Auto sign-out after 30 min idle | `useInactivityTimer(30)` mounted in authenticated layout |
| FR-AUTH-009 | Failed-login tracking (5 attempts → lock) | `POST /auth/track-failure` called by `LoginForm` catch |
| FR-AUTH-010 | Link / unlink Google & Apple to existing account | `/profile` Linked Accounts section, `useLink/UnlinkProviderMutation` |
| FR-USER-001 | Read own profile | `useGetMeQuery` in `/profile` |
| FR-USER-002 | Update own profile | `useUpdateMeMutation` |
| FR-USER-003 | Change preferred language | `LanguageSwitcher` + `/profile` |
| FR-USER-004 | Manage notification preferences (per channel) | `/profile` Notification preferences card |
| FR-MEM-001  | Browse public course catalogue | `/courses`, `/courses/[id]` |
| FR-MEM-002  | Submit role request (apply to course) | `/apply/[courseId]` |
| FR-MEM-003  | View own role requests | `/my-requests` |
| FR-MEM-004  | View own cell memberships | `/my-cells`, `/my-cells/[id]` |
| FR-STU-001  | View enrolled courses | `/my-courses` |
| FR-STU-002  | Track per-subject progress | `/my-courses/[id]`, `useCourseProgress` |
| FR-STU-003  | Access subject content (gated by semester endDate) | `/my-courses/[id]/[subjectId]` |
| FR-STU-004  | Withdraw from a course | `/enrollments`, withdraw button |
| FR-LDR-001  | Create / manage own cells | `/cells`, `/cells/new`, `/cells/[id]/edit` |
| FR-LDR-002  | Add / remove members | `/cells/[id]/members` |
| FR-LDR-003  | File cell reports (immutable, idempotent) | `ReportForm` with `useIdempotencyKey()` |
| FR-LDR-004  | Void incorrect report (with reason) | `/cells/[id]/reports/[reportId]` void action |
| FR-LDR-005  | View own cell analytics | `/analytics` (leader scope) |
| FR-G12-001  | View network (own + downstream leaders) | `/network` |
| FR-G12-002  | Promote member to Leader within network | `/promote` |
| FR-G12-003  | Network-scope analytics (incl. growth, participation) | `/analytics` (g12 scope) |
| FR-ADM-001  | List & manage all users | `/admin/users`, `/admin/users/[uid]` |
| FR-ADM-002  | Approve / reject role requests (atomic role + enrollment) | `/admin/role-requests` |
| FR-ADM-003  | Manage course catalogue | `/admin/courses`, `/admin/courses/[id]` |
| FR-ADM-004  | Manage batches | `/admin/courses/[id]/batches/*` |
| FR-ADM-005  | View audit log | `/admin/audit-log` (NEW Admin access) |
| FR-ADM-006  | Org-wide analytics | `/admin/analytics` |
| FR-SADM-001 | Manage Admin accounts | `/admins`, `/admins/new`, `/admins/[uid]` |
| FR-SADM-005 | Global audit log | `/admin/audit-log` |
| FR-SADM-007 | System settings (locale toggles, defaults) | `/admin/settings` |
| FR-CRS-001  | Course → Batch → Semester → Subject → Lesson hierarchy | Project structure under `/admin/courses/[id]/...` |
| FR-CRS-002  | Subject images (PNG/JPG, ≤ 10 MB) | Subject create/edit forms accept image uploads |
| FR-CRS-003  | Semester openDate / endDate | Semester form fields; client gating in `/my-courses/[id]/[subjectId]` |
| FR-CELL-001 | Cell module — group CRUD | Cells routes (leader & admin scopes) |
| FR-CELL-002 | Cell reports immutable + idempotent | `X-Idempotency-Key` header in `cellReportsApi.fileReport` |
| FR-CELL-003 | Cell report photos (PNG/JPG) | `ReportForm` photo step |
| FR-ANL-001  | Pre-aggregated weekly / monthly snapshots | `analyticsApi` endpoints |
| FR-ANL-002  | Cell attendance, meeting types, growth, participation | Recharts components in `/analytics` |
| FR-ANL-003  | Dashboard read latency ≤ 2 s | RTK Query 300s cache; lazy-loaded charts |
| FR-ANL-005  | CSV export | Behind `FEATURE_ANALYTICS_CSV_EXPORT` flag |
| FR-NOT-001  | In-app notifications | `<NotificationBell />`, `notificationsApi` |
| FR-NOT-006  | Per-channel opt-out (email, push) | `/profile` notification preferences |
| FR-I18N-001 | Three locales: en, si, ta | `next-intl` setup, `/src/messages/*.json` |
| FR-I18N-002 | User-selectable preferred language | `<LanguageSwitcher />` + persisted via `PATCH /me` |
| FR-I18N-003 | URL prefix `/[locale]/...` | App Router segment |
| FR-I18N-004 | English fallback for missing keys | `next-intl` default config + `messages.en` is canonical |
| FR-I18N-005 | Script-specific fonts (Sinhala, Tamil) | `tailwind.config.ts` font families, `globals.css` `html[lang]` rules |
| NFR-SEC-001 | TLS everywhere | Vercel handles TLS; HSTS via `headers()` |
| NFR-SEC-005 | CSP, X-Frame-Options, etc. | `next.config.ts` `headers()` |
| NFR-SEC-006 | OAuth tokens discarded after Firebase exchange | Federated sign-in code never persists OAuth `accessToken` |
| NFR-PER-001 | Page p95 ≤ 3 s | Bundle split, lazy load, image optimisation |
| NFR-PER-003 | Dashboard ≤ 2 s | Snapshot-backed reads; 5-min RTK cache |
| NFR-USE-002 | WCAG 2.1 AA | §18 accessibility patterns |
| NFR-OBS-001 | Structured logs + traces | Sentry; `X-Request-Id` echoed by API parser |

---

*© 2026 Future CX Lanka (Pvt) Ltd — Confidential*
*Document version: 2.0.0 · Paired with TCCR SRS v2.0 dated 15 May 2026 and TCCR API Reference v2.0*
