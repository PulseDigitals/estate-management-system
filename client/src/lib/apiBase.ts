const DEFAULT_API_BASE = "https://estate-management-system-ccbt.onrender.com";

// Central API base resolver for client-side links and fetches
export const API_BASE =
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_BASE_URL ||
  DEFAULT_API_BASE;

export function withApiBase(path: string): string {
  if (!path) return API_BASE;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;

  // Avoid double /api/api when the base already ends with /api and the path starts with /api
  const baseSansTrailingSlash = API_BASE.replace(/\/+$/, "");
  if (
    baseSansTrailingSlash.toLowerCase().endsWith("/api") &&
    normalized.toLowerCase().startsWith("/api/")
  ) {
    return `${baseSansTrailingSlash}${normalized.replace(/^\/api/, "")}`;
  }

  return `${baseSansTrailingSlash}${normalized}`;
}
