"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { InviteAdminForm, type InvitePayload } from "@/components/admin/InviteAdminForm";
import { Icon } from "@/components/ui/Icon";
import { useAppDispatch } from "@/application/hooks/useAppDispatch";
import { useAppSelector } from "@/application/hooks/useAppSelector";
import { pushToast, setTotalAdmins } from "@/application/slices/uiSlice";
import { apiRequest, ApiRequestError } from "@/infrastructure/api/request";

interface AdminUser {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  role?: string;
  roles?: string[];
  profilePhotoUrl?: string | null;
  createdAt?: string;
}

interface PagedResponse {
  items: AdminUser[];
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

export default function SuperAdminAdminsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const sessionUser = useAppSelector((s) => s.session.user);

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [toRemove, setToRemove] = useState<AdminUser | null>(null);
  const [toSuspend, setToSuspend] = useState<AdminUser | null>(null);
  const [toReactivate, setToReactivate] = useState<AdminUser | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const flash = useCallback((tone: "success" | "warning", title: string, message?: string) =>
    dispatch(pushToast({ tone, title, message })), [dispatch]);

  /* ── Fetch all admins ─────────────────────────────────────────────── */

  const fetchAll = useCallback(async () => {
    if (!sessionUser) return;
    setLoading(true);
    try {
      const collected: AdminUser[] = [];
      let cursor: string | undefined;
      let primaryTotal = 0;
      for (let i = 0; i < 20; i++) {
        const params = new URLSearchParams({ limit: "100" });
        if (cursor) params.append("cursor", cursor);
        const data = await apiRequest<PagedResponse>(`/super-admin/admins?${params}`);
        collected.push(...(data.items ?? []));
        primaryTotal = data.total ?? primaryTotal;
        cursor = data.nextCursor ?? undefined;
        if (!cursor) break;
      }

      // Fallback: the /super-admin/admins endpoint sometimes returns an empty
      // `items` array while `total` reports 30+ admins. When that happens, fall
      // back to /users filtered to admin/super_admin role membership.
      if (collected.length === 0 && primaryTotal > 0) {
        const fallback: AdminUser[] = [];
        let cur: string | undefined;
        for (let i = 0; i < 20; i++) {
          const params = new URLSearchParams({ limit: "100" });
          if (cur) params.append("cursor", cur);
          const data = await apiRequest<PagedResponse>(`/users?${params}`);
          const adminsOnly = (data.items ?? []).filter((u) => {
            const roles = u.roles ?? (u.role ? [u.role] : []);
            return roles.includes("admin") || roles.includes("super_admin");
          });
          fallback.push(...adminsOnly);
          cur = data.nextCursor ?? undefined;
          if (!cur) break;
        }
        setAdmins(fallback);
        dispatch(setTotalAdmins(fallback.length));
      } else {
        setAdmins(collected);
        dispatch(setTotalAdmins(collected.length));
      }
    } catch (err) {
      if (err instanceof ApiRequestError && err.status !== 401) {
        flash("warning", "Failed to load administrators");
      }
    } finally {
      setLoading(false);
    }
  }, [sessionUser, flash, dispatch]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Filtered list ─────────────────────────────────────────────────── */

  const filteredAdmins = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return admins;
    return admins.filter((a) =>
      `${a.firstName} ${a.lastName}`.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q),
    );
  }, [admins, query]);

  // Reset to first page when the search narrows the list.
  useEffect(() => { setPage(0); }, [query]);

  const totalPages = Math.max(1, Math.ceil(filteredAdmins.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pagedAdmins = filteredAdmins.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  /* ── Create admin ──────────────────────────────────────────────────── */

  const submit = async (p: InvitePayload) => {
    if (!p.firstName.trim() || !p.lastName.trim() || !p.email.trim() || !p.password) {
      flash("warning", "Missing details", "First name, last name, email and password are required.");
      return;
    }
    setCreating(true);
    try {
      const created = await apiRequest<AdminUser>(`/super-admin/admins`, {
        method: "POST",
        body: {
          firstName: p.firstName.trim(),
          lastName: p.lastName.trim(),
          email: p.email.trim(),
          initialPassword: p.password,
        },
      });
      setAdmins((prev) => {
        const next = [created, ...prev];
        dispatch(setTotalAdmins(next.length));
        return next;
      });
      flash("success", "Admin account created", `${created.firstName} ${created.lastName} can sign in immediately.`);
      setShowForm(false);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.status === 409 && err.code === "EMAIL_EXISTS") {
          flash("warning", "Email already in use", "Another account uses this email.");
        } else {
          flash("warning", "Failed to create admin", err.message);
        }
      }
    } finally {
      setCreating(false);
    }
  };

  /* ── Suspend / Reactivate / Delete ─────────────────────────────────── */

  const confirmSuspend = async () => {
    if (!toSuspend) return;
    setActionBusy(true);
    try {
      await apiRequest(`/super-admin/admins/${toSuspend.uid}/suspend`, { method: "POST" });
      setAdmins((prev) => prev.map((a) => a.uid === toSuspend.uid ? { ...a, status: "suspended" } : a));
      flash("warning", "Admin suspended", `${toSuspend.firstName} ${toSuspend.lastName}'s access has been revoked.`);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 409) {
        flash("warning", "Already suspended");
        setAdmins((prev) => prev.map((a) => a.uid === toSuspend.uid ? { ...a, status: "suspended" } : a));
      } else {
        flash("warning", "Failed to suspend");
      }
    } finally {
      setActionBusy(false);
      setToSuspend(null);
    }
  };

  const confirmReactivate = async () => {
    if (!toReactivate) return;
    setActionBusy(true);
    try {
      await apiRequest(`/super-admin/admins/${toReactivate.uid}/reactivate`, { method: "POST" });
      setAdmins((prev) => prev.map((a) => a.uid === toReactivate.uid ? { ...a, status: "approved" } : a));
      flash("success", "Admin reactivated", `${toReactivate.firstName} ${toReactivate.lastName} can sign in again.`);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 409) {
        flash("warning", "Already active");
        setAdmins((prev) => prev.map((a) => a.uid === toReactivate.uid ? { ...a, status: "approved" } : a));
      } else {
        flash("warning", "Failed to reactivate");
      }
    } finally {
      setActionBusy(false);
      setToReactivate(null);
    }
  };

  const confirmRemove = async () => {
    if (!toRemove) return;
    setActionBusy(true);
    try {
      await apiRequest(`/super-admin/admins/${toRemove.uid}`, { method: "DELETE" });
      setAdmins((prev) => {
        const next = prev.filter((a) => a.uid !== toRemove.uid);
        dispatch(setTotalAdmins(next.length));
        return next;
      });
      flash("success", "Admin deleted", `${toRemove.firstName} ${toRemove.lastName}'s account has been permanently removed.`);
    } catch {
      flash("warning", "Failed to delete admin");
    } finally {
      setActionBusy(false);
      setToRemove(null);
    }
  };

  const pendingCount = admins.filter((a) => a.status === "suspended").length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Administrators</h1>
          <div className="greeting">
            <b style={{ color: "var(--color-primary)" }}>
              {loading && admins.length === 0 ? "…" : admins.length}
            </b>{" "}
            total{pendingCount > 0 && <> · {pendingCount} suspended</>}
          </div>
        </div>
        <Button icon="user-plus" onClick={() => setShowForm(true)} disabled={showForm}>
          Add admin
        </Button>
      </div>

      {showForm && (
        <InviteAdminForm
          onCancel={() => setShowForm(false)}
          onSubmit={submit}
          submitting={creating}
        />
      )}

      <div className="audit-toolbar">
        <div className="audit-search">
          <Icon name="search" size={16} />
          <input
            placeholder="Search by name or email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="tbl-card">
        <table className="tbl">
          <thead>
            <tr>
              <th>Person</th>
              <th>Status</th>
              <th>Created</th>
              <th style={{ textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && admins.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: 40 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--color-muted)" }}>
                    <Icon name="loader" size={18} />
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 14 }}>Loading…</span>
                  </div>
                </td>
              </tr>
            )}
            {!loading && filteredAdmins.length === 0 && (
              <tr>
                <td colSpan={4}>
                  <div className="empty">
                    <h3>No administrators found</h3>
                    <p>{query ? "Try a different name or email." : "Click \"Add admin\" to create the first one."}</p>
                  </div>
                </td>
              </tr>
            )}
            {pagedAdmins.map((a) => {
              const fullName = `${a.firstName} ${a.lastName}`.trim();
              const promoted = a.roles?.includes("student");
              return (
                <tr
                  key={a.uid}
                  style={{ cursor: "pointer" }}
                  onClick={() => router.push(`/super-admin/admins/${a.uid}`)}
                >
                  <td>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <Avatar src={a.profilePhotoUrl ?? undefined} size="sm" name={fullName || a.uid} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                          {fullName || a.uid.slice(0, 12) + "…"}
                          {promoted && <Badge tone="info">Promoted student</Badge>}
                        </div>
                        <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-body-green)" }}>
                          {a.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {a.status === "approved" || a.status === "active"
                      ? <Badge tone="success">Active</Badge>
                      : a.status === "suspended"
                        ? <Badge tone="error">Suspended</Badge>
                        : <Badge tone="warning">{a.status}</Badge>}
                  </td>
                  <td className="muted" style={{ whiteSpace: "nowrap" }}>{formatDate(a.createdAt)}</td>
                  <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "inline-flex", gap: 6 }}>
                      {a.status === "suspended" ? (
                        <Button size="sm" variant="secondary" icon="check-circle" onClick={() => setToReactivate(a)}>
                          Reactivate
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" icon="user-x" onClick={() => setToSuspend(a)}
                          style={{ color: "var(--color-error)", borderColor: "var(--color-error)" }}>
                          Suspend
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" icon="trash-2" onClick={() => setToRemove(a)}
                        style={{ color: "var(--color-error)" }}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredAdmins.length > 0 && (
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
              Showing <b>{safePage * PAGE_SIZE + 1}</b>–<b>{Math.min((safePage + 1) * PAGE_SIZE, filteredAdmins.length)}</b> of <b>{filteredAdmins.length}</b>
              {totalPages > 1 && <> · Page <b>{safePage + 1}</b> of <b>{totalPages}</b></>}
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
        open={!!toRemove}
        title={toRemove ? `Permanently delete ${toRemove.firstName} ${toRemove.lastName}?` : ""}
        message="This cannot be undone. Their account is deleted and any content they authored will be anonymised per the data retention policy."
        confirmLabel="Delete account"
        destructive
        onConfirm={confirmRemove}
        onCancel={() => setToRemove(null)}
      />

      <ConfirmDialog
        open={!!toSuspend}
        title={toSuspend ? `Suspend ${toSuspend.firstName} ${toSuspend.lastName}?` : ""}
        message="Their active sessions will be terminated immediately and they will be unable to sign in until reactivated."
        confirmLabel={actionBusy ? "Suspending…" : "Suspend admin"}
        destructive
        onConfirm={confirmSuspend}
        onCancel={() => setToSuspend(null)}
      />

      <ConfirmDialog
        open={!!toReactivate}
        title={toReactivate ? `Reactivate ${toReactivate.firstName} ${toReactivate.lastName}?` : ""}
        message="They will be able to sign in again immediately with their previous permissions restored."
        confirmLabel={actionBusy ? "Reactivating…" : "Reactivate admin"}
        onConfirm={confirmReactivate}
        onCancel={() => setToReactivate(null)}
      />
    </div>
  );
}
