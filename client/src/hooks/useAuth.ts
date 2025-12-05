import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

// Loads the logged-in user session and sends cookies with the request
async function fetchUser(): Promise<User | null> {
  const res = await fetch("/api/auth/user", {
    credentials: "include", // required to send session cookie
  });

  if (!res.ok) {
    return null; // Not logged in
  }

  return res.json();
}

export function useAuth() {
  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false, // avoid retrying 401 responses endlessly
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    reload: refetch, // useful for login/logouts
  };
}