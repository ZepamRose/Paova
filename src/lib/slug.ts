/** Convert a string into a URL-safe slug. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** A short, reasonably unique suffix for public slugs. */
export function shortId(length = 8): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, length);
}
