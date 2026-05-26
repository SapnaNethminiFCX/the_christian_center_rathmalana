import { createSlice, PayloadAction, nanoid } from "@reduxjs/toolkit";

export type ToastTone = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  tone: ToastTone;
  title: string;
  message?: string;
}

export interface ModalState {
  kind: string;
  payload?: unknown;
}

interface UiState {
  toasts: ToastItem[];
  modal: ModalState | null;
  sidebarCollapsed: boolean;
  /** Live counts shown in sidebar — kept in sync by approval queue hooks. */
  pendingRegistrations: number;
  pendingEnrollments: number;
  totalAdmins: number;
}

const initialState: UiState = {
  toasts: [],
  modal: null,
  sidebarCollapsed: false,
  pendingRegistrations: 0,
  pendingEnrollments: 0,
  totalAdmins: 0,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    pushToast: {
      reducer(state, action: PayloadAction<ToastItem>) {
        state.toasts.push(action.payload);
      },
      prepare(input: Omit<ToastItem, "id">) {
        return { payload: { id: nanoid(), ...input } };
      },
    },
    dismissToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    openModal(state, action: PayloadAction<ModalState>) {
      state.modal = action.payload;
    },
    closeModal(state) {
      state.modal = null;
    },
    setSidebarCollapsed(state, action: PayloadAction<boolean>) {
      state.sidebarCollapsed = action.payload;
    },
    setPendingRegistrations(state, action: PayloadAction<number>) {
      state.pendingRegistrations = action.payload;
    },
    setPendingEnrollments(state, action: PayloadAction<number>) {
      state.pendingEnrollments = action.payload;
    },
    setTotalAdmins(state, action: PayloadAction<number>) {
      state.totalAdmins = action.payload;
    },
  },
});

export const {
  pushToast,
  dismissToast,
  openModal,
  closeModal,
  setSidebarCollapsed,
  setPendingRegistrations,
  setPendingEnrollments,
  setTotalAdmins,
} = uiSlice.actions;
export default uiSlice.reducer;
