import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Eye, CreditCard, Clock, XCircle, FileText } from "lucide-react";

interface Expense {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorBankName: string;
  vendorBankAccountNumber: string;
  vendorBankAccountName: string;
  accountId: string;
  accountNumber: string;
  accountName: string;
  expenseType: string;
  description: string;
  expenseAmount: string;
  serviceCharge: string | null;
  receiptPath: string | null;
  status: string;
  paymentStatus: string;
  whtRate: string | null;
  whtAmount: string | null;
  netPayment: string | null;
  paidDate: string | null;
  paidFromAccountId: string | null;
  reviewedBy: string;
  reviewedAt: string;
  createdAt: string;
  submittedBy: string;
  submitterName: string;
}

interface BankAccount {
  id: string;
  accountNumber: string;
  accountName: string;
  accountType: string;
  balance: string;
}

export default function AccountsPayable() {
  const { toast } = useToast();
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showPayNowDialog, setShowPayNowDialog] = useState(false);
  const [showPayLaterDialog, setShowPayLaterDialog] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [receiptToView, setReceiptToView] = useState<string>("");
  
  const [selectedBankAccount, setSelectedBankAccount] = useState("");
  const [whtRate, setWhtRate] = useState("5.00");
  const [declineReason, setDeclineReason] = useState("");

  // Fetch approved expenses
  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ['/api/accountant/accounts-payable'],
  });

  // Fetch bank accounts
  const { data: bankAccounts = [] } = useQuery<BankAccount[]>({
    queryKey: ['/api/accountant/bank-accounts'],
  });

  // Pay now mutation
  const payNowMutation = useMutation({
    mutationFn: async (data: { id: string; paidFromAccountId: string; whtRate: string }) => {
      return await apiRequest('POST', `/api/accountant/accounts-payable/${data.id}/pay-now`, {
        paidFromAccountId: data.paidFromAccountId,
        whtRate: data.whtRate
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accountant/accounts-payable'] });
      toast({
        title: "Payment Processed",
        description: "The expense has been paid and posted to the general ledger",
      });
      setShowPayNowDialog(false);
      setSelectedExpense(null);
      setSelectedBankAccount("");
      setWhtRate("5.00");
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process payment",
        variant: "destructive",
      });
    },
  });

  // Pay later mutation
  const payLaterMutation = useMutation({
    mutationFn: async (data: { id: string; whtRate: string }) => {
      return await apiRequest('POST', `/api/accountant/accounts-payable/${data.id}/pay-later`, {
        whtRate: data.whtRate
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accountant/accounts-payable'] });
      toast({
        title: "Approved for Payment",
        description: "The expense has been approved for payment later",
      });
      setShowPayLaterDialog(false);
      setSelectedExpense(null);
      setWhtRate("5.00");
    },
    onError: (error: any) => {
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve for payment",
        variant: "destructive",
      });
    },
  });

  // Decline mutation
  const declineMutation = useMutation({
    mutationFn: async (data: { id: string; reason: string }) => {
      return await apiRequest('POST', `/api/accountant/expenses/${data.id}/reject`, {
        reason: data.reason
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accountant/accounts-payable'] });
      toast({
        title: "Expense Declined",
        description: "The expense has been rejected",
      });
      setShowDeclineDialog(false);
      setSelectedExpense(null);
      setDeclineReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Decline Failed",
        description: error.message || "Failed to decline expense",
        variant: "destructive",
      });
    },
  });

  const calculatePaymentDetails = (expense: Expense, whtRateValue: string) => {
    const expenseAmount = parseFloat(expense.expenseAmount);
    const serviceCharge = parseFloat(expense.serviceCharge || '0');
    const whtRateNum = parseFloat(whtRateValue);
    const whtAmount = (serviceCharge * whtRateNum) / 100;
    const totalAmount = expenseAmount + serviceCharge;
    const netPayment = totalAmount - whtAmount;

    return {
      expenseAmount,
      serviceCharge,
      whtAmount,
      totalAmount,
      netPayment,
    };
  };

  const handlePayNow = () => {
    if (!selectedExpense || !selectedBankAccount || !whtRate) {
      toast({
        title: "Validation Error",
        description: "Please select a bank account and enter WHT rate",
        variant: "destructive",
      });
      return;
    }

    payNowMutation.mutate({
      id: selectedExpense.id,
      paidFromAccountId: selectedBankAccount,
      whtRate,
    });
  };

  const handlePayLater = () => {
    if (!selectedExpense || !whtRate) {
      toast({
        title: "Validation Error",
        description: "Please enter WHT rate",
        variant: "destructive",
      });
      return;
    }

    payLaterMutation.mutate({
      id: selectedExpense.id,
      whtRate,
    });
  };

  const handleDecline = () => {
    if (!selectedExpense || !declineReason.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a decline reason",
        variant: "destructive",
      });
      return;
    }

    declineMutation.mutate({
      id: selectedExpense.id,
      reason: declineReason,
    });
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" data-testid={`badge-payment-status-paid`}>Paid</Badge>;
      case 'approved_for_payment':
        return <Badge variant="secondary" data-testid={`badge-payment-status-approved`}>Approved for Payment</Badge>;
      default:
        return <Badge variant="outline" data-testid={`badge-payment-status-unpaid`}>Unpaid</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" data-testid="loader-accounts-payable" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="heading-accounts-payable">Accounts Payable</h1>
        <p className="text-muted-foreground" data-testid="text-description">
          Manage and process payments for approved expenses
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle data-testid="heading-approved-expenses">Approved Expenses</CardTitle>
          <CardDescription data-testid="text-card-description">
            View and process approved expenses for payment
          </CardDescription>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-expenses">
              No approved expenses for payment
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead data-testid="th-vendor">Vendor</TableHead>
                    <TableHead data-testid="th-description">Description</TableHead>
                    <TableHead data-testid="th-type">Type</TableHead>
                    <TableHead data-testid="th-expense-amount">Expense Amount</TableHead>
                    <TableHead data-testid="th-service-charge">Service Charge</TableHead>
                    <TableHead data-testid="th-total">Total</TableHead>
                    <TableHead data-testid="th-payment-status">Payment Status</TableHead>
                    <TableHead data-testid="th-actions">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => {
                    const totalAmount = parseFloat(expense.expenseAmount) + parseFloat(expense.serviceCharge || '0');
                    return (
                      <TableRow key={expense.id} data-testid={`row-expense-${expense.id}`}>
                        <TableCell data-testid={`cell-vendor-${expense.id}`}>{expense.vendorName || 'N/A'}</TableCell>
                        <TableCell data-testid={`cell-description-${expense.id}`} className="max-w-xs truncate">
                          {expense.description}
                        </TableCell>
                        <TableCell data-testid={`cell-type-${expense.id}`}>{expense.expenseType}</TableCell>
                        <TableCell data-testid={`cell-expense-amount-${expense.id}`}>
                          ₦{parseFloat(expense.expenseAmount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell data-testid={`cell-service-charge-${expense.id}`}>
                          {expense.serviceCharge ? `₦${parseFloat(expense.serviceCharge).toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : 'N/A'}
                        </TableCell>
                        <TableCell data-testid={`cell-total-${expense.id}`} className="font-semibold">
                          ₦{totalAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell data-testid={`cell-payment-status-${expense.id}`}>
                          {getPaymentStatusBadge(expense.paymentStatus)}
                        </TableCell>
                        <TableCell data-testid={`cell-actions-${expense.id}`}>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedExpense(expense);
                                setShowViewDialog(true);
                              }}
                              data-testid={`button-view-${expense.id}`}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            {expense.paymentStatus === 'unpaid' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedExpense(expense);
                                    setWhtRate("5.00");
                                    setShowPayNowDialog(true);
                                  }}
                                  data-testid={`button-pay-now-${expense.id}`}
                                >
                                  <CreditCard className="h-4 w-4 mr-1" />
                                  Pay Now
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => {
                                    setSelectedExpense(expense);
                                    setWhtRate("5.00");
                                    setShowPayLaterDialog(true);
                                  }}
                                  data-testid={`button-pay-later-${expense.id}`}
                                >
                                  <Clock className="h-4 w-4 mr-1" />
                                  Pay Later
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedExpense(expense);
                                    setShowDeclineDialog(true);
                                  }}
                                  data-testid={`button-decline-${expense.id}`}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Decline
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl" data-testid="dialog-view-expense">
          <DialogHeader>
            <DialogTitle data-testid="heading-expense-details">Expense Details</DialogTitle>
            <DialogDescription data-testid="text-dialog-description">
              Complete details of the selected expense
            </DialogDescription>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Vendor</Label>
                  <p className="font-semibold" data-testid="text-vendor-name">{selectedExpense.vendorName || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Expense Type</Label>
                  <p className="font-semibold" data-testid="text-expense-type">{selectedExpense.expenseType}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Expense Amount</Label>
                  <p className="font-semibold" data-testid="text-expense-amount">
                    ₦{parseFloat(selectedExpense.expenseAmount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Service Charge</Label>
                  <p className="font-semibold" data-testid="text-service-charge">
                    {selectedExpense.serviceCharge ? `₦${parseFloat(selectedExpense.serviceCharge).toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : 'N/A'}
                  </p>
                </div>
                {selectedExpense.accountNumber && (
                  <div>
                    <Label className="text-muted-foreground">Expense Classification</Label>
                    <p className="font-semibold" data-testid="text-account">
                      {selectedExpense.accountNumber} - {selectedExpense.accountName}
                    </p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">Payment Status</Label>
                  <div data-testid="text-payment-status">{getPaymentStatusBadge(selectedExpense.paymentStatus)}</div>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p className="text-sm" data-testid="text-description-detail">{selectedExpense.description}</p>
              </div>
              {selectedExpense.vendorBankName && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Vendor Banking Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Bank Name</Label>
                      <p data-testid="text-bank-name">{selectedExpense.vendorBankName}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Account Number</Label>
                      <p data-testid="text-account-number">{selectedExpense.vendorBankAccountNumber}</p>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">Account Name</Label>
                      <p data-testid="text-account-name">{selectedExpense.vendorBankAccountName}</p>
                    </div>
                  </div>
                </div>
              )}
              {selectedExpense.receiptPath && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setReceiptToView(selectedExpense.receiptPath!);
                    setShowReceiptDialog(true);
                  }}
                  data-testid="button-view-receipt"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Receipt
                </Button>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)} data-testid="button-close-view">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Now Dialog */}
      <Dialog open={showPayNowDialog} onOpenChange={setShowPayNowDialog}>
        <DialogContent data-testid="dialog-pay-now">
          <DialogHeader>
            <DialogTitle data-testid="heading-pay-now">Process Payment</DialogTitle>
            <DialogDescription data-testid="text-pay-now-description">
              Select bank account and confirm payment details
            </DialogDescription>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-md">
                <div>
                  <Label className="text-muted-foreground">Vendor</Label>
                  <p className="font-semibold" data-testid="text-pay-vendor">{selectedExpense.vendorName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="text-sm" data-testid="text-pay-description">{selectedExpense.description}</p>
                </div>
              </div>

              <div>
                <Label htmlFor="bank-account">Pay from Bank Account *</Label>
                <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
                  <SelectTrigger data-testid="select-bank-account">
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id} data-testid={`option-bank-${account.id}`}>
                        {account.accountNumber} - {account.accountName} (Balance: ₦{parseFloat(account.balance).toLocaleString('en-NG')})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="wht-rate">WHT Rate (%) *</Label>
                <Input
                  id="wht-rate"
                  type="number"
                  step="0.01"
                  value={whtRate}
                  onChange={(e) => setWhtRate(e.target.value)}
                  data-testid="input-wht-rate"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Withholding tax is calculated on the service charge only
                </p>
              </div>

              {whtRate && (
                <div className="border-t pt-4 space-y-2">
                  <h3 className="font-semibold">Payment Summary</h3>
                  {(() => {
                    const details = calculatePaymentDetails(selectedExpense, whtRate);
                    return (
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Expense Amount:</span>
                          <span data-testid="text-summary-expense">₦{details.expenseAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Service Charge:</span>
                          <span data-testid="text-summary-service">₦{details.serviceCharge.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Amount:</span>
                          <span data-testid="text-summary-total">₦{details.totalAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-destructive">
                          <span>WHT ({whtRate}%):</span>
                          <span data-testid="text-summary-wht">-₦{details.whtAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-base border-t pt-2">
                          <span>Net Payment:</span>
                          <span data-testid="text-summary-net">₦{details.netPayment.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPayNowDialog(false);
                setSelectedBankAccount("");
                setWhtRate("5.00");
              }}
              data-testid="button-cancel-pay"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayNow}
              disabled={payNowMutation.isPending || !selectedBankAccount}
              data-testid="button-confirm-pay"
            >
              {payNowMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Later Dialog */}
      <Dialog open={showPayLaterDialog} onOpenChange={setShowPayLaterDialog}>
        <DialogContent data-testid="dialog-pay-later">
          <DialogHeader>
            <DialogTitle data-testid="heading-pay-later">Approve for Payment Later</DialogTitle>
            <DialogDescription data-testid="text-pay-later-description">
              Set WHT rate and approve expense for future payment
            </DialogDescription>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-md">
                <div>
                  <Label className="text-muted-foreground">Vendor</Label>
                  <p className="font-semibold" data-testid="text-later-vendor">{selectedExpense.vendorName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="text-sm" data-testid="text-later-description">{selectedExpense.description}</p>
                </div>
              </div>

              <div>
                <Label htmlFor="wht-rate-later">WHT Rate (%) *</Label>
                <Input
                  id="wht-rate-later"
                  type="number"
                  step="0.01"
                  value={whtRate}
                  onChange={(e) => setWhtRate(e.target.value)}
                  data-testid="input-wht-rate-later"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Withholding tax is calculated on the service charge only
                </p>
              </div>

              {whtRate && (
                <div className="border-t pt-4 space-y-2">
                  <h3 className="font-semibold">Payment Summary (for future payment)</h3>
                  {(() => {
                    const details = calculatePaymentDetails(selectedExpense, whtRate);
                    return (
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Expense Amount:</span>
                          <span data-testid="text-later-expense">₦{details.expenseAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Service Charge:</span>
                          <span data-testid="text-later-service">₦{details.serviceCharge.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Amount:</span>
                          <span data-testid="text-later-total">₦{details.totalAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-destructive">
                          <span>WHT ({whtRate}%):</span>
                          <span data-testid="text-later-wht">-₦{details.whtAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-base border-t pt-2">
                          <span>Net Payment:</span>
                          <span data-testid="text-later-net">₦{details.netPayment.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPayLaterDialog(false);
                setWhtRate("5.00");
              }}
              data-testid="button-cancel-later"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayLater}
              disabled={payLaterMutation.isPending}
              data-testid="button-confirm-later"
            >
              {payLaterMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve for Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Dialog */}
      <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <DialogContent data-testid="dialog-decline">
          <DialogHeader>
            <DialogTitle data-testid="heading-decline">Decline Expense</DialogTitle>
            <DialogDescription data-testid="text-decline-description">
              Provide a reason for declining this expense
            </DialogDescription>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-md">
                <p className="font-semibold" data-testid="text-decline-vendor">
                  {selectedExpense.vendorName} - {selectedExpense.description}
                </p>
                <p className="text-sm text-muted-foreground" data-testid="text-decline-amount">
                  Amount: ₦{(parseFloat(selectedExpense.expenseAmount) + parseFloat(selectedExpense.serviceCharge || '0')).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div>
                <Label htmlFor="decline-reason">Decline Reason *</Label>
                <Textarea
                  id="decline-reason"
                  placeholder="Enter reason for declining this expense..."
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  rows={4}
                  data-testid="textarea-decline-reason"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeclineDialog(false);
                setDeclineReason("");
              }}
              data-testid="button-cancel-decline"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDecline}
              disabled={declineMutation.isPending || !declineReason.trim()}
              data-testid="button-confirm-decline"
            >
              {declineMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Decline Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="max-w-3xl" data-testid="dialog-receipt">
          <DialogHeader>
            <DialogTitle data-testid="heading-receipt">Receipt Image</DialogTitle>
            <DialogDescription data-testid="text-receipt-description">
              View uploaded receipt
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {receiptToView && (
              <img
                src={receiptToView}
                alt="Receipt"
                className="w-full h-auto rounded-md border"
                data-testid="img-receipt-view"
              />
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowReceiptDialog(false);
                setReceiptToView("");
              }}
              data-testid="button-close-receipt"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
