import { createSlice, PayloadAction } from "@reduxjs/toolkit";

/**
 * Supported UI locales for the TCCR platform. English is the default and
 * always available; Sinhala and Tamil are translation work-in-progress.
 */
export type Locale = "en" | "si" | "ta";

export const SUPPORTED_LOCALES: Locale[] = ["en", "si", "ta"];
export const DEFAULT_LOCALE: Locale = "en";

const STORAGE_KEY = "edupath.locale";

function isLocale(v: unknown): v is Locale {
  return v === "en" || v === "si" || v === "ta";
}

/** Read the saved locale from localStorage (browser only). */
function readSavedLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return isLocale(v) ? v : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

interface LocaleState {
  current: Locale;
}

const initialState: LocaleState = {
  // Note: this default is overwritten on the client by Providers reading
  // localStorage on mount. The initial value matters only for SSR.
  current: DEFAULT_LOCALE,
};

const localeSlice = createSlice({
  name: "locale",
  initialState,
  reducers: {
    setLocale(state, action: PayloadAction<Locale>) {
      state.current = action.payload;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, action.payload);
        } catch {
          /* ignore */
        }
      }
    },
    /** Hydrate from localStorage — called once on app mount. */
    hydrateLocale(state) {
      state.current = readSavedLocale();
    },
  },
});

export const { setLocale, hydrateLocale } = localeSlice.actions;
export default localeSlice.reducer;
