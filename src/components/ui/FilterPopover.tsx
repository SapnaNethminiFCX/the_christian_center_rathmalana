"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./Button";

export interface FilterOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  title?: string;
  options: ReadonlyArray<FilterOption<T>>;
  selected: ReadonlyArray<T>;
  onChange: (next: T[]) => void;
}

export function FilterPopover<T extends string>({
  title = "Status",
  options,
  selected,
  onChange,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const toggle = (v: T) => {
    if (selected.includes(v)) onChange(selected.filter((x) => x !== v));
    else onChange([...selected, v]);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <Button variant="secondary" icon="filter" onClick={() => setOpen((v) => !v)}>
        Filter
        {selected.length > 0 && selected.length < options.length ? ` · ${selected.length}` : ""}
      </Button>
      {open && (
        <div className="filter-pop">
          <div className="filter-title">{title}</div>
          {options.map((o) => (
            <label key={o.value}>
              <input
                type="checkbox"
                checked={selected.includes(o.value)}
                onChange={() => toggle(o.value)}
              />
              {o.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
