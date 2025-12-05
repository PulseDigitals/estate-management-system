import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Crown, Sparkles, Zap, ArrowRight } from "lucide-react";
import { SUBSCRIPTION_PLANS } from "@shared/subscription-plans";
import { formatNaira } from "@/lib/currency";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function SubscriptionManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  const { data: subscription, isLoading } = useQuery<any>({
    queryKey: ['/api/admin/subscription'],
    enabled: user?.role === 'admin',
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { plan: string; billingCycle: string }) => {
      return await apiRequest('/api/admin/subscription', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscription'] });
      toast({
        title: "Subscription Updated",
        description: "Your subscription plan has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update subscription",
        variant: "destructive",
      });
    },
  });

  const handleUpgrade = (planId: string) => {
    updateMutation.mutate({
      plan: planId,
      billingCycle: billingCycle,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const currentPlan = subscription?.plan || 'starter';
  const planDetails = SUBSCRIPTION_PLANS[currentPlan];

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'starter':
        return <Sparkles className="h-5 w-5" />;
      case 'professional':
        return <Zap className="h-5 w-5" />;
      case 'enterprise':
        return <Crown className="h-5 w-5" />;
      default:
        return <Sparkles className="h-5 w-5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-600">Active</Badge>;
      case 'trial':
        return <Badge variant="secondary">Trial</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Current Subscription Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Your Subscription</CardTitle>
              <CardDescription>Manage your estate's subscription plan</CardDescription>
            </div>
            {getStatusBadge(subscription?.status || 'trial')}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Current Plan</p>
              <p className="text-2xl font-semibold capitalize">{currentPlan}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estate Name</p>
              <p className="text-lg font-medium">{subscription?.estateName || 'My Estate'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Billing Cycle</p>
              <p className="text-lg font-medium capitalize">{subscription?.billingCycle || 'Monthly'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Next Billing Date</p>
              <p className="text-lg font-medium">
                {subscription?.currentPeriodEnd 
                  ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                  : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing Cycle Toggle */}
      <div className="flex justify-center">
        <Tabs value={billingCycle} onValueChange={(value) => setBillingCycle(value as 'monthly' | 'annual')} className="w-auto">
          <TabsList>
            <TabsTrigger value="monthly" data-testid="tab-monthly">Monthly</TabsTrigger>
            <TabsTrigger value="annual" data-testid="tab-annual">
              Annual <Badge variant="secondary" className="ml-2">Save 20%</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Pricing Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {Object.values(SUBSCRIPTION_PLANS).map((plan) => (
          <Card 
            key={plan.id} 
            className={`relative ${plan.popular ? 'border-primary shadow-lg' : ''} ${
              currentPlan === plan.id ? 'ring-2 ring-primary' : ''
            }`}
            data-testid={`plan-card-${plan.id}`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary">Most Popular</Badge>
              </div>
            )}
            {currentPlan === plan.id && (
              <div className="absolute -top-3 right-4">
                <Badge className="bg-green-600">Current Plan</Badge>
              </div>
            )}
            
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                {getPlanIcon(plan.id)}
                <CardTitle className="text-2xl capitalize">{plan.name}</CardTitle>
              </div>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">
                    {formatNaira(billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice)}
                  </span>
                  <span className="text-muted-foreground">
                    /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                  </span>
                </div>
                {billingCycle === 'annual' && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatNaira(Math.round(plan.annualPrice / 12))}/month billed annually
                  </p>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">
                    {plan.features.maxResidents === 999999 ? 'Unlimited' : `Up to ${plan.features.maxResidents}`} residents
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">
                    {plan.features.maxAdmins} Admin{plan.features.maxAdmins > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">
                    {plan.features.maxSecurity} Security guard{plan.features.maxSecurity > 1 ? 's' : ''}
                  </span>
                </div>
                {plan.features.maxAccountants > 0 && (
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">
                      {plan.features.maxAccountants === 999999 ? 'Unlimited' : plan.features.maxAccountants} Accountant{plan.features.maxAccountants > 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t pt-4 space-y-2">
                <p className="font-semibold text-sm">Key Features:</p>
                {plan.features.manualBilling && (
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Billing & Collections</span>
                  </div>
                )}
                {plan.features.visitorAccessControl && (
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">QR Visitor Access</span>
                  </div>
                )}
                {plan.features.chartOfAccounts && (
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Full Accounting System</span>
                  </div>
                )}
                {plan.features.automatedBilling && (
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Automated Billing</span>
                  </div>
                )}
                {plan.features.vendorManagement && (
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Vendor Management</span>
                  </div>
                )}
                {plan.features.budgetPlanning && (
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Budget Planning</span>
                  </div>
                )}
                {plan.features.accountsPayable && (
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Accounts Payable + WHT</span>
                  </div>
                )}
                {plan.features.bankReconciliation && (
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Bank Reconciliation</span>
                  </div>
                )}
                {plan.features.supportType !== 'community' && (
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm capitalize">
                      {plan.features.supportType} Support
                      {plan.features.supportResponseTime && ` (${plan.features.supportResponseTime})`}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>

            <CardFooter>
              {currentPlan === plan.id ? (
                <Button className="w-full" variant="outline" disabled>
                  Current Plan
                </Button>
              ) : (
                <Button 
                  className="w-full" 
                  variant={plan.popular ? "default" : "outline"}
                  data-testid={`button-upgrade-${plan.id}`}
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Processing...' : (
                    <>
                      {currentPlan === 'starter' || (currentPlan === 'professional' && plan.id === 'enterprise')
                        ? 'Upgrade to ' : 'Switch to '} {plan.name}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Feature Comparison Link */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              Need help choosing? View the detailed feature comparison in SUBSCRIPTION_TIERS.md
            </p>
            <Button variant="outline">
              View Full Feature Comparison
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
