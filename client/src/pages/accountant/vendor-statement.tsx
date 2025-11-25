import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, FileText } from "lucide-react";
import { format } from "date-fns";
import type { Vendor } from "@shared/schema";

export default function VendorStatement() {
  const [location] = useLocation();
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const vendorIdFromUrl = urlParams.get('vendorId') || "";

  const [selectedVendorId, setSelectedVendorId] = useState<string>(vendorIdFromUrl);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [appliedParams, setAppliedParams] = useState<{
    vendorId: string;
    startDate?: string;
    endDate?: string;
  } | null>(null);

  // Auto-generate statement if vendorId is in URL
  useEffect(() => {
    if (vendorIdFromUrl && !appliedParams) {
      setAppliedParams({
        vendorId: vendorIdFromUrl,
        startDate: undefined,
        endDate: undefined,
      });
    }
  }, [vendorIdFromUrl, appliedParams]);

  const { data: vendors } = useQuery<Vendor[]>({
    queryKey: ["/api/accountant/vendors"],
  });

  const approvedVendors = vendors?.filter(v => v.status === "approved") || [];

  const { data: statement, isLoading, isFetching } = useQuery({
    queryKey: appliedParams ? [
      "/api/accountant/vendors",
      appliedParams.vendorId,
      "statement",
      {
        ...(appliedParams.startDate && { startDate: appliedParams.startDate }),
        ...(appliedParams.endDate && { endDate: appliedParams.endDate }),
      }
    ] : ['__disabled__'],
    enabled: Boolean(appliedParams),
  });

  const handleGenerateStatement = () => {
    if (selectedVendorId) {
      setAppliedParams({
        vendorId: selectedVendorId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
    }
  };

  const handleDownloadJSON = () => {
    if (isFetching || !statement) return;

    const dataStr = JSON.stringify(statement, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vendor-statement-${statement.vendor.name.replace(/\s+/g, "-")}-${appliedParams?.startDate || "all"}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrintPDF = () => {
    if (isFetching || !statement) return;
    window.print();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6 print:hidden">
        <h1 className="text-3xl font-bold" data-testid="text-title">Vendor Account Statement</h1>
        <p className="text-muted-foreground">Generate account statements for vendors</p>
      </div>

      <Card className="mb-6 print:hidden">
        <CardHeader>
          <CardTitle>Statement Parameters</CardTitle>
          <CardDescription>Select a vendor and optional date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="vendor">Vendor *</Label>
                <Select 
                  value={selectedVendorId} 
                  onValueChange={setSelectedVendorId}
                >
                  <SelectTrigger id="vendor" data-testid="select-vendor">
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {approvedVendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id} data-testid={`option-vendor-${vendor.id}`}>
                        {vendor.name} ({vendor.tinNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="start-date">Start Date (Optional)</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  data-testid="input-start-date"
                />
              </div>

              <div>
                <Label htmlFor="end-date">End Date (Optional)</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  data-testid="input-end-date"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                onClick={handleGenerateStatement}
                disabled={!selectedVendorId || isLoading || isFetching}
                data-testid="button-generate"
              >
                <FileText className="h-4 w-4 mr-2" />
                {isFetching ? "Generating..." : "Generate Statement"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {statement && (
        <>
          <div className="mb-4 flex justify-end gap-2 print:hidden">
            <Button
              variant="outline"
              onClick={handleDownloadJSON}
              disabled={isFetching}
              data-testid="button-download-json"
            >
              <Download className="h-4 w-4 mr-2" />
              Download JSON
            </Button>
            <Button
              variant="outline"
              onClick={handlePrintPDF}
              disabled={isFetching}
              data-testid="button-print-pdf"
            >
              <FileText className="h-4 w-4 mr-2" />
              Print / PDF
            </Button>
          </div>

          <Card className="print:shadow-none">
            <CardHeader className="print:pb-2">
              <div className="text-center">
                <CardTitle className="text-2xl mb-2">Vendor Account Statement</CardTitle>
                <CardDescription className="text-base">
                  <div className="font-semibold text-lg" data-testid="text-vendor-name">
                    {statement.vendor.name}
                  </div>
                  <div data-testid="text-vendor-tin">TIN: {statement.vendor.tinNumber}</div>
                  {statement.startDate && statement.endDate && (
                    <div className="mt-2">
                      Period: {format(new Date(statement.startDate), "MMM dd, yyyy")} -{" "}
                      {format(new Date(statement.endDate), "MMM dd, yyyy")}
                    </div>
                  )}
                  {!statement.startDate && !statement.endDate && (
                    <div className="mt-2">All Transactions</div>
                  )}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {statement.transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions found for this vendor in the selected period.
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Entry Number</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statement.transactions.map((transaction: any) => (
                        <TableRow key={transaction.id} data-testid={`row-transaction-${transaction.id}`}>
                          <TableCell>
                            {format(new Date(transaction.entryDate), "MMM dd, yyyy")}
                          </TableCell>
                          <TableCell>{transaction.entryNumber}</TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell className="text-right">
                            {transaction.amount > 0 ? formatCurrency(transaction.amount) : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {transaction.amount < 0 ? formatCurrency(Math.abs(transaction.amount)) : "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(transaction.runningBalance)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="mt-6 border-t pt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Opening Balance</div>
                        <div className="text-lg font-semibold" data-testid="text-opening-balance">
                          {formatCurrency(statement.openingBalance)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Total Debits</div>
                        <div className="text-lg font-semibold" data-testid="text-total-debits">
                          {formatCurrency(statement.totalDebits)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Total Credits</div>
                        <div className="text-lg font-semibold" data-testid="text-total-credits">
                          {formatCurrency(statement.totalCredits)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Closing Balance</div>
                        <div className="text-lg font-semibold" data-testid="text-closing-balance">
                          {formatCurrency(statement.closingBalance)}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!appliedParams && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Select a vendor and click "Generate Statement" to view transactions
          </CardContent>
        </Card>
      )}
    </div>
  );
}
