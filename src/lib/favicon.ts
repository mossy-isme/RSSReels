export function deriveFaviconUrl(link: string): string | null {
  try {
    const { hostname } = new URL(link);
    return `https://${hostname}/favicon.ico`;
  } catch {
    return null;
  }
}
