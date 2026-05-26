# Sprint 6 (V2): Cell Groups Module

**Goal:** Stand up the entire Cell Groups module: cells list / detail / member roster for everyone, create / edit / archive for Leaders & G12s, direct add-member for owners, and the Member-initiated join-request flow with admin approval.
**Estimated effort:** XL
**Depends on:** Sprint 1 (multi-role guards). Sprint 3's role-requests hook is reused for shape consistency but not required.
**Status:** Not started

---

## Branches

- `feature/v2-cells-list-and-detail` — Leader/G12/Admin list + cell detail view + member roster
- `feature/v2-cells-create-edit-archive` — Cell mutations (create / patch / archive)
- `feature/v2-cell-members-direct` — Add and remove members (`POST /cells/:id/members` + `DELETE`)
- `feature/v2-cell-join-requests-member` — Member apply to join + member-side display in `/my-requests`
- `feature/v2-cell-join-requests-admin` — Admin queue per cell + approve / reject
- `feature/v2-my-cells-member` — Read-only "My Cells" for Members

> Six branches. Each branch is independently mergeable; merging order does not matter aside from `cells-list-and-detail` providing the type definitions.

---

## Current State

- `(authed)/my-cells/page.tsx` and `[cellId]/page.tsx` exist as UI-only mocks
- `(leader)/cells/...` route group exists with mock data under `src/lib/mock/cells.ts`
- `MEMBER_NAV`, `LEADER_NAV`, `G12_NAV` already include cell links
- No API hooks for cells yet

---

## Features

### 1. Cells list (role-scoped)

**What to integrate:**
- New `useCells.ts` hook calling `GET /cells` with query params:
  - `search`, `type`, `area`, `state`, `leaderUid`, `limit`, `cursor`
- The server auto-scopes by role:
  - Member/Student → all active cells (so they can find one to join)
  - Leader → cells they lead
  - G12 → cells in their network
  - Admin/Super Admin → all cells
- Render: `tccr-additions.css` `.cell-grid` + `.cell-card`

**API:**
- `GET /cells` (NEW V2)

**Pages:**
- `(authed)/cells/page.tsx` (NEW — for Members/Students browsing)
- `(leader)/cells/page.tsx` (existing — wire to API)
- `(g12)/cells/page.tsx` (NEW — alias of leader view, network scope)
- `admin/cells/page.tsx` (NEW — org-wide scope)

**UI changes:**
- Cell card shows: name, type chip (`.cell-type.g12` etc.), area, leader avatar+name, member count, report count, state
- Filter chips: type (G12 / Care / Children / Outreach), area dropdown, search box
- Empty state with role-appropriate CTAs: Member sees "No cells yet — be the first to join"; Leader sees "Create your first cell"

---

### 2. My Cells (Member read-only)

**What to integrate:**
- `(authed)/my-cells/page.tsx` calls `GET /cells/mine`
- Shows cells the user belongs to as a member; clicking opens the read-only detail view
- For dual-role Member+Leader: own-led cells listed separately under "Cells I lead"

**API:**
- `GET /cells/mine` (NEW V2)

**UI changes:**
- Empty state: "You're not in any cell yet. Browse cells to apply to join."

---

### 3. Cell detail + member roster

**What to integrate:**
- `useCell(cellId)` calls `GET /cells/:id`; returns cell + full member roster
- Routes:
  - `(authed)/my-cells/[cellId]/page.tsx` — Member's read-only view
  - `(leader)/cells/[cellId]/page.tsx` — Leader's full view with "File Report" / "Add Members" actions
  - `(g12)/cells/[cellId]/page.tsx` — G12 view (similar to leader if owner)
- Render with `.cd-header`, `.cd-tabs` (Members · Reports · Settings)
- 404 → "Cell not found" page; 403 → "You don't have access to this cell"

**API:**
- `GET /cells/:id` (NEW V2)

---

### 4. Create / edit / archive cell

**What to integrate:**
- New page `(leader)/cells/new/page.tsx` for cell creation
- Existing `(leader)/cells/[cellId]/edit/page.tsx` wired to `PATCH /cells/:id`
- Archive action on cell settings tab → `POST /cells/:id/archive` with confirm dialog
- Form fields: name, type (radio), area (autocomplete from existing areas), g12LeaderUid (Typeahead from G12 users)

**API:**
- `POST /cells` (NEW V2)
- `PATCH /cells/:id` (NEW V2)
- `POST /cells/:id/archive` (NEW V2)

**UI changes:**
- Use `<Typeahead>` (already exists) for `g12LeaderUid` — search calls `GET /users?roles=g12&search=`
- After create → redirect to the new cell's detail page
- After archive → return to cells list with toast

---

### 5. Direct add / remove members (Leader / G12 / Admin)

**What to integrate:**
- `(leader)/cells/[cellId]/members/page.tsx` — Members tab
- "Add members" button opens a dialog with `<Typeahead>` (search Members from `GET /users?roles=member&search=`)
- Multi-select → `POST /cells/:id/members { userUids: [...] }`
- Remove row × → `DELETE /cells/:id/members/:uid` with confirm
- Optimistic update + rollback on failure

**API:**
- `POST /cells/:id/members` (NEW V2)
- `DELETE /cells/:id/members/:uid` (NEW V2)

**UI changes:**
- Member row: avatar, displayName, "Remove" link
- Member count badge updates from server response (`memberCount`)

---

### 6. Member apply to join cell

**What to integrate:**
- "Apply to Join" CTA on the cells list & cell detail (Members only, when not already a member)
- Confirmation dialog with optional message textarea
- POST `/cells/:id/join-requests { message }`
- After 201 → toast + flip CTA to "Requested — waiting for admin"
- 409 `CELL_JOIN_REQUEST_PENDING` → toast "You already have a pending request for this cell"

**API:**
- `POST /cells/:id/join-requests` (NEW V2)

**UI changes:**
- "My Requests" page (built in Sprint 3) now also shows cell-join requests via `useCellJoinRequests().mine()` (new helper using `GET /role-requests/mine` — wait, that's role requests; cell join requests have a different endpoint)

> **Implementation note:** the API doc does not expose a "list my own cell-join requests" endpoint. To populate `/my-requests` for cell-join, the client must store request IDs locally after `POST /cells/:id/join-requests` (e.g. an array in Redux that survives page reloads via redux-persist) until the server adds a `GET /cells/join-requests/mine` endpoint. Flag this in the sprint review.

---

### 7. Admin cell join-request queue

**What to integrate:**
- New page `admin/cells/[cellId]/join-requests/page.tsx` (and super-admin mirror)
- `GET /cells/:id/join-requests?status=pending&cursor=...`
- Approve / reject dialogs with optional note
- After approval → cell's `memberCount` increments; row moves to Approved

**API:**
- `GET /cells/:id/join-requests` (NEW V2)
- `POST /cells/:id/join-requests/:rid/approve` (NEW V2)
- `POST /cells/:id/join-requests/:rid/reject` (NEW V2)

**UI changes:**
- Row shows requesterName, optional message, createdAt, status
- Approve note suggestion: "Welcome to the cell!"
- Same approve/reject dialog pattern as Sprint 3 role-request queue

**Files:**
- `src/application/hooks/useCellJoinRequests.ts` (NEW)
- `src/app/admin/cells/[cellId]/join-requests/page.tsx` (NEW)

---

## Files touched

```
src/application/hooks/useCells.ts                                       (NEW)
src/application/hooks/useCell.ts                                        (NEW)
src/application/hooks/useCellJoinRequests.ts                            (NEW)
src/app/(authed)/cells/page.tsx                                         (NEW)
src/app/(authed)/my-cells/page.tsx                                      (wire)
src/app/(authed)/my-cells/[cellId]/page.tsx                             (wire, read-only)
src/app/(leader)/cells/page.tsx                                         (wire)
src/app/(leader)/cells/[cellId]/page.tsx                                (wire)
src/app/(leader)/cells/[cellId]/edit/page.tsx                           (wire)
src/app/(leader)/cells/[cellId]/members/page.tsx                        (NEW)
src/app/(leader)/cells/new/page.tsx                                     (wire)
src/app/(g12)/cells/page.tsx                                            (NEW)
src/app/(g12)/cells/[cellId]/page.tsx                                   (NEW)
src/app/admin/cells/page.tsx                                            (NEW)
src/app/admin/cells/[cellId]/page.tsx                                   (NEW)
src/app/admin/cells/[cellId]/join-requests/page.tsx                     (NEW)
src/components/cells/CellCard.tsx                                       (NEW)
src/components/cells/CellMembersList.tsx                                (NEW)
src/components/cells/AddMembersDialog.tsx                               (NEW)
src/components/cells/ApplyToJoinDialog.tsx                              (NEW)
src/components/cells/CellForm.tsx                                       (NEW)
src/domain/types/Cell.ts                                                (NEW)
src/domain/types/CellJoinRequest.ts                                     (NEW)
src/messages/en.json                                                    (leader.cells.*, admin.cells.*, member.cells.*)
```

---

## Tests (per FR-T-001)

**Unit:**
- `useCells.test.ts` — happy path returns list; 403 returns empty + flag
- `useCellJoinRequests.test.ts` — optimistic approve / reject

**Integration (RTL):**
- `cells-list.test.tsx` — Member sees Apply button; Leader sees Create button
- `add-members-dialog.test.tsx` — Typeahead → multi-select → POST → roster updates
- `apply-to-join.test.tsx` — 409 surfaces inline

**E2E (Playwright):**
- `cell-flow.spec.ts` — Leader creates cell → Member applies → Admin approves → Member sees the cell in My Cells

---

## Checklist

- [ ] Cells list page reads `GET /cells` with role-scoping (all four roles)
- [ ] My Cells page calls `GET /cells/mine`
- [ ] Cell detail loads full roster via `GET /cells/:id`
- [ ] Create cell form posts `POST /cells`
- [ ] Edit cell form patches `PATCH /cells/:id`
- [ ] Archive cell confirmed and `POST /cells/:id/archive` called
- [ ] Add members dialog with Typeahead; bulk POST works
- [ ] Remove member confirms and DELETEs
- [ ] Apply to Join dialog posts `POST /cells/:id/join-requests`; 409 handled
- [ ] Admin join-requests queue paginated + filterable
- [ ] Approve / reject dialogs with note
- [ ] My Requests page surfaces own cell-join requests (local cache pattern documented)
- [ ] Tests written and green
