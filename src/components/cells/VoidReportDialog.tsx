"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export function VoidReportDialog({ open, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState("");

  const submit = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
    setReason("");
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="modal-ico" style={{ color: "var(--color-error)" }}>
        <Icon name="alert-triangle" size={22} />
      </div>
      <h2>Void this report?</h2>
      <p>
        Voiding marks the report as invalid in cell history and analytics. Add a short reason so
        your G12 leader can audit it later.
      </p>
      <label
        className="label"
        style={{
          display: "block",
          fontFamily: "var(--font-body)",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--color-body-green)",
          marginTop: 12,
          marginBottom: 6,
          textAlign: "left",
        }}
      >
        Reason for voiding
      </label>
      <textarea
        rows={3}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g. Filed for the wrong week — refiling correctly."
        style={{
          width: "100%",
          padding: "10px 12px",
          border: "1px solid var(--color-stroke)",
          borderRadius: 10,
          fontFamily: "var(--font-body)",
          fontSize: 14,
          color: "var(--color-primary)",
          background: "#fff",
          resize: "vertical",
        }}
      />
      <div className="form-actions" style={{ justifyContent: "center", borderTop: "none", marginTop: 16 }}>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="destructive" icon="trash-2" disabled={!reason.trim()} onClick={submit}>
          Void report
        </Button>
      </div>
    </Modal>
  );
}
