import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Users, DollarSign, TrendingUp, AlertCircle } from "lucide-react";

interface AccountStatusData {
  summary: {
    totalResidents: number;
    totalBilled: number;
    totalCollected: number;
    totalOutstanding: number;
  };
  aging: {
    current: number;
    '1-30': number;
    '31-60': number;
    '61-90': number;
    '90+': number;
  };
}

interface ResidentWithUser {
  residents: {
    id: string;
    unitNumber: string;
  };
  users: {
    firstName: string | null;
    lastName: string | null;
  };
}

export default function AccountStatus() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [residentId, setResidentId] = useState("__all__");
  
  const [appliedFilters, setAppliedFilters] = useState({
    startDate: "",
    endDate: "",
    residentId: "",
  });

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== "admin")) {
      toast({
        title: "Unauthorized",
        description: "Admin access required",
        variant: "destructive",
      });
      setTimeout(() => {
        setLocation("/");
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast, setLocation]);

  const buildQueryKey = () => {
    const params = new URLSearchParams();
    if (appliedFilters.startDate) params.append('startDate', appliedFilters.startDate);
    if (appliedFilters.endDate) params.append('endDate', appliedFilters.endDate);
    if (appliedFilters.residentId) params.append('residentId', appliedFilters.residentId);
    const queryString = params.toString();
    return `/api/admin/account-status${queryString ? `?${queryString}` : ''}`;
  };

  const { data, isLoading: isDataLoading } = useQuery<AccountStatusData>({
    queryKey: [buildQueryKey()],
    enabled: isAuthenticated && user?.role === "admin",
  });

  const { data: residents } = useQuery<ResidentWithUser[]>({
    queryKey: ['/api/admin/residents'],
    enabled: isAuthenticated && user?.role === "admin",
  });

  const handleApplyFilters = () => {
    setAppliedFilters({
      startDate,
      endDate,
      residentId: residentId === "__all__" ? "" : residentId,
    });
  };

  const handleResetFilters = () => {
    setStartDate("");
    setEndDate("");
    setResidentId("__all__");
    setAppliedFilters({
      startDate: "",
      endDate: "",
      residentId: "",
    });
  };

  if (isLoading || !isAuthenticated || user?.role !== "admin") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const agingChartData = data ? [
    { name: 'Current', amount: data.aging.current, fill: 'hsl(var(--chart-1))' },
    { name: '1-30 Days', amount: data.aging['1-30'], fill: 'hsl(var(--chart-2))' },
    { name: '31-60 Days', amount: data.aging['31-60'], fill: 'hsl(var(--chart-3))' },
    { name: '61-90 Days', amount: data.aging['61-90'], fill: 'hsl(var(--chart-4))' },
    { name: '90+ Days', amount: data.aging['90+'], fill: 'hsl(var(--chart-5))' },
  ] : [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Residents account status</h1>
        <p className="text-muted-foreground mt-1">Resident billing and collection analysis</p>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter data by date range and resident name</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="filter-start-date">Start Date</Label>
              <Input
                id="filter-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-end-date">End Date</Label>
              <Input
                id="filter-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="input-end-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-resident-name">Resident Name</Label>
              <Select
                value={residentId}
                onValueChange={setResidentId}
              >
                <SelectTrigger id="filter-resident-name" data-testid="select-resident-name">
                  <SelectValue placeholder="Select a resident" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__" data-testid="select-resident-all">All Residents</SelectItem>
                  {residents?.map((row) => {
                    if (!row.users || !row.residents) return null;
                    const displayName = `${row.users.firstName || ''} ${row.users.lastName || ''} - Unit ${row.residents.unitNumber}`.trim();
                    return (
                      <SelectItem 
                        key={row.residents.id} 
                        value={row.residents.id}
                        data-testid={`select-resident-${row.residents.id}`}
                      >
                        {displayName}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex items-end gap-2">
              <Button onClick={handleApplyFilters} className="flex-1" data-testid="button-apply-filters">
                Apply Filters
              </Button>
              <Button onClick={handleResetFilters} variant="outline" data-testid="button-reset-filters">
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {isDataLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Residents</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-residents">
                  {data.summary.totalResidents}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active resident accounts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Service Charge Billed</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-billed">
                  {formatCurrency(data.summary.totalBilled)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  All invoiced amounts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-collected">
                  {formatCurrency(data.summary.totalCollected)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Payments received
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive" data-testid="text-total-outstanding">
                  {formatCurrency(data.summary.totalOutstanding)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Unpaid balances
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Aging Analysis Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Aging Analysis</CardTitle>
              <CardDescription>Outstanding bills categorized by days overdue</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={agingChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis 
                    tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="amount" 
                    name="Amount (₦)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">No data available</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
