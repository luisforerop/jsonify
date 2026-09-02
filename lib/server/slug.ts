/**
 * Turn a human name into a URL slug: lowercase, trim, collapse every run of
 * non-alphanumeric characters into a single hyphen, and strip leading/trailing
 * hyphens. "Clean Fuel" -> "clean-fuel".
 */
export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
