export function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

export function textOf(value: unknown): string {
  if (value == null) {
    return "";
  }
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (typeof value === "object" && "#text" in (value as Record<string, unknown>)) {
    return textOf((value as Record<string, unknown>)["#text"]);
  }
  return "";
}

export function parseDate(value: string | undefined | null): number {
  if (!value) {
    return Date.now();
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Date.now() : parsed;
}
