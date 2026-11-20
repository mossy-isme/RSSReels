const UNITS: { limit: number; divisor: number; label: string }[] = [
  { limit: 60, divisor: 1, label: "s" },
  { limit: 60 * 60, divisor: 60, label: "m" },
  { limit: 60 * 60 * 24, divisor: 60 * 60, label: "h" },
  { limit: 60 * 60 * 24 * 7, divisor: 60 * 60 * 24, label: "d" },
  { limit: Infinity, divisor: 60 * 60 * 24 * 7, label: "w" },
];

export function relativeTime(epochMs: number): string {
  const diffSeconds = Math.max(0, Math.round((Date.now() - epochMs) / 1000));
  if (diffSeconds < 5) {
    return "just now";
  }
  const unit = UNITS.find((u) => diffSeconds < u.limit) ?? UNITS[UNITS.length - 1];
  const value = Math.max(1, Math.floor(diffSeconds / unit.divisor));
  return `${value}${unit.label} ago`;
}
