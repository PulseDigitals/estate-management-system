import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Receipt, QrCode, Bell, AlertCircle, CheckCircle, Clock, Plus, ShoppingCart, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { formatNaira } from "@/lib/currency";
import type { Resident, Bill, Visitor, Notification } from "@shared/schema";
import yoduLogo from "@assets/yodu-logo.jpg";

export default function Home() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();

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

  const { data: resident } = useQuery<Resident>({
    queryKey: ["/api/resident/profile"],
    enabled: isAuthenticated,
  });

  const { data: recentBills = [] } = useQuery<Bill[]>({
    queryKey: ["/api/resident/bills/recent"],
    enabled: isAuthenticated,
  });

  const { data: activeVisitors = [] } = useQuery<Visitor[]>({
    queryKey: ["/api/resident/visitors/active"],
    enabled: isAuthenticated,
  });

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
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
      active: { variant: "default" as const, icon: CheckCircle, className: "bg-green-500 hover:bg-green-600" },
      inactive: { variant: "secondary" as const, icon: Clock, className: "" },
      delinquent: { variant: "destructive" as const, icon: AlertCircle, className: "" },
    };
    const config = variants[status as keyof typeof variants] || variants.active;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
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

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">
                  Welcome back, {user?.firstName}!
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <span data-testid="text-unit-number">Unit {resident?.unitNumber || "—"}</span>
                  <span>•</span>
                  {resident && getStatusBadge(resident.accountStatus)}
                </CardDescription>
              </div>
            </div>
            {resident && parseFloat(resident.totalBalance) > 0 && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                <p className="text-3xl font-semibold text-destructive" data-testid="text-balance">
                  {formatNaira(resident.totalBalance)}
                </p>
                <Button className="mt-2" data-testid="button-pay-now">
                  <Receipt className="h-4 w-4 mr-2" />
                  Pay Now
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Bills</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold" data-testid="text-bills-count">{recentBills.length}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
            <Link href="/bills">
              <Button variant="ghost" className="px-0 mt-2" data-testid="link-view-all-bills">
                View all bills →
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Visitors</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold" data-testid="text-visitors-count">{activeVisitors.length}</div>
            <p className="text-xs text-muted-foreground">Pre-approved access</p>
            <Link href="/visitors">
              <Button variant="ghost" className="px-0 mt-2" data-testid="link-manage-visitors">
                Manage visitors →
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold" data-testid="text-notifications-count">{unreadCount}</div>
            <p className="text-xs text-muted-foreground">Unread messages</p>
            <Link href="/notifications">
              <Button variant="ghost" className="px-0 mt-2" data-testid="link-view-notifications">
                View notifications →
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Yodu Shopping App Placeholder */}
      <Card className="overflow-hidden bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-orange-200 dark:border-orange-800" data-testid="card-yodu-shopping">
        <CardContent className="p-0">
          <div className="flex items-center gap-6 p-6">
            <div className="flex-shrink-0">
              <img 
                src={yoduLogo} 
                alt="Yodu Shopping" 
                className="h-24 w-24 rounded-lg object-cover shadow-md"
                data-testid="img-yodu-logo"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <h3 className="text-xl font-bold text-orange-900 dark:text-orange-100" data-testid="text-yodu-title">
                  Yodu Shopping
                </h3>
              </div>
              <p className="text-base text-gray-700 dark:text-gray-300 mb-4">
                Buy your Grocery & Home supplies at unbeatable prices!
              </p>
              <Button 
                className="bg-orange-600 hover:bg-orange-700 text-white"
                onClick={() => {
                  // TODO: Integrate with Yodu API
                  // For now, show a placeholder message
                  toast({
                    title: "Coming Soon!",
                    description: "Yodu shopping integration will be available soon. Stay tuned!",
                  });
                }}
                data-testid="button-yodu-shop"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Click here to start!
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Bills */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Bills</CardTitle>
              <CardDescription>Your latest levy statements</CardDescription>
            </div>
            <Link href="/visitors">
              <Button data-testid="button-add-visitor">
                <Plus className="h-4 w-4 mr-2" />
                Pre-approve Visitor
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentBills.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No recent bills</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentBills.slice(0, 5).map((bill) => (
                <div
                  key={bill.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover-elevate"
                  data-testid={`bill-${bill.id}`}
                >
                  <div className="flex-1">
                    <h4 className="font-medium">{bill.description}</h4>
                    <p className="text-sm text-muted-foreground">
                      Due {new Date(bill.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-lg font-semibold">{formatNaira(bill.amount)}</p>
                      {getPaymentStatusBadge(bill.status)}
                    </div>
                    {bill.status !== "paid" && (
                      <Button size="sm" data-testid={`button-pay-${bill.id}`}>
                        Pay
                      </Button>
                    )}
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

