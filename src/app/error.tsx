"use client";

import { Button } from "@/components/ui/Button";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        padding: 24,
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: 40, margin: 0 }}>Something went wrong.</h1>
      <p style={{ fontSize: 16, color: "var(--color-body-green)", margin: 0 }}>
        Try again, or refresh the page.
      </p>
      <Button onClick={reset} iconAfter="arrow-right">
        Try again
      </Button>
    </div>
  );
}
