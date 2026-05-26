/* eslint-disable @next/next/no-img-element */
import { Icon } from "./Icon";

interface CourseCoverProps {
  /** Real image URL from API. Falls back to generated visual when null/empty. */
  imageUrl?: string | null;
  /** Course title — used to deterministically pick color + icon + initials. */
  title?: string;
  /** Optional pill tag rendered in the top-left corner. */
  tag?: string;
  /** Alt text when imageUrl is used. */
  alt?: string;
}

/** Curated palette of two-stop gradients — used when no image is provided. */
const GRADIENTS = [
  "linear-gradient(135deg, #2a4d3e 0%, #41574A 100%)",       // forest
  "linear-gradient(135deg, #1F3626 0%, #2a5d3a 100%)",       // deep moss
  "linear-gradient(135deg, #345244 0%, #5a7066 100%)",       // sage
  "linear-gradient(135deg, #213c30 0%, #4a6356 100%)",       // pine
  "linear-gradient(135deg, #1e3a5f 0%, #2d5a8f 100%)",       // navy
  "linear-gradient(135deg, #3d2a4d 0%, #5a3d6e 100%)",       // plum
  "linear-gradient(135deg, #4d3a2a 0%, #6e5a3d 100%)",       // bronze
  "linear-gradient(135deg, #1a4a4a 0%, #2a6e6e 100%)",       // teal
];

/** Curated set of icons that fit course themes. */
const ICONS = [
  "book-open",
  "layers",
  "code-2",
  "brain-circuit",
  "terminal",
  "bar-chart-3",
  "database",
  "cpu",
  "target",
  "compass",
  "shield",
  "graduation-cap",
];

const SKIP_WORDS = new Set([
  "of", "for", "the", "and", "to", "in", "a", "an", "on", "at", "by", "with",
]);

/** Stable string hash → non-negative integer */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Generate 1–2 character initials from a course title.
 * - "Local Test Course"          → "LT"
 * - "SQL for Analytics"          → "SA"
 * - "Python"                     → "PY"
 */
function getInitials(title: string): string {
  const words = title
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z]/g, ""))
    .filter((w) => w.length > 0 && !SKIP_WORDS.has(w.toLowerCase()));

  if (words.length === 0) {
    return title.replace(/\s+/g, "").slice(0, 2).toUpperCase() || "C";
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function CourseCover({ imageUrl, title, tag, alt }: CourseCoverProps) {
  // Treat `blob:` URLs as missing — those are browser-session-only references
  // left over from an earlier broken upload flow that never POSTed to storage.
  // They always 404 in any subsequent session, so fall through to the gradient.
  const usable = imageUrl && !imageUrl.startsWith("blob:");
  if (usable) {
    return (
      <div className="cover">
        <img
          src={imageUrl}
          alt={alt ?? tag ?? title ?? "Course cover"}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        {tag && <span className="tag">{tag}</span>}
      </div>
    );
  }

  const safeTitle = title || "Course";
  const hash = hashString(safeTitle.toLowerCase());
  const gradient = GRADIENTS[hash % GRADIENTS.length];
  const iconName = ICONS[Math.floor(hash / GRADIENTS.length) % ICONS.length];
  const initials = getInitials(safeTitle);

  return (
    <div className="cover" style={{ background: gradient }}>
      {/* Large decorative icon — top-right, low opacity */}
      <div
        style={{
          position: "absolute",
          top: -20,
          right: -20,
          opacity: 0.12,
          color: "#BCE955",
          pointerEvents: "none",
          transform: "rotate(-12deg)",
        }}
      >
        <Icon name={iconName} size={180} strokeWidth={1.5} />
      </div>

      {/* Subtle dot pattern overlay for texture */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(rgba(188,233,85,0.08) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
          pointerEvents: "none",
        }}
      />

      {/* Initials — bottom-left, prominent */}
      <div
        style={{
          position: "absolute",
          bottom: 16,
          left: 18,
          display: "flex",
          alignItems: "center",
          gap: 10,
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 56,
            height: 56,
            borderRadius: 14,
            background: "rgba(188,233,85,0.18)",
            border: "1.5px solid rgba(188,233,85,0.35)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            color: "#BCE955",
            fontFamily: "var(--font-heading)",
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: "-0.02em",
            userSelect: "none",
          }}
        >
          {initials}
        </span>
        <span
          style={{
            color: "rgba(255,255,255,0.75)",
            fontFamily: "var(--font-body)",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            userSelect: "none",
          }}
        >
          Course
        </span>
      </div>

      {tag && <span className="tag">{tag}</span>}
    </div>
  );
}
