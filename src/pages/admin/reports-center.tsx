import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar,
  Download,
  Eye,
  BarChart3,
  PieChart,
  FileBarChart,
  Clock,
  UserCheck,
  Receipt,
  Wallet
} from "lucide-react";
import { format } from "date-fns";
import { convertToCSV, downloadCSV, formatCurrencyForCSV, formatDateForCSV } from "@/lib/csv-export";
import { useToast } from "@/hooks/use-toast";

type ReportCategory = "operational" | "financial" | "accounting";

interface Report {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  icon: any;
  endpoint: string;
  isExternal?: boolean;
  externalPath?: string;
}

const reports: Report[] = [
  // Operational Reports
  {
    id: "visitor-activity",
    title: "Visitor Activity Report",
    description: "Summary of visitor entries, approvals, and access patterns",
    category: "operational",
    icon: UserCheck,
    endpoint: "/api/admin/reports/visitor-activity"
  },
  {
    id: "account-status",
    title: "Resident Account Status",
    description: "Overview of all resident accounts and their current status",
    category: "operational",
    icon: Users,
    endpoint: "/api/admin/reports/account-status"
  },
  {
    id: "overdue-bills",
    title: "Overdue Bills Report",
    description: "All bills past their due date with aging analysis",
    category: "operational",
    icon: Clock,
    endpoint: "/api/admin/reports/overdue-bills"
  },
  
  // Financial Reports
  {
    id: "collections-summary",
    title: "Collections Summary",
    description: "Total collections by period with payment method breakdown",
    category: "financial",
    icon: DollarSign,
    endpoint: "/api/admin/reports/collections-summary"
  },
  {
    id: "revenue-analysis",
    title: "Revenue Analysis",
    description: "Revenue trends, billing vs collections comparison",
    category: "financial",
    icon: TrendingUp,
    endpoint: "/api/admin/reports/revenue-analysis"
  },
  {
    id: "ar-aging",
    title: "Accounts Receivable Aging",
    description: "Outstanding receivables organized by aging buckets",
    category: "financial",
    icon: Receipt,
    endpoint: "/api/admin/reports/ar-aging"
  },
  {
    id: "cash-flow",
    title: "Cash Flow Report",
    description: "Cash inflows from collections, outflows from expenses, and net cash position",
    category: "financial",
    icon: Wallet,
    endpoint: "/api/admin/reports/cash-flow"
  },
  {
    id: "resident-service-charge-summary",
    title: "Resident Service Charge Summary",
    description: "Comprehensive view of service charges, payments, and outstanding balances per resident",
    category: "financial",
    icon: Users,
    endpoint: "/api/admin/reports/resident-service-charge-summary"
  },
  
  // Accounting Reports
  {
    id: "income-statement",
    title: "Income Statement",
    description: "Comprehensive profit & loss statement",
    category: "accounting",
    icon: FileBarChart,
    endpoint: "",
    isExternal: true,
    externalPath: "/accountant/income-statement"
  },
  {
    id: "balance-sheet",
    title: "Balance Sheet",
    description: "Assets, liabilities, and equity snapshot",
    category: "accounting",
    icon: BarChart3,
    endpoint: "",
    isExternal: true,
    externalPath: "/accountant/balance-sheet"
  },
  {
    id: "trial-balance",
    title: "Trial Balance",
    description: "List of all accounts with debit and credit balances",
    category: "accounting",
    icon: FileText,
    endpoint: "",
    isExternal: true,
    externalPath: "/accountant/trial-balance"
  },
  {
    id: "budget-performance",
    title: "Budget Performance",
    description: "Budget vs actual spending with variance analysis",
    category: "accounting",
    icon: PieChart,
    endpoint: "/api/admin/reports/budget-performance"
  },
  {
    id: "expense-report",
    title: "Expense Report",
    description: "Detailed listing of all expenses with vendor, category, approval and payment status",
    category: "accounting",
    icon: Receipt,
    endpoint: "/api/admin/reports/expense-report"
  }
];

export default function ReportsCenter() {
  const [, setLocation] = useLocation();
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<ReportCategory>("operational");

  const handleGenerateReport = (report: Report) => {
    if (report.isExternal && report.externalPath) {
      setLocation(report.externalPath);
    } else {
      setSelectedReport(report);
      setReportDialogOpen(true);
    }
  };

  const operationalReports = reports.filter(r => r.category === "operational");
  const financialReports = reports.filter(r => r.category === "financial");
  const accountingReports = reports.filter(r => r.category === "accounting");

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports Center</h1>
        <p className="text-muted-foreground mt-2">
          Generate operational, financial, and accounting reports for estate management
        </p>
      </div>

      <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as ReportCategory)}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="operational" data-testid="tab-operational-reports">
            Operational
            <Badge variant="secondary" className="ml-2">{operationalReports.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="financial" data-testid="tab-financial-reports">
            Financial
            <Badge variant="secondary" className="ml-2">{financialReports.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="accounting" data-testid="tab-accounting-reports">
            Accounting
            <Badge variant="secondary" className="ml-2">{accountingReports.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="operational" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {operationalReports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onGenerate={() => handleGenerateReport(report)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {financialReports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onGenerate={() => handleGenerateReport(report)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="accounting" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accountingReports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onGenerate={() => handleGenerateReport(report)}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Report Viewer Dialog */}
      {selectedReport && !selectedReport.isExternal && (
        <ReportViewerDialog
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          report={selectedReport}
        />
      )}
    </div>
  );
}

function ReportCard({ report, onGenerate }: { report: Report; onGenerate: () => void }) {
  const Icon = report.icon;
  
  return (
    <Card className="hover-elevate" data-testid={`card-report-${report.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">{report.title}</CardTitle>
            </div>
          </div>
        </div>
        <CardDescription className="mt-2">{report.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          className="w-full"
          onClick={onGenerate}
          data-testid={`button-generate-${report.id}`}
        >
          <Eye className="h-4 w-4 mr-2" />
          {report.isExternal ? "View Report" : "Generate Report"}
        </Button>
      </CardContent>
    </Card>
  );
}

function ReportViewerDialog({ 
  open, 
  onOpenChange, 
  report 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  report: Report;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: [report.endpoint],
    enabled: open && !!report.endpoint
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" data-testid={`dialog-report-${report.id}`}>
        <DialogHeader>
          <DialogTitle>{report.title}</DialogTitle>
          <DialogDescription>{report.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="mt-4 text-muted-foreground">Generating report...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              <p className="text-lg font-medium">Error loading report</p>
              <p className="text-sm mt-2">Please try again later</p>
            </div>
          ) : (
            <ReportRenderer report={report} data={data} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReportRenderer({ report, data }: { report: Report; data: any }) {
  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
        <p>No data available for this report</p>
      </div>
    );
  }

  // Render different report types based on report ID
  switch (report.id) {
    case "visitor-activity":
      return <VisitorActivityReport data={data} reportId={report.id} />;
    case "account-status":
      return <AccountStatusReport data={data} reportId={report.id} />;
    case "overdue-bills":
      return <OverdueBillsReport data={data} reportId={report.id} />;
    case "collections-summary":
      return <CollectionsSummaryReport data={data} reportId={report.id} />;
    case "revenue-analysis":
      return <RevenueAnalysisReport data={data} reportId={report.id} />;
    case "ar-aging":
      return <ARAgingReport data={data} reportId={report.id} />;
    case "cash-flow":
      return <CashFlowReport data={data} reportId={report.id} />;
    case "resident-service-charge-summary":
      return <ResidentServiceChargeSummaryReport data={data} />;
    case "budget-performance":
      return <BudgetPerformanceReport data={data} reportId={report.id} />;
    case "expense-report":
      return <ExpenseReportComponent data={data} />;
    default:
      return <GenericReport data={data} />;
  }
}

// Individual Report Components
function VisitorActivityReport({ data, reportId }: { data: any; reportId: string }) {
  const { toast } = useToast();
  
  const handleExportCSV = () => {
    if (!data.visitors || data.visitors.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no visitor records to export.",
        variant: "destructive"
      });
      return;
    }
    
    const csvData = data.visitors.map((visitor: any) => ({
      'Visitor Name': visitor.visitorName,
      'Resident': visitor.residentName,
      'Date': formatDateForCSV(visitor.visitDate),
      'Status': visitor.status,
      'Access Code': visitor.accessCode || ''
    }));
    
    const csv = convertToCSV(csvData);
    downloadCSV(csv, `visitor-activity-report-${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleExportCSV} variant="outline" size="sm" data-testid="button-download-csv">
          <Download className="h-4 w-4 mr-2" />
          Download CSV
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Visitors</CardDescription>
            <CardTitle className="text-2xl">{data.summary?.totalVisitors || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Approved</CardDescription>
            <CardTitle className="text-2xl text-green-600">{data.summary?.approved || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">{data.summary?.pending || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Rejected</CardDescription>
            <CardTitle className="text-2xl text-red-600">{data.summary?.rejected || 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {data.visitors && data.visitors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Visitor Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Visitor Name</TableHead>
                  <TableHead>Resident</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Access Code</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.visitors.map((visitor: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{visitor.visitorName}</TableCell>
                    <TableCell>{visitor.residentName}</TableCell>
                    <TableCell>{format(new Date(visitor.visitDate), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      <Badge variant={
                        visitor.status === "approved" ? "default" : 
                        visitor.status === "rejected" ? "destructive" : "secondary"
                      }>
                        {visitor.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{visitor.accessCode || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AccountStatusReport({ data, reportId }: { data: any; reportId: string }) {
  const { toast } = useToast();
  
  const handleExportCSV = () => {
    if (!data.residents || data.residents.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no resident records to export.",
        variant: "destructive"
      });
      return;
    }
    
    const csvData = data.residents.map((resident: any) => ({
      'Name': resident.name,
      'Unit': resident.unitNumber,
      'Status': resident.accountStatus,
      'Balance': formatCurrencyForCSV(resident.balance || 0),
      'Overdue Bills': resident.overdueBills || 0
    }));
    
    const csv = convertToCSV(csvData);
    downloadCSV(csv, `account-status-report-${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleExportCSV} variant="outline" size="sm" data-testid="button-download-csv">
          <Download className="h-4 w-4 mr-2" />
          Download CSV
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Residents</CardDescription>
            <CardTitle className="text-2xl">{data.summary?.totalResidents || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-2xl text-green-600">{data.summary?.active || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Delinquent</CardDescription>
            <CardTitle className="text-2xl text-red-600">{data.summary?.delinquent || 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {data.residents && data.residents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resident Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Overdue Bills</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.residents.map((resident: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{resident.name}</TableCell>
                    <TableCell>{resident.unitNumber}</TableCell>
                    <TableCell>
                      <Badge variant={resident.accountStatus === "active" ? "default" : "destructive"}>
                        {resident.accountStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className={resident.balance > 0 ? "text-red-600 font-semibold" : ""}>
                      ₦{parseFloat(resident.balance || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>{resident.overdueBills || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function OverdueBillsReport({ data, reportId }: { data: any; reportId: string }) {
  const { toast } = useToast();
  
  const handleExportCSV = () => {
    if (!data.bills || data.bills.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no overdue bills to export.",
        variant: "destructive"
      });
      return;
    }
    
    const csvData = data.bills.map((bill: any) => ({
      'Resident': bill.residentName,
      'Unit': bill.unitNumber,
      'Description': bill.description,
      'Amount': formatCurrencyForCSV(bill.amount),
      'Due Date': formatDateForCSV(bill.dueDate),
      'Days Overdue': bill.daysOverdue
    }));
    
    const csv = convertToCSV(csvData);
    downloadCSV(csv, `overdue-bills-report-${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleExportCSV} variant="outline" size="sm" data-testid="button-download-csv">
          <Download className="h-4 w-4 mr-2" />
          Download CSV
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Overdue</CardDescription>
            <CardTitle className="text-2xl text-red-600">
              ₦{parseFloat(data.summary?.totalOverdue || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>0-30 Days</CardDescription>
            <CardTitle className="text-xl">
              ₦{parseFloat(data.summary?.aging_0_30 || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>31-60 Days</CardDescription>
            <CardTitle className="text-xl">
              ₦{parseFloat(data.summary?.aging_31_60 || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>60+ Days</CardDescription>
            <CardTitle className="text-xl">
              ₦{parseFloat(data.summary?.aging_60_plus || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {data.bills && data.bills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Overdue Bill Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resident</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Days Overdue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.bills.map((bill: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{bill.residentName}</TableCell>
                    <TableCell>{bill.unitNumber}</TableCell>
                    <TableCell>{bill.description}</TableCell>
                    <TableCell className="font-semibold">
                      ₦{parseFloat(bill.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>{format(new Date(bill.dueDate), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">{bill.daysOverdue} days</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CollectionsSummaryReport({ data, reportId }: { data: any; reportId: string }) {
  const { toast } = useToast();
  
  const handleExportCSV = () => {
    if (!data.byMethod || data.byMethod.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no collection records to export.",
        variant: "destructive"
      });
      return;
    }
    
    const csvData = data.byMethod.map((method: any) => ({
      'Payment Method': method.paymentMethod,
      'Amount': formatCurrencyForCSV(method.total),
      'Count': method.count,
      'Percentage': method.percentage
    }));
    
    const csv = convertToCSV(csvData);
    downloadCSV(csv, `collections-summary-report-${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleExportCSV} variant="outline" size="sm" data-testid="button-download-csv">
          <Download className="h-4 w-4 mr-2" />
          Download CSV
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Collections</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              ₦{parseFloat(data.summary?.totalCollections || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Number of Payments</CardDescription>
            <CardTitle className="text-2xl">{data.summary?.paymentCount || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Average Payment</CardDescription>
            <CardTitle className="text-2xl">
              ₦{parseFloat(data.summary?.averagePayment || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {data.byMethod && data.byMethod.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Collections by Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Percentage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.byMethod.map((method: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium capitalize">{method.paymentMethod}</TableCell>
                    <TableCell className="text-right font-semibold">
                      ₦{parseFloat(method.total).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">{method.count}</TableCell>
                    <TableCell className="text-right">{method.percentage}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RevenueAnalysisReport({ data, reportId }: { data: any; reportId: string }) {
  const { toast } = useToast();
  
  const handleExportCSV = () => {
    if (!data.monthly || data.monthly.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no monthly revenue records to export.",
        variant: "destructive"
      });
      return;
    }
    
    const csvData = data.monthly.map((month: any) => ({
      'Month': month.month,
      'Billed': formatCurrencyForCSV(month.billed),
      'Collected': formatCurrencyForCSV(month.collected),
      'Collection Rate (%)': month.collectionRate
    }));
    
    const csv = convertToCSV(csvData);
    downloadCSV(csv, `revenue-analysis-report-${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleExportCSV} variant="outline" size="sm" data-testid="button-download-csv">
          <Download className="h-4 w-4 mr-2" />
          Download CSV
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Billed</CardDescription>
            <CardTitle className="text-2xl">
              ₦{parseFloat(data.summary?.totalBilled || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Collected</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              ₦{parseFloat(data.summary?.totalCollected || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Collection Rate</CardDescription>
            <CardTitle className="text-2xl">{data.summary?.collectionRate || 0}%</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Outstanding</CardDescription>
            <CardTitle className="text-2xl text-red-600">
              ₦{parseFloat(data.summary?.outstanding || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {data.monthly && data.monthly.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Billed</TableHead>
                  <TableHead className="text-right">Collected</TableHead>
                  <TableHead className="text-right">Collection %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.monthly.map((month: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{month.month}</TableCell>
                    <TableCell className="text-right">
                      ₦{parseFloat(month.billed).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-green-600 font-semibold">
                      ₦{parseFloat(month.collected).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">{month.collectionRate}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ARAgingReport({ data, reportId }: { data: any; reportId: string }) {
  const { toast } = useToast();
  
  const handleExportCSV = () => {
    if (!data.details || data.details.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no aging details to export.",
        variant: "destructive"
      });
      return;
    }
    
    const csvData = data.details.map((detail: any) => ({
      'Resident': detail.residentName,
      'Unit': detail.unitNumber,
      'Current': formatCurrencyForCSV(detail.current || 0),
      '1-30 Days': formatCurrencyForCSV(detail.days_1_30 || 0),
      '31-60 Days': formatCurrencyForCSV(detail.days_31_60 || 0),
      '60+ Days': formatCurrencyForCSV(detail.days_60_plus || 0),
      'Total': formatCurrencyForCSV(detail.total || 0)
    }));
    
    const csv = convertToCSV(csvData);
    downloadCSV(csv, `ar-aging-report-${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleExportCSV} variant="outline" size="sm" data-testid="button-download-csv">
          <Download className="h-4 w-4 mr-2" />
          Download CSV
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total AR</CardDescription>
            <CardTitle className="text-xl">
              ₦{parseFloat(data.summary?.totalAR || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Current</CardDescription>
            <CardTitle className="text-xl text-green-600">
              ₦{parseFloat(data.summary?.current || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>1-30 Days</CardDescription>
            <CardTitle className="text-xl">
              ₦{parseFloat(data.summary?.days_1_30 || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>31-60 Days</CardDescription>
            <CardTitle className="text-xl text-yellow-600">
              ₦{parseFloat(data.summary?.days_31_60 || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>60+ Days</CardDescription>
            <CardTitle className="text-xl text-red-600">
              ₦{parseFloat(data.summary?.days_60_plus || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {data.details && data.details.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Aging Details by Resident</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resident</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="text-right">1-30 Days</TableHead>
                  <TableHead className="text-right">31-60 Days</TableHead>
                  <TableHead className="text-right">60+ Days</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.details.map((detail: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{detail.residentName}</TableCell>
                    <TableCell>{detail.unitNumber}</TableCell>
                    <TableCell className="text-right">
                      ₦{parseFloat(detail.current || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      ₦{parseFloat(detail.days_1_30 || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      ₦{parseFloat(detail.days_31_60 || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      ₦{parseFloat(detail.days_60_plus || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ₦{parseFloat(detail.total || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CashFlowReport({ data, reportId }: { data: any; reportId: string }) {
  const { toast } = useToast();
  
  const handleExportCSV = () => {
    if (!data.monthly || data.monthly.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no monthly cash flow records to export.",
        variant: "destructive"
      });
      return;
    }
    
    const csvData = data.monthly.map((month: any) => ({
      'Month': month.month,
      'Inflows': formatCurrencyForCSV(month.inflows),
      'Outflows': formatCurrencyForCSV(month.outflows),
      'Net Cash Flow': formatCurrencyForCSV(month.netCashFlow)
    }));
    
    const csv = convertToCSV(csvData);
    downloadCSV(csv, `cash-flow-report-${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleExportCSV} variant="outline" size="sm" data-testid="button-download-csv">
          <Download className="h-4 w-4 mr-2" />
          Download CSV
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Opening Balance</CardDescription>
            <CardTitle className="text-xl">
              ₦{parseFloat(data.summary?.openingBalance || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Cash Inflows</CardDescription>
            <CardTitle className="text-xl text-green-600">
              ₦{parseFloat(data.summary?.totalInflows || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Cash Outflows</CardDescription>
            <CardTitle className="text-xl text-red-600">
              ₦{parseFloat(data.summary?.totalOutflows || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Net Cash Flow</CardDescription>
            <CardTitle className={`text-xl ${parseFloat(data.summary?.netCashFlow || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₦{parseFloat(data.summary?.netCashFlow || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Closing Balance</CardDescription>
            <CardTitle className="text-xl font-bold">
              ₦{parseFloat(data.summary?.closingBalance || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {data.monthly && data.monthly.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Cash Flow Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Inflows</TableHead>
                  <TableHead className="text-right">Outflows</TableHead>
                  <TableHead className="text-right">Net Cash Flow</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.monthly.map((month: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{month.month}</TableCell>
                    <TableCell className="text-right text-green-600">
                      ₦{parseFloat(month.inflows).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      ₦{parseFloat(month.outflows).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${month.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₦{parseFloat(month.netCashFlow).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {data.detailedInflows && data.detailedInflows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cash Inflows Details (Collections)</CardTitle>
            <CardDescription>{data.summary?.inflowCount || 0} payment transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Resident</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.detailedInflows.slice(0, 20).map((inflow: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell>{format(new Date(inflow.date), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="font-medium">{inflow.residentName}</TableCell>
                    <TableCell>{inflow.unitNumber}</TableCell>
                    <TableCell>{inflow.description}</TableCell>
                    <TableCell className="text-xs">{inflow.paymentMethod}</TableCell>
                    <TableCell className="text-right text-green-600 font-semibold">
                      ₦{parseFloat(inflow.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {data.detailedInflows.length > 20 && (
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Showing first 20 of {data.detailedInflows.length} transactions
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {data.detailedOutflows && data.detailedOutflows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cash Outflows Details (Expenses)</CardTitle>
            <CardDescription>{data.summary?.outflowCount || 0} paid expense transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">WHT</TableHead>
                  <TableHead className="text-right">Net Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.detailedOutflows.slice(0, 20).map((outflow: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell>{format(new Date(outflow.date), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="font-medium">{outflow.vendor}</TableCell>
                    <TableCell>{outflow.description}</TableCell>
                    <TableCell className="text-xs">{outflow.category}</TableCell>
                    <TableCell className="text-right text-xs">
                      ₦{parseFloat(outflow.whtAmount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-red-600 font-semibold">
                      ₦{parseFloat(outflow.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {data.detailedOutflows.length > 20 && (
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Showing first 20 of {data.detailedOutflows.length} transactions
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BudgetPerformanceReport({ data, reportId }: { data: any; reportId: string }) {
  const { toast } = useToast();
  
  const handleExportCSV = () => {
    if (!data.categories || data.categories.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no budget categories to export.",
        variant: "destructive"
      });
      return;
    }
    
    const csvData = data.categories.map((category: any) => ({
      'Category': category.name,
      'Budget': formatCurrencyForCSV(category.budget),
      'Actual': formatCurrencyForCSV(category.actual),
      'Variance': formatCurrencyForCSV(category.variance),
      'Percent Used': category.percentUsed
    }));
    
    const csv = convertToCSV(csvData);
    downloadCSV(csv, `budget-performance-report-${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleExportCSV} variant="outline" size="sm" data-testid="button-download-csv">
          <Download className="h-4 w-4 mr-2" />
          Download CSV
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Budget</CardDescription>
            <CardTitle className="text-2xl">
              ₦{parseFloat(data.summary?.totalBudget || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Actual Spent</CardDescription>
            <CardTitle className="text-2xl">
              ₦{parseFloat(data.summary?.actualSpent || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Variance</CardDescription>
            <CardTitle className={`text-2xl ${(data.summary?.variance || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
              ₦{parseFloat(data.summary?.variance || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Utilization</CardDescription>
            <CardTitle className="text-2xl">{data.summary?.utilization || 0}%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {data.categories && data.categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Budget vs Actual by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right">% Used</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.categories.map((category: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-right">
                      ₦{parseFloat(category.budget).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      ₦{parseFloat(category.actual).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${category.variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₦{parseFloat(category.variance).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">{category.percentUsed}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ResidentServiceChargeSummaryReport({ data }: { data: any }) {
  const handleExportCSV = () => {
    window.location.href = '/api/admin/reports/resident-service-charge-summary/export';
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Residents</CardDescription>
            <CardTitle className="text-2xl">{data.summary?.totalResidents || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Service Charge</CardDescription>
            <CardTitle className="text-xl">
              ₦{parseFloat(data.summary?.totalServiceCharge || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Amount Paid</CardDescription>
            <CardTitle className="text-xl text-green-600">
              ₦{parseFloat(data.summary?.totalAmountPaid || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Outstanding Balance</CardDescription>
            <CardTitle className="text-xl text-red-600">
              ₦{parseFloat(data.summary?.totalOutstanding || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleExportCSV} variant="outline" data-testid="button-export-csv">
          <Download className="h-4 w-4 mr-2" />
          Export to CSV
        </Button>
      </div>

      {data.residents && data.residents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resident Service Charge Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resident</TableHead>
                  <TableHead>House No</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Total Service Charge</TableHead>
                  <TableHead className="text-right">Amount Paid</TableHead>
                  <TableHead className="text-right">Outstanding Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.residents.map((resident: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{resident.resident}</TableCell>
                    <TableCell>{resident.houseNo}</TableCell>
                    <TableCell>{resident.phone}</TableCell>
                    <TableCell className="text-right">
                      ₦{parseFloat(resident.totalServiceCharge).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      ₦{parseFloat(resident.amountPaid).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-red-600">
                      ₦{parseFloat(resident.outstandingBalance).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ExpenseReportComponent({ data }: { data: any }) {
  const handleExportCSV = () => {
    window.location.href = '/api/admin/reports/expense-report/export';
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Expenses</CardDescription>
            <CardTitle className="text-2xl">{data.summary?.totalExpenses || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Amount</CardDescription>
            <CardTitle className="text-xl">
              ₦{parseFloat(data.summary?.totalAmount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Paid Amount</CardDescription>
            <CardTitle className="text-xl text-green-600">
              ₦{parseFloat(data.summary?.paidAmount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Unpaid Amount</CardDescription>
            <CardTitle className="text-xl text-red-600">
              ₦{parseFloat(data.summary?.unpaidAmount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Approved</CardDescription>
            <CardTitle className="text-2xl text-green-600">{data.summary?.approvedCount || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">{data.summary?.pendingCount || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Rejected</CardDescription>
            <CardTitle className="text-2xl text-red-600">{data.summary?.rejectedCount || 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleExportCSV} variant="outline" data-testid="button-export-csv">
          <Download className="h-4 w-4 mr-2" />
          Export to CSV
        </Button>
      </div>

      {data.expenses && data.expenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Expense Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead>Payment Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.expenses.map((expense: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell>{expense.date}</TableCell>
                    <TableCell>{expense.vendor}</TableCell>
                    <TableCell className="max-w-xs truncate">{expense.description}</TableCell>
                    <TableCell>{expense.category}</TableCell>
                    <TableCell className="text-right font-medium">
                      ₦{parseFloat(expense.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        expense.approved === "Yes" ? "default" :
                        expense.approved === "No" ? "destructive" : "secondary"
                      }>
                        {expense.approved}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        expense.paymentStatus === "paid" ? "default" : "secondary"
                      }>
                        {expense.paymentStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function GenericReport({ data }: { data: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Report Data</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96">
          {JSON.stringify(data, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}
