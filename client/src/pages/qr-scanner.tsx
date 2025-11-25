import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { QrCode, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function QRScanner() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [accessCode, setAccessCode] = useState("");
  const [verificationResult, setVerificationResult] = useState<any>(null);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== "security")) {
      toast({
        title: "Unauthorized",
        description: "Security access required",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  const verifyMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/security/verify", { accessCode: code });
      return response.json();
    },
    onSuccess: (data) => {
      setVerificationResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/security/logs/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/security/visitors/today"] });
      
      if (data.valid) {
        toast({
          title: "Access Granted",
          description: `${data.visitor.visitorName} verified successfully`,
        });
      } else {
        toast({
          title: "Access Denied",
          description: data.reason || "Invalid or expired access code",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to verify access code",
        variant: "destructive",
      });
      setVerificationResult({ valid: false, reason: "Verification failed" });
    },
  });

  if (isLoading || !isAuthenticated || user?.role !== "security") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessCode.trim()) {
      verifyMutation.mutate(accessCode.trim());
    }
  };

  const handleReset = () => {
    setAccessCode("");
    setVerificationResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold">QR Code Scanner</h1>
        <p className="text-muted-foreground mt-1">Verify visitor access codes at the gate</p>
      </div>

      {/* Scanner Card */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-6 w-6" />
            Access Code Verification
          </CardTitle>
          <CardDescription>
            Scan the visitor's QR code or enter the access code manually
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Manual Input Form */}
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accessCode">Access Code</Label>
              <Input
                id="accessCode"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                placeholder="Enter access code..."
                className="text-lg font-mono"
                autoFocus
                data-testid="input-access-code"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={!accessCode.trim() || verifyMutation.isPending}
              data-testid="button-verify"
            >
              {verifyMutation.isPending ? "Verifying..." : "Verify Access Code"}
            </Button>
          </form>

          {/* Verification Result */}
          {verificationResult && (
            <div className={`p-6 rounded-lg border-2 ${
              verificationResult.valid 
                ? "border-green-500 bg-green-50 dark:bg-green-950" 
                : "border-red-500 bg-red-50 dark:bg-red-950"
            }`}>
              <div className="flex items-center gap-3 mb-4">
                {verificationResult.valid ? (
                  <>
                    <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                    <div>
                      <h3 className="text-xl font-semibold text-green-900 dark:text-green-100">
                        Access Granted
                      </h3>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Visitor verified successfully
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                    <div>
                      <h3 className="text-xl font-semibold text-red-900 dark:text-red-100">
                        Access Denied
                      </h3>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        {verificationResult.reason || "Invalid access code"}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {verificationResult.valid && verificationResult.visitor && (
                <div className="space-y-3 mt-4 p-4 bg-white dark:bg-gray-900 rounded-lg">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Visitor Name</p>
                      <p className="font-semibold" data-testid="text-visitor-name">
                        {verificationResult.visitor.visitorName}
                      </p>
                    </div>
                    {verificationResult.visitor.visitorPhone && (
                      <div>
                        <p className="text-muted-foreground">Phone</p>
                        <p className="font-semibold">{verificationResult.visitor.visitorPhone}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground">Visiting Unit</p>
                      <p className="font-semibold" data-testid="text-unit-number">
                        {verificationResult.unitNumber || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Valid Until</p>
                      <p className="font-semibold">
                        {new Date(verificationResult.visitor.validUntil).toLocaleString()}
                      </p>
                    </div>
                    {verificationResult.visitor.purpose && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Purpose</p>
                        <p className="font-semibold">{verificationResult.visitor.purpose}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Button
                onClick={handleReset}
                className="w-full mt-4"
                variant="outline"
                data-testid="button-reset"
              >
                Scan Another Code
              </Button>
            </div>
          )}

          {/* Instructions */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="text-sm space-y-1">
                <p className="font-medium">Verification Instructions</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Ask the visitor to show their QR code</li>
                  <li>Scan the code or enter the access code manually</li>
                  <li>Verify the visitor's identity matches the displayed information</li>
                  <li>Grant entry if all details are correct and code is valid</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
