import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { withApiBase as withBase } from "./apiBase";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(withBase(url), {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

function buildRequestUrl(queryKey: readonly unknown[]): string {
  // Handle legacy single-string keys (e.g., ['/api/resource'] or ['/api/resource?param=value'])
  if (queryKey.length === 1 && typeof queryKey[0] === 'string') {
    return queryKey[0];
  }

  // Fallback to legacy join("/") behavior if all segments are strings with no objects
  const hasObject = queryKey.some(seg => typeof seg === 'object' && seg !== null);
  if (!hasObject && queryKey.every(seg => typeof seg === 'string' || typeof seg === 'number' || typeof seg === 'boolean')) {
    return queryKey.join("/") as string;
  }

  // Collect segments for the path
  const pathSegments: string[] = [];
  let params: Record<string, any> | null = null;

  for (let i = 0; i < queryKey.length; i++) {
    const segment = queryKey[i];
    
    if (typeof segment === 'object' && segment !== null) {
      // Only the last segment can be an object (for query parameters)
      if (i === queryKey.length - 1) {
        params = segment as Record<string, any>;
      } else {
        throw new Error(
          `Query key objects must be the final segment. Found object at index ${i} in query key of length ${queryKey.length}`
        );
      }
    } else if (segment !== null && segment !== undefined) {
      // For the first segment, keep it verbatim if it starts with '/'
      if (i === 0 && typeof segment === 'string' && segment.startsWith('/')) {
        pathSegments.push(segment);
      } else {
        // For other segments, trim leading slashes and percent-encode
        const stringSegment = String(segment).replace(/^\/+/, '');
        if (stringSegment) {
          pathSegments.push(encodeURIComponent(stringSegment));
        }
      }
    }
  }

  // Join path segments
  let url = pathSegments.join('/');
  // Add leading slash if not present
  if (!url.startsWith('/')) {
    url = '/' + url;
  }

  // Append query parameters if present
  if (params) {
    const searchParams = new URLSearchParams();
    // Flatten and coerce all values to strings
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        // Convert all values to strings (dates become ISO strings, primitives to String())
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += '?' + queryString;
    }
  }

  return url;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = buildRequestUrl(queryKey);
    const res = await fetch(withBase(url), {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
