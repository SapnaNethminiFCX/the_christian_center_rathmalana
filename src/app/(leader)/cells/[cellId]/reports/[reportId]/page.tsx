"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReportViewer } from "@/components/cells/ReportViewer";
import { VoidReportDialog } from "@/components/cells/VoidReportDialog";
import { EditReportDialog } from "@/components/cells/EditReportDialog";
import { useAppSelector } from "@/application/hooks/useAppSelector";
import { useCell } from "@/application/hooks/useCell";
import {
  useCellReport,
  useVoidReport,
  useEditReport,
  editWindowSecondsRemaining,
  isWithinEditWindow,
  type CellReport,
} from "@/application/hooks/useCellReports";

function formatRemainingShort(seconds: number): string {
  if (seconds <= 0) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${Math.max(1, m)}m`;
}

export default function CellReportViewPage() {
  const router = useRouter();
  const params = useParams();
  const user = useAppSelector((s) => s.session.user);
  const cellId  = (params?.cellId  as string) ?? "";
  const reportId = (params?.reportId as string) ?? "";

  const { report: fetchedReport, loading } = useCellReport(cellId || undefined, reportId || undefined);
  const { cell } = useCell(cellId || undefined);
  const { voidReport } = useVoidReport();
  const { editReport, busy: editBusy } = useEditReport();
  const [voidOpen, setVoidOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // Hold a local copy so we can mutate after an edit succeeds without
  // re-fetching. Re-syncs from `fetchedReport` whenever a fresh fetch lands.
  const [report, setReport] = useState<CellReport | null>(null);
  useEffect(() => { setReport(fetchedReport); }, [fetchedReport]);

  // Tick once a minute so the "edit window closes in Xm" pill stays current.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const isFiler = !!report && !!user?.uid && report.filledByUid === user.uid;
  const isSuperAdmin = !!user?.roles?.includes("super_admin");
  const withinWindow = !!report && isWithinEditWindow(report.createdAt);

  // V2 §14.5 — only the original filer or super_admin can edit, within 24h,
  // and the report must not be voided.
  const canEdit = !!report && !report.voided && withinWindow && (isFiler || isSuperAdmin);

  const canVoid =
    !!report &&
    !report.voided &&
    ((user?.roles?.includes("leader") || user?.roles?.includes("g12") || user?.roles?.includes("super_admin")) ?? false);

  if (loading) return <div className="page" style={{ textAlign: "center", padding: 48 }}><Icon name="loader" size={24} style={{ color: "var(--color-muted)" }} /></div>;

  if (!report) {
    return (
      <div className="page">
        <EmptyState icon="alert-circle" title="Report not found" message="It may have been removed or you don't have access." />
      </div>
    );
  }

  const handleVoid = async (reason: string) => {
    const ok = await voidReport(cellId, reportId, reason);
    if (ok) { setVoidOpen(false); router.push(`/cells/${cellId}`); }
  };

  const handleEdit = async (payload: Parameters<typeof editReport>[2]) => {
    const updated = await editReport(cellId, reportId, payload);
    if (updated) {
      setReport(updated);
      setEditOpen(false);
    }
  };

  const remainingSeconds = editWindowSecondsRemaining(report.createdAt);

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
        <Button variant="ghost" size="sm" icon="arrow-left" onClick={() => router.push(`/cells/${cellId}`)}>
          Back to cell
        </Button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Edit window indicator + button — only for filer / super_admin
              within 24h, and never for voided reports. */}
          {canEdit && (
            <>
              <span
                title="Reports can only be edited within 24 hours of filing"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  borderRadius: 9999,
                  background: "rgba(217,119,6,0.10)",
                  color: "var(--color-warning)",
                  fontFamily: "var(--font-body)",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <Icon name="clock" size={12} />
                Editable for {formatRemainingShort(remainingSeconds)} more
              </span>
              <Button variant="secondary" size="sm" icon="edit-3" onClick={() => setEditOpen(true)}>
                Edit report
              </Button>
            </>
          )}

          {/* Read-only badge — shown when the user IS the filer/super_admin
              but the 24h has elapsed (or the report is voided). */}
          {!canEdit && report && !report.voided && (isFiler || isSuperAdmin) && !withinWindow && (
            <span
              title="Editing window closed 24 hours after filing"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: 9999,
                background: "var(--color-stroke-2)",
                color: "var(--color-muted)",
                fontFamily: "var(--font-body)",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <Icon name="lock" size={12} />
              Editing locked
            </span>
          )}

          {canVoid && (
            <Button variant="ghost" size="sm" icon="x-circle" onClick={() => setVoidOpen(true)}
              style={{ color: "var(--color-error)" }}>
              Void report
            </Button>
          )}
        </div>
      </div>

      <ReportViewer report={report} cellName={cell?.name} />

      {voidOpen && (
        <VoidReportDialog
          open={voidOpen}
          onConfirm={handleVoid}
          onClose={() => setVoidOpen(false)}
        />
      )}

      {editOpen && report && (
        <EditReportDialog
          open={editOpen}
          report={report}
          busy={editBusy}
          onCancel={() => setEditOpen(false)}
          onConfirm={handleEdit}
        />
      )}
    </div>
  );
}
