import { ReactNode, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[]; // optional now
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo = "/login",
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      // First check — user not logged in
      if (!isAuthenticated) {
        console.warn("Access denied: User not authenticated.");
        setLocation(redirectTo);
        return;
      }

      // Second check — role not permitted
      if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        console.warn(
          `Access denied: User role '${user.role}' not in allowed roles:`,
          allowedRoles
        );
        setLocation("/not-authorized");
      }
    }
  }, [isLoading, isAuthenticated, user, allowedRoles, redirectTo, setLocation]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  // Do not render page until access validated
  if (!isAuthenticated) return null;
  if (allowedRoles && user && !allowedRoles.includes(user.role)) return null;

  return <>{children}</>;
}
