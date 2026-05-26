"use client";

import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";

interface Props {
  icon?: string;
  title: string;
  body: string;
  ctaLabel: string;
  onCta: () => void;
}

/**
 * "Want to enroll? Apply to become a Student." call-to-action banner shown
 * on Member home when the user has no pending role request.
 */
export function RoleBanner({ icon = "graduation-cap", title, body, ctaLabel, onCta }: Props) {
  return (
    <div className="role-banner">
      <div className="ico">
        <Icon name={icon} size={22} />
      </div>
      <div className="b-body">
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
      <Button size="sm" iconAfter="arrow-right" onClick={onCta}>
        {ctaLabel}
      </Button>
    </div>
  );
}
