import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

export function ProtectedRoute({ children, allowedRoles, redirectTo = "/" }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && user) {
      // Check if user's role is allowed
      if (!user.role || !allowedRoles.includes(user.role)) {
        console.warn(`Access denied: User role '${user.role}' not in allowed roles:`, allowedRoles);
        setLocation(redirectTo);
      }
    }
  }, [user, isLoading, allowedRoles, redirectTo, setLocation]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  // If user doesn't have the required role, don't render anything
  // (useEffect will handle redirect)
  if (!user || !user.role || !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
