"use client";

import { Icon } from "@/components/ui/Icon";
import { CellTypeBadge } from "./CellTypeBadge";
import type { Cell } from "@/application/hooks/useCells";

interface Props {
  cell: Cell;
  actions?: React.ReactNode;
}

export function CellDetailHeader({ cell, actions }: Props) {
  return (
    <div className="cd-header">
      <div style={{ position: "relative" }}>
        <CellTypeBadge type={cell.type} />
      </div>
      <h1>{cell.name}</h1>
      <div className="meta">
        <span>
          <Icon name="map-pin" size={14} /> {cell.area}
        </span>
        <span>
          <Icon name="user" size={14} /> Led by {cell.leaderName}
        </span>
        {cell.g12LeaderName && (
          <span>
            <Icon name="share-2" size={14} /> G12: {cell.g12LeaderName}
          </span>
        )}
        <span>
          <Icon name="users" size={14} /> {cell.memberCount} members
        </span>
        <span>
          <Icon name="file-text" size={14} /> {cell.reportCount} reports filed
        </span>
      </div>
      {actions && <div className="cd-actions">{actions}</div>}
    </div>
  );
}
