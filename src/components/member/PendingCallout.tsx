"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

interface Props {
  title?: string;
  body: string;
  linkLabel?: string;
  linkHref?: string;
}

/**
 * Yellow-tinted callout shown when the user has a pending role request
 * waiting for admin review.
 */
export function PendingCallout({ title = "Application in review", body, linkLabel, linkHref }: Props) {
  return (
    <div className="pending-callout">
      <div className="ico">
        <Icon name="clock" size={20} />
      </div>
      <div className="b-body">
        <b>{title}.</b> {body}
        {linkLabel && linkHref && (
          <>
            {" "}
            <Link href={linkHref} style={{ color: "var(--color-warning)", fontWeight: 600 }}>
              {linkLabel} →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
