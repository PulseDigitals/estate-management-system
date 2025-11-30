import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { QrCode, Search, Shield, Activity, CheckCircle, XCircle } from "lucide-react";
import { Link } from "wouter";
import type { Visitor, AccessLog } from "@shared/schema";

export default function SecurityDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

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

  const { data: todayVisitors = [] } = useQuery<Visitor[]>({
    queryKey: ["/api/security/visitors/today"],
    enabled: isAuthenticated && user?.role === "security",
  });

  const { data: recentLogs = [] } = useQuery<AccessLog[]>({
    queryKey: ["/api/security/logs/recent"],
    enabled: isAuthenticated && user?.role === "security",
  });

  if (isLoading || !isAuthenticated || user?.role !== "security") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const filteredVisitors = todayVisitors.filter(v =>
    v.visitorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.accessCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Security Dashboard</h1>
          <p className="text-muted-foreground mt-1">Gate access and visitor management</p>
        </div>
        <Link href="/security/scan">
          <Button size="lg" data-testid="button-scan-qr">
            <QrCode className="h-5 w-5 mr-2" />
            Scan QR Code
          </Button>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Visitors</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold" data-testid="text-today-visitors">
              {todayVisitors.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pre-approved access codes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Entries</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold" data-testid="text-recent-entries">
              {recentLogs.filter(l => l.action === "entry").length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Access Logs</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold" data-testid="text-total-logs">
              {recentLogs.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Recent activity
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visitor Lookup */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Approved Visitors</CardTitle>
          <CardDescription>Search and verify visitor access codes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or access code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-visitor"
            />
          </div>

          {filteredVisitors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <QrCode className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No visitors found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredVisitors.map((visitor) => (
                <div
                  key={visitor.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover-elevate"
                  data-testid={`visitor-${visitor.id}`}
                >
                  <div className="flex-1">
                    <h4 className="font-medium">{visitor.visitorName}</h4>
                    <p className="text-sm text-muted-foreground">
                      Code: {visitor.accessCode} • Valid until {new Date(visitor.validUntil).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {visitor.status === "approved" ? (
                      <Badge className="bg-green-500 hover:bg-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Approved
                      </Badge>
                    ) : visitor.status === "used" ? (
                      <Badge variant="secondary">
                        Used
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        {visitor.status}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Access Log */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Access Log</CardTitle>
          <CardDescription>Latest gate activity</CardDescription>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentLogs.slice(0, 10).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-lg border text-sm"
                  data-testid={`log-${log.id}`}
                >
                  <div className="flex-1">
                    <p className="font-medium">{log.name}</p>
                    <p className="text-muted-foreground">
                      {log.accessType} • {new Date(log.createdAt!).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={log.action === "entry" ? "default" : log.action === "exit" ? "secondary" : "destructive"}>
                    {log.action}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
