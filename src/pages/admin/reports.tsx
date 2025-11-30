import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { useLocation } from "wouter";

interface DashboardStats {
  totalResidents: number;
  activeResidents: number;
  delinquentResidents: number;
  totalRevenue: number;
  collectionsThisMonth: number;
  pendingPayments: number;
  overdueBills: number;
  collectionRate: number;
  activeVisitors: number;
  totalExpenses: number;
  paidExpenses: number;
  approvedExpenses: number;
  pendingExpenses: number;
  accountsPayable: number;
}

const formatNaira = (amount: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(amount);
};

export default function AdminReports() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location] = useLocation();
  
  // Get report type from URL query params
  const urlParams = new URLSearchParams(window.location.search);
  const reportType = urlParams.get('type');

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/admin/stats'],
    enabled: isAuthenticated && user?.role === "admin",
  });

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== "admin")) {
      toast({
        title: "Unauthorized",
        description: "Admin access required",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  if (isLoading || !isAuthenticated || user?.role !== "admin") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const renderReport = () => {
    if (!stats) {
      return (
        <div className="text-center py-12">
          <p>Loading report data...</p>
        </div>
      );
    }

    const totalCollections = stats.totalRevenue || 0;
    const totalExpenses = stats.totalExpenses || 0;
    const paidExpenses = stats.paidExpenses || 0;
    const accountsReceivable = stats.pendingPayments || 0;
    const arOverdue = stats.overdueBills || 0;
    const accountsPayable = stats.accountsPayable || 0;
    const apPending = stats.pendingExpenses || 0;
    const apApproved = stats.approvedExpenses || 0;
    const currentBalance = accountsReceivable - arOverdue;

    switch (reportType) {
      case 'collections':
        return (
          <div className="space-y-6">
            <div className="border-b pb-4">
              <h1 className="text-3xl font-bold">Collections Report</h1>
              <p className="text-muted-foreground mt-2">Total Payments Received</p>
              <p className="text-sm text-muted-foreground">
                Generated: {new Date().toLocaleDateString('en-NG', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>

            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-600">Total Collections</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-green-600">
                    {formatNaira(totalCollections)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-muted-foreground">Total Residents</span>
                      <span className="font-semibold">{stats.totalResidents}</span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-muted-foreground">Active Residents</span>
                      <span className="font-semibold">{stats.activeResidents}</span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-muted-foreground">Outstanding Balance</span>
                      <span className="font-semibold">{formatNaira(accountsReceivable)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-muted-foreground">Collection Rate</span>
                      <span className="font-semibold">{stats.collectionRate}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'expenses':
        return (
          <div className="space-y-6">
            <div className="border-b pb-4">
              <h1 className="text-3xl font-bold">Total Expenses Report</h1>
              <p className="text-muted-foreground mt-2">Approved Estate Expenses</p>
              <p className="text-sm text-muted-foreground">
                Generated: {new Date().toLocaleDateString('en-NG', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>

            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600">Total Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-red-600">
                    {formatNaira(totalExpenses)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Expense Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-muted-foreground">Approved Expenses</span>
                      <span className="font-semibold">{formatNaira(totalExpenses)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-muted-foreground">Paid Expenses</span>
                      <span className="font-semibold">{formatNaira(paidExpenses)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-muted-foreground">Remaining to Pay</span>
                      <span className="font-semibold">{formatNaira(totalExpenses - paidExpenses)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'ar':
        return (
          <div className="space-y-6">
            <div className="border-b pb-4">
              <h1 className="text-3xl font-bold">Accounts Receivable Report</h1>
              <p className="text-muted-foreground mt-2">Outstanding Resident Bills</p>
              <p className="text-sm text-muted-foreground">
                Generated: {new Date().toLocaleDateString('en-NG', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>

            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-blue-600">Total Accounts Receivable</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-blue-600">
                    {formatNaira(accountsReceivable)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>AR Aging</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-muted-foreground">Current Balance</span>
                      <span className="font-semibold">{formatNaira(currentBalance)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-muted-foreground">Overdue Amount</span>
                      <span className="font-semibold text-red-600">{formatNaira(arOverdue)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-muted-foreground">Total Outstanding</span>
                      <span className="font-semibold">{formatNaira(accountsReceivable)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-muted-foreground">Delinquent Residents</span>
                      <span className="font-semibold">{stats.delinquentResidents}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'ap':
        return (
          <div className="space-y-6">
            <div className="border-b pb-4">
              <h1 className="text-3xl font-bold">Accounts Payable Report</h1>
              <p className="text-muted-foreground mt-2">Outstanding Vendor Payments</p>
              <p className="text-sm text-muted-foreground">
                Generated: {new Date().toLocaleDateString('en-NG', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>

            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-orange-600">Total Accounts Payable</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-orange-600">
                    {formatNaira(accountsPayable)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payables Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-muted-foreground">Pending Approval</span>
                      <span className="font-semibold">{formatNaira(apPending)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-muted-foreground">Approved (Unpaid)</span>
                      <span className="font-semibold">{formatNaira(apApproved)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-muted-foreground">Total Payable</span>
                      <span className="font-semibold">{formatNaira(accountsPayable)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">Please select a report type from the dashboard.</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-semibold">Financial Reports</h1>
          <p className="text-muted-foreground mt-1">View and print detailed reports</p>
        </div>
        {reportType && (
          <Button onClick={handlePrint} data-testid="button-print-report">
            <Printer className="h-4 w-4 mr-2" />
            Print / Save as PDF
          </Button>
        )}
      </div>

      <div className="print:p-8">
        {statsLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        ) : (
          renderReport()
        )}
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:p-8, .print\\:p-8 * {
            visibility: visible;
          }
          .print\\:p-8 {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
