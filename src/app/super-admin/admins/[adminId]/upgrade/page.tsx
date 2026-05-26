"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ADMINS_SEED } from "@/lib/mock/admins";
import { useAppDispatch } from "@/application/hooks/useAppDispatch";
import { pushToast } from "@/application/slices/uiSlice";
import { avatarUrl } from "@/lib/kit";

export default function UpgradeAdminPage() {
  const router = useRouter();
  const params = useParams<{ adminId: string }>();
  const dispatch = useAppDispatch();

  const admin = ADMINS_SEED.find((a) => a.id === Number(params.adminId)) ?? ADMINS_SEED[0];
  const [confirmed, setConfirmed] = useState(false);

  const handleUpgrade = () => {
    dispatch(
      pushToast({
        tone: "success",
        title: "Role upgraded",
        message: `${admin.name} has been upgraded to Super Admin.`,
      }),
    );
    router.push("/super-admin/admins");
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Upgrade Admin</h1>
          <div className="greeting">Upgrade this administrator to Super Admin.</div>
        </div>
        <Button variant="secondary" icon="arrow-left" onClick={() => router.back()}>
          Back
        </Button>
      </div>

      <div className="settings-card">
        <div className="avatar-row">
          <Avatar src={avatarUrl(admin.avatar)} size="xl" name={admin.name} />
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0 }}>{admin.name}</h2>
            <p className="settings-sub" style={{ margin: "4px 0 0" }}>
              {admin.email} · Current role: <b>Administrator</b>
            </p>
          </div>
          <div>
            {admin.status === "active" && <Badge tone="success">Active</Badge>}
            {admin.status === "invited" && <Badge tone="warning">Invited</Badge>}
            {admin.status === "suspended" && <Badge tone="error">Suspended</Badge>}
          </div>
        </div>
      </div>

      <div className="settings-card">
        <h2>Upgrade to Super Admin</h2>
        <p className="settings-sub">
          Super Admins have full platform access. They can manage all administrators, upgrade
          roles, and control all platform settings.
        </p>

        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
            padding: "14px 16px",
            background: "rgba(217, 119, 6, 0.06)",
            border: "1px solid rgba(217, 119, 6, 0.2)",
            borderRadius: 10,
            marginTop: 16,
            fontSize: 14,
            fontFamily: "var(--font-body)",
            color: "#92400e",
          }}
        >
          <Icon name="alert-triangle" size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            This action grants full administrative privileges. Only upgrade trusted administrators.
          </span>
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 20,
            cursor: "pointer",
            fontFamily: "var(--font-body)",
            fontSize: 14,
            color: "var(--color-primary)",
          }}
        >
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          I understand this will grant Super Admin access to {admin.name}.
        </label>

        <div className="form-actions" style={{ marginTop: 24 }}>
          <Button variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button icon="shield-check" disabled={!confirmed} onClick={handleUpgrade}>
            Upgrade to Super Admin
          </Button>
        </div>
      </div>
    </div>
  );
}
