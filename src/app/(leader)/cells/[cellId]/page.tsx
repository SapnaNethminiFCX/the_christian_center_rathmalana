"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import { CellDetailHeader } from "@/components/cells/CellDetailHeader";
import { CellTabs } from "@/components/cells/CellTabs";
import { CellMembersPanel } from "@/components/cells/CellMembersPanel";
import { CellReportCard } from "@/components/cells/CellReportCard";
import { AddMemberDialog } from "@/components/cells/AddMemberDialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useCell, useCellMembers } from "@/application/hooks/useCell";
import { useCellReports } from "@/application/hooks/useCellReports";
import { useAppSelector } from "@/application/hooks/useAppSelector";
import { useCellMutations, canDeleteCell } from "@/application/hooks/useCells";
import { cellMemberSearchRoles } from "@/lib/cellMemberSearchRoles";

export default function LeaderCellDetailPage() {
  const router = useRouter();
  const params = useParams();
  const cellId = (params?.cellId as string) ?? "";
  const { cell, loading: cellLoading, error: cellError, refetch } = useCell(cellId || undefined);
  const { reports, loading: reportsLoading } = useCellReports(cellId || undefined);
  const { busy: memberBusy, addMembers, removeMember } = useCellMembers(cellId || undefined);

  const user = useAppSelector((s) => s.session.user);

  // G12 viewing a cell they only SUPERVISE (not lead) → read-only.
  // They can see members + reports but cannot edit / delete / add / remove
  // / file new reports. The cell's own leader still gets full access; admin
  // and super_admin always get full access regardless.
  const isAdmin = !!(user?.roles?.includes("admin") || user?.roles?.includes("super_admin"));
  const isCellLeader = !!cell && cell.leaderUid === user?.uid;
  const isSupervisorOnly =
    !!cell && !isAdmin && !isCellLeader && cell.g12LeaderUid === user?.uid;

  const canFile =
    !isSupervisorOnly &&
    ((user?.roles?.includes("leader") || user?.roles?.includes("g12") || user?.roles?.includes("super_admin")) ?? false);
  const canEdit = !isSupervisorOnly;
  const canDelete = !isSupervisorOnly && canDeleteCell(cell, user);
  const { deleteCell: deleteCellApi } = useCellMutations();
  const [deleting, setDeleting] = useState(false);

  const [tab, setTab] = useState<"members" | "reports">("members");
  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ uid: string; name: string } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleDeleteCell = async () => {
    if (!cell) return;
    setDeleting(true);
    const ok = await deleteCellApi(cell.id);
    setDeleting(false);
    if (ok) {
      setDeleteOpen(false);
      router.push("/cells");
    }
  };

  const handleAddMembers = async (uids: string[]) => {
    const res = await addMembers(uids);
    if (res) { setAddOpen(false); refetch(); }
  };

  const handleRemoveMember = async () => {
    if (!removeTarget) return;
    const ok = await removeMember(removeTarget.uid);
    if (ok) { setRemoveTarget(null); refetch(); }
  };

  if (cellLoading) {
    return <div className="page" style={{ textAlign: "center", padding: 48, color: "var(--color-muted)" }}><Icon name="loader" size={24} /></div>;
  }

  if (!cell || (cellError && cellError.status === 404)) {
    return (
      <div className="page">
        <EmptyState icon="alert-circle" title="Cell not found" message="This cell may have been archived or you don't have access." />
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Link href="/cells" className="btn btn--secondary-light">
            <Icon name="arrow-left" size={14} /> Back to cells
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <Button variant="ghost" size="sm" icon="arrow-left" onClick={() => router.push("/cells")}>
        Back to cells
      </Button>

      <CellDetailHeader
        cell={cell}
        actions={
          <>
            {canFile && (
              <Button size="lg" icon="plus" onClick={() => router.push(`/cells/${cell.id}/reports/new`)}>
                Cell report
              </Button>
            )}
            {canEdit && (
              <Button size="lg" variant="secondary-light" icon="edit-3" onClick={() => router.push(`/cells/${cell.id}/edit`)}>
                Edit cell
              </Button>
            )}
            {canDelete && (
              <Button
                size="lg"
                variant="ghost"
                icon="trash-2"
                onClick={() => setDeleteOpen(true)}
                style={{ color: "var(--color-error)" }}
              >
                Delete
              </Button>
            )}
          </>
        }
      />

      <CellTabs
        tabs={[
          { id: "members", label: "Members", icon: "users", count: cell.memberCount },
          { id: "reports", label: "Reports", icon: "file-text", count: reports.length },
        ]}
        active={tab}
        onChange={(id) => setTab(id as "members" | "reports")}
      />

      {tab === "members" && (
        <CellMembersPanel
          members={(cell.members ?? []).map((m) => ({
            uid: typeof m === "string" ? m : (m.uid ?? ""),
            displayName: typeof m === "string" ? m : (m.displayName || m.uid || ""),
            roles: typeof m === "string" ? [] : ((m as { roles?: string[] }).roles ?? []),
          }))}
          leaderUid={cell.leaderUid}
          canEdit={canEdit && canFile}
          busy={memberBusy}
          onAddClick={() => setAddOpen(true)}
          onRemove={(uid) => {
            const m = (cell.members ?? []).find((x) => (typeof x === "string" ? x : x.uid) === uid);
            const name = typeof m === "string" ? m : (m?.displayName || m?.uid || uid);
            setRemoveTarget({ uid, name });
          }}
        />
      )}

      <AddMemberDialog
        open={addOpen}
        existingUids={(cell.members ?? []).map((m) => (typeof m === "string" ? m : (m.uid ?? "")))}
        roleFilter={cellMemberSearchRoles(user?.roles)}
        busy={memberBusy}
        onCancel={() => setAddOpen(false)}
        onConfirm={handleAddMembers}
      />

      <ConfirmDialog
        open={!!removeTarget}
        title={`Remove ${removeTarget?.name ?? ""}?`}
        message="They will lose access to this cell's reports and stop appearing in attendance lists."
        confirmLabel="Yes, remove"
        destructive
        onConfirm={handleRemoveMember}
        onCancel={() => setRemoveTarget(null)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title={`Delete ${cell.name}?`}
        message="This permanently removes the cell, its members list, and all its reports. This action cannot be undone."
        confirmLabel={deleting ? "Deleting…" : "Yes, delete"}
        destructive
        onConfirm={handleDeleteCell}
        onCancel={() => (deleting ? null : setDeleteOpen(false))}
      />

      {tab === "reports" && (
        <div>
          {reportsLoading ? (
            <div style={{ textAlign: "center", padding: 32 }}><Icon name="loader" size={20} style={{ color: "var(--color-muted)" }} /></div>
          ) : reports.length === 0 ? (
            <EmptyState icon="file-text" title="No reports yet"
              message="File your first cell report to start tracking attendance, satisfaction, and meeting notes." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {reports.map((r) => (
                <CellReportCard key={r.id} report={r as unknown as Parameters<typeof CellReportCard>[0]["report"]}
                  onClick={() => router.push(`/cells/${cell.id}/reports/${r.id}`)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
