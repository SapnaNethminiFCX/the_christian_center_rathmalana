"use client";

import { Icon } from "@/components/ui/Icon";

interface Props {
  value: 1 | 2 | 3 | 4 | 5;
  onChange?: (v: 1 | 2 | 3 | 4 | 5) => void;
  size?: number;
  readonly?: boolean;
}

export function SatisfactionStars({ value, onChange, size = 24, readonly }: Props) {
  return (
    <div className="rf-stars">
      {([1, 2, 3, 4, 5] as const).map((i) => (
        <button
          type="button"
          key={i}
          className={i <= value ? "on" : ""}
          onClick={readonly ? undefined : () => onChange?.(i)}
          aria-label={`${i} star${i === 1 ? "" : "s"}`}
          disabled={readonly}
        >
          <Icon name="star" size={size} />
        </button>
      ))}
    </div>
  );
}
