// Shared UI utilities for consistent styling across the app

// Position styling for player positions (1=GK, 2=DEF, 3=MID, 4=FWD)
export const positionStyles: Record<
  number,
  { bg: string; text: string; border: string }
> = {
  1: {
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
  2: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
  },
  3: { bg: "bg-sky-500/15", text: "text-sky-400", border: "border-sky-500/30" },
  4: {
    bg: "bg-rose-500/15",
    text: "text-rose-400",
    border: "border-rose-500/30",
  },
};

export const positionLabels = ["", "GK", "DEF", "MID", "FWD"];

// Form color based on form rating (0-10 scale)
export function getFormColor(form: number): string {
  if (form >= 7) return "text-emerald-400";
  if (form >= 5) return "text-lime-400";
  if (form >= 3) return "text-amber-400";
  if (form >= 1) return "text-orange-400";
  return "text-red-400";
}

// Form style with background and width for visual bars
export function getFormStyle(form: number): {
  text: string;
  bg: string;
  width: string;
} {
  const width = `${Math.min((form / 10) * 100, 100)}%`;
  if (form >= 7)
    return { text: "text-emerald-400", bg: "bg-emerald-500", width };
  if (form >= 5) return { text: "text-lime-400", bg: "bg-lime-500", width };
  if (form >= 3) return { text: "text-amber-400", bg: "bg-amber-500", width };
  if (form >= 1) return { text: "text-orange-400", bg: "bg-orange-500", width };
  return { text: "text-red-400", bg: "bg-red-500", width };
}

// Difficulty color for FDR (1-5 scale)
export function getDifficultyColor(difficulty: number): string {
  if (difficulty <= 2) return "bg-emerald-500";
  if (difficulty === 3) return "bg-amber-500";
  if (difficulty === 4) return "bg-orange-500";
  return "bg-red-500";
}

// FDR color with text variant
export function getFDRStyle(fdr: number): { bg: string; text: string } {
  if (fdr <= 2) return { bg: "bg-emerald-500", text: "text-emerald-400" };
  if (fdr <= 2.5) return { bg: "bg-lime-500", text: "text-lime-400" };
  if (fdr <= 3) return { bg: "bg-amber-500", text: "text-amber-400" };
  if (fdr <= 3.5) return { bg: "bg-orange-500", text: "text-orange-400" };
  return { bg: "bg-rose-500", text: "text-rose-400" };
}

// Ownership color based on percentage
export function getOwnershipStyle(ownership: number): string {
  if (ownership >= 50) return "text-purple-400";
  if (ownership >= 25) return "text-blue-400";
  if (ownership >= 10) return "text-foreground/70";
  return "text-muted-foreground";
}

// Rank impact styling
export function getRankImpactStyle(impact: string): {
  bg: string;
  text: string;
  border: string;
} {
  switch (impact) {
    case "high":
      return {
        bg: "bg-emerald-500/15",
        text: "text-emerald-400",
        border: "border-emerald-500/30",
      };
    case "medium":
      return {
        bg: "bg-amber-500/15",
        text: "text-amber-400",
        border: "border-amber-500/30",
      };
    default:
      return {
        bg: "bg-muted",
        text: "text-muted-foreground",
        border: "border-border",
      };
  }
}
