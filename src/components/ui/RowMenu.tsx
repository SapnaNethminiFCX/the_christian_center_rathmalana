"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

export interface RowMenuItem {
  label: string;
  ico: string;
  onClick: () => void;
  danger?: boolean;
}

interface Props {
  items: RowMenuItem[];
  ariaLabel?: string;
}

export function RowMenu({ items, ariaLabel = "Row actions" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const onItemClick = (item: RowMenuItem) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(false);
    item.onClick();
  };

  return (
    <div ref={ref} className="row-menu-wrap">
      <button
        className="btn btn--ghost btn--sm"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <Icon name="more-horizontal" size={16} />
      </button>
      {open && (
        <div className="row-menu" role="menu">
          {items.map((it, i) => (
            <button
              key={i}
              role="menuitem"
              className={it.danger ? "danger" : undefined}
              onClick={onItemClick(it)}
            >
              <Icon name={it.ico} size={14} /> {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
