import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, UserPlus, LogIn } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface InviteData {
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  unitNumber?: string;
}

const API_BASE = import.meta.env.VITE_API_BASE || "";
const withBase = (path: string) =>
  path.startsWith("http://") || path.startsWith("https://") ? path : `${API_BASE}${path}`;

export default function InviteLanding() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  const { data: inviteData, isLoading, error: queryError } = useQuery({
    queryKey: [`/api/invite/${token}`],
    enabled: !!token,
    select: (data) => data as InviteData,
  });

  useEffect(() => {
    if (queryError) {
      setError("This invite link is invalid, expired, or has already been used.");
    }
  }, [queryError]);

  const handleSignIn = async () => {
    try {
      // Store invite token in session storage so it's available after auth redirect
      if (token) {
        // First, store the token in the session via API
        const response = await fetch(withBase('/api/store-invite-token'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inviteToken: token }),
          credentials: 'include',
        });

        if (response.ok) {
          // Redirect to Replit Auth login
          window.location.href = withBase('/api/login');
        } else {
          setError('Failed to process invite. Please try again.');
        }
      }
    } catch (err) {
      console.error('Error processing invite:', err);
      setError('Failed to process invite. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">Validating invite...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || queryError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle className="text-center">Invalid Invite</CardTitle>
            <CardDescription className="text-center">
              {error || "This invite link is invalid, expired, or has already been used."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => setLocation('/')}
              data-testid="button-back-home"
            >
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!inviteData) {
    return null;
  }

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'resident':
        return 'Resident';
      case 'security':
        return 'Security Personnel';
      case 'accountant':
        return 'Accountant';
      default:
        return role;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto mb-4">
            <UserPlus className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-center text-2xl" data-testid="heading-invite-title">
            Welcome to Magodo Estate
          </CardTitle>
          <CardDescription className="text-center">
            You've been invited to join the estate management system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Invite Details</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Email:</span>
                  <span className="text-sm font-medium" data-testid="text-invite-email">
                    {inviteData.email}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Role:</span>
                  <Badge variant="secondary" data-testid="badge-invite-role">
                    {getRoleName(inviteData.role)}
                  </Badge>
                </div>
                {inviteData.firstName && inviteData.lastName && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Name:</span>
                    <span className="text-sm font-medium" data-testid="text-invite-name">
                      {inviteData.firstName} {inviteData.lastName}
                    </span>
                  </div>
                )}
                {inviteData.unitNumber && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Unit:</span>
                    <span className="text-sm font-medium" data-testid="text-invite-unit">
                      {inviteData.unitNumber}
                    </span>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>

          <Alert className="border-primary/50 bg-primary/5">
            <LogIn className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary">Sign-In Instructions</AlertTitle>
            <AlertDescription className="text-sm space-y-2">
              <p className="font-semibold">This system uses Replit Auth (OAuth)</p>
              <p>NOT traditional username/password login</p>
              
              <div className="mt-3 space-y-2">
                <p><strong>Step 1:</strong> Click the button below</p>
                <p><strong>Step 2:</strong> Sign in with ONE of these:</p>
                <ul className="list-disc list-inside pl-2 space-y-1">
                  <li>Google (if your email is a Google account)</li>
                  <li>GitHub</li>
                  <li>Email (magic link)</li>
                </ul>
                <p className="pt-2 text-primary font-semibold">
                  IMPORTANT: You MUST use an account with email: {inviteData.email}
                </p>
                <p className="text-xs">
                  Don't have a Replit account with this email? Create one at replit.com first
                </p>
              </div>
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <Button
              className="w-full"
              size="lg"
              onClick={handleSignIn}
              data-testid="button-accept-invite"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Continue to Replit Sign-In
            </Button>
            
            <p className="text-xs text-center text-muted-foreground">
              After signing in, you'll receive <strong>{getRoleName(inviteData.role)}</strong> access
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
