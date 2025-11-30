import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Receipt, Download, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { formatNaira } from "@/lib/currency";
import type { Bill, Payment } from "@shared/schema";

export default function Bills() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [downloadingBillId, setDownloadingBillId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  const { data: bills = [] } = useQuery<Bill[]>({
    queryKey: ["/api/resident/bills"],
    enabled: isAuthenticated,
  });

  const { data: payments = [] } = useQuery<Payment[]>({
    queryKey: ["/api/resident/payments"],
    enabled: isAuthenticated,
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      paid: { variant: "default" as const, icon: CheckCircle, className: "bg-green-500 hover:bg-green-600" },
      pending: { variant: "secondary" as const, icon: Clock, className: "bg-yellow-500 hover:bg-yellow-600" },
      overdue: { variant: "destructive" as const, icon: AlertCircle, className: "" },
    };
    const config = variants[status as keyof typeof variants] || variants.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const handleDownloadInvoice = async (billId: string, invoiceNumber: string) => {
    try {
      setDownloadingBillId(billId);

      const response = await fetch(`/api/resident/bills/${billId}/pdf`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to download invoice');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invoiceNumber || billId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Invoice downloaded successfully",
      });
    } catch (error) {
      console.error("Error downloading invoice:", error);
      toast({
        title: "Error",
        description: "Failed to download invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloadingBillId(null);
    }
  };

  const totalPaid = payments
    .filter(p => p.status === "completed")
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const totalPending = bills
    .filter(b => b.status !== "paid")
    .reduce((sum, b) => sum + parseFloat(b.amount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold">My Bills</h1>
        <p className="text-muted-foreground mt-1">View and manage your levy payments</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-green-600" data-testid="text-total-paid">
              {formatNaira(totalPaid)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Balance</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-yellow-600" data-testid="text-total-pending">
              {formatNaira(totalPending)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Outstanding amount</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bills</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold" data-testid="text-total-bills">
              {bills.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">All statements</p>
          </CardContent>
        </Card>
      </div>

      {/* Bills List */}
      <Card>
        <CardHeader>
          <CardTitle>All Bills</CardTitle>
          <CardDescription>Complete billing history</CardDescription>
        </CardHeader>
        <CardContent>
          {bills.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No bills yet</p>
              <p className="text-sm mt-1">Your levy statements will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bills.map((bill) => (
                <div
                  key={bill.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-lg border hover-elevate gap-4"
                  data-testid={`bill-${bill.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Receipt className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-semibold text-lg">{bill.description}</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <p>
                        Period: {new Date(bill.periodStart).toLocaleDateString()} - {new Date(bill.periodEnd).toLocaleDateString()}
                      </p>
                      <p>Due Date: {new Date(bill.dueDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-semibold">{formatNaira(bill.amount)}</p>
                      <div className="mt-1">{getStatusBadge(bill.status)}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleDownloadInvoice(bill.id, bill.invoiceNumber || '')}
                        disabled={downloadingBillId === bill.id}
                        data-testid={`button-download-${bill.id}`}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        {downloadingBillId === bill.id ? 'Downloading...' : 'Download'}
                      </Button>
                      {bill.status !== "paid" && (
                        <Button size="sm" data-testid={`button-pay-${bill.id}`}>
                          Pay Now
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>Your completed transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No payment history</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                  data-testid={`payment-${payment.id}`}
                >
                  <div className="flex-1">
                    <p className="font-medium">Payment #{payment.id.slice(0, 8)}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(payment.createdAt!).toLocaleDateString()} • {payment.paymentMethod}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatNaira(payment.amount)}</p>
                    <Badge variant={payment.status === "completed" ? "default" : "secondary"} className="mt-1">
                      {payment.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
