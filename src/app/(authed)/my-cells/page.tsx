"use client";

import { useRouter } from "next/navigation";
import { useAppSelector } from "@/application/hooks/useAppSelector";
import { useMyCells } from "@/application/hooks/useCells";
import { CellCard } from "@/components/cells/CellCard";
import { SwitchBanner } from "@/components/member/SwitchBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";

export default function MyCellsPage() {
  const router = useRouter();
  const user = useAppSelector((s) => s.session.user);

  const isG12    = user?.roles?.includes("g12")    ?? false;
  const isLeader = user?.roles?.includes("leader") ?? false;
  const hasLeaderRole = isLeader || isG12;
  const isDevDemo = (user?.uid ?? "").startsWith("dev-");
  const showBanner = hasLeaderRole || isDevDemo;
  const bannerVariant: "g12" | "leader" = isG12 ? "g12" : "leader";
  const bannerLabel = bannerVariant === "g12" ? "G12 Leader" : "Leader";

  // Member view shows ONLY the cells the user belongs to. The "other available
  // cells" directory was intentionally removed — members don't browse cells.
  const { cells: memberCells, loading } = useMyCells();

  return (
    <div className="page">
      <header className="page-header" style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: 32, color: "var(--color-primary)", letterSpacing: "-0.01em" }}>
          {hasLeaderRole ? "Cells" : "My Cell"}
        </h1>
        <p style={{ margin: "8px 0 0", fontFamily: "var(--font-body)", fontSize: 15, color: "var(--color-body-green)" }}>
          You are a member of{" "}
          <b style={{ color: "var(--color-primary)" }}>{memberCells.length} cell{memberCells.length === 1 ? "" : "s"}</b>.
        </p>
      </header>

      {showBanner && (
        <SwitchBanner
          title={`You're also a ${bannerLabel}.`}
          body={`Switch to your ${bannerVariant === "g12" ? "G12" : "Leader"} dashboard for full access.`}
          ctaLabel={`Continue as ${bannerLabel}`}
          onCta={() => router.push(bannerVariant === "g12" ? "/g12/dashboard" : "/leader/dashboard")}
        />
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--color-muted)" }}>
          <Icon name="loader" size={24} />
        </div>
      ) : memberCells.length === 0 ? (
        <EmptyState icon="users" title="You're not in any cell groups yet"
          message="Speak to a cell leader at TCCR to be added." />
      ) : (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ margin: "0 0 14px", fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 600, color: "var(--color-primary)" }}>My cells</h2>
          <div className="cell-grid">
            {memberCells.map((c) => (
              <CellCard key={c.id} cell={c} onClick={() => router.push(`/my-cells/${c.id}`)} />
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
