// Kit helpers shared across screens — avatars + course-cover gradients.
// Lifted from src/ui_structure/project/components.jsx so the same emblems
// and gradients render in the production build.

export const avatarUrl = (n: number) => `https://i.pravatar.cc/120?img=${n}`;

export type CoverKind = "math" | "sci" | "lit" | "soc" | "gen";

export const coverGradient = (kind: CoverKind = "gen"): string => {
  const map: Record<CoverKind, string> = {
    math: "linear-gradient(135deg, #2a4d3e 0%, #41574A 100%)",
    sci: "linear-gradient(135deg, #1F3626 0%, #2a5d3a 100%)",
    lit: "linear-gradient(135deg, #345244 0%, #5a7066 100%)",
    soc: "linear-gradient(135deg, #213c30 0%, #4a6356 100%)",
    gen: "linear-gradient(135deg, #2a4d3e 0%, #1F3626 100%)",
  };
  return map[kind];
};
