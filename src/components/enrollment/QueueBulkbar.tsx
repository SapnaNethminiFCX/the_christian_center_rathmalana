"use client";

import { Button } from "@/components/ui/Button";

interface Props {
  selectedCount: number;
  onApprove: () => void;
  onReject: () => void;
  onCancel: () => void;
}

export function QueueBulkbar({ selectedCount, onApprove, onReject, onCancel }: Props) {
  return (
    <div className="tbl-bulkbar">
      <span>
        <b>{selectedCount}</b> selected
      </span>
      <div style={{ display: "flex", gap: 8 }}>
        <Button size="sm" variant="primary" icon="check" onClick={onApprove}>
          Approve all
        </Button>
        <Button size="sm" variant="destructive" icon="x" onClick={onReject}>
          Reject all
        </Button>
        <button
          onClick={onCancel}
          style={{
            background: "transparent",
            border: "none",
            color: "rgba(255,255,255,0.6)",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
