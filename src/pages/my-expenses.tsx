import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ExternalLink, Plus } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

export default function MyExpenses() {
  const { data: expenses = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/expenses/my-expenses'],
  });

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
          <TableHead>Receipt</TableHead>
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
                {expense.receiptPath && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(expense.receiptPath, '_blank')}
                    data-testid={`button-receipt-${expense.id}`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle data-testid="text-page-title">My Expense Requests</CardTitle>
              <CardDescription>
                View and track your submitted expense requests
              </CardDescription>
            </div>
            <Link href="/accountant/expenses/request">
              <Button data-testid="button-new-expense">
                <Plus className="h-4 w-4 mr-2" />
                New Expense
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="all" data-testid="tab-all">
                All ({expenses.length})
              </TabsTrigger>
              <TabsTrigger value="pending" data-testid="tab-pending">
                Pending ({pendingExpenses.length})
              </TabsTrigger>
              <TabsTrigger value="approved" data-testid="tab-approved">
                Approved ({approvedExpenses.length})
              </TabsTrigger>
              <TabsTrigger value="rejected" data-testid="tab-rejected">
                Rejected ({rejectedExpenses.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              {renderExpenseTable(expenses)}
            </TabsContent>

            <TabsContent value="pending">
              {renderExpenseTable(pendingExpenses)}
            </TabsContent>

            <TabsContent value="approved">
              {renderExpenseTable(approvedExpenses)}
            </TabsContent>

            <TabsContent value="rejected">
              {renderExpenseTable(rejectedExpenses)}
              {rejectedExpenses.length > 0 && rejectedExpenses.some(e => e.rejectionReason) && (
                <div className="mt-4 p-4 bg-muted rounded-md">
                  <h4 className="font-semibold mb-2">Rejection Reasons:</h4>
                  {rejectedExpenses.filter(e => e.rejectionReason).map((expense) => (
                    <div key={expense.id} className="mb-2">
                      <span className="font-medium">{format(new Date(expense.createdAt), "MMM dd, yyyy")}:</span>{" "}
                      {expense.rejectionReason}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
