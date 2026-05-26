"use client";

import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import type { Cell } from "@/application/hooks/useCells";

interface Props {
  cell: Cell;
  /** When true, hover effects and click handler are disabled. */
  readonly?: boolean;
  onClick?: () => void;
}

const TYPE_LABEL: Record<Cell["type"], string> = {
  g12: "G12",
  care: "Care",
  children: "Children",
  outreach: "Outreach",
};

/**
 * Cell summary card used in cell grids (member read-only view + leader cells list).
 * Works with V2 API data — leaderAvatar is optional; uses memberCount for count.
 */
export function CellCard({ cell, readonly, onClick }: Props) {
  const Wrapper = readonly ? "div" : "button";

  return (
    <Wrapper
      className={`cell-card${readonly ? " readonly" : ""}`}
      onClick={readonly ? undefined : onClick}
      type={readonly ? undefined : "button"}
    >
      <div className="top">
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3>{cell.name}</h3>
          {cell.leaderName && cell.leaderName !== cell.leaderUid && (
            <div className="leader">
              <Avatar name={cell.leaderName} size="sm" />
              {cell.leaderName}
            </div>
          )}
        </div>
        <span className={`cell-type ${cell.type}`}>{TYPE_LABEL[cell.type]}</span>
      </div>

      <div className="members-row">
        <div className="stack">
          {/* Show placeholder avatars based on memberCount */}
          {Array.from({ length: Math.min(cell.memberCount, 4) }).map((_, i) => (
            <Avatar key={i} name={`Member ${i + 1}`} size="sm" />
          ))}
        </div>
        <span className="members-count">
          {cell.memberCount} member{cell.memberCount === 1 ? "" : "s"}
        </span>
      </div>

      <div className="footer">
        <span className="stat">
          <Icon name="map-pin" size={12} /> {cell.area}
        </span>
        <span className="stat">
          <Icon name="file-text" size={12} /> <b>{cell.reportCount}</b> reports
        </span>
      </div>
    </Wrapper>
  );
}
