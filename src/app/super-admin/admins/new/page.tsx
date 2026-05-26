"use client";

import { useRouter } from "next/navigation";
import { InviteAdminForm } from "@/components/admin/InviteAdminForm";
import { useAppDispatch } from "@/application/hooks/useAppDispatch";
import { pushToast } from "@/application/slices/uiSlice";

export default function NewAdminPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Invite admin</h1>
          <div className="greeting">Send an invite with role-scoped permissions.</div>
        </div>
      </div>
      <InviteAdminForm
        onCancel={() => router.push("/super-admin/admins")}
        onSubmit={({ firstName, lastName, email }) => {
          const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
          dispatch(
            pushToast({
              tone: "success",
              title: "Admin created",
              message: `${fullName || email} can sign in immediately.`,
            }),
          );
          setTimeout(() => router.push("/super-admin/admins"), 600);
        }}
      />
    </div>
  );
}
