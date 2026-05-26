# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Next.js dev server
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — Next.js / ESLint (config extends `next/core-web-vitals`; ignores `src/ui_structure/**`)
- `npm run type-check` — `tsc --noEmit`
- `npm test` — vitest run (config: `vitest.config.ts`, setup: `tests/setup.ts`, jsdom env)
- `npm run test:watch` — vitest in watch mode

Tests live under `tests/v02/sprint-NN/` (e.g. `sprint-01/sessionSlice.test.ts`, `sprint-01/useRoles.test.tsx`, `sprint-04/restoreCourse.test.ts`, `sprint-06/cells.test.ts`, `sprint-07/cellReports.test.ts`). The `tests/{unit,integration,e2e}/` folders are empty scaffolding.

Path alias: `@/*` → `src/*` (set in `tsconfig.json`). The `src/ui_structure/**` tree is excluded from the TS compile.

## Branch Strategy

### Naming convention
```
feature/<short-description>   e.g. feature/auth-login-token-storage
```

### Rules — follow these strictly

1. **Always ask permission before creating a new branch.** Never create a branch silently.

2. **One feature = one branch.** Even within the same sprint, if two features are distinct enough to be reviewed separately, they get separate branches.

3. **Before switching to a new branch:** if there are any uncommitted changes on the current branch:
   - Commit and push the changes
   - Create a PR
   - Wait for the user to review and merge before starting the next branch

4. **Never work directly on `main`.** All changes go through feature branches and PRs.

5. **Sprint files live at `_sprints/v01/sprint-{N}.md`** — check the relevant sprint file before starting work to know which branches are expected.

6. **PR before merge** — never merge a branch yourself. Always create a PR and let the user review and approve it.

### Workflow per feature

```
Ask permission to create branch
  ↓
git checkout -b feature/<name>
  ↓
Implement feature
  ↓
npm run type-check  (must pass)
  ↓
git add <specific files>
git commit -m "feat(<scope>): ..."
git push -u origin feature/<name>
  ↓
gh pr create ...
  ↓
Wait for user to merge
  ↓
git checkout main && git pull
  ↓
Ask permission for next branch
```

## Product re-baseline — V1 (CMP) → V2 (TCCR)

> **Read this first.** The repo was originally `slp-web` / `EduPath` — a single-purpose **Course Management Portal (CMP)** for Future CX Lanka. As of the **TCCR v2.0 baseline (May 2026)**, the entire V1 product has been re-scoped as **one module — "Bible School"** — inside a larger platform called **TCCR (The Christian Center Rathmalana)**. **Nothing from V1 is thrown away;** every V1 screen has a recognisable counterpart in V2. The V2 platform adds a second top-level module (**Cell Groups**), plus analytics, i18n, federated sign-in, and a multi-role model.

### What changed at the product level

| # | Area | V1 (CMP / EduPath) | V2 (TCCR) |
|---|------|--------------------|-----------|
| 1 | Product identity | EduPath / CMP — single portal | TCCR — Bible School + Cell Groups under one shell |
| 2 | V1 portal lives on as | — | the **Bible School module** (courses, semesters, subjects, enrollments, student progress are all "Bible School" surfaces now) |
| 3 | Roles model | scalar `role: 'student' \| 'admin' \| 'super_admin'` | additive `roles: Role[]`. Every authed user holds `member` at minimum; six total: `member`, `student`, `leader`, `g12`, `admin`, `super_admin`. `super_admin` inherits `admin` |
| 4 | Course hierarchy | Course → Semester → Subject → Lesson | Course → **Batch (new)** → Semester → Subject → Lesson |
| 5 | Semester lifecycle | static `number` only | `openDate` + `endDate`; auto-disabled past `endDate` |
| 6 | Subject media | PDF + DOCX | PDF + DOCX + **PNG / JPG** lesson images |
| 7 | Registration outcome | `pending_approval` Student | Active **Member**, signed in immediately. Becoming a Student is a separate role request |
| 8 | Sign-in | Email + password | + **Google OAuth** + **Apple Sign-In** (Firebase JS SDK; OAuth tokens discarded after exchange) |
| 9 | New module | — | **Cell Groups** (cells, members, multi-step cell reports with attendance, void) |
| 10 | New surfaces | — | per-user audit timeline; weekly/monthly **analytics** dashboards (Leader / G12 / Admin / Super Admin scopes); **role requests** queue |
| 11 | Languages | English only | **Sinhala / Tamil / English** with English fallback; URLs locale-prefixed (`/si/...`, `/ta/...`, `/en/...`); `preferredLanguage` is a user profile field |
| 12 | Identity claims | `{role}` | `{roles[], preferredLanguage}` |
| 13 | API contracts package | `slp-contracts` | `tccr-contracts` (V2 rename) |
| 14 | API base URL | (planned) `slp-backend` | `https://api.tccr.lk/api/v1` |
| 15 | Inactivity timeout | none | auto sign-out after **30 min** of inactivity (web only) |

### Authoritative spec

- **`.claude/TCCR_Web_Frontend_Blueprint_v2_0.md`** — current design contract. Use this for all new work.
- `.claude/CMP_Web_Frontend_Blueprint.md.md` — V1 blueprint. Kept for reference; **superseded** by the V2 doc above.

When the V2 blueprint and the existing code disagree, the V2 blueprint wins — but flag it before refactoring large surfaces.

## High-level architecture

This is the **Next.js 14 (App Router)** frontend for TCCR. It is the **presentation layer only** — it calls a separate REST backend over HTTP. **V1 (Bible School) is fully integrated end-to-end:** Firebase Auth, REST hooks, redux-persist, and the dual-role `activeRole` switching are all wired and working. V2 features (Member home, Cell Groups, role-requests, analytics, Batches) are **UI-only at this phase** — they read from mocks under `src/lib/mock/` until backend support lands.

### Implementation status

| Layer | Status | Notes |
|---|---|---|
| V1 / Bible School pages & routing | ✅ Done | 42 page components across the four V1 route groups — all of these are now Bible School surfaces in V2 |
| UI components (`src/components/ui/`) | ✅ Done | 22 V1 primitives + V2 additions: `LanguageSwitcher`, `Typeahead`, `RoleBadgeStack`, `FederatedSignInButtons`, `AppleIcon` |
| Layout shell | ✅ Done | AppShell, Sidebar, TopNav, UserMenu, NotificationBell, FloatingNav. RoleNav now exports `MEMBER_NAV`, `LEADER_NAV`, `G12_NAV` alongside V1 navs |
| Redux store + slices | ✅ Done | `uiSlice`, `sessionSlice` with `roles: string[]` + `activeRole` + localStorage persistence (`edupath.activeRole.${uid}`). `Role` union extended to `member \| student \| leader \| g12 \| admin \| super_admin` |
| Mock data (`src/lib/mock/`) | ✅ Done | V1: `students`, `courses`, `users`, `admins`, `notifications`, `registrations`, `audit`. V2: `cells`, `cellReports`, `roleRequests`, `batches`, `tccrDirectory` |
| Domain layer (`src/domain/`) | ✅ Partial | Has `enums/`, `schemas/`, `types/`, `utils/` directories with content; types still mostly live inline in hooks |
| Infrastructure (`src/infrastructure/`) | ✅ Done | `api/` (Axios + apiRequest), `auth/` (helpers), `firebase/` (config + initialised SDK + getIdToken), `storage/` |
| Application API hooks (`src/application/hooks/`) | ✅ Done | 25 integrated hooks. V1: `useCourses`, `useCourse`, `useEnrollments`, `useProgress` / `useCourseProgress`, `useAdminCourseProgress`, `useNotifications`, `useRegistrationQueue`, `useAdminEnrollmentQueue`, `useEnrollmentRequests`, `useProfile`, `useApprovalQueue`, `useSessionUser`. V2: `useRoles`, `useAnalytics`, `useAuditLog`, `useBatches`, `useCell`, `useCells`, `useCellJoinRequests`, `useCellReports`, `useReportAggregates`, `useRoleRequests`, `useRoleRequestQueue`, `useIdempotencyKey`, `useInactivityTimer`, `useSidebarCounts` |
| Auth / role guards | ✅ Done | `<AuthGuard allowedRoles={Role[]}>` in `src/components/auth/AuthGuard.tsx`; `FirebaseAuthListener` handles sign-in / token / status / redirect |
| **V2: Member surfaces (`/home`, `/apply/...`, `/my-requests`, `/my-cells`)** | ✅ Done | `src/app/(authed)/{home,apply,my-cells,my-requests,notifications,profile,school}` shipped |
| **V2: Cell Groups (Leader + G12)** | ✅ Done | `src/app/(leader)/{cells,leader}`, `src/app/(g12)/g12`, `src/components/cells/*` populated |
| **V2: Admin role-requests + course Batches** | ✅ Done | `src/app/admin/cells/`, `useBatches`, `useRoleRequestQueue` |
| **V2: Super-admin user-roles management + audit timeline** | ✅ Done | `src/app/super-admin/cells/`, `useAuditLog` |
| **V2: i18n (si / ta / en)** | ✅ Partial | `next-intl` v4 installed, `src/messages/{en,si,ta}.json` live, `localeSlice` mounted. **Still pending:** locale-prefixed URLs — `src/app/` is flat, no `[locale]/` segment yet |
| **V2: Federated sign-in (Google + Apple)** | ✅ Done | Wired in commit `98144e1` (federated nav fix, signup cleanup) |
| One Next API route | ✅ | `src/app/api/health/` — only server route in the app |

**Installed:** `firebase` (v12), `@reduxjs/toolkit`, `react-redux`, `redux-persist`, `next-themes`, `lucide-react`, `clsx`, `tailwind-merge`, `react-hook-form`, `zod`, `@hookform/resolvers`, `next-intl`, plus `@tailwindcss/forms` / `@tailwindcss/typography`. **Test stack:** `vitest`, `@vitejs/plugin-react`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`. **Still not installed:** `axios` (the existing `apiRequest` uses `fetch`), `recharts` (V2 charts are hand-rolled SVG), `uuid`, `msw`, `playwright`. Do not assume any of these are available — add them explicitly if a future feature needs them.

### Clean Architecture layers (intended)

```
src/app/            Presentation — Next.js App Router, layouts, pages
                    V2: nested under [locale]/ — /si/..., /ta/..., /en/...
src/components/     Presentation — UI primitives (ui/) + feature components
src/application/    Application — Redux slices, RTK Query, hooks
src/infrastructure/ Infrastructure — API client (Axios + Accept-Language),
                                     Firebase Auth (email/pwd + Google + Apple),
                                     token service (in-memory only), i18n loader   (empty)
src/domain/         Domain — types (from `tccr-contracts`), enums, Zod schemas,
                             pure utils (incl. roleUtils.hasAnyRole / effectiveRoles)  (empty)
src/lib/            Cross-cutting helpers (cn, kit) + mock fixtures (lib/mock/)
src/messages/       V2 — i18n catalogues (en.json, si.json, ta.json)                 (not yet)
```

Dependency rule: inner layers (domain) must never import from outer layers (application / presentation / infrastructure). Presentation must not import Axios or call APIs directly — go through hooks / RTK Query. **Tokens never go to `localStorage`** — Firebase ID token is held in memory only (`tokenService`); OAuth tokens from Google/Apple are discarded after exchange.

### Routing model

**Today (V1 layout):** `src/app/` uses route groups to segregate by role — `(public)`, `(student)`, `admin/`, `super-admin/`. Guards are not yet implemented; they belong in each group's `layout.tsx`.

**Target (V2 layout, per blueprint §5):** every URL is **locale-prefixed**, and route groups expand to six tiers matching the `roles[]` model:

```
src/app/[locale]/
  (public)/         landing, login, register, forgot/reset password, public catalogue
  (authed)/         home (member), profile, notifications, my-cells (read-only),
                    my-requests, apply/[courseId]    — any authenticated user
  (student)/        dashboard, my-courses/[courseId]/[subjectId], enrollments
  (leader)/         cells, cells/[id]/reports/new, leader-scoped analytics
  (g12)/            network, promote, g12-scoped analytics
  (admin)/          users/[uid]/{roles,audit}, role-requests, courses/[id]/batches/...,
                    cells (org-wide), analytics (org-wide), audit-log
  (super-admin)/    admins, settings
```

Role match is **union**: a user with `["member","leader"]` can hit any `(authed)` and `(leader)` page. `super_admin` expands to `[super_admin, admin]` for inheritance. Cell-report **creation** explicitly excludes plain `admin` (SRS §9.3).

Nav config is in `src/components/layout/RoleNav.ts` — exports `STUDENT_NAV`, `ADMIN_NAV`, `SUPERADMIN_NAV`, `MEMBER_NAV`, `LEADER_NAV`, `G12_NAV`. The shared shell is `components/layout/AppShell.tsx` (Sidebar + TopNav + Toaster + footer). Feature directories under `src/components/` (all populated): `admin/`, `analytics/`, `auth/`, `cells/`, `course/`, `enrollment/`, `layout/`, `member/`, `notifications/`, `profile/`, `progress/`, `student/`, `ui/`, `user/`.

### State management

Redux Toolkit store at `src/application/store/`. `RootLayout` mounts `Providers` (`src/app/providers.tsx`) which wraps the app in `<Provider store={store}>`. Slices today:

- `uiSlice` — toasts (with `nanoid` ids), modal kind+payload, sidebar collapsed flag
- `sessionSlice` — current `user` + `roles: Role[]` + `activeRole` (persisted to localStorage as `edupath.activeRole.${uid}`). Note: the V2 blueprint envisioned renaming this to `authSlice`; it was kept as `sessionSlice` in code.
- `localeSlice` — current locale, used by `next-intl` plumbing

`useRoles()` is implemented at `src/application/hooks/useRoles.ts` and returns the role-predicates + `can([...])` helper as planned. RTK Query is **not added** — all data hooks are hand-rolled around `apiRequest` (fetch). `useIdempotencyKey()` exists and is used by cell-report POSTs (`X-Idempotency-Key`).

Existing hooks: `useAppDispatch`, `useAppSelector`, `useApprovalQueue` (generic optimistic approve/reject + bulk-select state used by registrations and enrollments queues — dispatches a toast on action). Data still comes from `src/lib/mock/*.ts`.

### Design system

Tailwind is the styling system. Brand tokens are defined in **two places that must stay in sync**:
- `tailwind.config.ts` — extended `colors`, `fontFamily`, `borderRadius`, `boxShadow` (utility classes like `bg-primary`, `text-accent`, `shadow-card`)
- `src/app/globals.css` — the same tokens as CSS custom properties (`--color-primary`, `--fs-h1`, etc.), used by raw CSS and by the `.shell` / `.shell-main` layout classes referenced from `AppShell`

**Core palette (carried from V1, kept in V2):**
- `--color-primary` `#152A24` (dark forest green) — sidebars, dark sections, primary text
- `--color-primary-2` `#1F3626` — alternate dark
- `--color-accent` `#BCE955` (lime) — the **single** action colour: CTAs, active states, focus rings, progress fills
- `--color-accent-hover` `#A8D43D`
- `--color-body-green` `#41574A` — body text on light
- Surfaces `#FFFFFF` / `#FAFAFA` / `#EEF1EF`; stroke `#E5E5E5`; muted `#A0ACA6`
- Semantic: success `#3DB55F`, warning `#D97706`, error `#DC2626`, info `#0891B2`, progress `#1D4ED8`

**V2 additions (from `src/ui_structure/v2/project/tccr-theme.css` + `tccr-additions.css`):**
- **Mono theme** (`body.theme-mono`) — silver/black palette (primary `#0E0E10`, accent silver `#C8CCD2`) used by the TCCR mono brand variant
- **Dark theme** (`body.theme-dark`) — applies on top of either palette; page bg `#0E0E10`, surfaces `#161618`/`#1A1A1D`
- **Role accent chips** — `.role-chip.{member|student|leader|g12|admin|super_admin}` for the V2 multi-role badge stack
- **Cell-type badges** — `.cell-type.{g12|care|children|outreach}`
- **Module tiles** — `.module-tiles` grid; `.mod-tile.bs` (Bible School, dark gradient) and `.mod-tile.cg` (Cell Groups, lime gradient) for the Member home
- **Language pill** — `.lang-pill` with `.active` state; `--dark` variant for hero/sidebar contexts
- **Federated sign-in buttons** — `.fed-row`, `.fed-btn`, `.fed-divider`
- **Cell components** — `.cell-grid`, `.cell-card`, `.cd-header` (cell-detail hero), `.cd-tabs`, `.report-card`, `.report-form` (multi-step layout with `.report-steps` sticky sidebar)
- **Cell-report form atoms** — `.rf-card`, `.rf-yesno`, `.rf-stars` (satisfaction), `.att-list` / `.att-row` / `.att-toggle` (attendance present/absent)
- **Analytics atoms** — `.kpi-mini` (delta + sparkline-friendly), `.chart-card`, `.legend`
- **Batch row** — `.batches` / `.batch-row` (with `.closed` state) for course-detail batch listing
- **Semester date badge** — `.sem-dates`, `.sem-dates.disabled` (after `endDate`); `.subject.disabled` adds a "Closed" pill
- **Status callouts** — `.role-banner` ("Want to enroll? Apply to become a Student"), `.pending-callout`, `.switch-banner` (Member+Leader "Continue as Leader" prompt), `.wfa-wrap` (waiting-for-approval centerpiece)
- **Course-view layout** — `.cv-wrap` two-column (300 px sidebar + main pane), `.cv-side` / `.cv-sem` / `.cv-sub` / `.cv-lesson` for the Bible School course viewer

**Fonts:** loaded via `next/font/google` in `src/app/layout.tsx` — Figtree → `--font-heading`, Inter → `--font-body`, JetBrains Mono → `--font-mono`. V2 adds **Noto Sans Sinhala** and **Noto Sans Tamil**, swapped per-locale via `html[lang='si']` / `html[lang='ta']` body selectors. These will need to be loaded in `public/fonts/` and wired into Tailwind's `fontFamily.{sinhala,tamil}`.

**Type scale:** Figtree headings `h1` 64 / `h2` 56 / `h3` 48 / `h4` 40 / `h5` 32 / `h6` 24 / `h7` 20 (1.1 line-height, letter-spacing -0.01em/-0.02em). Inter body `lg/md/base/sm/xs` = 20/18/16/14/12 (1.4 line-height).

**Tokens not in Tailwind today but available as CSS vars:** `--shadow-{xs,sm,md,lg,xl,card,modal}`, `--radius-{sm,md,lg,xl,2xl,full}`, `--space-1` through `--space-24` (4 px base), `--duration-{fast,base,slow,slower}`, `--ease-{default,spring,out,in-out}`, `--focus-ring`.

Class-merging helper: `cn()` in `src/lib/cn.ts` (clsx + tailwind-merge). Course cover gradients and pravatar avatars live in `src/lib/kit.ts`.

### `src/ui_structure/` — design handoff bundles, not source

This directory holds Claude Design HTML/CSS/JS prototype handoffs. **Excluded from TypeScript, ESLint, and Tailwind content scanning** — treat as visual reference only; do not import from it, do not render it; mirror its visuals into real React/Tailwind components.

- `src/ui_structure/` (V1 bundle) — screens for the CMP / Bible School surfaces (`screens-public.jsx`, `screens-student.jsx`, `screens-admin.jsx`, `screens-real.jsx`) + design tokens in `design_system/colors_and_type.css`. Already partially recreated as the live V1 code.
- **`src/ui_structure/v2/project/`** (V2 bundle, primary reference for new work) — entry point `TCCR Web Frontend v2.html`. Pulls in the V1 base kit (`components.jsx`, V1 `screens-*.jsx`) **plus** the TCCR additions:
  - `tccr-components.jsx` — wordmark, language pill, federated buttons, role-chip stack
  - `tccr-screens-public.jsx` — TCCR landing + login/register with federated buttons + locale-aware copy
  - `tccr-screens-member.jsx` — Member home (module tiles), profile (with linked accounts + notification preferences + preferred language), my-cells (read-only), apply-to-enroll, my-requests
  - `tccr-screens-student.jsx` — Student dashboard + course viewer with the Batch + image-gallery V2 changes
  - `tccr-screens-cells.jsx` — full Cell Groups module: cells list, cell detail, members panel, multi-step report form, report viewer, void dialog, leader/g12 analytics
  - `tccr-screens-admin.jsx` — admin variants: user directory with role chips, role-requests queue, course editor with batches sub-tree, per-user audit timeline, org-wide analytics
  - `app-tccr.jsx` — hash-routed demo shell with a role-switcher pill (Public / Login / Member / Member+Student / Leader / G12 / Admin / Super Admin)
  - `tccr-additions.css` + `tccr-theme.css` — the new component CSS and the mono / dark theme overrides

  When implementing a V2 surface, **read both the V2 blueprint section for that page AND the corresponding `tccr-screens-*.jsx` block** before writing components — the blueprint gives data flow + RBAC, the prototype gives the exact visual.

## Conventions worth knowing

- Prettier: 100-col, double quotes, trailing commas, semis, `prettier-plugin-tailwindcss` sorts class names.
- All components that touch Redux, hooks, or browser APIs need `"use client"` (this is a Next.js App Router project — server is the default).
- `next.config.mjs` whitelists `i.pravatar.cc` and `images.unsplash.com` for `next/image`; mock avatars use pravatar via `kit.ts`.
- Env template is `.env.example` (`NEXT_PUBLIC_API_BASE_URL`, Firebase keys) — actual integration is pending.
- Theme (light/dark) is managed by `next-themes`; `providers.tsx` wraps the app in both `<Provider store={store}>` and `<ThemeProvider>`. V2 adds a **mono** brand variant on top of light/dark — toggled by adding `theme-mono` to `<body>`.
- **V2 i18n rule:** no UI string lives in component source — every string flows through `t()` (`next-intl`). When adding a new screen, ship `en.json` keys alongside; CI will flag missing `si`/`ta` keys at release time. Wrap user-generated Sinhala/Tamil text with `<ScriptOptimisedText>` so line-height stays correct.
- **V2 role checks:** never compare `roles[0]` or `user.role` — always use `useRoles().can([...])` or `<RoleGuard allowAny={[...]} />`. Union match, with `super_admin` ⊃ `admin` handled by `effectiveRoles()`.
