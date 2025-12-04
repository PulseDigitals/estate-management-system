// @ts-nocheck
// Subscription plan definitions and pricing

export interface SubscriptionPlanFeatures {
  maxResidents: number;
  maxAdmins: number;
  maxSecurity: number;
  maxAccountants: number;
  
  // Core Features
  residentManagement: boolean;
  manualBilling: boolean;
  paymentTracking: boolean;
  visitorAccessControl: boolean;
  securityLogs: boolean;
  securityLogRetentionDays: number;
  announcements: boolean;
  basicNotifications: boolean;
  
  // Accounting Features
  chartOfAccounts: boolean;
  transactionTemplates: boolean;
  journalEntries: boolean;
  financialReports: boolean;
  
  // Advanced Features
  automatedBilling: boolean;
  vendorManagement: boolean;
  expenseManagement: boolean;
  accountsReceivable: boolean;
  accountsPayable: boolean;
  whtManagement: boolean;
  budgetPlanning: boolean;
  bankReconciliation: boolean;
  
  // Analytics
  basicDashboard: boolean;
  enhancedAnalytics: boolean;
  advancedReports: boolean;
  
  // Support
  supportType: 'community' | 'email' | 'priority';
  supportResponseTime?: string;
}

export interface SubscriptionPlan {
  id: 'starter' | 'professional' | 'enterprise';
  name: string;
  description: string;
  monthlyPrice: number; // in NGN
  annualPrice: number; // in NGN (with 20% discount)
  currency: string;
  features: SubscriptionPlanFeatures;
  popular?: boolean;
}

export const SUBSCRIPTION_PLAN_IDS = ['starter', 'professional', 'enterprise'] as const;
export type SubscriptionPlanId = typeof SUBSCRIPTION_PLAN_IDS[number];

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanId, SubscriptionPlan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Best for small estates (1-50 units)',
    monthlyPrice: 50000,
    annualPrice: 480000,
    currency: 'NGN',
    features: {
      maxResidents: 50,
      maxAdmins: 1,
      maxSecurity: 1,
      maxAccountants: 0,
      
      residentManagement: true,
      manualBilling: true,
      paymentTracking: true,
      visitorAccessControl: true,
      securityLogs: true,
      securityLogRetentionDays: 30,
      announcements: true,
      basicNotifications: true,
      
      chartOfAccounts: false,
      transactionTemplates: false,
      journalEntries: false,
      financialReports: false,
      
      automatedBilling: false,
      vendorManagement: false,
      expenseManagement: false,
      accountsReceivable: false,
      accountsPayable: false,
      whtManagement: false,
      budgetPlanning: false,
      bankReconciliation: false,
      
      basicDashboard: true,
      enhancedAnalytics: false,
      advancedReports: false,
      
      supportType: 'community',
    },
  },
  
  professional: {
    id: 'professional',
    name: 'Professional',
    description: 'Best for medium estates (51-200 units)',
    monthlyPrice: 150000,
    annualPrice: 1440000,
    currency: 'NGN',
    popular: true,
    features: {
      maxResidents: 200,
      maxAdmins: 2,
      maxSecurity: 2,
      maxAccountants: 1,
      
      residentManagement: true,
      manualBilling: true,
      paymentTracking: true,
      visitorAccessControl: true,
      securityLogs: true,
      securityLogRetentionDays: 90,
      announcements: true,
      basicNotifications: true,
      
      chartOfAccounts: true,
      transactionTemplates: true,
      journalEntries: true,
      financialReports: true,
      
      automatedBilling: true,
      vendorManagement: true,
      expenseManagement: true,
      accountsReceivable: true,
      accountsPayable: false,
      whtManagement: false,
      budgetPlanning: false,
      bankReconciliation: false,
      
      basicDashboard: true,
      enhancedAnalytics: true,
      advancedReports: false,
      
      supportType: 'email',
      supportResponseTime: '48 hours',
    },
  },
  
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Best for large estates (Unlimited units)',
    monthlyPrice: 350000,
    annualPrice: 3360000,
    currency: 'NGN',
    features: {
      maxResidents: 999999, // Unlimited
      maxAdmins: 999999,
      maxSecurity: 999999,
      maxAccountants: 999999,
      
      residentManagement: true,
      manualBilling: true,
      paymentTracking: true,
      visitorAccessControl: true,
      securityLogs: true,
      securityLogRetentionDays: 999999, // Unlimited
      announcements: true,
      basicNotifications: true,
      
      chartOfAccounts: true,
      transactionTemplates: true,
      journalEntries: true,
      financialReports: true,
      
      automatedBilling: true,
      vendorManagement: true,
      expenseManagement: true,
      accountsReceivable: true,
      accountsPayable: true,
      whtManagement: true,
      budgetPlanning: true,
      bankReconciliation: true,
      
      basicDashboard: true,
      enhancedAnalytics: true,
      advancedReports: true,
      
      supportType: 'priority',
      supportResponseTime: '12 hours',
    },
  },
};

export function getPlanPrice(planId: string, billingCycle: 'monthly' | 'annual'): number {
  const plan = SUBSCRIPTION_PLANS[planId];
  if (!plan) return 0;
  return billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
}

export function hasFeatureAccess(subscription: any, feature: keyof SubscriptionPlanFeatures): boolean {
  if (!subscription) return false;
  const plan = SUBSCRIPTION_PLANS[subscription.plan];
  if (!plan) return false;
  return plan.features[feature] as boolean;
}

export function getUserLimitForRole(subscription: any, role: 'admin' | 'security' | 'accountant'): number {
  if (!subscription) return 0;
  const plan = SUBSCRIPTION_PLANS[subscription.plan];
  if (!plan) return 0;
  
  switch (role) {
    case 'admin':
      return plan.features.maxAdmins;
    case 'security':
      return plan.features.maxSecurity;
    case 'accountant':
      return plan.features.maxAccountants;
    default:
      return 0;
  }
}
// @ts-nocheck
