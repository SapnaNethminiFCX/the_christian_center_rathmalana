# Redux State Handling — EduPath

This file documents how Redux is structured in EduPath and the patterns to follow when adding new state. Read this before adding a new slice, modifying state, or wiring API responses into the store.

---

## 1. Stack

- **Redux Toolkit** (`@reduxjs/toolkit`) — handles store, slices, reducers
- **React Redux** (`react-redux`) — `<Provider>`, hooks
- **No RTK Query yet** — blueprint calls for it but not installed (will be added during integration)
- Store lives in `src/application/store/`
- Slices live in `src/application/slices/`
- Typed hooks live in `src/application/hooks/`

---

## 2. Directory layout

```
src/application/
├── store/
│   ├── index.ts          ← configureStore + RootState + AppDispatch types
│   └── rootReducer.ts    ← combines all slices
├── slices/
│   ├── uiSlice.ts        ← toasts, modal, sidebar
│   └── sessionSlice.ts   ← logged-in user + role
└── hooks/
    ├── useAppDispatch.ts ← typed dispatch hook
    ├── useAppSelector.ts ← typed selector hook
    ├── useApprovalQueue.ts ← generic approve/reject queue with optimistic updates
    └── useEnrollmentRequests.ts
```

The Redux `<Provider>` is mounted in `src/app/providers.tsx` and wraps the entire app via `RootLayout`.

---

## 3. Existing slices

### `uiSlice` — ephemeral UI state
- `toasts` — array of `ToastItem` (auto-ID via `nanoid`)
- `modal` — `{ kind, payload }` or `null`
- `sidebarCollapsed` — boolean

Actions: `pushToast`, `dismissToast`, `openModal`, `closeModal`, `setSidebarCollapsed`

### `sessionSlice` — current user + role
- `user` — `SessionUser | null` (name, email, avatar)
- `role` — `'student' | 'admin' | 'super_admin' | null`

Actions: `setUser`, `setRole`, `clearSession`

> ⚠️ `sessionSlice` is currently demo-seeded with a mock student so role-aware screens render without auth. This is replaced with real Firebase user data in Sprint 1.

---

## 4. Typed hooks — ALWAYS use these

**Never use raw `useDispatch` or `useSelector`. Always use the typed versions:**

```typescript
import { useAppDispatch } from "@/application/hooks/useAppDispatch";
import { useAppSelector } from "@/application/hooks/useAppSelector";

const dispatch = useAppDispatch();
const user = useAppSelector((s) => s.session.user);
```

This gives you full type safety against `RootState` and `AppDispatch`.

---

## 5. Adding a new slice — recipe

### Step 1: Define the slice (`src/application/slices/mySlice.ts`)

```typescript
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface MyItem {
  id: string;
  name: string;
}

interface MyState {
  items: MyItem[];
  loading: boolean;
  error: string | null;
}

const initialState: MyState = {
  items: [],
  loading: false,
  error: null,
};

const mySlice = createSlice({
  name: "my",
  initialState,
  reducers: {
    setItems(state, action: PayloadAction<MyItem[]>) {
      state.items = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
});

export const { setItems, setLoading, setError } = mySlice.actions;
export default mySlice.reducer;
```

### Step 2: Register in `rootReducer.ts`

```typescript
import myReducer from "@/application/slices/mySlice";

const rootReducer = combineReducers({
  ui: uiReducer,
  session: sessionReducer,
  my: myReducer,   // add here
});
```

### Step 3: Use in components

```typescript
const items = useAppSelector((s) => s.my.items);
const dispatch = useAppDispatch();
dispatch(setItems([...]));
```

---

## 6. Common patterns

### Pattern A — Action creator with `prepare` (auto-generate fields)

Use when you want the action to inject something like a generated ID or timestamp:

```typescript
pushToast: {
  reducer(state, action: PayloadAction<ToastItem>) {
    state.toasts.push(action.payload);
  },
  prepare(input: Omit<ToastItem, "id">) {
    return { payload: { id: nanoid(), ...input } };
  },
},
```

Caller code stays clean — no need to generate IDs at the call site:
```typescript
dispatch(pushToast({ tone: "success", title: "Saved" }));
```

### Pattern B — Selecting derived state in components

Compute derived state in the selector to avoid unnecessary re-renders:

```typescript
const unreadCount = useAppSelector((s) => s.notifications.items.filter(n => !n.readAt).length);
```

For expensive computations, use `reselect` (not yet installed — add when needed).

### Pattern C — Optimistic updates with rollback

See `useApprovalQueue.ts` for the existing pattern: update state immediately, fire API call, rollback on failure.

```typescript
// Pseudocode
const optimisticApprove = async (id: string) => {
  dispatch(removeFromQueue(id));        // optimistic
  try {
    await api.approve(id);              // real call
  } catch (err) {
    dispatch(restoreToQueue(id));       // rollback
    dispatch(pushToast({ tone: "error", title: "Failed" }));
  }
};
```

---

## 7. Mutating state — Immer is built in

RTK uses Immer under the hood, so you can write **mutating-looking** code safely. Both styles work:

```typescript
// ✅ Mutating (preferred — concise)
addItem(state, action) {
  state.items.push(action.payload);
}

// ✅ Returning new state (also valid)
addItem(state, action) {
  return { ...state, items: [...state.items, action.payload] };
}
```

**Stick with the mutating style** — that's the convention in this project.

---

## 8. Rules — strict

1. **Never store derived data in state.** Compute it in selectors.
2. **Never store non-serializable values** (functions, class instances, Firebase user objects). Store IDs/tokens only.
3. **Never call dispatch in a selector** — selectors are pure read-only.
4. **Always type the payload** — use `PayloadAction<T>` for every reducer.
5. **Never `useState` for global concerns** — toast count, current user, modal state all go in Redux.
6. **Local form state stays local** — don't put form input values in Redux unless they need cross-component sharing.

---

## 9. Working with async (current approach — no RTK Query yet)

Until RTK Query is wired up, async API calls live inside custom hooks:

```typescript
// src/application/hooks/useApprovalQueue.ts pattern
export function useApprovalQueue<T extends { id: string }>(items: T[]) {
  const dispatch = useAppDispatch();
  const [list, setList] = useState(items);
  const [loading, setLoading] = useState(false);

  const approve = async (id: string) => {
    setLoading(true);
    try {
      // await api.approve(id);  ← will be added in integration sprints
      setList((prev) => prev.filter((x) => x.id !== id));
      dispatch(pushToast({ tone: "success", title: "Approved" }));
    } catch (err) {
      dispatch(pushToast({ tone: "error", title: "Failed", message: String(err) }));
    } finally {
      setLoading(false);
    }
  };

  return { list, loading, approve };
}
```

> When RTK Query is added in integration, async API calls move there. Hooks like `useApprovalQueue` become thin wrappers around RTK Query mutations.

---

## 10. Future — RTK Query (planned)

RTK Query will live at `src/application/api/` (currently empty placeholder). It will:
- Replace manual fetch wrappers
- Auto-cache responses
- Auto-invalidate after mutations
- Provide generated hooks like `useGetCoursesQuery()`, `useApproveRegistrationMutation()`

Until that's in place, keep using slices + custom hooks for async.

---

## 11. Sprint 1 changes — heads up

When you wire up real auth (Sprint 1), `sessionSlice` will be modified to hold:

```typescript
interface SessionState {
  uid: string | null;
  email: string | null;
  role: 'student' | 'admin' | 'super_admin' | null;
  roles: string[];
  status: 'pending_approval' | 'approved' | 'rejected' | 'suspended' | null;
  firstName: string | null;
  lastName: string | null;
  profilePhotoUrl: string | null;
  token: string | null;
  loading: boolean;
}
```

The current demo seed will be removed. Components using `state.session.user.name` will need to be updated to use `state.session.firstName + lastName` or a `displayName` selector.

---

## 12. Debugging

- Install Redux DevTools browser extension — `configureStore` enables it automatically in development
- Use `console.log(store.getState())` for one-off inspection
- Action names appear in DevTools as `slice/action` (e.g., `session/setUser`)

---

## Quick reference cheat sheet

```typescript
// Read state
const value = useAppSelector((s) => s.slice.field);

// Dispatch action
const dispatch = useAppDispatch();
dispatch(actionName(payload));

// Define new slice
const slice = createSlice({ name, initialState, reducers });

// Export actions + reducer
export const { ...actions } = slice.actions;
export default slice.reducer;
```
