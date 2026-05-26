"use client";

import { Icon } from "@/components/ui/Icon";

export interface WfaStep {
  state: "done" | "active" | "pending";
  name: string;
  meta: string;
  icon?: string;
}

interface Props {
  title: string;
  blurb: React.ReactNode;
  steps: WfaStep[];
  /** Optional actions rendered under the rings. */
  actions?: React.ReactNode;
}

/**
 * Big "waiting for approval" centrepiece — rings, lit bulb, blurb, 3-step
 * progress timeline. Used by /apply/student/pending and friends.
 */
export function WaitingForApproval({ title, blurb, steps, actions }: Props) {
  return (
    <div className="wfa-wrap">
      <div className="wfa-rings" aria-hidden="true">
        <div className="wfa-bulb">
          <Icon name="sparkles" size={36} />
        </div>
      </div>
      <h1 className="wfa-title">{title}</h1>
      <p className="wfa-blurb">{blurb}</p>

      {actions && <div style={{ display: "flex", gap: 10, marginBottom: 28, flexWrap: "wrap", justifyContent: "center" }}>{actions}</div>}

      <ol className="wfa-steps" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {steps.map((s) => (
          <li key={s.name} className={`wfa-step ${s.state}`}>
            <span className="marker">
              <Icon
                name={s.icon ?? (s.state === "done" ? "check" : s.state === "active" ? "clock" : "circle")}
                size={14}
              />
            </span>
            <div>
              <div className="name">{s.name}</div>
              <div className="meta">{s.meta}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
