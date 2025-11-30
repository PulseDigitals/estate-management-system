import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, DollarSign, CheckCircle, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { formatNaira } from "@/lib/currency";
import businessManImg from "@assets/image_1763300568028.png";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

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

export default function AdminDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== "admin")) {
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
  }, [isAuthenticated, authLoading, user, toast]);

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/stats"],
    enabled: isAuthenticated && user?.role === "admin",
  });

  const { data: agingData = [], isLoading: agingLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/dashboard/aging-analysis"],
    enabled: isAuthenticated && user?.role === "admin",
  });

  const { data: budgetVsExpensesData = [], isLoading: budgetVsExpensesLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/dashboard/budget-vs-expenses"],
    enabled: isAuthenticated && user?.role === "admin",
  });

  const { data: collectionsExpensesData = [], isLoading: collectionsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/dashboard/collections-expenses"],
    enabled: isAuthenticated && user?.role === "admin",
  });

  if (authLoading || !isAuthenticated || user?.role !== "admin") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const totalOverdue = agingData.reduce((sum, item) => sum + item.amount, 0);
  const totalOverdueCount = agingData.reduce((sum, item) => sum + item.inv, 0);
  
  const totalBudget = budgetVsExpensesData.reduce((sum, item) => sum + item.budget, 0);
  const totalActual = budgetVsExpensesData.reduce((sum, item) => sum + item.actual, 0);
  const budgetVariance = totalBudget - totalActual;
  
  const collectionsNet = collectionsExpensesData.reduce((sum, item) => sum + (item.collections - item.expenses), 0);
  
  // Use collectionsThisMonth for current month's collections
  const totalCollections = stats?.collectionsThisMonth || 0;
  const totalExpenses = stats?.totalExpenses || 0;
  const paidExpenses = stats?.paidExpenses || 0;
  const accountsReceivable = stats?.pendingPayments || 0;
  const arOverdue = stats?.overdueBills || 0;
  const accountsPayable = stats?.accountsPayable || 0;
  const apPending = stats?.pendingExpenses || 0;
  const apApproved = stats?.approvedExpenses || 0;
  
  const collectionGoal = 1500000;
  const currentBalance = accountsReceivable - arOverdue;

  // Calculate performance insights (only if stats are loaded)
  let goingWell: string[] = [];
  let improvementAreas: string[] = [];

  if (stats && !statsLoading) {
    const collectionRate = stats.collectionRate || 0;
    const overduePercentage = accountsReceivable > 0 ? (arOverdue / accountsReceivable) * 100 : 0;
    const expensePaymentRate = totalExpenses > 0 ? (paidExpenses / totalExpenses) * 100 : 0;
    const delinquentPercentage = stats.totalResidents > 0 ? ((stats.delinquentResidents || 0) / stats.totalResidents) * 100 : 0;
    const budgetUtilization = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

    // What's going well
    if (collectionRate >= 80) goingWell.push(`Strong collection rate at ${collectionRate}%`);
    if (overduePercentage < 20) goingWell.push(`Low overdue rate (${overduePercentage.toFixed(1)}%)`);
    if (totalCollections > 0) goingWell.push(`Collected ${formatNaira(totalCollections)} this month`);
    if (delinquentPercentage < 10) goingWell.push(`Low delinquency rate (${delinquentPercentage.toFixed(1)}%)`);
    if (budgetVariance > 0) goingWell.push(`Under budget by ${formatNaira(budgetVariance)}`);
    if (expensePaymentRate >= 80) goingWell.push(`${expensePaymentRate.toFixed(0)}% of expenses paid on time`);
    if (stats.activeResidents === stats.totalResidents) goingWell.push(`All ${stats.totalResidents} residents active`);
    if (collectionsNet > 0) goingWell.push(`Positive cash flow: ${formatNaira(collectionsNet)}`);

    // Improvement areas
    if (collectionRate < 70) improvementAreas.push(`Collection rate low at ${collectionRate}%`);
    if (overduePercentage >= 30) improvementAreas.push(`High overdue rate (${overduePercentage.toFixed(1)}%)`);
    if (arOverdue > 100000) improvementAreas.push(`${formatNaira(arOverdue)} in overdue bills`);
    if (delinquentPercentage >= 15) improvementAreas.push(`${stats.delinquentResidents} delinquent residents (${delinquentPercentage.toFixed(1)}%)`);
    if (accountsPayable > 200000) improvementAreas.push(`High accounts payable: ${formatNaira(accountsPayable)}`);
    if (budgetVariance < 0) improvementAreas.push(`Over budget by ${formatNaira(Math.abs(budgetVariance))}`);
    if (expensePaymentRate < 60) improvementAreas.push(`Only ${expensePaymentRate.toFixed(0)}% of expenses paid`);
    if (apPending > 100000) improvementAreas.push(`${formatNaira(apPending)} in pending expense approvals`);
    if (totalOverdueCount > 5) improvementAreas.push(`${totalOverdueCount} invoices overdue`);

    // Default messages if lists are empty
    if (goingWell.length === 0) goingWell.push("No standout strengths detected – monitor KPIs");
    if (improvementAreas.length === 0) improvementAreas.push("No critical issues detected");
  } else {
    // Default messages while loading
    goingWell = ["Loading performance data..."];
    improvementAreas = ["Loading performance data..."];
  }

  return (
    <div className="flex gap-6 p-6">
      {/* Left Sidebar - Performance Insights */}
      <div className="w-80 flex-shrink-0 space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1" data-testid="text-dashboard-title">
            Performance Insights
          </h1>
          <p className="text-xs text-muted-foreground">
            AI-powered KPI analysis
          </p>
        </div>

        {/* What's Going Well */}
        <Card className="overflow-hidden border-2 shadow-sm">
          <div className="h-1.5 bg-gradient-to-r from-green-500 to-green-400" />
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <CardTitle className="text-base">What's Going Well</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <ul className="space-y-2 text-sm">
                {goingWell.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">•</span>
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Section Separator */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-3 text-xs text-muted-foreground">Performance Analysis</span>
          </div>
        </div>

        {/* Improvement Areas */}
        <Card className="overflow-hidden border-2 shadow-sm">
          <div className="h-1.5 bg-gradient-to-r from-orange-500 to-orange-400" />
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-base">Improvement Areas</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <ul className="space-y-2 text-sm">
                {improvementAreas.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-orange-600 mt-0.5">•</span>
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Section Separator */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-3 text-xs text-muted-foreground">Partner Solutions</span>
          </div>
        </div>

        {/* BizMate-ai Placeholder */}
        <Card className="overflow-hidden border-2 shadow-lg" data-testid="card-bizmate-placeholder">
          <div className="relative">
            <img 
              src={businessManImg} 
              alt="Professional Business Executive" 
              className="w-full h-64 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end">
              <div className="p-6 w-full">
                <h3 className="text-white text-2xl font-bold mb-1" data-testid="text-bizmate-title">BizMate-ai</h3>
                <p className="text-white/90 text-base">Smart Business. Simplified Compliance.</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Dashboard Content */}
      <div className="flex-1 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">
            Management Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Real-time overview of estate operations and financial metrics
          </p>
        </div>
      
      {/* KEY METRICS SECTION */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-primary/60 to-transparent" />
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase" data-testid="heading-key-metrics">
            Key Financial Metrics
          </h2>
          <div className="h-px flex-1 bg-gradient-to-l from-primary/60 to-transparent" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Collection this month */}
        <Card className="overflow-hidden border-2 hover-elevate transition-all" data-testid="card-collections">
          <div className="h-1.5 bg-gradient-to-r from-green-500 to-green-400" />
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Collection this month
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {statsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-green-600" data-testid="text-collections">
                {formatNaira(totalCollections)}
              </div>
            )}
            <div className="text-xs text-muted-foreground space-y-0.5">
              <div>Outstanding: {formatNaira(accountsReceivable)}</div>
              <div>Total payments received</div>
            </div>
            <Link href="/admin/collections" asChild>
              <a className="text-xs text-blue-600 hover:underline cursor-pointer" data-testid="link-collections-report">
                View all collections →
              </a>
            </Link>
          </CardContent>
        </Card>

        {/* Total Expenses */}
        <Card className="overflow-hidden border-2 hover-elevate transition-all" data-testid="card-expenses">
          <div className="h-1.5 bg-gradient-to-r from-red-500 to-red-400" />
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Expenses
              </CardTitle>
              <TrendingDown className="h-5 w-5 text-red-500" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {statsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-red-600" data-testid="text-expenses">
                {formatNaira(totalExpenses)}
              </div>
            )}
            <div className="text-xs text-muted-foreground space-y-0.5">
              <div>Approved: {formatNaira(totalExpenses)}</div>
              <div>Paid: {formatNaira(paidExpenses)}</div>
            </div>
            <Link href="/accountant/accounts-payable" asChild>
              <a className="text-xs text-blue-600 hover:underline cursor-pointer" data-testid="link-expenses-report">
                View Accounts Payable →
              </a>
            </Link>
          </CardContent>
        </Card>

        {/* Accounts Receivable */}
        <Card className="overflow-hidden border-2 hover-elevate transition-all" data-testid="card-ar">
          <div className="h-1.5 bg-gradient-to-r from-blue-500 to-blue-400" />
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Accounts Receivable
              </CardTitle>
              <DollarSign className="h-5 w-5 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {statsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-blue-600" data-testid="text-ar">
                {formatNaira(accountsReceivable)}
              </div>
            )}
            <div className="text-xs text-muted-foreground space-y-0.5">
              <div>Current: {formatNaira(currentBalance)}</div>
              <div>Overdue: {formatNaira(arOverdue)}</div>
            </div>
            <Link href="/admin/reports?type=ar" asChild>
              <a className="text-xs text-blue-600 hover:underline cursor-pointer" data-testid="link-ar-report">
                Click to view PDF report
              </a>
            </Link>
          </CardContent>
        </Card>

        {/* Accounts Payable */}
        <Card className="overflow-hidden border-2 hover-elevate transition-all" data-testid="card-ap">
          <div className="h-1.5 bg-gradient-to-r from-orange-500 to-orange-400" />
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Accounts Payable
              </CardTitle>
              <DollarSign className="h-5 w-5 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {statsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-orange-600" data-testid="text-ap">
                {formatNaira(accountsPayable)}
              </div>
            )}
            <div className="text-xs text-muted-foreground space-y-0.5">
              <div>Pending: {formatNaira(apPending)}</div>
              <div>Approved: {formatNaira(apApproved)}</div>
            </div>
            <Link href="/accountant/accounts-payable" asChild>
              <a className="text-xs text-blue-600 hover:underline cursor-pointer" data-testid="link-ap-report">
                Manage payments →
              </a>
            </Link>
          </CardContent>
        </Card>
      </div>
      </div>

      {/* AGING ANALYSIS SECTION */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-yellow-500/60 to-transparent" />
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase" data-testid="heading-aging-analysis">
            Collections Aging Analysis
          </h2>
          <div className="h-px flex-1 bg-gradient-to-l from-yellow-500/60 to-transparent" />
        </div>
        
        <Card className="overflow-hidden border-2" data-testid="card-aging">
          <div className="h-1.5 bg-gradient-to-r from-yellow-500 to-yellow-400" />
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Aging Analysis - Overdue Collections
            </CardTitle>
            <div className="text-right">
              {agingLoading ? (
                <Skeleton className="h-6 w-24" />
              ) : (
                <>
                  <div className="text-xs text-muted-foreground mb-0.5">{totalOverdueCount} Overdue</div>
                  <div className="text-xl font-bold text-red-600" data-testid="text-total-overdue">
                    {formatNaira(totalOverdue)}
                  </div>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {agingLoading ? (
            <Skeleton className="h-24 w-full mb-3" />
          ) : (
            <>
              <div className="h-24 mb-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agingData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => formatNaira(Number(value))} />
                    <Bar dataKey="amount" fill="#3b82f6" name="Outstanding Amount" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {/* Aging Breakdown */}
              <div className="grid grid-cols-5 gap-2">
                {agingData.map((item) => (
                  <div
                    key={item.name}
                    className="border rounded-md p-2 text-center"
                    data-testid={`aging-bucket-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <div className="text-xs text-muted-foreground mb-0.5">{item.name}</div>
                    <div className="text-sm font-bold">{formatNaira(item.amount)}</div>
                    <div className="text-xs text-muted-foreground">{item.inv} inv</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
      </div>

      {/* PERFORMANCE TRENDS SECTION */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-purple-500/60 to-transparent" />
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase" data-testid="heading-performance-trends">
            Performance Trends & Analytics
          </h2>
          <div className="h-px flex-1 bg-gradient-to-l from-purple-500/60 to-transparent" />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Budget vs Expenses Month-to-Date */}
          <Card className="overflow-hidden border-2 hover-elevate transition-all" data-testid="card-budget-vs-expenses">
            <div className="h-1.5 bg-gradient-to-r from-purple-500 to-purple-400" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Budget vs Expenses (Month-to-Date)
              </CardTitle>
              <div className="text-right">
                {budgetVsExpensesLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <div className="text-sm font-semibold">
                    Variance: {formatNaira(budgetVariance)}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {budgetVsExpensesLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : budgetVsExpensesData.length === 0 ? (
              <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">
                No active budget for current month
              </div>
            ) : (
              <div className="h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={budgetVsExpensesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="account" angle={-45} textAnchor="end" height={50} tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => formatNaira(Number(value))} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="budget" fill="#3b82f6" name="Budget" />
                    <Bar dataKey="actual" fill="#ef4444" name="Actual" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

          {/* Collections & Expenses */}
          <Card className="overflow-hidden border-2 hover-elevate transition-all" data-testid="card-collections-expenses">
            <div className="h-1.5 bg-gradient-to-r from-orange-400 to-orange-300" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Collections & Expenses
              </CardTitle>
              <div className="text-right">
                {collectionsLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <div className="text-sm font-semibold">Net: {formatNaira(collectionsNet)}</div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {collectionsLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <div className="h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={collectionsExpensesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="collections" fill="#f97316" name="Collections" />
                    <Bar dataKey="expenses" fill="#dc2626" name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
      </div>
    </div>
  );
}
