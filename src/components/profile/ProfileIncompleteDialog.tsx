"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";

interface ProfileIncompleteDialogProps {
  open: boolean;
  onSkip: () => void;
  onClose: () => void;
}

export function ProfileIncompleteDialog({
  open,
  onSkip,
  onClose,
}: ProfileIncompleteDialogProps) {
  const router = useRouter();

  return (
    <Modal open={open} onClose={onClose}>
      <div className="modal-ico">
        <Icon name="alert-triangle" size={22} />
      </div>
      <h2>Complete your profile first</h2>
      <p>
        Your account profile is incomplete. Applications submitted without
        address, date of birth, gender and educational qualifications may be
        rejected by the admin.
      </p>
      <div
        className="form-actions"
        style={{ justifyContent: "center", borderTop: "none" }}
      >
        <Button variant="ghost" onClick={onSkip}>
          Skip &amp; continue
        </Button>
        <Button
          icon="user"
          onClick={() => {
            onClose();
            router.push("/profile");
          }}
        >
          Fill profile
        </Button>
      </div>
    </Modal>
  );
}
