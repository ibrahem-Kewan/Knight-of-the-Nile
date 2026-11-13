// Dynamic route params are NOT decoded in Next 15 + next-intl middleware:
// an Arabic slug ("بطولة-ab12") arrives as "%D8%A8...-ab12", so `.eq("slug", slug)`
// never matches and the detail page 404s. Always decode before querying.
export function decodeSlug(raw: string): string {
  try {
    return decodeURIComponent(raw).normalize("NFC");
  } catch {
    return raw; // malformed escape sequence: query as-is (will simply not match)
  }
}
