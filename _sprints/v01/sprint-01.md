# Sprint 1: Firebase Auth, Login & Route Guards

**Goal:** Establish the authentication foundation — real login for all roles, token storage, automatic token refresh, and role-based route protection.
**Estimated effort:** L
**Depends on:** Firebase config keys from backend team
**Status:** Not started

---

## Branch(es)
- `feature/auth-login-token-storage` — Firebase setup, login, token storage, auto-refresh
- `feature/auth-route-guards` — Route protection for admin, super-admin, student areas

> Split into two branches: token/login work can be reviewed independently before guards are added.

---

## Features

### Firebase SDK Setup
**What to integrate:**
- Install `firebase` package
- Create `src/infrastructure/firebase/firebaseConfig.ts` — initialise Firebase app with env keys
- Create `src/infrastructure/firebase/auth.ts` — export `auth` instance

**UI changes needed:**
- None — infrastructure only

**Error states to handle:**
- Missing Firebase config → console error + fallback message

---

### Login (All Roles)
**What to integrate:**
- Replace `LoginForm` mock `completeSignIn()` with real `signInWithEmailAndPassword`
- After sign-in, call `GET /me` to get role and profile
- Store Firebase ID token + user profile in Redux `sessionSlice`
- Remove role toggle selector (role comes from API, not UI)
- Remove hardcoded mock user seeding

**UI changes needed:**
- Remove role segment toggle from login form
- Add loading state on "Sign In" button
- Inline error on email field: account not found
- Inline error on password field: wrong password
- Form-level banner: account suspended, too many attempts
- After successful login → redirect based on `role` from `/me` response

**Error states to handle:**
- `auth/wrong-password` → inline on password field
- `auth/user-not-found` → inline on email field
- `auth/user-disabled` → form banner "Account suspended"
- `auth/too-many-requests` → form banner with retry message
- `GET /me` fails → toast + sign out

---

### Token Storage & Auto-Refresh
**What to integrate:**
- Store Firebase ID token in Redux `sessionSlice`
- Create `src/infrastructure/firebase/getToken.ts` — calls `user.getIdToken()` (always fresh)
- Listen to `onIdTokenChanged` → update Redux on every token refresh
- Create a fetch wrapper / base request helper that auto-attaches `Authorization: Bearer <token>`

**UI changes needed:**
- None — infrastructure only

---

### Logout
**What to integrate:**
- `signOut(auth)` from Firebase
- Call `POST /auth/logout` to revoke refresh tokens
- Clear Redux session
- Redirect to `/login`

**UI changes needed:**
- Logout button in `UserMenu` triggers real logout
- Show loading briefly while logout request completes

---

### Route Guards
**What to integrate:**
- `src/app/admin/layout.tsx` — check `role === 'admin' || role === 'super_admin'`
- `src/app/super-admin/layout.tsx` — check `role === 'super_admin'`
- `src/app/(student)/layout.tsx` — check `role === 'student'` or dual-role
- Unauthenticated → redirect `/login`
- Wrong role → redirect to own dashboard

**UI changes needed:**
- Loading skeleton while auth state resolves (prevents flash of wrong page)
- Each layout shows a spinner until Firebase `onAuthStateChanged` fires

---

## Checklist
- [x] Install `firebase` package
- [x] Create Firebase config and auth initialisation
- [x] Update `sessionSlice` to store real token and user profile
- [x] Replace mock login with Firebase `signInWithEmailAndPassword`
- [x] Call `GET /me` after login to get role
- [x] Store token, attach to all API requests via base request helper
- [x] Set up `onIdTokenChanged` listener for auto-refresh
- [x] Implement logout (`signOut` + `POST /auth/logout` + clear session)
- [x] Remove role toggle from `LoginForm`
- [x] Add login inline errors
- [x] Add route guard to admin layout
- [x] Add route guard to super-admin layout
- [x] Add route guard to student layout
- [ ] Test login as admin → redirects to `/admin/dashboard` (needs admin account in Firebase)
- [x] Test login as super admin → redirects to `/super-admin/dashboard` (verified working)
- [ ] Test login as student (approved) → redirects to `/dashboard` (needs approved student)
- [ ] Test accessing `/admin` without auth → redirects to `/login`

**Status: Sprint 1 complete (Branch 2 pending PR + merge).**
