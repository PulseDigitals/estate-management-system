import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Signup from "@/pages/signup";
import Home from "@/pages/home";
import Bills from "@/pages/bills";
import Visitors from "@/pages/visitors";
import Notifications from "@/pages/notifications";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminResidents from "@/pages/admin/residents";
import AdminResidentsList from "@/pages/admin/residents-list";
import AdminBilling from "@/pages/admin/billing";
import AdminAnnouncements from "@/pages/admin/announcements";
import AdminReports from "@/pages/admin/reports";
import AdminCollections from "@/pages/admin/collections";
import AdminSubscription from "@/pages/admin/subscription";
import AccountStatus from "@/pages/admin/account-status";
import AutomatedBilling from "@/pages/admin/automated-billing";
import ReportsCenter from "@/pages/admin/reports-center";
import SecurityDashboard from "@/pages/security-dashboard";
import QRScanner from "@/pages/qr-scanner";
import SecurityLogs from "@/pages/security-logs";
import AccountantDashboard from "@/pages/accountant-dashboard";
import ChartOfAccounts from "@/pages/accountant/chart-of-accounts";
import TransactionTemplates from "@/pages/accountant/transaction-templates";
import JournalEntries from "@/pages/accountant/journal-entries";
import VendorRegistration from "@/pages/accountant/vendor-registration";
import VendorApproval from "@/pages/accountant/vendor-approval";
import VendorManagement from "@/pages/accountant/vendor-management";
import VendorStatement from "@/pages/accountant/vendor-statement";
import ExpenseRequest from "@/pages/accountant/expense-request";
import ExpenseApproval from "@/pages/accountant/expense-approval";
import AccountsPayable from "@/pages/accountant/accounts-payable";
import AccountsReceivable from "@/pages/accountant/accounts-receivable";
import BankStatementUpload from "@/pages/accountant/bank-statement-upload";
import BudgetPlanning from "@/pages/accountant/budget-planning";
import MyExpenses from "@/pages/my-expenses";
import TrialBalance from "@/pages/accountant/trial-balance";
import IncomeStatement from "@/pages/accountant/income-statement";
import BalanceSheet from "@/pages/accountant/balance-sheet";
import UserManagement from "@/pages/admin/user-management";
import InviteLanding from "@/pages/invite-landing";
import type { Resident } from "@shared/schema";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading || !isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/invite/:token" component={InviteLanding} />
        <Route component={Landing} />
      </Switch>
    );
  }

  // Role-based routing
  if (user?.role === "admin") {
    return (
      <Switch>
        <Route path="/" component={AdminDashboard} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/residents/list" component={AdminResidentsList} />
        <Route path="/admin/residents" component={AdminResidents} />
        <Route path="/admin/billing" component={AdminBilling} />
        <Route path="/admin/billing/automated" component={AutomatedBilling} />
        <Route path="/admin/account-status" component={AccountStatus} />
        <Route path="/admin/announcements" component={AdminAnnouncements} />
        <Route path="/admin/collections" component={AdminCollections} />
        <Route path="/admin/subscription" component={AdminSubscription} />
        <Route path="/admin/reports-center" component={ReportsCenter} />
        <Route path="/admin/reports" component={AdminReports} />
        <Route path="/admin/user-management" component={UserManagement} />
        {/* Accounting Centre routes */}
        <Route path="/accountant" component={AccountantDashboard} />
        <Route path="/accountant/accounts" component={ChartOfAccounts} />
        <Route path="/accountant/templates" component={TransactionTemplates} />
        <Route path="/accountant/entries" component={JournalEntries} />
        <Route path="/accountant/trial-balance" component={TrialBalance} />
        <Route path="/accountant/income-statement" component={IncomeStatement} />
        <Route path="/accountant/balance-sheet" component={BalanceSheet} />
        {/* Vendor routes */}
        <Route path="/accountant/vendors/register" component={VendorRegistration} />
        <Route path="/accountant/vendors/approval" component={VendorApproval} />
        <Route path="/accountant/vendors/management" component={VendorManagement} />
        <Route path="/accountant/vendor-statement" component={VendorStatement} />
        {/* Expense routes */}
        <Route path="/accountant/expenses/request" component={ExpenseRequest} />
        <Route path="/accountant/expenses/approval" component={ExpenseApproval} />
        <Route path="/accountant/accounts-payable" component={AccountsPayable} />
        <Route path="/accountant/accounts-receivable" component={AccountsReceivable} />
        <Route path="/accountant/bank-statements/upload" component={BankStatementUpload} />
        <Route path="/expenses" component={MyExpenses} />
        {/* Budget & Planning */}
        <Route path="/accountant/budget-planning" component={BudgetPlanning} />
        {/* Notifications */}
        <Route path="/notifications" component={Notifications} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  if (user?.role === "security") {
    return (
      <Switch>
        <Route path="/" component={SecurityDashboard} />
        <Route path="/security" component={SecurityDashboard} />
        <Route path="/security/scan" component={QRScanner} />
        <Route path="/security/logs" component={SecurityLogs} />
        <Route path="/notifications" component={Notifications} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  if (user?.role === "accountant") {
    return (
      <Switch>
        <Route path="/" component={AccountantDashboard} />
        <Route path="/accountant" component={AccountantDashboard} />
        <Route path="/accountant/accounts" component={ChartOfAccounts} />
        <Route path="/accountant/templates" component={TransactionTemplates} />
        <Route path="/accountant/entries" component={JournalEntries} />
        <Route path="/accountant/vendors/register" component={VendorRegistration} />
        <Route path="/accountant/vendors/approval" component={VendorApproval} />
        <Route path="/accountant/vendors/management" component={VendorManagement} />
        <Route path="/accountant/vendor-statement" component={VendorStatement} />
        <Route path="/accountant/expenses/request" component={ExpenseRequest} />
        <Route path="/accountant/expenses/approval" component={ExpenseApproval} />
        <Route path="/accountant/accounts-payable" component={AccountsPayable} />
        <Route path="/accountant/accounts-receivable" component={AccountsReceivable} />
        <Route path="/accountant/bank-statements/upload" component={BankStatementUpload} />
        <Route path="/expenses" component={MyExpenses} />
        <Route path="/accountant/budget-planning" component={BudgetPlanning} />
        <Route path="/accountant/trial-balance" component={TrialBalance} />
        <Route path="/accountant/income-statement" component={IncomeStatement} />
        <Route path="/accountant/balance-sheet" component={BalanceSheet} />
        <Route path="/notifications" component={Notifications} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // Default: Resident routes
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/bills" component={Bills} />
      <Route path="/expenses" component={MyExpenses} />
      <Route path="/visitors" component={Visitors} />
      <Route path="/notifications" component={Notifications} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Check if resident profile exists (for signup gate)
  const shouldCheckProfile = isAuthenticated && (user?.role === "resident" || !user?.role);
  
  const { data: residentProfile, isLoading: profileLoading, isError } = useQuery<Resident>({
    queryKey: ["/api/resident/profile"],
    enabled: shouldCheckProfile,
    retry: false,
    throwOnError: false,
  });

  // Determine if user needs signup BEFORE rendering protected layout
  const needsSignup = isAuthenticated && 
    shouldCheckProfile &&
    !profileLoading && 
    (isError || !residentProfile);

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  // Show landing page for unauthenticated users
  if (isLoading || !isAuthenticated) {
    return (
      <>
        <Router />
        <Toaster />
      </>
    );
  }

  // Show loading while checking profile status
  // This prevents TOCTOU gap where protected layout renders before profile check completes
  if (profileLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Show signup page BEFORE rendering protected layout
  // This prevents TOCTOU gap where protected components render before redirect
  if (needsSignup) {
    return (
      <>
        <Signup />
        <Toaster />
      </>
    );
  }

  // Only render protected layout after signup is complete
  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between px-6 py-3 border-b bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-y-auto bg-background">
            <div className="container mx-auto px-6 py-8 max-w-7xl">
              <Router />
            </div>
          </main>
        </div>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <AppContent />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
