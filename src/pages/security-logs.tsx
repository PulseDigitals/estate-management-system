import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, ArrowRight, ArrowLeft, XCircle } from "lucide-react";
import type { AccessLog } from "@shared/schema";

export default function SecurityLogs() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();

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

  const { data: logs = [] } = useQuery<AccessLog[]>({
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

  const getActionBadge = (action: string) => {
    const variants = {
      entry: { variant: "default" as const, icon: ArrowRight, className: "bg-green-500 hover:bg-green-600" },
      exit: { variant: "secondary" as const, icon: ArrowLeft, className: "" },
      denied: { variant: "destructive" as const, icon: XCircle, className: "" },
    };
    const config = variants[action as keyof typeof variants] || variants.entry;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {action}
      </Badge>
    );
  };

  const getAccessTypeBadge = (type: string) => {
    const colors = {
      visitor: "bg-blue-500 hover:bg-blue-600",
      resident: "bg-purple-500 hover:bg-purple-600",
      manual: "bg-gray-500 hover:bg-gray-600",
    };
    return (
      <Badge className={colors[type as keyof typeof colors] || colors.manual}>
        {type}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold">Access Logs</h1>
        <p className="text-muted-foreground mt-1">Complete gate activity history</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-sm font-medium">Total Entries</div>
            <ArrowRight className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold" data-testid="text-total-entries">
              {logs.filter(l => l.action === "entry").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-sm font-medium">Total Exits</div>
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold" data-testid="text-total-exits">
              {logs.filter(l => l.action === "exit").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-sm font-medium">Denied Access</div>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-destructive" data-testid="text-denied">
              {logs.filter(l => l.action === "denied").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Complete Access History</CardTitle>
          <CardDescription>All gate activity records</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No access logs</p>
              <p className="text-sm mt-1">Gate activity will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover-elevate"
                  data-testid={`log-${log.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-medium">{log.name}</h4>
                      {getAccessTypeBadge(log.accessType)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{new Date(log.createdAt!).toLocaleString()}</span>
                      {log.notes && (
                        <>
                          <span>•</span>
                          <span>{log.notes}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    {getActionBadge(log.action)}
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
