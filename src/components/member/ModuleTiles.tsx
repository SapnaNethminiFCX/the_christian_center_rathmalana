import { type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

/** Wrapper grid for the Member home module tiles (two-column on desktop). */
export function ModuleTiles({ children }: Props) {
  return <div className="module-tiles">{children}</div>;
}
