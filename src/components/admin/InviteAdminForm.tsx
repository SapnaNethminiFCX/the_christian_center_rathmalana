"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SUPER_PERMISSIONS } from "@/lib/mock/admins";

export interface InvitePayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  perms: string[];
}

interface Props {
  onCancel: () => void;
  onSubmit: (p: InvitePayload) => void;
  submitting?: boolean;
}

export function InviteAdminForm({ onCancel, onSubmit, submitting }: Props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = () => {
    onSubmit({
      firstName,
      lastName,
      email,
      password,
      perms: SUPER_PERMISSIONS.map((p) => p.id),
    });
  };

  return (
    <div className="settings-card">
      <h2>Create admin account</h2>
      <p className="settings-sub">
        The account is active immediately. The admin must change their password on first sign-in.
      </p>
      <div className="form-grid two">
        <Input
          label="First name"
          placeholder="e.g. Sahan"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <Input
          label="Last name"
          placeholder="e.g. Wijeratne"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
        <Input
          label="Email"
          type="email"
          placeholder="name@edupath.org"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Initial password"
          type="password"
          placeholder="Temporary password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="form-actions">
        <Button variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button icon="user-plus" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Creating…" : "Create account"}
        </Button>
      </div>
    </div>
  );
}
