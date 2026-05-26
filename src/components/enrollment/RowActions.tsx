"use client";

import { Button } from "@/components/ui/Button";
import type { ApprovalStatus } from "@/application/hooks/useApprovalQueue";

interface Props {
  status: ApprovalStatus;
  onApprove: () => void;
  onReject: () => void;
}

export function RowActions({ status, onApprove, onReject }: Props) {
  if (status !== "pending") {
    return (
      <span className="muted" style={{ fontFamily: "var(--font-body)", fontSize: 12 }}>
        -
      </span>
    );
  }
  return (
    <div style={{ display: "inline-flex", gap: 6 }}>
      <Button size="sm" variant="primary" onClick={onApprove}>
        Approve
      </Button>
      <Button size="sm" variant="ghost" onClick={onReject}>
        Reject
      </Button>
    </div>
  );
}
