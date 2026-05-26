"use client";

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export function Toggle({ checked, onChange, disabled = false, label }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        position: "relative",
        display: "inline-flex",
        width: 44,
        height: 24,
        borderRadius: 9999,
        border: "none",
        background: checked ? "var(--color-accent, #BCE955)" : "var(--color-stroke, #E5E5E5)",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 150ms",
        opacity: disabled ? 0.5 : 1,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 23 : 3,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: checked ? "#152A24" : "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
          transition: "left 150ms, background 150ms",
        }}
      />
    </button>
  );
}
