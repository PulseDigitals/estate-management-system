import { 
  Home, 
  Users, 
  Receipt, 
  Bell, 
  QrCode, 
  FileText, 
  Shield, 
  LogOut,
  Building2,
  DollarSign,
  Activity,
  BarChart3,
  BookOpen,
  LayoutList,
  Calculator,
  TrendingUp,
  Scale,
  Package,
  CheckSquare,
  FileBarChart,
  ShoppingCart,
  ClipboardCheck,
  Calendar,
  Upload,
  UserCog
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";

export function AppSidebar() {
  const { user } = useAuth();
  const [location] = useLocation();

  const residentItems = [
    { title: "Dashboard", url: "/", icon: Home },
    { title: "My Bills", url: "/bills", icon: Receipt },
    { title: "My Expenses", url: "/expenses", icon: ShoppingCart },
    { title: "Visitors", url: "/visitors", icon: QrCode },
    { title: "Notifications", url: "/notifications", icon: Bell },
  ];

  const adminItems = [
    { title: "Dashboard", url: "/admin", icon: Home },
    { title: "Registered Residents", url: "/admin/residents/list", icon: Users },
    { title: "User Management", url: "/admin/user-management", icon: UserCog },
    { title: "Collections", url: "/admin/collections", icon: Receipt },
    { title: "Automated Billing", url: "/admin/billing/automated", icon: Calendar },
    { title: "Residents account status", url: "/admin/account-status", icon: BarChart3 },
    { title: "Announcements", url: "/admin/announcements", icon: FileText },
    { title: "Reports Center", url: "/admin/reports-center", icon: Activity },
  ];

  const securityItems = [
    { title: "Dashboard", url: "/security", icon: Home },
    { title: "Scan QR Code", url: "/security/scan", icon: QrCode },
    { title: "Access Log", url: "/security/logs", icon: Shield },
  ];

  const accountantAccountingItems = [
    { title: "Dashboard", url: "/accountant", icon: Home },
    { title: "Chart of Accounts", url: "/accountant/accounts", icon: BookOpen },
    { title: "Transaction Templates", url: "/accountant/templates", icon: LayoutList },
    { title: "Journal Entries", url: "/accountant/entries", icon: FileText },
    { title: "Trial Balance", url: "/accountant/trial-balance", icon: Calculator },
    { title: "Income Statement", url: "/accountant/income-statement", icon: TrendingUp },
    { title: "Balance Sheet", url: "/accountant/balance-sheet", icon: Scale },
  ];

  const accountantVendorItems = [
    { title: "Vendor Registration", url: "/accountant/vendors/register", icon: Package },
    { title: "Vendor Approval", url: "/accountant/vendors/approval", icon: CheckSquare },
    { title: "Vendor Management", url: "/accountant/vendors/management", icon: Users },
  ];

  const accountantExpenseItems = [
    { title: "Expense Request", url: "/accountant/expenses/request", icon: ShoppingCart },
    { title: "Expense Approval", url: "/accountant/expenses/approval", icon: ClipboardCheck },
    { title: "Accounts Payable", url: "/accountant/accounts-payable", icon: DollarSign },
    { title: "Accounts Receivable", url: "/accountant/accounts-receivable", icon: Receipt },
    { title: "Upload Bank Statement", url: "/accountant/bank-statements/upload", icon: Upload },
  ];

  const accountantBudgetItems = [
    { title: "Budget & Planning", url: "/accountant/budget-planning", icon: TrendingUp },
  ];

  const menuItems = user?.role === "admin" ? adminItems : 
                    user?.role === "security" ? securityItems : 
                    residentItems;

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || "U";
  };

  return (
    <Sidebar data-testid="sidebar-main">
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Building2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Magodo Estate</h2>
            <p className="text-xs text-muted-foreground">Management System</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        {user?.role === "admin" ? (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>Administration</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={location === item.url}>
                        <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Accounting Centre</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {accountantAccountingItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={location === item.url}>
                        <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Vendors</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {accountantVendorItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={location === item.url}>
                        <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Expense</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {accountantExpenseItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={location === item.url}>
                        <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Budget</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {accountantBudgetItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={location === item.url}>
                        <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : user?.role === "accountant" ? (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>Accounting Centre</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {accountantAccountingItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={location === item.url}>
                        <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Vendors</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {accountantVendorItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={location === item.url}>
                        <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Expense</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {accountantExpenseItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={location === item.url}>
                        <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Budget</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {accountantBudgetItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={location === item.url}>
                        <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : user?.role === "security" ? (
          <SidebarGroup>
            <SidebarGroupLabel>Security</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {securityItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location === item.url}>
                      <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <SidebarGroup>
            <SidebarGroupLabel>My Account</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {residentItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location === item.url}>
                      <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3 rounded-lg p-3 hover-elevate">
          <Avatar className="h-9 w-9" data-testid="avatar-user">
            <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || "User"} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" data-testid="text-user-name">
              {user?.firstName && user?.lastName 
                ? `${user.firstName} ${user.lastName}` 
                : user?.email}
            </p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
          <a href="/api/logout" data-testid="button-logout">
            <LogOut className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </a>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
