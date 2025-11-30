import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Loader2, ExternalLink, AlertTriangle, TrendingUp, Receipt } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

// Component to display budget information for an expense account
function BudgetInfo({ accountId }: { accountId: string | null }) {
  const { data: budgetInfo, isLoading } = useQuery<any>({
    queryKey: ['/api/accountant/budgets/account', accountId],
    enabled: !!accountId,
  });

  if (!accountId) {
    return (
      <div className="text-sm text-muted-foreground">
        No active budget
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Loading budget information...</span>
      </div>
    );
  }

  if (!budgetInfo) {
    return (
      <div className="text-sm text-muted-foreground">
        No active budget for this account
      </div>
    );
  }

  const allocated = parseFloat(budgetInfo.allocatedAmount || '0');
  const consumed = parseFloat(budgetInfo.consumedAmount || '0');
  const remaining = parseFloat(budgetInfo.remainingAmount || '0');
  const percentUsed = (consumed / allocated) * 100;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs font-medium">{budgetInfo.budgetName}</span>
      </div>
      <div className="text-xs space-y-0.5">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Allocated:</span>
          <span className="font-mono">₦{allocated.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Consumed:</span>
          <span className="font-mono">₦{consumed.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Remaining:</span>
          <span className={`font-mono ${percentUsed > 90 ? 'text-red-600 font-semibold' : ''}`}>
            ₦{remaining.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Used:</span>
          <span className={`font-semibold ${percentUsed > 90 ? 'text-red-600' : percentUsed > 75 ? 'text-orange-600' : 'text-green-600'}`}>
            {percentUsed.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

// Component to check if expense will exceed budget
function BudgetWarning({ accountId, expenseAmount }: { accountId: string | null; expenseAmount: number }) {
  const { data: budgetInfo, isLoading } = useQuery<any>({
    queryKey: ['/api/accountant/budgets/account', accountId],
    enabled: !!accountId,
  });

  if (!accountId || isLoading || !budgetInfo) {
    return null;
  }

  const remaining = parseFloat(budgetInfo.remainingAmount || '0');
  const willExceed = expenseAmount > remaining;

  if (!willExceed) {
    return null;
  }

  const overage = expenseAmount - remaining;

  return (
    <Alert variant="destructive" className="mt-2">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        This expense (₦{expenseAmount.toLocaleString()}) exceeds the remaining budget by ₦{overage.toLocaleString()}
      </AlertDescription>
    </Alert>
  );
}

export default function ExpenseApproval() {
  const { toast } = useToast();
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [receiptToView, setReceiptToView] = useState<string>("");
  const [expenseToApprove, setExpenseToApprove] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: expenses = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/accountant/expenses'],
  });

  const approveMutation = useMutation({
    mutationFn: async (expenseId: string) => {
      return await apiRequest('POST', `/api/accountant/expenses/${expenseId}/approve`, {});
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Expense approved successfully",
      });
      setShowApprovalDialog(false);
      setExpenseToApprove(null);
      queryClient.invalidateQueries({ queryKey: ['/api/accountant/expenses'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve expense",
        variant: "destructive",
      });
      // Keep dialog open on error so user can retry
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ expenseId, reason }: { expenseId: string; reason: string }) => {
      return await apiRequest('POST', `/api/accountant/expenses/${expenseId}/reject`, { reason });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Expense rejected successfully",
      });
      setShowRejectDialog(false);
      setSelectedExpense(null);
      setRejectionReason("");
      queryClient.invalidateQueries({ queryKey: ['/api/accountant/expenses'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject expense",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (expense: any) => {
    setExpenseToApprove(expense);
    setShowApprovalDialog(true);
  };

  const confirmApprove = () => {
    if (expenseToApprove) {
      approveMutation.mutate(expenseToApprove.id);
    }
  };

  const handleReject = (expense: any) => {
    setSelectedExpense(expense);
    setShowRejectDialog(true);
  };

  const confirmReject = () => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a rejection reason",
        variant: "destructive",
      });
      return;
    }
    rejectMutation.mutate({
      expenseId: selectedExpense.id,
      reason: rejectionReason,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" data-testid={`status-pending`}>Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-600 hover:bg-green-700" data-testid={`status-approved`}>Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" data-testid={`status-rejected`}>Rejected</Badge>;
      default:
        return <Badge variant="outline" data-testid={`status-${status}`}>{status}</Badge>;
    }
  };

  const calculateTotal = (expense: any) => {
    const amount = parseFloat(expense.expenseAmount) || 0;
    const serviceCharge = parseFloat(expense.serviceCharge) || 0;
    return amount + serviceCharge;
  };

  const renderExpenseTable = (filteredExpenses: any[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Vendor</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Service Charge</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredExpenses.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="text-center text-muted-foreground">
              No expenses found
            </TableCell>
          </TableRow>
        ) : (
          filteredExpenses.map((expense) => (
            <TableRow key={expense.id} data-testid={`row-expense-${expense.id}`}>
              <TableCell data-testid={`text-date-${expense.id}`}>
                {format(new Date(expense.createdAt), "MMM dd, yyyy")}
              </TableCell>
              <TableCell data-testid={`text-type-${expense.id}`}>
                {expense.expenseType}
              </TableCell>
              <TableCell data-testid={`text-description-${expense.id}`}>
                <div className="max-w-xs truncate" title={expense.description}>
                  {expense.description}
                </div>
              </TableCell>
              <TableCell data-testid={`text-vendor-${expense.id}`}>
                {expense.vendorName || "-"}
              </TableCell>
              <TableCell data-testid={`text-amount-${expense.id}`}>
                ₦{parseFloat(expense.expenseAmount).toLocaleString()}
              </TableCell>
              <TableCell data-testid={`text-service-charge-${expense.id}`}>
                {expense.serviceCharge ? `₦${parseFloat(expense.serviceCharge).toLocaleString()}` : "-"}
              </TableCell>
              <TableCell data-testid={`text-total-${expense.id}`}>
                ₦{calculateTotal(expense).toLocaleString()}
              </TableCell>
              <TableCell>
                {getStatusBadge(expense.status)}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {expense.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleApprove(expense)}
                        disabled={approveMutation.isPending}
                        data-testid={`button-approve-${expense.id}`}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(expense)}
                        disabled={rejectMutation.isPending}
                        data-testid={`button-reject-${expense.id}`}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {expense.receiptPath && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setReceiptToView(expense.receiptPath);
                        setShowReceiptDialog(true);
                      }}
                      data-testid={`button-receipt-${expense.id}`}
                    >
                      <Receipt className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  const pendingExpenses = expenses.filter(e => e.status === 'pending');
  const approvedExpenses = expenses.filter(e => e.status === 'approved');
  const rejectedExpenses = expenses.filter(e => e.status === 'rejected');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle data-testid="text-page-title">Expense Approval</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="pending" data-testid="tab-pending">
                Pending ({pendingExpenses.length})
              </TabsTrigger>
              <TabsTrigger value="approved" data-testid="tab-approved">
                Approved ({approvedExpenses.length})
              </TabsTrigger>
              <TabsTrigger value="rejected" data-testid="tab-rejected">
                Rejected ({rejectedExpenses.length})
              </TabsTrigger>
              <TabsTrigger value="all" data-testid="tab-all">
                All ({expenses.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              {renderExpenseTable(pendingExpenses)}
            </TabsContent>

            <TabsContent value="approved">
              {renderExpenseTable(approvedExpenses)}
            </TabsContent>

            <TabsContent value="rejected">
              {renderExpenseTable(rejectedExpenses)}
            </TabsContent>

            <TabsContent value="all">
              {renderExpenseTable(expenses)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-2xl" data-testid="dialog-approve">
          <DialogHeader>
            <DialogTitle>Approve Expense</DialogTitle>
            <DialogDescription>
              Review budget utilization before approving this expense
            </DialogDescription>
          </DialogHeader>
          {expenseToApprove && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Expense Details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm border rounded-md p-4 bg-muted/30">
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <div className="font-medium">{expenseToApprove.expenseType}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Vendor:</span>
                    <div className="font-medium">{expenseToApprove.vendorName || "N/A"}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Amount:</span>
                    <div className="font-medium">₦{parseFloat(expenseToApprove.expenseAmount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</div>
                  </div>
                  {expenseToApprove.serviceCharge && (
                    <div>
                      <span className="text-muted-foreground">Service Charge:</span>
                      <div className="font-medium">₦{parseFloat(expenseToApprove.serviceCharge).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</div>
                    </div>
                  )}
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Description:</span>
                    <div className="font-medium">{expenseToApprove.description}</div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Total Amount:</span>
                    <div className="text-lg font-bold">₦{calculateTotal(expenseToApprove).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</div>
                  </div>
                </div>
              </div>

              {expenseToApprove.accountId && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Budget Information</h3>
                  <div className="border rounded-md p-4 bg-muted/30">
                    <BudgetInfo accountId={expenseToApprove.accountId} />
                  </div>
                  <BudgetWarning 
                    accountId={expenseToApprove.accountId} 
                    expenseAmount={calculateTotal(expenseToApprove)} 
                  />
                </div>
              )}

              {!expenseToApprove.accountId && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This expense is not linked to any budget account. Budget tracking will not be available.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowApprovalDialog(false);
                setExpenseToApprove(null);
              }}
              data-testid="button-cancel-approval"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmApprove}
              disabled={approveMutation.isPending}
              data-testid="button-confirm-approve"
            >
              {approveMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Approve Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent data-testid="dialog-reject">
          <DialogHeader>
            <DialogTitle>Reject Expense</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this expense request.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rejection-reason">Rejection Reason</Label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter reason for rejection..."
              rows={4}
              className="mt-2"
              data-testid="input-rejection-reason"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setSelectedExpense(null);
                setRejectionReason("");
              }}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={rejectMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Reject Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="max-w-3xl" data-testid="dialog-receipt">
          <DialogHeader>
            <DialogTitle>Receipt Image</DialogTitle>
            <DialogDescription>
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
