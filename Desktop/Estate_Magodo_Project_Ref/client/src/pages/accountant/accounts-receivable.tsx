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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Eye, CreditCard } from "lucide-react";
import { format } from "date-fns";

interface AREntry {
  id: string;
  residentId: string;
  residentName: string;
  unitNumber: string;
  invoiceNumber: string;
  description: string;
  amount: string;
  totalPaid: string;
  balance: string;
  paymentStatus: string;
  status: string;
  dueDate: string;
  createdAt: string;
}

export default function AccountsReceivable() {
  const { toast } = useToast();
  const [selectedEntry, setSelectedEntry] = useState<AREntry | null>(null);
  const [showMarkPaidDialog, setShowMarkPaidDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  
  const [amountApplied, setAmountApplied] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");

  // Fetch AR entries
  const { data: arEntries = [], isLoading } = useQuery<AREntry[]>({
    queryKey: ['/api/accountant/accounts-receivable'],
  });

  // Mark as paid mutation
  const markPaidMutation = useMutation({
    mutationFn: async (data: { 
      id: string; 
      amountApplied: string; 
      bankName: string; 
      accountNumber: string; 
      paymentDate: string; 
      notes?: string; 
    }) => {
      const { id, ...paymentData } = data;
      return await apiRequest('POST', `/api/accountant/accounts-receivable/${id}/mark-paid`, paymentData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accountant/accounts-receivable'] });
      toast({
        title: "Payment Applied",
        description: "The payment has been applied and posted to the general ledger",
      });
      setShowMarkPaidDialog(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to apply payment",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedEntry(null);
    setAmountApplied("");
    setBankName("");
    setAccountNumber("");
    setPaymentDate(format(new Date(), "yyyy-MM-dd"));
    setNotes("");
  };

  const handleMarkPaidClick = (entry: AREntry) => {
    setSelectedEntry(entry);
    setAmountApplied(entry.balance);
    setShowMarkPaidDialog(true);
  };

  const handleMarkPaidSubmit = () => {
    if (!selectedEntry) return;

    if (!amountApplied || !bankName || !accountNumber || !paymentDate) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(amountApplied);
    const balance = parseFloat(selectedEntry.balance);

    if (amount <= 0 || amount > balance) {
      toast({
        title: "Invalid Amount",
        description: `Amount must be between ₦0 and ₦${balance.toLocaleString()}`,
        variant: "destructive",
      });
      return;
    }

    markPaidMutation.mutate({
      id: selectedEntry.id,
      amountApplied,
      bankName,
      accountNumber,
      paymentDate,
      notes,
    });
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      unpaid: { label: "Unpaid", variant: "destructive" },
      partial: { label: "Partially Paid", variant: "secondary" },
      paid: { label: "Paid", variant: "default" },
    };

    const config = statusConfig[status] || { label: status, variant: "outline" };
    return <Badge variant={config.variant} data-testid={`status-payment-${status}`}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `₦${numAmount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" data-testid="loader-loading" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle data-testid="text-page-title">Accounts Receivable</CardTitle>
          <CardDescription data-testid="text-page-description">
            Manage resident bills and track payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {arEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-entries">
              No accounts receivable entries found
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead data-testid="header-invoice">Invoice #</TableHead>
                    <TableHead data-testid="header-resident">Resident</TableHead>
                    <TableHead data-testid="header-unit">Unit</TableHead>
                    <TableHead data-testid="header-description">Description</TableHead>
                    <TableHead data-testid="header-amount">Amount</TableHead>
                    <TableHead data-testid="header-paid">Total Paid</TableHead>
                    <TableHead data-testid="header-balance">Balance</TableHead>
                    <TableHead data-testid="header-status">Status</TableHead>
                    <TableHead data-testid="header-due-date">Due Date</TableHead>
                    <TableHead data-testid="header-actions">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {arEntries.map((entry) => (
                    <TableRow key={entry.id} data-testid={`row-entry-${entry.id}`}>
                      <TableCell className="font-medium" data-testid={`text-invoice-${entry.id}`}>
                        {entry.invoiceNumber}
                      </TableCell>
                      <TableCell data-testid={`text-resident-${entry.id}`}>
                        {entry.residentName}
                      </TableCell>
                      <TableCell data-testid={`text-unit-${entry.id}`}>
                        {entry.unitNumber}
                      </TableCell>
                      <TableCell data-testid={`text-description-${entry.id}`}>
                        {entry.description}
                      </TableCell>
                      <TableCell data-testid={`text-amount-${entry.id}`}>
                        {formatCurrency(entry.amount)}
                      </TableCell>
                      <TableCell data-testid={`text-total-paid-${entry.id}`}>
                        {formatCurrency(entry.totalPaid)}
                      </TableCell>
                      <TableCell className="font-semibold" data-testid={`text-balance-${entry.id}`}>
                        {formatCurrency(entry.balance)}
                      </TableCell>
                      <TableCell data-testid={`cell-status-${entry.id}`}>
                        {getPaymentStatusBadge(entry.paymentStatus)}
                      </TableCell>
                      <TableCell data-testid={`text-due-date-${entry.id}`}>
                        {format(new Date(entry.dueDate), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedEntry(entry);
                              setShowViewDialog(true);
                            }}
                            data-testid={`button-view-${entry.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          {entry.paymentStatus !== "paid" && (
                            <Button
                              size="sm"
                              onClick={() => handleMarkPaidClick(entry)}
                              data-testid={`button-mark-paid-${entry.id}`}
                            >
                              <CreditCard className="h-4 w-4 mr-1" />
                              Mark as Paid
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent data-testid="dialog-view-entry">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">AR Entry Details</DialogTitle>
            <DialogDescription data-testid="text-dialog-description">
              Full details of the accounts receivable entry
            </DialogDescription>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Invoice Number</Label>
                  <p className="font-medium" data-testid="text-detail-invoice">{selectedEntry.invoiceNumber}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Payment Status</Label>
                  <div data-testid="badge-detail-status">{getPaymentStatusBadge(selectedEntry.paymentStatus)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Resident</Label>
                  <p className="font-medium" data-testid="text-detail-resident">{selectedEntry.residentName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Unit Number</Label>
                  <p className="font-medium" data-testid="text-detail-unit">{selectedEntry.unitNumber}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Bill Amount</Label>
                  <p className="font-medium" data-testid="text-detail-amount">{formatCurrency(selectedEntry.amount)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Total Paid</Label>
                  <p className="font-medium" data-testid="text-detail-total-paid">{formatCurrency(selectedEntry.totalPaid)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Balance Due</Label>
                  <p className="font-semibold text-lg" data-testid="text-detail-balance">{formatCurrency(selectedEntry.balance)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Due Date</Label>
                  <p className="font-medium" data-testid="text-detail-due-date">{format(new Date(selectedEntry.dueDate), "MMM dd, yyyy")}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p className="mt-1" data-testid="text-detail-description">{selectedEntry.description}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)} data-testid="button-close-view">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Paid Dialog */}
      <Dialog open={showMarkPaidDialog} onOpenChange={setShowMarkPaidDialog}>
        <DialogContent data-testid="dialog-mark-paid">
          <DialogHeader>
            <DialogTitle data-testid="text-mark-paid-title">Apply Payment</DialogTitle>
            <DialogDescription data-testid="text-mark-paid-description">
              Record payment received for invoice {selectedEntry?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Resident:</span>
                    <span className="ml-2 font-medium" data-testid="text-payment-resident">{selectedEntry.residentName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Outstanding Balance:</span>
                    <span className="ml-2 font-semibold" data-testid="text-payment-balance">{formatCurrency(selectedEntry.balance)}</span>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="amountApplied">
                  Amount Received <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="amountApplied"
                  type="number"
                  step="0.01"
                  value={amountApplied}
                  onChange={(e) => setAmountApplied(e.target.value)}
                  placeholder="Enter amount received"
                  data-testid="input-amount-applied"
                />
              </div>

              <div>
                <Label htmlFor="bankName">
                  Bank Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="bankName"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Enter bank name"
                  data-testid="input-bank-name"
                />
              </div>

              <div>
                <Label htmlFor="accountNumber">
                  Account Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="accountNumber"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Enter account number"
                  data-testid="input-account-number"
                />
              </div>

              <div>
                <Label htmlFor="paymentDate">
                  Payment Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  data-testid="input-payment-date"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this payment"
                  rows={3}
                  data-testid="input-notes"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowMarkPaidDialog(false);
                resetForm();
              }}
              data-testid="button-cancel-payment"
            >
              Cancel
            </Button>
            <Button
              onClick={handleMarkPaidSubmit}
              disabled={markPaidMutation.isPending}
              data-testid="button-submit-payment"
            >
              {markPaidMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Apply Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
