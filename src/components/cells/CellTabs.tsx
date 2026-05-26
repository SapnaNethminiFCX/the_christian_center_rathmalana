"use client";

import { Icon } from "@/components/ui/Icon";

export interface CellTab {
  id: string;
  label: string;
  icon: string;
  count?: number;
}

interface Props {
  tabs: CellTab[];
  active: string;
  onChange: (id: string) => void;
}

export function CellTabs({ tabs, active, onChange }: Props) {
  return (
    <div className="cd-tabs">
      {tabs.map((t) => (
        <button
          type="button"
          key={t.id}
          className={`cd-tab${active === t.id ? " active" : ""}`}
          onClick={() => onChange(t.id)}
        >
          <Icon name={t.icon} size={16} />
          {t.label}
          {typeof t.count === "number" && <span className="count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
