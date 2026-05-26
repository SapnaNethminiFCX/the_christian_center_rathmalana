# Sprint 2 (V2): Profile, Avatar, Linked Accounts, FCM & Notification Preferences

**Goal:** Bring the V2 profile surface online. Avatar upload, linked-account chips (Google / Apple link/unlink), FCM token registration, and per-channel notification preferences. Plus pull `preferredLanguage` into the profile so it stops drifting from the locale slice.
**Estimated effort:** L
**Depends on:** Sprint 1 (multi-role session, locale-aware `apiRequest`, `tokenService`)
**Status:** Not started

---

## Branches

- `feature/v2-profile-and-avatar` — profile page V2 rewrite, avatar upload, `preferredLanguage` field
- `feature/v2-linked-accounts` — provider link/unlink chip stack
- `feature/v2-fcm-tokens` — FCM registration on login + deregistration on logout
- `feature/v2-notification-prefs` — per-channel preferences toggle UI

> Four branches. FCM is a separate branch because it needs Firebase Messaging set up (which can fail silently in dev — easier to isolate).

---

## Current State

- `useProfile.ts` calls `PATCH /me` and `POST /me/change-password`
- Profile pages exist at `/(student)/profile`, `/admin/profile`, `/super-admin/profile` with form-only UI
- `GET /me` already returns `providers`, `preferredLanguage`, `notificationPreferences` (V2 shape) — Sprint 1 made the session slice store them
- `NotificationBell` and `useNotifications` already call `/me/notifications*` — no change here, except the V2 server now renders `title` / `body` in the user's `preferredLanguage`

---

## Features

### 1. Profile page V2 rewrite

**What to change:**
- Single profile page at `src/app/(authed)/profile/page.tsx` (NEW) — replaces the three role-specific profile pages. The route-group layout enforces "any authenticated"; role-specific shells render the same component
- Sections (mirrors `tccr-screens-member.jsx → ProfilePage`):
  - **Identity**: first name, last name, email (read-only), preferred language dropdown
  - **Avatar**: square preview, upload button, "Remove photo" link
  - **Linked accounts**: chip stack (Sprint 2 feature 2)
  - **Notification preferences**: toggle row (Sprint 2 feature 4)
  - **Security**: change password button → reuses the existing modal
- "Save changes" disabled until any field is dirty
- `PATCH /me` sends only changed fields

**API:**
- `GET /me` (already)
- `PATCH /me` (already; V2 accepts `preferredLanguage`)

**UI changes:**
- Delete the three legacy profile pages and re-route them to the single `/profile` URL (each role's sidebar still links here)
- Preferred-language dropdown writes to **both** the profile (server) and the locale slice (client) so the change is immediate
- Form validation via `react-hook-form` + `zod`

---

### 2. Avatar upload

**What to integrate:**
- `POST /me/avatar` multipart upload — `photo` field, JPEG/PNG, max 2 MB
- Pre-upload preview: render local `URL.createObjectURL(file)` before posting
- After success: `profilePhotoUrl` on the user document updates → dispatch `setUser({ ...user, profilePhotoUrl })` and the avatar rerenders everywhere (TopNav, Sidebar, UserMenu)

**API:**
- `POST /me/avatar` (NEW V2)

**UI changes:**
- "Choose photo" button opens file picker; chosen file shows preview + "Save photo" / "Cancel"
- Validation: client checks MIME + size before posting; show error inline ("Image must be JPG or PNG, under 2 MB")
- 400 `VALIDATION_ERROR` from server → same inline message
- On success: success toast + replace the existing avatar URL in Redux

**Files:**
- `src/components/profile/AvatarUploader.tsx` (NEW)

---

### 3. Linked-account chips (Google / Apple)

**What to integrate:**
- Read `providers[]` from `user`; show one chip per provider with an "Unlink" affordance
- "Link Google" button → run `signInWithPopup(auth, googleProvider)` → call `POST /me/providers/link { provider: "google", idToken }`
- Same for Apple
- "Unlink" → `DELETE /me/providers/:provider`; backend rejects with 409 `INVALID_STATE` if it's the last sign-in method (cannot remove the only way to sign in)

**API:**
- `POST /me/providers/link` (NEW V2)
- `DELETE /me/providers/:provider` (NEW V2)

**UI changes:**
- New `<LinkedAccountsCard>` component
- Each chip: provider icon, label, "Unlink" link or "Linked ✓" if active
- Disable "Unlink" when `providers.length === 1`
- On 409 → toast "Add another sign-in method first"

**Files:**
- `src/components/profile/LinkedAccountsCard.tsx` (NEW)

---

### 4. FCM token registration

**What to integrate:**
- Set up Firebase Messaging: `import { getMessaging, getToken, onMessage } from "firebase/messaging"`
- On successful login (in `FirebaseAuthListener` after `setUser`):
  1. `Notification.requestPermission()` if `Notification.permission === "default"`
  2. If granted, `getToken(messaging, { vapidKey: NEXT_PUBLIC_FCM_VAPID_KEY })` to get the FCM token
  3. `POST /me/fcm-token { token }` (best-effort — don't block login if it fails)
  4. Stash the token in module scope so logout can deregister it
- On token rotation (`onMessage` doesn't notify, but FCM has its own rotation listener) → call `POST` again with the new token
- On logout (already in AppShell): `DELETE /me/fcm-token { token }`
- Foreground push messages (`onMessage`) → render via `pushToast`

**API:**
- `POST /me/fcm-token` (NEW V2)
- `DELETE /me/fcm-token` (NEW V2)

**Env:**
- `NEXT_PUBLIC_FCM_VAPID_KEY` — added to `.env.example`

**UI changes:**
- First-login: a small banner above the profile page says "Turn on push notifications" when `Notification.permission === "default"` and the user is on the profile page; clicking triggers the permission prompt
- No global notification UI — notifications still show in the bell (Sprint 8 will surface unread count, already shipped)

**Files:**
- `src/infrastructure/firebase/messaging.ts` (NEW)
- `src/components/auth/FirebaseAuthListener.tsx` (modify)
- `public/firebase-messaging-sw.js` (NEW — service worker for background pushes)

---

### 5. Notification preferences toggle

**What to integrate:**
- `notificationPreferences: { email: boolean, push: boolean }` is read from `GET /me`
- Two toggle rows on the profile page: "Email notifications" and "Push notifications"
- On change → optimistic update + `PATCH /me/notifications/preferences { email, push }`
- Helper copy: "Essential notifications (security alerts, account changes) are always delivered in-app even when these are off"

**API:**
- `PATCH /me/notifications/preferences` (NEW V2)

**UI changes:**
- `<Toggle>` ui-kit primitive (build if not yet present); state mirrors the server
- On `400 VALIDATION_ERROR` → revert + toast

**Files:**
- `src/components/profile/NotificationPreferences.tsx` (NEW)

---

### 6. `useProfile` hook expansion

`useProfile` exists; expand it to expose:
- `uploadAvatar(file)`
- `linkProvider(provider, idToken)`
- `unlinkProvider(provider)`
- `setNotificationPrefs({ email, push })`
- `setPreferredLanguage(locale)` — convenience that PATCH's `/me` + updates locale slice

All mutations dispatch `setUser` so child components re-render from Redux.

---

## Files touched

```
src/app/(authed)/profile/page.tsx                           (NEW)
src/app/(student)/profile/page.tsx                          (-> redirect)
src/app/admin/profile/page.tsx                              (-> redirect)
src/app/super-admin/profile/page.tsx                        (-> redirect)
src/application/hooks/useProfile.ts
src/components/profile/AvatarUploader.tsx                   (NEW)
src/components/profile/LinkedAccountsCard.tsx               (NEW)
src/components/profile/NotificationPreferences.tsx          (NEW)
src/components/auth/FirebaseAuthListener.tsx
src/infrastructure/firebase/messaging.ts                    (NEW)
public/firebase-messaging-sw.js                             (NEW)
.env.example                                                (FCM VAPID key)
src/messages/en.json                                        (profile.*)
```

---

## Tests (per FR-T-001)

**Unit:**
- `useProfile.test.ts` — every mutation dispatches `setUser`; rejects when no auth user
- `avatar-validation.test.ts` — pure validator: rejects > 2 MB, wrong MIME

**Integration (RTL):**
- `AvatarUploader.test.tsx` — file picker → preview → upload → URL updates
- `LinkedAccountsCard.test.tsx` — Unlink button disabled when only one provider; 409 toast shown when server refuses
- `NotificationPreferences.test.tsx` — toggling email reverts on 400

**E2E (Playwright):**
- `profile.spec.ts` — login → profile → change first name → save → reload → still shows new name
- `linked-accounts.spec.ts` — link Google (mocked popup) → chip appears; unlink → server confirms

---

## Checklist

- [ ] Single `/profile` route (role-specific routes redirect here)
- [ ] First name / last name / preferred language editable via `PATCH /me`
- [ ] Preferred-language change also updates the active locale instantly
- [ ] Avatar upload: file picker, preview, MIME + size validation, `POST /me/avatar`
- [ ] Avatar URL flows back into Redux → updates TopNav / Sidebar / UserMenu
- [ ] Linked-accounts chip stack reads `providers[]`
- [ ] Google link via popup → `POST /me/providers/link`
- [ ] Apple link via popup → same
- [ ] Unlink disabled when `providers.length === 1`; 409 surfaces as toast
- [ ] FCM messaging initialised; permission prompt where appropriate
- [ ] Token registered after login (`POST /me/fcm-token`)
- [ ] Token deregistered before logout (`DELETE /me/fcm-token`)
- [ ] Foreground pushes → `pushToast` with locale-rendered body
- [ ] Notification preferences toggles wired to `PATCH /me/notifications/preferences`
- [ ] Tests written and green
