"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";

interface Props {
  open: boolean;
  name: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function RejectModal({ open, name, onConfirm, onCancel }: Props) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    onConfirm(reason.trim());
    setReason("");
  };

  const handleCancel = () => {
    setReason("");
    onCancel();
  };

  return (
    <Modal open={open} onClose={handleCancel}>
      <div className="modal-ico">
        <Icon name="x-circle" size={22} />
      </div>
      <h2>Reject {name}?</h2>
      <p>
        The applicant will be notified by email. You can optionally include a reason.
      </p>
      <div className="field" style={{ textAlign: "left", marginTop: 8 }}>
        <label className="label" htmlFor="reject-reason">
          Reason <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span>
        </label>
        <textarea
          id="reject-reason"
          className="input"
          style={{ height: 90, paddingTop: 10, resize: "none" }}
          placeholder="e.g. Incomplete registration information."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
        />
        <span className="hint" style={{ textAlign: "right" }}>
          {reason.length} / 500
        </span>
      </div>
      <div className="form-actions" style={{ justifyContent: "center", borderTop: "none" }}>
        <Button variant="ghost" onClick={handleCancel}>
          Cancel
        </Button>
        <Button variant="destructive" icon="x-circle" onClick={handleConfirm}>
          Reject registration
        </Button>
      </div>
    </Modal>
  );
}
