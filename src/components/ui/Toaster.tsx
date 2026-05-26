"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/application/hooks/useAppDispatch";
import { useAppSelector } from "@/application/hooks/useAppSelector";
import { dismissToast } from "@/application/slices/uiSlice";
import { Toast } from "./Toast";

const TOAST_TTL_MS = 2000;

export function Toaster() {
  const toasts = useAppSelector((s) => s.ui.toasts);
  const dispatch = useAppDispatch();
  const t = toasts[toasts.length - 1];

  useEffect(() => {
    if (!t) return;
    const id = window.setTimeout(() => dispatch(dismissToast(t.id)), TOAST_TTL_MS);
    return () => window.clearTimeout(id);
  }, [t, dispatch]);

  if (!t) return null;
  return (
    <Toast
      tone={t.tone}
      title={t.title}
      message={t.message}
      onDismiss={() => dispatch(dismissToast(t.id))}
    />
  );
}
