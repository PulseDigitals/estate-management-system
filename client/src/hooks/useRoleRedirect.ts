import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

export function useRoleRedirect() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      console.log("Redirecting based on role:", user.role);

      const roleRoutes: Record<string, string> = {
        admin: "/admin/dashboard",
        resident: "/resident/home",
        accountant: "/accountant/dashboard",
        security: "/security/home",
      };

      const route = roleRoutes[user.role] || "/";

      navigate(route, { replace: true });
    }
  }, [isLoading, isAuthenticated, user, navigate]);
}

