"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useAppDispatch } from "@/application/hooks/useAppDispatch";
import { useAppSelector } from "@/application/hooks/useAppSelector";
import { setLocale, type Locale } from "@/application/slices/localeSlice";

export type LanguageCode = "EN" | "SI" | "TA";

const LANGS: { id: LanguageCode; locale: Locale; label: string; native: string }[] = [
  { id: "EN", locale: "en", label: "English",  native: "EN" },
  { id: "SI", locale: "si", label: "සිංහල",   native: "සි" },
  { id: "TA", locale: "ta", label: "தமிழ்",  native: "த" },
];

const LOCALE_TO_CODE: Record<Locale, LanguageCode> = { en: "EN", si: "SI", ta: "TA" };

interface Props {
  /** Override the active language (otherwise read from Redux locale). */
  current?: LanguageCode;
  /** Optional extra hook when the user picks a language (in addition to the
   *  built-in Redux dispatch that flips the active locale). */
  onChange?: (code: LanguageCode) => void;
  dark?: boolean;
}

/**
 * Language switcher wired to the Redux `locale` slice. Clicking an option
 * dispatches `setLocale`, which persists to localStorage AND re-renders the
 * <NextIntlClientProvider> with the new catalogue. The change is reflected
 * across the whole tree without a page reload.
 */
export function LanguageSwitcher({ current, onChange, dark }: Props) {
  const dispatch = useAppDispatch();
  const reduxLocale = useAppSelector((s) => s.locale.current);
  const fallbackCode = LOCALE_TO_CODE[reduxLocale];
  const [open, setOpen] = useState(false);
  const [cur, setCur] = useState<LanguageCode>(current ?? fallbackCode);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Keep local state in sync with whichever source of truth is in play.
  useEffect(() => {
    setCur(current ?? fallbackCode);
  }, [current, fallbackCode]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const active = LANGS.find((l) => l.id === cur) ?? LANGS[0];

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Choose language"
        aria-expanded={open}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          borderRadius: 9999,
          // Use the theme surface variables so the pill stays readable in
          // both light and dark. Previously hardcoded #fff bg + a text colour
          // that flipped white in dark mode produced an invisible pill.
          border: `1px solid ${dark ? "rgba(255,255,255,0.16)" : "var(--color-stroke)"}`,
          background: dark ? "rgba(255,255,255,0.06)" : "var(--color-surface)",
          color: "var(--color-primary)",
          fontFamily: "var(--font-body)",
          fontWeight: 600,
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        <Icon name="globe" size={14} />
        {active.label}
        <Icon name="chevron-down" size={12} />
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 20,
            minWidth: 160,
            background: "var(--color-surface)",
            border: "1px solid var(--color-stroke)",
            borderRadius: 12,
            boxShadow: "0 8px 24px -8px rgba(21,42,36,0.18)",
            padding: 6,
          }}
        >
          {LANGS.map((l) => (
            <button
              type="button"
              role="menuitem"
              key={l.id}
              onClick={() => {
                setCur(l.id);
                setOpen(false);
                dispatch(setLocale(l.locale));
                onChange?.(l.id);
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px",
                borderRadius: 8,
                border: 0,
                background: "transparent",
                color: "var(--color-primary)",
                fontFamily: "var(--font-body)",
                fontWeight: 500,
                fontSize: 13,
                cursor: "pointer",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "var(--color-stroke-2)")}
              onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span>{l.label}</span>
              {cur === l.id && <Icon name="check" size={14} style={{ color: "var(--color-success-deep)" }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
