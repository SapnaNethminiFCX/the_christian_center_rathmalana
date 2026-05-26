# EduPath — Course Management Portal (Web)

`slp-web` is the Next.js 14 web frontend for **EduPath**, a multi-role Course Management Portal for Future CX Lanka (Pvt) Ltd. It serves three roles — **Student**, **Admin**, and **Super Admin** — through a single role-aware application.

The frontend is a pure presentation layer: it renders state and dispatches user intent. Business logic lives in `slp-backend`, which this client will eventually consume over HTTPS.

---

## Tech stack

- **Next.js 14** (App Router, SSR/CSR mix)
- **React 18** + **TypeScript** (strict)
- **Redux Toolkit** + **react-redux** for client state (RTK Query planned for server state)
- **Tailwind CSS 3** with `@tailwindcss/forms` and `@tailwindcss/typography`
- **lucide-react** icons, **next-themes**, **clsx** + **tailwind-merge**

> Firebase Auth (auth-only) and a real API layer are spec'd in the blueprint but not yet wired up — the current build runs against in-memory mock fixtures in `src/lib/mock/`.

---

## Getting started

### Prerequisites

- Node.js 18.17+ (recommended: 20 LTS)
- npm 9+

### Install

```bash
npm install
```

### Environment

Copy `.env.example` to `.env.local` and fill in values as integration lands:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
```

### Run

```bash
npm run dev          # start dev server at http://localhost:3000
npm run build        # production build
npm run start        # serve the production build
npm run lint         # ESLint (next/core-web-vitals)
npm run type-check   # tsc --noEmit
```

---

## Project structure

```
src/
├── app/                  Next.js App Router — role-grouped routes
│   ├── (public)/         Landing, login, register, public catalog
│   ├── (student)/        Dashboard, my-courses, profile, notifications, help
│   ├── admin/            Approvals, course editor, students, audit log
│   ├── super-admin/      Admin management + super-admin views
│   ├── api/health/       Health route handler
│   ├── layout.tsx        Root layout (fonts + Providers)
│   └── globals.css       Tailwind base + design-token CSS variables
│
├── components/
│   ├── ui/               Design-system primitives (Button, Card, Modal, ...)
│   ├── layout/           AppShell, Sidebar, TopNav, NotificationBell, RoleNav
│   ├── auth/             LoginForm, RegisterForm, AuthSplit
│   ├── course/           CourseEditor and related
│   ├── enrollment/       Approval queue UI
│   └── admin/            Admin-only forms & tables
│
├── application/          Redux slices, store, hooks (RTK Query goes here)
├── domain/               Types, enums, schemas, pure utils       (placeholder)
├── infrastructure/       API client, Firebase Auth, token store  (placeholder)
├── lib/
│   ├── cn.ts             clsx + tailwind-merge helper
│   ├── kit.ts            Avatar URLs + course cover gradients
│   └── mock/             In-memory fixtures driving the UI today
│
└── ui_structure/         HTML/CSS/JS design handoff bundle (read-only reference,
                          excluded from TS / ESLint / Tailwind scanning)
```

Path alias: `@/*` → `src/*`.

---

## Architecture at a glance

The codebase follows a **Clean Architecture** layout. Inner layers must not import from outer layers:

```
Presentation  →  src/app/, src/components/
Application   →  src/application/   (Redux, RTK Query, hooks)
Infrastructure→  src/infrastructure/ (HTTP client, Firebase Auth, tokens)
Domain        →  src/domain/        (types, enums, Zod schemas, utils)
```

- **Routing** — three role-grouped trees under `src/app/` (`(public)`, `(student)`, `admin/`, `super-admin/`). Role guards belong in each group's `layout.tsx` once auth is integrated.
- **Navigation** — sidebar/top-nav config for all roles is centralised in `src/components/layout/RoleNav.ts`.
- **State** — `uiSlice` (toasts, modal, sidebar) + `sessionSlice` (current user + role). Store is mounted by `src/app/providers.tsx`.
- **Styling** — Tailwind utilities driven by tokens in `tailwind.config.ts`; the same tokens are mirrored as CSS custom properties in `globals.css` for the shell layout.

The full design contract — RTK Query endpoints, role guards, page-by-page specs, accessibility targets — lives at [`.claude/CMP_Web_Frontend_Blueprint.md.md`](./.claude/CMP_Web_Frontend_Blueprint.md.md).

---

## Conventions

- **Prettier**: 100-col, double quotes, trailing commas, semis. `prettier-plugin-tailwindcss` sorts class names.
- **ESLint**: extends `next/core-web-vitals`; ignores `src/ui_structure/**`, `node_modules/**`, `.next/**`.
- **TypeScript**: strict mode; `src/ui_structure/**` is excluded from compilation.
- **Client components**: anything touching Redux, hooks, or browser APIs needs `"use client"`.
- **Images**: `next/image` is restricted to `i.pravatar.cc` and `images.unsplash.com` (see `next.config.mjs`).

---

## Design handoff bundle

`src/ui_structure/` contains the original Claude Design HTML/CSS/JS prototype. It is the visual source of truth for screen-by-screen recreation, but it is **not source code** — do not import from it, do not render it. Recreate its visuals as real React + Tailwind components.

---

## License

Proprietary — © 2026 Future CX Lanka (Pvt) Ltd. All rights reserved.
