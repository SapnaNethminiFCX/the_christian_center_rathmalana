import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

export default function NotFound() {
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
      <Logo height={32} />
      <h1 style={{ fontSize: 56, margin: "12px 0 0" }}>404</h1>
      <p style={{ fontSize: 16, color: "var(--color-body-green)", margin: 0 }}>
        That page doesn&apos;t exist.
      </p>
      <Link href="/">
        <Button iconAfter="arrow-right">Back to home</Button>
      </Link>
    </div>
  );
}
