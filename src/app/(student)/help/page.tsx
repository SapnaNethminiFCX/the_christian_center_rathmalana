"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export default function HelpPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Help &amp; Support</h1>
          <div className="greeting">Get answers from the team.</div>
        </div>
      </div>
      <div className="stub-card">
        <div className="stub-ico">
          <Icon name="life-buoy" size={28} />
        </div>
        <h2>Help centre coming soon.</h2>
        <p>
          Searchable docs, contact form and live chat hand-off will live on this page.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "center" }}>
          <Link href="/dashboard">
            <Button icon="arrow-left" variant="secondary">
              Back to dashboard
            </Button>
          </Link>
          <Link href="/my-courses">
            <Button iconAfter="arrow-right">Browse courses</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
