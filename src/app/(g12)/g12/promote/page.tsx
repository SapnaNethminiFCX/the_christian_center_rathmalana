"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AddNewMemberDialog, type AddNewMemberPayload } from "@/components/admin/AddNewMemberDialog";
import { RoleBadgeStack } from "@/components/user/RoleBadgeStack";
import { useAppDispatch } from "@/application/hooks/useAppDispatch";
import { useAppSelector } from "@/application/hooks/useAppSelector";
import { pushToast } from "@/application/slices/uiSlice";
import { apiRequest, ApiRequestError } from "@/infrastructure/api/request";

interface UserRow {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  status?: string;
  profilePhotoUrl?: string | null;
  roles?: string[];
  createdAt?: string;
}

interface PagedResponse {
  items: UserRow[];
  nextCursor: string | null;
  total: number;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const PAGE_SIZE = 25;

export default function G12PromotePage() {
  const dispatch = useAppDispatch();
  const sessionUser = useAppSelector((s) => s.session.user);

  const [allUsers, setAllUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [promoting, setPromoting] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ uid: string; name: string; role: "leader" | "g12" } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addBusy, setAddBusy] = useState(false);

  // V2 POST /auth/register — public endpoint that creates a new account
  // with the requested role + emails credentials/reset link to the user.
  const handleAddNewMember = async (payload: AddNewMemberPayload) => {
    setAddBusy(true);
    try {
      await apiRequest("/auth/register", {
        method: "POST",
        auth: false,
        body: {
          firstName: payload.firstName,
          lastName: payload.lastName,
          email: payload.email,
          password: payload.password,
          role: payload.role,
          preferredLanguage: "en",
        },
      });
      dispatch(pushToast({
        tone: "success",
        title: "Member created",
        message: `Invite emailed to ${payload.email}.`,
      }));
      setAddOpen(false);
      // The created user already holds the assigned Leader/G12 role so they
      // won't appear on this Members-only list; no refresh needed.
    } catch (err) {
      let title = "Couldn't create member";
      let message: string | undefined;
      if (err instanceof ApiRequestError) {
        if (err.status === 409) { title = "Email already registered"; message = err.message; }
        else if (err.status === 403) { title = "Not permitted"; message = err.message; }
        else if (err.status === 400) { title = "Validation error"; message = err.message; }
        else if (err.message) message = err.message;
      }
      dispatch(pushToast({ tone: "warning", title, message }));
    } finally {
      setAddBusy(false);
    }
  };

  useEffect(() => {
    if (!sessionUser) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const collected: UserRow[] = [];
        let cursor: string | undefined;
        for (let i = 0; i < 20; i++) {
          // List only Members — no Leaders, G12s, Admins, or Super Admins.
          const params = new URLSearchParams({ roles: "member", limit: "100" });
          if (cursor) params.append("cursor", cursor);
          const data = await apiRequest<PagedResponse>(`/users?${params}`);
          collected.push(...(data.items ?? []));
          cursor = data.nextCursor ?? undefined;
          if (!cursor) break;
        }
        // Belt-and-braces — drop anyone with elevated roles in case the
        // backend's role filter returns supersets.
        const onlyMembers = collected.filter((u) => {
          const roles = u.roles ?? [];
          return !roles.includes("leader")
              && !roles.includes("g12")
              && !roles.includes("admin")
              && !roles.includes("super_admin");
        });
        if (!cancelled) setAllUsers(onlyMembers);
      } catch (err) {
        if (err instanceof ApiRequestError && err.status !== 401) {
          dispatch(pushToast({ tone: "warning", title: "Failed to load members" }));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sessionUser, dispatch]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allUsers;
    return allUsers.filter((u) =>
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q),
    );
  }, [allUsers, query]);

  useEffect(() => { setPage(0); }, [query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const rows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const runPromote = async (uid: string, role: "leader" | "g12") => {
    setPromoting(uid);
    try {
      const updated = await apiRequest<{ roles?: string[] } | undefined>(`/users/${uid}/roles`, {
        method: "PATCH",
        body: { role, action: "add" },
      });
      setAllUsers((prev) =>
        prev.map((u) =>
          u.uid === uid
            ? { ...u, roles: updated?.roles ?? [...new Set([...(u.roles ?? []), role])] }
            : u,
        ),
      );
      dispatch(pushToast({
        tone: "success",
        title: role === "g12" ? "Promoted to G12 Leader" : "Promoted to Leader",
      }));
    } catch (err) {
      let title = "Promote failed";
      let message: string | undefined;
      if (err instanceof ApiRequestError) {
        if (err.status === 403) title = "Not permitted";
        else if (err.status === 409) { title = "Role conflict"; message = err.message; }
        else if (err.message) message = err.message;
      }
      dispatch(pushToast({ tone: "warning", title, message }));
    } finally {
      setPromoting(null);
      setConfirm(null);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Promote a member</h1>
          <div className="greeting">
            <b style={{ color: "var(--color-primary)" }}>{loading ? "…" : allUsers.length}</b> members eligible for promotion.
            Promote a Member to Leader or G12 here — roles are additive, so members keep their existing access.
          </div>
        </div>
        <Button icon="user-plus" onClick={() => setAddOpen(true)}>
          Add a new member
        </Button>
      </div>

      <div className="role-banner">
        <div className="ico">
          <Icon name="info" size={20} />
        </div>
        <div className="b-body">
          <h3>How promotions work</h3>
          <p>
            Members ask a pastor or G12 leader in person to become a Leader or G12. You then
            add the role here — roles are additive (the user keeps Member access).
          </p>
        </div>
      </div>

      <div className="audit-toolbar">
        <div className="audit-search">
          <Icon name="search" size={16} />
          <input
            placeholder="Search by name or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="tbl-card">
        <table className="tbl" style={{ tableLayout: "fixed", width: "100%" }}>
          <colgroup>
            <col style={{ width: "30%" }} />
            <col style={{ width: "22%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "24%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>User</th>
              <th>Roles</th>
              <th>Status</th>
              <th>Joined</th>
              <th style={{ textAlign: "right" }}>Promote</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 40 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--color-muted)" }}>
                    <Icon name="loader" size={18} />
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 14 }}>Loading…</span>
                  </div>
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <div className="empty">
                    <h3>No members found</h3>
                    <p>{query ? "Try a different search term." : "No promotable members yet."}</p>
                  </div>
                </td>
              </tr>
            )}
            {rows.map((u) => {
              const fullName = `${u.firstName} ${u.lastName}`.trim();
              // V2 spec: every authed user holds `member` at minimum.
              const rawRoles = u.roles && u.roles.length > 0 ? u.roles : ["member"];
              const roles = rawRoles.includes("member") ? rawRoles : [...rawRoles, "member"];
              const hasLeader = roles.includes("leader");
              const hasG12 = roles.includes("g12");
              const isSuspended = u.status === "suspended";
              const showLeaderBtn = !hasLeader && !hasG12;
              // A user who already holds the Leader role is promoted to G12
              // from the dedicated /g12/network page, not from here. Keeping
              // the button on this page caused two paths to the same action
              // and risked the wrong row being promoted.
              const showG12Btn = !hasG12 && !hasLeader;
              const isThisRowPromoting = promoting === u.uid;
              const promoteDisabled = isThisRowPromoting || isSuspended;
              const suspendedTitle = isSuspended ? "Reactivate the user before promoting" : undefined;

              return (
                <tr key={u.uid}>
                  <td>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <Avatar src={u.profilePhotoUrl ?? undefined} size="sm" name={fullName || u.uid} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {fullName || u.uid.slice(0, 12) + "…"}
                        </div>
                        <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-body-green)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {u.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <RoleBadgeStack roles={roles} />
                  </td>
                  <td>
                    {isSuspended
                      ? <Badge tone="error">Suspended</Badge>
                      : <Badge tone="success">Active</Badge>}
                  </td>
                  <td className="muted">{formatDate(u.createdAt)}</td>
                  <td style={{ textAlign: "right" }} title={suspendedTitle}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end", minWidth: 220 }}>
                      {showLeaderBtn ? (
                        <Button size="sm" variant="ghost" icon="chevron-up" disabled={promoteDisabled}
                          onClick={() => setConfirm({ uid: u.uid, name: fullName || u.uid, role: "leader" })}>
                          {isThisRowPromoting ? "…" : "Make Leader"}
                        </Button>
                      ) : (
                        <span style={{ display: "inline-block", minWidth: 110 }} />
                      )}
                      {showG12Btn ? (
                        <Button size="sm" icon="chevron-up" disabled={promoteDisabled}
                          onClick={() => setConfirm({ uid: u.uid, name: fullName || u.uid, role: "g12" })}>
                          {isThisRowPromoting ? "…" : "Make G12"}
                        </Button>
                      ) : (
                        <span style={{ display: "inline-block", minWidth: 90 }} />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length > PAGE_SIZE && (
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 16px",
            borderTop: "1px solid var(--color-stroke)",
            fontFamily: "var(--font-body)",
            fontSize: 13,
            color: "var(--color-body-green)",
            flexWrap: "wrap",
            gap: 10,
          }}>
            <span>
              Showing <b>{safePage * PAGE_SIZE + 1}</b>–<b>{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)}</b> of <b>{filtered.length}</b>
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <Button size="sm" variant="secondary" icon="chevron-left" disabled={safePage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                Previous
              </Button>
              <Button size="sm" variant="secondary" iconAfter="chevron-right" disabled={safePage >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirm}
        title={
          confirm?.role === "g12"
            ? `Promote ${confirm?.name} to G12 Leader?`
            : `Promote ${confirm?.name ?? ""} to Leader?`
        }
        message={
          confirm
            ? `This adds the ${confirm.role === "g12" ? "G12" : "Leader"} role to ${confirm.name}. Roles are additive — they keep their existing access.`
            : undefined
        }
        confirmLabel={confirm?.role === "g12" ? "Yes, promote to G12" : "Yes, promote to Leader"}
        onConfirm={() => { if (confirm) runPromote(confirm.uid, confirm.role); }}
        onCancel={() => setConfirm(null)}
      />

      <AddNewMemberDialog
        open={addOpen}
        busy={addBusy}
        allowedRoles={["leader", "g12"]}
        onCancel={() => setAddOpen(false)}
        onSubmit={handleAddNewMember}
      />
    </div>
  );
}
