"use client";

import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";

interface Props {
  title: string;
  body: string;
  ctaLabel: string;
  onCta: () => void;
  icon?: string;
  /** Icon attached to the CTA button. Defaults to up-right (matches prototype). */
  ctaIcon?: string;
}

/**
 * Dark "switch surface" banner — used on /my-cells (member view) and on
 * /cells (leader view) when the user also holds a higher leadership role
 * and could be operating in a richer surface.
 *
 * Markup mirrors src/ui_structure/v2/project/tccr-screens-cells.jsx lines 55-65.
 */
export function SwitchBanner({ title, body, ctaLabel, onCta, icon = "shield-check", ctaIcon = "arrow-up-right" }: Props) {
  return (
    <div className="switch-banner">
      <div className="ico">
        <Icon name={icon} size={22} />
      </div>
      <div className="b-body">
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
      <Button size="md" icon={ctaIcon} onClick={onCta}>
        {ctaLabel}
      </Button>
    </div>
  );
}
