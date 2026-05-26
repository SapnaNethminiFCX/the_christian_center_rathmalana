interface Props {
  variant?: "default" | "reversed";
}

/**
 * TCCR wordmark used in the public TopNav, auth pages, and footer.
 * Renders the lime-on-dark "T" mark plus the "TCCR" wordmark.
 * Mirrors src/ui_structure/v2/project/tccr-components.jsx (TLogo).
 */
export function TccrWordmark({ variant = "default" }: Props) {
  return (
    <span className={`tccr-wordmark${variant === "reversed" ? " tccr-wordmark--reversed" : ""}`}>
      <span className="mark">T</span>
      <span className="name">TCCR</span>
    </span>
  );
}
