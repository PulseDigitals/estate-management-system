import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Calendar, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";

interface BillingResult {
  success: number;
  failed: number;
  skipped: number;
  message: string;
  details?: Array<{
    residentId: string;
    status: 'success' | 'failed' | 'skipped';
    reason?: string;
  }>;
}

export default function AutomatedBillingPage() {
  const [lastResult, setLastResult] = useState<BillingResult | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generateBillsMutation = useMutation({
    mutationFn: async (): Promise<BillingResult> => {
      const response = await apiRequest("POST", "/api/admin/billing/generate-service-charges");
      const data = await response.json();
      return data as BillingResult;
    },
    onSuccess: (data) => {
      setLastResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/residents"] });
      
      toast({
        title: "Billing Generation Complete",
        description: data.message,
        variant: data.failed > 0 ? "default" : "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate automated bills",
        variant: "destructive",
      });
    },
  });

  const handleGenerateBills = () => {
    if (generateBillsMutation.isPending) return;
    
    if (confirm("This will generate service charge bills for all eligible residents. Continue?")) {
      generateBillsMutation.mutate();
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Automated Billing</h1>
        <p className="text-muted-foreground mt-1">
          Generate recurring service charge bills for registered residents
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Service Charge Billing
          </CardTitle>
          <CardDescription>
            This tool automatically generates 12-month service charge bills for all eligible residents.
            Bills are created based on each resident's registration start date and billing cycle.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>How it works</AlertTitle>
            <AlertDescription className="space-y-2 mt-2">
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>First bill: Generated from registration start date to 12 months later</li>
                <li>Subsequent bills: Generated from previous bill end date to 12 months later</li>
                <li>Each bill automatically creates a journal entry (Debit: AR, Credit: Estate Management Fund)</li>
                <li>In-app notifications are sent to residents</li>
                <li>Residents with no service charge amount or without registration dates are skipped</li>
                <li>Only active residents are eligible for automated billing</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="flex items-center gap-4">
            <Button
              onClick={handleGenerateBills}
              disabled={generateBillsMutation.isPending}
              size="lg"
              data-testid="button-generate-bills"
            >
              {generateBillsMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Bills...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Generate Service Charge Bills
                </>
              )}
            </Button>
          </div>

          {lastResult && (
            <div className="mt-6 space-y-3">
              <h3 className="font-semibold text-lg">Last Generation Result</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-300" data-testid="text-success-count">
                          {lastResult.success}
                        </p>
                        <p className="text-sm text-green-600 dark:text-green-400">Bills Generated</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                      <div>
                        <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300" data-testid="text-skipped-count">
                          {lastResult.skipped}
                        </p>
                        <p className="text-sm text-yellow-600 dark:text-yellow-400">Skipped</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                      <div>
                        <p className="text-2xl font-bold text-red-700 dark:text-red-300" data-testid="text-failed-count">
                          {lastResult.failed}
                        </p>
                        <p className="text-sm text-red-600 dark:text-red-400">Failed</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Alert>
                <AlertDescription className="text-sm">
                  {lastResult.message}
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            The following accounts must exist in the Chart of Accounts for automated billing to work:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>
              <strong>Accounts Receivable (AR)</strong> - Asset account type
            </li>
            <li>
              <strong>Estate Management Fund</strong> - Liability account type
            </li>
          </ul>
          <p className="text-sm text-muted-foreground mt-3">
            If these accounts do not exist, billing generation will fail. Please create them in the Chart of Accounts page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
