import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Eye, DollarSign, Calendar, User } from "lucide-react";
import { format } from "date-fns";

interface PaymentApplication {
  id: string;
  billId: string;
  amountApplied: string;
  applicationType: "bank_statement" | "manual";
  bankName: string | null;
  accountNumber: string | null;
  paymentDate: Date;
  appliedBy: string;
  appliedAt: Date;
  notes: string | null;
  bill?: {
    id: string;
    invoiceNumber: string;
    description: string;
    amount: string;
    resident?: {
      id: string;
      fullName: string;
      houseNumber: string;
    };
  };
}

const formatNaira = (amount: string | number) => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(numAmount);
};

export default function Collections() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [selectedPayment, setSelectedPayment] = useState<PaymentApplication | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const { data: payments = [], isLoading } = useQuery<PaymentApplication[]>({
    queryKey: ['/api/admin/collections'],
    enabled: isAuthenticated && user?.role === "admin",
  });

  if (authLoading || !isAuthenticated || user?.role !== "admin") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const handleView = (payment: PaymentApplication) => {
    setSelectedPayment(payment);
    setViewDialogOpen(true);
  };

  const totalCollections = payments.reduce((sum, p) => sum + parseFloat(p.amountApplied), 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-collections-title">Collections</h1>
          <p className="text-muted-foreground">View all payments received from residents</p>
        </div>
        <Card className="w-auto">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Collections</p>
                <p className="text-2xl font-bold text-green-600" data-testid="text-total-collections">
                  {formatNaira(totalCollections)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No collections yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Resident</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(payment.paymentDate), 'MMM dd, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{payment.bill?.resident?.fullName || 'N/A'}</p>
                          <p className="text-sm text-muted-foreground">
                            {payment.bill?.resident?.houseNumber || ''}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {payment.bill?.invoiceNumber || 'N/A'}
                      </code>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {payment.bill?.description || 'N/A'}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-green-600">
                      {formatNaira(payment.amountApplied)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={payment.applicationType === 'bank_statement' ? 'default' : 'secondary'}>
                        {payment.applicationType === 'bank_statement' ? 'Bank Transfer' : 'Manual'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(payment)}
                        data-testid={`button-view-${payment.id}`}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Payment Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>
              Complete information about this payment
            </DialogDescription>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Payment Date</p>
                  <p className="font-medium">
                    {format(new Date(selectedPayment.paymentDate), 'MMMM dd, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount Paid</p>
                  <p className="font-medium text-green-600 text-lg">
                    {formatNaira(selectedPayment.amountApplied)}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Resident Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{selectedPayment.bill?.resident?.fullName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">House Number</p>
                    <p className="font-medium">{selectedPayment.bill?.resident?.houseNumber || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Bill Information</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Invoice Number</p>
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {selectedPayment.bill?.invoiceNumber || 'N/A'}
                    </code>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="font-medium">{selectedPayment.bill?.description || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Bill Amount</p>
                    <p className="font-medium">{formatNaira(selectedPayment.bill?.amount || 0)}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Payment Method</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <Badge variant={selectedPayment.applicationType === 'bank_statement' ? 'default' : 'secondary'}>
                      {selectedPayment.applicationType === 'bank_statement' ? 'Bank Transfer' : 'Manual Payment'}
                    </Badge>
                  </div>
                  {selectedPayment.bankName && (
                    <div>
                      <p className="text-sm text-muted-foreground">Bank Name</p>
                      <p className="font-medium">{selectedPayment.bankName}</p>
                    </div>
                  )}
                </div>
                {selectedPayment.accountNumber && (
                  <div className="mt-3">
                    <p className="text-sm text-muted-foreground">Account Number</p>
                    <p className="font-medium">{selectedPayment.accountNumber}</p>
                  </div>
                )}
              </div>

              {selectedPayment.notes && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Notes</h3>
                  <p className="text-sm">{selectedPayment.notes}</p>
                </div>
              )}

              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground">
                  Applied on {format(new Date(selectedPayment.appliedAt), 'MMMM dd, yyyy')} at {format(new Date(selectedPayment.appliedAt), 'hh:mm a')}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
