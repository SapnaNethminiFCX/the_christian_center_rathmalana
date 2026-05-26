"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { RowMenu } from "@/components/ui/RowMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AddNewMemberDialog, type AddNewMemberPayload, type AssignableRole } from "@/components/admin/AddNewMemberDialog";
import { RoleBadgeStack } from "@/components/user/RoleBadgeStack";
import { useAppDispatch } from "@/application/hooks/useAppDispatch";
import { useAppSelector } from "@/application/hooks/useAppSelector";
import { pushToast } from "@/application/slices/uiSlice";
import { downloadCsv } from "@/lib/csv";
import { apiRequest, ApiRequestError } from "@/infrastructure/api/request";

interface StudentUser {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  status?: string;
  profilePhotoUrl?: string | null;
  createdAt?: string;
  enrollmentCount?: number;
  // V2: every user has a roles array. Backend may not yet send this; default
  // to ["member","student"] since the query filters by role=student.
  roles?: string[];
}

interface StudentListResponse {
  items: StudentUser[];
  nextCursor: string | null;
  total: number;
}

interface AdminEnrollment {
  id: string;
  studentUid: string;
  courseId: string;
  state: string;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function SuperAdminStudentsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const base = pathname?.startsWith("/super-admin") ? "/super-admin" : "/admin";
  const dispatch = useAppDispatch();
  const sessionUser = useAppSelector((s) => s.session.user);
  const [query, setQuery] = useState("");

  const [allStudents, setAllStudents] = useState<StudentUser[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [promoting, setPromoting] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ uid: string; name: string; role: "leader" | "g12" } | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;
  const [addOpen, setAddOpen] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  // Increment to retrigger the users-list effect after a create.
  const [refreshKey, setRefreshKey] = useState(0);

  // Super admins can assign any of leader/g12/admin. Plain admins shouldn't
  // assign admin per the V2 spec, but this page is shared — gate by route.
  const isSuper = pathname?.startsWith("/super-admin") ?? false;
  const allowedNewRoles: AssignableRole[] = isSuper
    ? ["leader", "g12", "admin"]
    : ["leader", "g12"];
  const [courseCountByStudent, setCourseCountByStudent] = useState<Record<string, {
    courseCount: number;
    loading: boolean;
  }>>({});

  // 1. Fetch the full student list once auth is ready.
  useEffect(() => {
    if (!sessionUser) return;
    let cancelled = false;
    setStudentsLoading(true);
    (async () => {
      try {
        const collected: StudentUser[] = [];
        let cursor: string | undefined;
        const MAX_PAGES = 20;
        for (let i = 0; i < MAX_PAGES; i++) {
          // V2: list ALL users so admins can promote any member to Leader/G12.
          const params = new URLSearchParams({ limit: "100" });
          if (cursor) params.append("cursor", cursor);
          const data = await apiRequest<StudentListResponse>(`/users?${params}`);
          collected.push(...(data.items ?? []));
          cursor = data.nextCursor ?? undefined;
          if (!cursor) break;
        }
        // V2: Users page excludes admins + super_admins — they are managed
        // from /super-admin/admins, not promoted from this list.
        const nonAdmin = collected.filter((u) => {
          const roles = u.roles ?? [];
          return !roles.includes("admin") && !roles.includes("super_admin");
        });
        if (!cancelled) setAllStudents(nonAdmin);
      } catch (err) {
        if (err instanceof ApiRequestError && err.status !== 401) {
          dispatch(pushToast({ tone: "warning", title: "Failed to load students" }));
        }
      } finally {
        if (!cancelled) setStudentsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sessionUser, dispatch, refreshKey]);

  // 2. Fetch ALL admin enrollments once, then count per student client-side.
  //    (Backend's studentUid filter is unreliable — returns the same count for
  //    every student. One bulk fetch + local count is faster and accurate.)
  useEffect(() => {
    if (allStudents.length === 0) return;
    let cancelled = false;

    // Initialise loading state.
    setCourseCountByStudent((prev) => {
      const next = { ...prev };
      for (const s of allStudents) {
        if (!next[s.uid]) next[s.uid] = { courseCount: 0, loading: true };
      }
      return next;
    });

    (async () => {
      try {
        // Pull every page (typically a small number of enrollments overall).
        const all: AdminEnrollment[] = [];
        let cursor: string | undefined;
        for (let i = 0; i < 20; i++) {
          const params = new URLSearchParams({ limit: "100" });
          if (cursor) params.append("cursor", cursor);
          const data = await apiRequest<{ items: AdminEnrollment[]; nextCursor: string | null }>(
            `/admin/enrollments?${params}`,
          );
          all.push(...(data.items ?? []));
          cursor = data.nextCursor ?? undefined;
          if (!cursor) break;
        }
        if (cancelled) return;

        // Count approved enrollments per studentUid.
        const countByUid = new Map<string, number>();
        for (const e of all) {
          if (e.state === "approved") {
            countByUid.set(e.studentUid, (countByUid.get(e.studentUid) ?? 0) + 1);
          }
        }

        const next: typeof courseCountByStudent = {};
        for (const s of allStudents) {
          next[s.uid] = { courseCount: countByUid.get(s.uid) ?? 0, loading: false };
        }
        if (!cancelled) setCourseCountByStudent(next);
      } catch {
        if (!cancelled) {
          // On failure, just mark all as 0/not-loading so the UI doesn't hang.
          const next: typeof courseCountByStudent = {};
          for (const s of allStudents) next[s.uid] = { courseCount: 0, loading: false };
          setCourseCountByStudent(next);
        }
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allStudents.length, allStudents.map((s) => s.uid).join(",")]);

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allStudents;
    return allStudents.filter((s) =>
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q),
    );
  }, [allStudents, query]);

  // Reset to page 0 whenever the filter narrows.
  useEffect(() => { setPage(0); }, [query]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const students = filteredStudents.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const hasPrev = safePage > 0;
  const hasNext = safePage < totalPages - 1;

  /**
   * V2: PATCH /users/:uid/roles { role, action } — promote a Member to
   * Leader or G12. The backend enforces caller-scoped permissions and
   * returns the updated roles[] in the response.
   */
  const runPromote = async (uid: string, role: "leader" | "g12") => {
    setPromoting(uid);
    try {
      const updated = await apiRequest<{ roles?: string[] } | undefined>(`/users/${uid}/roles`, {
        method: "PATCH",
        body: { role, action: "add" },
      });
      setAllStudents((prev) =>
        prev.map((s) =>
          s.uid === uid
            ? { ...s, roles: updated?.roles ?? [...new Set([...(s.roles ?? []), role])] }
            : s,
        ),
      );
      dispatch(
        pushToast({
          tone: "success",
          title: role === "g12" ? "Promoted to G12 Leader" : "Promoted to Leader",
        }),
      );
    } catch (err) {
      let title = "Promote failed";
      let message: string | undefined;
      if (err instanceof ApiRequestError) {
        if (err.status === 403) title = "Not permitted";
        else if (err.code === "LAST_SUPER_ADMIN") { title = "Cannot demote"; message = "This is the last super admin."; }
        else if (err.status === 409) { title = "Role conflict"; message = err.message; }
        else if (err.message) message = err.message;
      }
      dispatch(pushToast({ tone: "warning", title, message }));
    } finally {
      setPromoting(null);
      setConfirm(null);
    }
  };

  const handleExport = () => {
    const headers = ["Name", "Email", "Status", "Courses", "Joined"];
    const rows = filteredStudents.map((s) => {
      const p = courseCountByStudent[s.uid];
      return [
        `${s.firstName} ${s.lastName}`,
        s.email,
        s.status ?? "approved",
        p?.courseCount ?? 0,
        s.createdAt ?? "",
      ];
    });
    downloadCsv("students.csv", headers, rows);
    dispatch(pushToast({ tone: "success", title: "CSV downloaded" }));
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Users</h1>
          <div className="greeting">
            <b style={{ color: "var(--color-primary)" }}>{studentsLoading ? "…" : allStudents.length}</b> users registered.
            Promote a Member to Leader or G12 here — roles are additive, so members keep their existing access.
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button variant="secondary" icon="download" onClick={handleExport} disabled={students.length === 0}>
            Export CSV
          </Button>
          <Button icon="user-plus" onClick={() => setAddOpen(true)}>
            Add a new member
          </Button>
        </div>
      </div>

      {/* V2 promotions explainer banner */}
      <div className="role-banner">
        <div className="ico">
          <Icon name="info" size={20} />
        </div>
        <div className="b-body">
          <h3>How promotions work</h3>
          <p>
            Members ask a pastor or G12 leader in person to become a Leader or G12. The admin then
            adds the role here — roles are additive (the user keeps Member &amp; Student access).
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
            <col style={{ width: "26%" }} />  {/* User */}
            <col style={{ width: "18%" }} />  {/* Roles */}
            <col style={{ width: "10%" }} />  {/* Status */}
            <col style={{ width: "12%" }} />  {/* Joined */}
            <col style={{ width: "34%" }} />  {/* Action */}
          </colgroup>
          <thead>
            <tr>
              <th>User</th>
              <th>Roles</th>
              <th>Status</th>
              <th>Joined</th>
              <th style={{ textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {studentsLoading && students.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 40 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--color-muted)" }}>
                    <Icon name="loader" size={18} />
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 14 }}>Loading…</span>
                  </div>
                </td>
              </tr>
            )}
            {!studentsLoading && students.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <div className="empty">
                    <h3>No students found</h3>
                    <p>{query ? "Try a different search term." : "No students have registered yet."}</p>
                  </div>
                </td>
              </tr>
            )}
            {students.map((s) => {
              const fullName = `${s.firstName} ${s.lastName}`.trim();
              // V2 spec: every authed user holds `member` at minimum. Backend
              // sometimes omits it from roles[] — add it for display.
              const rawRoles = s.roles && s.roles.length > 0 ? s.roles : ["student"];
              const roles = rawRoles.includes("member") ? rawRoles : [...rawRoles, "member"];
              const hasLeader = roles.includes("leader");
              const hasG12 = roles.includes("g12");

              const openPromoteLeader = () => setConfirm({ uid: s.uid, name: fullName || s.uid, role: "leader" });
              const openPromoteG12 = () => setConfirm({ uid: s.uid, name: fullName || s.uid, role: "g12" });
              const isThisRowPromoting = promoting === s.uid;
              const isSuspended = s.status === "suspended";
              // G12 supersedes Leader — once a user is G12, the Leader role is
              // implied, so the "Make Leader" button is no longer relevant.
              const showLeaderBtn = !hasLeader && !hasG12;
              const showG12Btn = !hasG12;
              const promoteDisabled = isThisRowPromoting || isSuspended;
              const suspendedTitle = isSuspended ? "Reactivate the user before promoting" : undefined;

              return (
                <tr key={s.uid}>
                  <td>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <Avatar src={s.profilePhotoUrl ?? undefined} size="sm" name={fullName || s.uid} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {fullName || s.uid.slice(0, 12) + "…"}
                        </div>
                        <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-body-green)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {s.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <RoleBadgeStack roles={roles} />
                  </td>
                  <td>
                    {s.status === "suspended" ? (
                      <Badge tone="error">Suspended</Badge>
                    ) : s.status === "pending_approval" ? (
                      <Badge tone="warning">Pending</Badge>
                    ) : (
                      <Badge tone="success">Active</Badge>
                    )}
                  </td>
                  <td className="muted">{formatDate(s.createdAt)}</td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end", flexWrap: "nowrap", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end", minWidth: 240 }} title={suspendedTitle}>
                        {showLeaderBtn ? (
                          <Button size="sm" variant="ghost" icon="chevron-up" disabled={promoteDisabled} onClick={openPromoteLeader}>
                            {isThisRowPromoting ? "…" : "Make Leader"}
                          </Button>
                        ) : (
                          <span style={{ display: "inline-block", minWidth: 110 }} />
                        )}
                        {showG12Btn ? (
                          <Button size="sm" icon="chevron-up" disabled={promoteDisabled} onClick={openPromoteG12}>
                            {isThisRowPromoting ? "…" : "Make G12"}
                          </Button>
                        ) : (
                          <span style={{ display: "inline-block", minWidth: 90 }} />
                        )}
                      </div>
                      <RowMenu
                        ariaLabel={`Actions for ${fullName}`}
                        items={[
                          {
                            label: "View profile",
                            ico: "user",
                            onClick: () => router.push(`${base}/students/${s.uid}`),
                          },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredStudents.length > PAGE_SIZE && (
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
              Showing <b>{safePage * PAGE_SIZE + 1}</b>–<b>{Math.min((safePage + 1) * PAGE_SIZE, filteredStudents.length)}</b> of <b>{filteredStudents.length}</b>
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <Button size="sm" variant="secondary" icon="chevron-left" disabled={!hasPrev} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                Previous
              </Button>
              <Button size="sm" variant="secondary" iconAfter="chevron-right" disabled={!hasNext} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>
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
            ? `This adds the ${confirm.role === "g12" ? "G12" : "Leader"} role to ${confirm.name}. Roles are additive — they keep their existing access. You can revert this from the user's profile later.`
            : undefined
        }
        confirmLabel={confirm?.role === "g12" ? "Yes, promote to G12" : "Yes, promote to Leader"}
        onConfirm={() => { if (confirm) runPromote(confirm.uid, confirm.role); }}
        onCancel={() => setConfirm(null)}
      />

      <AddNewMemberDialog
        open={addOpen}
        busy={addBusy}
        allowedRoles={allowedNewRoles}
        onCancel={() => setAddOpen(false)}
        onSubmit={async (payload: AddNewMemberPayload) => {
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
            setRefreshKey((k) => k + 1);
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
        }}
      />
    </div>
  );
}
