"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import { CellReportForm, type CellReportPayload } from "@/components/cells/CellReportForm";
import { useAppDispatch } from "@/application/hooks/useAppDispatch";
import { pushToast } from "@/application/slices/uiSlice";
import { useCell } from "@/application/hooks/useCell";
import { fileCellReport, uploadReportPhotos } from "@/application/hooks/useCellReports";
import { useIdempotencyKey } from "@/application/hooks/useIdempotencyKey";

export default function NewCellReportPage() {
  const router = useRouter();
  const params = useParams();
  const dispatch = useAppDispatch();
  const cellId = (params?.cellId as string) ?? "";

  const { cell, loading } = useCell(cellId || undefined);
  const { getKey, resetKey } = useIdempotencyKey();
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <div className="page" style={{ textAlign: "center", padding: 48 }}><Icon name="loader" size={24} style={{ color: "var(--color-muted)" }} /></div>;
  if (!cell) return <div className="page"><EmptyState icon="alert-circle" title="Cell not found" message="The cell you tried to report on doesn't exist." /></div>;

  const submit = async (payload: CellReportPayload) => {
    setSubmitting(true);
    try {
      // Step 1: upload photos if any (returns URLs).
      let photoUrls: string[] = [];
      if (payload.photos?.length) {
        photoUrls = await uploadReportPhotos(cell.id, payload.photos);
      }

      // Step 2: file the report with X-Idempotency-Key.
      const created = await fileCellReport(
        cell.id,
        {
          date:                 payload.meetingDate,
          didMeet:              payload.didMeet,
          noMeetReason:         payload.notMetReason ?? null,
          leaderPresent:        payload.leaderPresent,
          location:             payload.location,
          timeStarted:          payload.startTime,
          timeEnded:            payload.endTime,
          language:             payload.language as "si" | "ta" | "en",
          subjectDiscussed:     payload.subjectKind === "sunday_sermon" ? "sunday_sermon" : "other",
          otherSubjectReason:   payload.subjectTopic ?? null,
          cellType:             payload.cellType,
          g12LeaderUid:         cell.g12LeaderUid,
          attendance:           (payload.attendance ?? []).map((a) => {
            const entry = a as unknown as Record<string, unknown>;
            const memberId = (entry.memberId ?? entry.userUid) as string | undefined;
            const isGuest = typeof memberId === "string" && memberId.startsWith("guest-");
            return {
              // Guests don't have a real UID — drop the synthetic one and flag them.
              userUid: isGuest ? undefined : memberId,
              name:    ((entry.name ?? entry.memberName) as string) ?? "",
              status:  a.status as "present" | "absent" | "new",
              isNew:   isGuest || entry.isNew === true,
            };
          }),
          additionalVisitors:   payload.visitorCount ?? 0,
          childrenCount:        0,
          satisfactionRate:     payload.satisfaction ?? 3,
          additionalInfo:       payload.followUpNotes ?? null,
          photoUrls,
        },
        getKey(),
      );

      resetKey();
      dispatch(pushToast({ tone: "success", title: "Report submitted", message: "Your G12 leader will see this." }));
      router.push(`/cells/${cell.id}/reports/${created.id}`);
    } catch (err) {
      dispatch(pushToast({ tone: "warning", title: "Failed to submit report", message: (err as Error).message }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <Button variant="ghost" size="sm" icon="arrow-left" onClick={() => router.push(`/cells/${cell.id}`)}>
        Back to {cell.name}
      </Button>

      <header className="page-header" style={{ marginTop: 12, marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: 28, color: "var(--color-primary)" }}>
          File a cell report
        </h1>
        <p style={{ margin: "6px 0 0", fontFamily: "var(--font-body)", fontSize: 14, color: "var(--color-body-green)" }}>
          For <b>{cell.name}</b>. You can jump between steps using the sidebar.
        </p>
      </header>

      <CellReportForm
        cell={{ id: cell.id, name: cell.name, type: cell.type, area: cell.area, leaderId: cell.leaderUid, leaderName: cell.leaderName ?? "", leaderAvatar: "", g12LeaderName: cell.g12LeaderName, members: (cell.members ?? []).map((m) => ({ id: m.uid ?? String(m), name: m.displayName ?? String(m), avatar: "", joinedAt: cell.createdAt })), state: cell.state, reportCount: cell.reportCount } as unknown as Parameters<typeof CellReportForm>[0]["cell"]}
        onSubmit={submit}
        onCancel={() => router.push(`/cells/${cell.id}`)}
      />
    </div>
  );
}
