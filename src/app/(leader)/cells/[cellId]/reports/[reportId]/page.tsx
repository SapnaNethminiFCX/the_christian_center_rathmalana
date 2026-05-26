"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReportViewer } from "@/components/cells/ReportViewer";
import { VoidReportDialog } from "@/components/cells/VoidReportDialog";
import { useAppSelector } from "@/application/hooks/useAppSelector";
import { useCell } from "@/application/hooks/useCell";
import { useCellReport, useVoidReport } from "@/application/hooks/useCellReports";

export default function CellReportViewPage() {
  const router = useRouter();
  const params = useParams();
  const user = useAppSelector((s) => s.session.user);
  const cellId  = (params?.cellId  as string) ?? "";
  const reportId = (params?.reportId as string) ?? "";

  const { report, loading } = useCellReport(cellId || undefined, reportId || undefined);
  const { cell } = useCell(cellId || undefined);
  const { voidReport, busy: voidBusy } = useVoidReport();
  const [voidOpen, setVoidOpen] = useState(false);

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

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
        <Button variant="ghost" size="sm" icon="arrow-left" onClick={() => router.push(`/cells/${cellId}`)}>
          Back to cell
        </Button>
        {canVoid && (
          <Button variant="ghost" size="sm" icon="x-circle" onClick={() => setVoidOpen(true)}
            style={{ color: "var(--color-error)" }}>
            Void report
          </Button>
        )}
      </div>

      <ReportViewer report={report} cellName={cell?.name} />

      {voidOpen && (
        <VoidReportDialog
          open={voidOpen}
          onConfirm={handleVoid}
          onClose={() => setVoidOpen(false)}
        />
      )}
    </div>
  );
}
