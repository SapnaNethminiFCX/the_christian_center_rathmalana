"use client";

import { useState } from "react";
import { useAppDispatch } from "./useAppDispatch";
import { pushToast } from "@/application/slices/uiSlice";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export function useApprovalQueue<T extends { id: number; status: ApprovalStatus }>(
  initial: T[],
  kind: string,
) {
  const dispatch = useAppDispatch();
  const [rows, setRows] = useState<T[]>(initial);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const toggle = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleAll = () =>
    setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.id)));

  const setStatus = (ids: number[], status: ApprovalStatus, label: string, body: string) => {
    setRows(rows.map((r) => (ids.includes(r.id) ? { ...r, status } : r)));
    setSelected(new Set());
    dispatch(
      pushToast({
        tone: status === "approved" ? "success" : "warning",
        title:
          ids.length === 1
            ? `${kind} ${label}`
            : `${ids.length} ${kind.toLowerCase()}s ${label}`,
        message: body,
      }),
    );
  };

  return {
    rows,
    selected,
    allChecked,
    toggle,
    toggleAll,
    approve: (ids: number[]) =>
      setStatus(ids, "approved", "approved", "The student has been emailed."),
    reject: (ids: number[]) =>
      setStatus(ids, "rejected", "rejected", "The student has been notified by email."),
  };
}
