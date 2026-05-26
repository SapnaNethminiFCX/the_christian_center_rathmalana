# Sprint 1 (V2): Auth & Authorization Foundation

**Goal:** Re-baseline the authentication layer for V2 — self-service Member registration, Google / Apple federated sign-in, OTP password reset, failed-login lockout, multi-role identity in Redux, union-match route guards, locale-aware request wrapper, and a 30-minute inactivity timer. Everything later in V2 sits on top of what this sprint ships.
**Estimated effort:** XL
**Depends on:** None (this is the foundation). Backend `tccr-backend` v2.3.0 must expose `/auth/federated/*`, `/auth/track-failure`, and `/me` with `roles[]`.
**Status:** Not started

---

## Branches

- `feature/v2-auth-redesign` — registration response + login profile shape + multi-role session slice
- `feature/v2-federated-signin` — Google + Apple sign-in (replace the existing UI-only stubs)
- `feature/v2-auth-lockout-and-reset` — track-failure + lockout countdown + OTP password reset modal
- `feature/v2-route-guards-union` — `useRoles()`, `<RoleGuard>`, route-group layouts, `activeRole` switcher wiring
- `feature/v2-inactivity-and-locale` — 30-min inactivity timer + `Accept-Language` header + `tokenService`

> Five branches; merge in order. Each is independently reviewable.

---

## Current State (what V1 already gives us)

- Firebase Auth SDK is installed and initialised (`src/infrastructure/firebase/auth.ts`)
- `signInWithEmailAndPassword` works in `LoginForm.tsx`
- `GET /me` is called after login and stored in Redux `sessionSlice`
- `POST /auth/logout` is wired in `AppShell`
- `sessionSlice` already supports a partial multi-role shape with `roles[]` + `activeRole` (left from the UI prototype phase) but the schema is not enforced and several call-sites still read scalar `role`
- `FirebaseAuthListener` handles token refresh via `onIdTokenChanged`
- `LanguageSwitcher` writes to Redux + localStorage; `<html lang>` syncs reactively (shipped in `fix/i18n-language-persistence`)
- `LoginForm` and `RegisterForm` use `useTranslations()` (shipped)
- "Sign in with Google" / "Sign in with Apple" buttons are present in `FederatedSignInButtons.tsx` but show a "coming soon" toast on click

---

## Features

### 1. Self-service Member registration

**What to change:**
- Update `RegisterForm` so the `POST /auth/register` response handler shows `welcomeToast` and redirects to `/login` — no "Waiting for approval" callout anymore (the V1 `pending_approval` page is removed from the flow but the route stays for back-compat)
- Add `preferredLanguage` to the form (defaults to the active locale; visible as a chip beneath the password field)
- On 409 `EMAIL_EXISTS` → inline error on the email field
- On network error → form-level banner

**API:**
- `POST /auth/register` — V1 endpoint; V2 response is `{ uid, message }` (no `status: "pending_approval"`)

**UI changes:**
- Remove the "Application Submitted — wait for approval" success screen
- Remove `src/app/(authed)/apply/student/pending/page.tsx` from the post-register flow (the page stays as the role-request pending page in Sprint 3)
- Welcome toast: `t("auth.register.welcomeToast")` → "Welcome to TCCR. Sign in to continue."

---

### 2. Google + Apple federated sign-in

**What to integrate:**
- Replace the placeholder click handlers in `FederatedSignInButtons.tsx` with real Firebase `signInWithPopup(auth, new GoogleAuthProvider())`
- After Firebase popup succeeds, call `POST /auth/federated/google` with `{ idToken, preferredLanguage }`; the backend returns `{ firebaseToken, uid, isNewUser }`; exchange via `signInWithCustomToken(auth, firebaseToken)`
- Mirror the same flow for Apple (`OAuthProvider("apple.com")`)
- Discard the Google/Apple ID token after the exchange completes — never store it
- If `isNewUser === true`, route to `/home` (Member); otherwise route by `roles[]`

**API:**
- `POST /auth/federated/google` (NEW V2)
- `POST /auth/federated/apple` (NEW V2)

**UI changes:**
- Loading spinner inside each federated button while popup is open
- Disable the email/password form while a popup is open
- Error toast on `FEDERATED_TOKEN_INVALID`, `EMAIL_NOT_VERIFIED`
- If the email matches an existing password account, prompt to "link this provider in Profile after signing in" — no automatic linking on first sign-in

**Out of scope:** linked-account management lives in Sprint 2.

---

### 3. Failed-login tracking & lockout

**What to integrate:**
- On every Firebase `auth/wrong-password` / `auth/invalid-credential` response, call `POST /auth/track-failure { email }`; do not block on its response
- Response `{ locked: true, attempts: 10 }` → show a form-level banner with a countdown to unlock (15 min from the most recent failure)
- Hide the password field while locked; CTAs change to "Reset password instead?"

**API:**
- `POST /auth/track-failure` (V1+, ensure it's wired now)

**UI changes:**
- New `<LockoutBanner countdownSeconds={n} onReset={() => openForgotModal()} />` component in `src/components/auth/`
- Countdown ticks every second; on hit 0, banner dismisses and form re-enables
- Surface error code in dev mode (`MAX_FAILURES`) so QA can verify

---

### 4. OTP password-reset flow

**What to integrate:**
- Replace the existing forgot-password placeholder modal (`ForgotPasswordModal.tsx`) with the real 2-step flow:
  1. Step 1 — email input → `POST /auth/password-reset` (always returns `204` regardless of whether email exists; show generic "If that email is registered you'll receive a code")
  2. Step 2 — 6-digit code input → `POST /auth/password-reset/verify { email, otp }`; on success show "Check your inbox" (Firebase sends the reset email)
- Codes expire after 15 min; modal shows a "Resend code" link with a 60s throttle
- Error codes: `INVALID_OTP`, `OTP_EXPIRED`, `OTP_MAX_ATTEMPTS`

**API:**
- `POST /auth/password-reset` (V1+, currently stubbed)
- `POST /auth/password-reset/verify` (V1+, currently stubbed)

**UI changes:**
- Modal already has the 2-step layout in the prototype — wire it to the real endpoints
- Resend button disables while throttled; visible 60s countdown

---

### 5. Multi-role identity & `activeRole` switcher

**What to integrate:**
- Refactor `sessionSlice` to enforce `roles: Role[]` (no scalar `role` field) and `activeRole: Role | null`
- After `GET /me`, hydrate `roles[]` and `preferredLanguage` from the response
- Read `localStorage.edupath.activeRole.{uid}` to pick the initial `activeRole`; if absent, default to highest assigned role (`super_admin > admin > g12 > leader > student > member`)
- `setActiveRole(role)` writes through to localStorage
- Build `useRoles()` hook per plan §4.2
- Replace every existing call site of `useAppSelector(s => s.session.user?.role)` with `useRoles()` calls
- Build `<RoleGuard allowAny={[...]}>` component for use inside pages

**API:**
- `GET /me` (V1 endpoint, response shape changes — already in V2)

**UI changes:**
- TopNav's "Switch to X" pill (already in `TopNav.tsx`) — wire to `setActiveRole(otherRole)` and `router.push(DASHBOARD_BY_ROLE[otherRole])`
- UserMenu shows the role chip stack
- Sidebar nav picks `MEMBER_NAV` / `STUDENT_NAV` / `LEADER_NAV` / `G12_NAV` / `ADMIN_NAV` / `SUPERADMIN_NAV` by `activeRole`

---

### 6. Union-match route guards (replaces V1 scalar checks)

**What to integrate:**
- Rewrite `src/app/admin/layout.tsx` (and super-admin / student equivalents) so they wrap their tree in `<AuthGuard allowedRoles={["admin","super_admin"]}>` etc., using union match
- Add `src/app/(leader)/layout.tsx`, `src/app/(g12)/layout.tsx`, `src/app/(authed)/layout.tsx` guards (some exist as bare layouts today)
- Cell-report **creation** routes exclude plain `admin` per SRS §9.3 — `<AuthGuard allowedRoles={["leader","g12","super_admin"]}>`
- Unauthenticated user on a guarded route → redirect to `/login?from=<encoded-path>`
- Authenticated but wrong role → redirect to `DASHBOARD_BY_ROLE[primary]`

**Files affected:**
- `src/components/auth/AuthGuard.tsx`
- `src/app/admin/layout.tsx`, `src/app/super-admin/layout.tsx`, `src/app/(student)/layout.tsx`, `src/app/(leader)/layout.tsx` (NEW), `src/app/(g12)/layout.tsx` (NEW), `src/app/(authed)/layout.tsx`

---

### 7. 30-minute inactivity timer

**What to integrate:**
- New hook `src/application/hooks/useInactivityTimer.ts` — debounced timer that resets on `mousemove`, `keydown`, `scroll`, `touchstart`, and any `<video>` `play` / `timeupdate` event
- Mount once inside `AppShell`
- On timeout: `pushToast({ tone: "warning", title: t("session.timeoutTitle"), message: t("session.timeoutMessage") })`, sign out, redirect to `/login?reason=inactive`
- Read `?reason=inactive` in `LoginForm`'s existing `useEffect` and render the inactivity banner

**No backend endpoint** — purely client-side per NFR-SEC-002.

---

### 8. `tokenService` + locale-aware `apiRequest`

**What to integrate:**
- New `src/infrastructure/firebase/tokenService.ts` per plan §4.5
- Update `src/infrastructure/api/request.ts` so it pulls from `tokenService.get()` for every authed call and attaches `Accept-Language: <activeLocale>`
- 401 with valid token → `tokenService.refresh()` and retry once; second 401 → call `signOut()` and redirect to `/login?reason=expired`
- Add an `idempotencyKey?: string` option that maps to `X-Idempotency-Key` header (Sprint 7 uses it)

**Files affected:**
- `src/infrastructure/api/request.ts`
- `src/infrastructure/firebase/tokenService.ts` (NEW)
- `src/components/auth/FirebaseAuthListener.tsx` — wire `onIdTokenChanged` → `tokenService.refresh()` + `tokenService.clear()` on null user

---

### 9. Logout cleanup

**What to integrate:**
- Logout sequence in `AppShell.handleLogout`:
  1. `await apiRequest("/me/fcm-token", { method: "DELETE", body: { token: cachedFcmToken } }).catch(() => null)` (sprint 2 sets `cachedFcmToken`)
  2. `await apiRequest("/auth/logout", { method: "POST" }).catch(() => null)`
  3. `await signOut(auth)`
  4. `tokenService.clear()`
  5. Clear `sessionSlice` (dispatch `clearUser()`)
  6. Remove `localStorage.edupath.activeRole.{uid}`
  7. `router.push("/login")`

---

## Files touched

```
src/components/auth/RegisterForm.tsx
src/components/auth/LoginForm.tsx
src/components/auth/FederatedSignInButtons.tsx
src/components/auth/ForgotPasswordModal.tsx
src/components/auth/LockoutBanner.tsx                              (NEW)
src/components/auth/FirebaseAuthListener.tsx
src/components/auth/AuthGuard.tsx
src/application/slices/sessionSlice.ts
src/application/hooks/useRoles.ts                                  (NEW)
src/application/hooks/useInactivityTimer.ts                        (NEW)
src/infrastructure/api/request.ts
src/infrastructure/firebase/tokenService.ts                        (NEW)
src/app/admin/layout.tsx                                           (guard)
src/app/super-admin/layout.tsx                                     (guard)
src/app/(student)/layout.tsx                                       (guard)
src/app/(leader)/layout.tsx                                        (NEW guard)
src/app/(g12)/layout.tsx                                           (NEW guard)
src/app/(authed)/layout.tsx                                        (guard)
src/messages/en.json                                               (auth.lockout.*, session.*)
```

---

## Tests (per FR-T-001)

> Vitest + RTL for units; Playwright for end-to-end. Create `tests/v02/sprint-01/` with one file per feature area.

**Unit tests:**
- `useRoles.test.ts` — verifies `effective` expands `super_admin → [super_admin, admin]`; `can([])` returns `false`; `primary` falls back when `activeRole` is null
- `tokenService.test.ts` — caches token for 50 minutes; `refresh()` forces re-fetch; `clear()` zeros the cache
- `sessionSlice.test.ts` — `setActiveRole` writes to localStorage; `clearUser` removes the key

**Integration tests (RTL):**
- `RegisterForm.test.tsx` — happy path → success toast + router push to `/login`; 409 EMAIL_EXISTS shows inline error
- `LoginForm.test.tsx` — wrong password fires `POST /auth/track-failure`; after 10 mocked failures the lockout banner renders
- `ForgotPasswordModal.test.tsx` — step transitions; invalid OTP shows code-level error; expired OTP shows full reset

**E2E (Playwright):**
- `auth.spec.ts` — register → login → land on `/home`; logout returns to `/login`; refresh while signed-in does NOT lose the session
- `federated.spec.ts` — Google sign-in popup mocked, custom-token exchange succeeds, lands on `/home` if `isNewUser=true`

---

## Checklist

- [ ] `POST /auth/register` flow drops the pending-approval branch
- [ ] `preferredLanguage` accepted in register form
- [ ] Google sign-in via popup → `POST /auth/federated/google` → `signInWithCustomToken`
- [ ] Apple sign-in via popup → `POST /auth/federated/apple` → `signInWithCustomToken`
- [ ] OAuth tokens discarded immediately after exchange
- [ ] `POST /auth/track-failure` called on Firebase wrong-password
- [ ] Lockout banner with 15-min countdown renders on `{ locked: true }`
- [ ] OTP flow: send code, verify code, Firebase reset email dispatched
- [ ] `sessionSlice` refactored to `roles[]` + `activeRole` + `preferredLanguage`
- [ ] `useRoles()` hook ships with `effective` super_admin expansion
- [ ] `<RoleGuard>` and route-group layouts use union match
- [ ] `useInactivityTimer` mounted in `AppShell` (30 min)
- [ ] `tokenService` integrated; `apiRequest` uses it on every authed call
- [ ] `Accept-Language` header attached on every authed request
- [ ] Logout removes FCM token, calls `/auth/logout`, signs out, clears Redux, clears localStorage `activeRole`
- [ ] All test files written and passing
- [ ] All routes still resolve correctly after multi-role refactor (no `role` scalar reads left in code)
