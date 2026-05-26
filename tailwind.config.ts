import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/application/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#152A24",
          2: "#1F3626",
        },
        accent: {
          DEFAULT: "#BCE955",
          hover: "#A8D43D",
        },
        body: {
          green: "#41574A",
        },
        page: "#FAFAFA",
        surface: {
          DEFAULT: "#FFFFFF",
          2: "#FAFAFA",
        },
        stroke: {
          DEFAULT: "#E5E5E5",
          2: "#F6F6F6",
        },
        "light-gray": "#EEF1EF",
        muted: "#A0ACA6",
        success: {
          DEFAULT: "#3DB55F",
          deep: "#15803D",
          bg: "#ECFDF0",
        },
        warning: {
          DEFAULT: "#D97706",
          bg: "#FEF9EC",
        },
        error: {
          DEFAULT: "#DC2626",
          deep: "#B91C1C",
          bg: "#FEF2F2",
        },
        info: {
          DEFAULT: "#0891B2",
          bg: "#F0FAFF",
        },
        archive: {
          DEFAULT: "#6B7280",
          bg: "#F3F4F6",
        },
        progress: {
          DEFAULT: "#1D4ED8",
          bg: "#EFF6FF",
        },
      },
      fontFamily: {
        heading: ["var(--font-heading)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "20px",
        "2xl": "24px",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(21, 42, 36, 0.05)",
        sm: "0 1px 3px 0 rgba(21, 42, 36, 0.08), 0 1px 2px -1px rgba(21, 42, 36, 0.06)",
        md: "0 4px 6px -1px rgba(21, 42, 36, 0.08), 0 2px 4px -2px rgba(21, 42, 36, 0.05)",
        lg: "0 10px 15px -3px rgba(21, 42, 36, 0.08), 0 4px 6px -4px rgba(21, 42, 36, 0.05)",
        xl: "0 20px 25px -5px rgba(21, 42, 36, 0.10), 0 8px 10px -6px rgba(21, 42, 36, 0.06)",
        card: "0 2px 8px 0 rgba(21, 42, 36, 0.08)",
        modal: "0 25px 50px -12px rgba(21, 42, 36, 0.25)",
      },
    },
  },
  plugins: [forms, typography],
};

export default config;
