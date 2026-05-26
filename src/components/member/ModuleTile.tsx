"use client";

import { Icon } from "@/components/ui/Icon";

export type ModuleTileVariant = "bs" | "cg";

interface PillLink {
  label: string;
  onClick: () => void;
  icon?: string;
}

interface Props {
  variant: ModuleTileVariant;
  label: string;
  title: string;
  body: string;
  glyph: string;
  pills?: PillLink[];
  onClick?: () => void;
}

/**
 * Bible School (.bs, dark gradient) or Cell Groups (.cg, lime gradient)
 * tile used on the Member home and similar dashboards. Whole tile is
 * clickable; pill row offers secondary actions.
 */
export function ModuleTile({ variant, label, title, body, glyph, pills, onClick }: Props) {
  return (
    <button
      type="button"
      className={`mod-tile ${variant}`}
      onClick={onClick}
      aria-label={title}
    >
      <div>
        <span className="label">{label}</span>
        <h2>{title}</h2>
        <p>{body}</p>
      </div>

      {pills && pills.length > 0 && (
        <div className="pill-row">
          {pills.map((p) => (
            <button
              type="button"
              key={p.label}
              onClick={(e) => {
                e.stopPropagation();
                p.onClick();
              }}
            >
              {p.label}
              {p.icon && <Icon name={p.icon} size={14} />}
            </button>
          ))}
        </div>
      )}

      <div className="glyph" aria-hidden="true">
        <Icon name={glyph} size={180} />
      </div>
    </button>
  );
}
