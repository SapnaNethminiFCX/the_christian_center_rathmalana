"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ADMINS_SEED, SUPER_PERMISSIONS } from "@/lib/mock/admins";
import { useAppDispatch } from "@/application/hooks/useAppDispatch";
import { pushToast } from "@/application/slices/uiSlice";
import { avatarUrl } from "@/lib/kit";
import { cn } from "@/lib/cn";

export default function AdminDetailPage() {
  const router = useRouter();
  const params = useParams<{ adminId: string }>();
  const dispatch = useAppDispatch();
  const admin =
    ADMINS_SEED.find((a) => a.id === Number(params.adminId)) ?? ADMINS_SEED[0];
  const [perms, setPerms] = useState<string[]>(admin.perms);

  const togglePerm = (id: string) =>
    setPerms(perms.includes(id) ? perms.filter((p) => p !== id) : [...perms, id]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{admin.name}</h1>
          <div className="greeting">{admin.email}</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="secondary" icon="arrow-left" onClick={() => router.back()}>
            Back
          </Button>
        </div>
      </div>

      <div className="settings-card">
        <div className="avatar-row">
          <Avatar src={avatarUrl(admin.avatar)} size="xl" name={admin.name} />
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0 }}>{admin.name}</h2>
            <p className="settings-sub" style={{ margin: "4px 0 0" }}>
              {admin.role} · {admin.last}
            </p>
          </div>
          <div>
            {admin.status === "active" && <Badge tone="success">Active</Badge>}
            {admin.status === "invited" && <Badge tone="warning">Invited</Badge>}
            {admin.status === "suspended" && <Badge tone="error">Suspended</Badge>}
          </div>
        </div>
        <div className="form-grid two">
          <Input label="Full name" defaultValue={admin.name} />
          <Input label="Email" type="email" defaultValue={admin.email} />
          <Input label="Role" defaultValue={admin.role} />
          <Input label="MFA" defaultValue={admin.mfa ? "Enabled" : "Off"} disabled />
        </div>
      </div>

      <div className="settings-card">
        <h2>Permissions</h2>
        <p className="settings-sub">Adjust what this administrator can do.</p>
        <div className="perm-grid">
          {SUPER_PERMISSIONS.map((p) => {
            const on = perms.includes(p.id);
            return (
              <label key={p.id} className={cn("perm-card", on && "on")}>
                <input type="checkbox" checked={on} onChange={() => togglePerm(p.id)} />
                <div>
                  <div className="perm-label">{p.label}</div>
                  <div className="perm-hint">{p.hint}</div>
                </div>
              </label>
            );
          })}
        </div>
        <div className="form-actions">
          <Button variant="ghost" onClick={() => setPerms(admin.perms)}>
            Reset
          </Button>
          <Button
            icon="check"
            onClick={() =>
              dispatch(pushToast({ tone: "success", title: "Permissions updated" }))
            }
          >
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}
