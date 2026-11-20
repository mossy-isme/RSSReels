function hashString(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function gradientColors(seed: string): readonly [string, string] {
  const hash = hashString(seed || "rssreels");
  const hue = hash % 360;
  const secondHue = (hue + 40) % 360;
  return [`hsl(${hue}, 55%, 35%)`, `hsl(${secondHue}, 55%, 18%)`] as const;
}
