/**
 * Capitalizes the first letter of each word in a name string.
 * Handles single names, multi-word names, hyphens, and international characters (e.g. Niño).
 * Preserves Anonymous / Anonymous Heartist and special system labels.
 */
export function formatCapitalizedName(value: string | null | undefined): string {
  if (!value || typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  const lower = trimmed.toLowerCase();
  if (lower === "anonymous" || lower === "anonymous heartist") {
    return "Anonymous Heartist";
  }

  if (lower === "systemerror" || lower === "system error" || lower === "system error (guest)") {
    return "System Error";
  }

  return trimmed
    .split(/(\s+|-|\.)/)
    .map((part) => {
      if (!part || /^\s+$/.test(part) || part === "-" || part === ".") return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join("");
}

/**
 * Formats a full name from first, middle, and last name components with proper capitalization.
 */
export function formatFullName(
  firstName?: string | null,
  lastName?: string | null,
  middleName?: string | null
): string {
  const parts = [
    firstName ? formatCapitalizedName(firstName) : "",
    middleName ? formatCapitalizedName(middleName) : "",
    lastName ? formatCapitalizedName(lastName) : ""
  ].filter(Boolean);

  return parts.join(" ");
}
