const PUBLISHED_ORIGIN = "https://agenfloow.lovable.app";

/**
 * Origin that external people (clients scanning a QR Code) can actually open.
 * Editor preview / localhost origins are not publicly reachable, so we fall
 * back to the published domain in those cases.
 */
export function publicOrigin(): string {
  if (typeof window === "undefined") return PUBLISHED_ORIGIN;
  const { origin, hostname } = window.location;
  const isPrivate =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("id-preview--") ||
    hostname.endsWith(".lovableproject.com") ||
    hostname.endsWith("-dev.lovable.app");
  return isPrivate ? PUBLISHED_ORIGIN : origin;
}

export function bookingUrl(slug: string): string {
  return `${publicOrigin()}/salao/${slug}`;
}
