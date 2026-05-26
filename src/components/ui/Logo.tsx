/* eslint-disable @next/next/no-img-element */
interface LogoProps {
  /**
   * Visual treatment.
   *   - `default`  — dark wordmark for light surfaces
   *   - `reversed` — white wordmark for dark surfaces (sidebars, hero)
   *   - `mark`     — image only, no wordmark (used as a favicon-style chip)
   * The TCCR mark is a single raster asset, so only the wordmark colour
   * differs between `default` and `reversed`.
   */
  variant?: "default" | "reversed" | "mark";
  height?: number;
  className?: string;
}

export function Logo({ variant = "default", height = 28, className }: LogoProps) {
  const wordmarkColor = variant === "reversed" ? "#FFFFFF" : "var(--color-primary)";
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        lineHeight: 1,
      }}
    >
      <img
        src="/tccr-logo.jpeg"
        alt="TCCR"
        style={{
          height,
          width: height,
          objectFit: "cover",
          borderRadius: 6,
          flexShrink: 0,
        }}
      />
      {variant !== "mark" && (
        <span
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 800,
            fontSize: Math.max(14, Math.round(height * 0.72)),
            letterSpacing: "0.02em",
            color: wordmarkColor,
            whiteSpace: "nowrap",
          }}
        >
          TCCR
        </span>
      )}
    </span>
  );
}
