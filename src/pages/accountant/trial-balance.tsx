import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, FileJson } from "lucide-react";
import { convertToCSV, downloadCSV, formatCurrencyForCSV } from "@/lib/csv-export";

export default function TrialBalance() {
  const [formAsOf, setFormAsOf] = useState(new Date().toISOString().split('T')[0]);
  const [appliedParams, setAppliedParams] = useState<{ asOf: string } | null>(null);

  const queryKey = useMemo(() => 
    appliedParams 
      ? ['api', 'accountant', 'reports', 'trial-balance', { asOf: appliedParams.asOf }]
      : null,
    [appliedParams]
  );

  const { data, isLoading, isFetching } = useQuery<any>({
    queryKey: queryKey ?? ['__disabled__'],
    enabled: Boolean(queryKey),
  });

  const handleGenerate = () => {
    setAppliedParams({ asOf: formAsOf });
  };

  const handleExportJSON = () => {
    if (!data || !appliedParams || isFetching) return;
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trial-balance-${appliedParams.asOf}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (!data || isFetching) return;
    window.print();
  };

  const handleExportCSV = () => {
    if (!data || isFetching) return;
    
    // Map trial balance data to CSV format
    const csvData = data.accounts.map((account: any) => ({
      'Account Number': account.accountNumber,
      'Account Name': account.accountName,
      'Type': account.accountType,
      'Debit': account.debitBalance > 0 ? formatCurrencyForCSV(account.debitBalance) : '',
      'Credit': account.creditBalance > 0 ? formatCurrencyForCSV(account.creditBalance) : ''
    }));
    
    // Add totals row
    csvData.push({
      'Account Number': '',
      'Account Name': 'Total',
      'Type': '',
      'Debit': formatCurrencyForCSV(data.totalDebits),
      'Credit': formatCurrencyForCSV(data.totalCredits)
    });
    
    const csv = convertToCSV(csvData);
    downloadCSV(csv, `trial-balance-${data.asOf}.csv`);
  };

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
        <h1 className="text-3xl font-semibold">Trial Balance</h1>
        <p className="text-muted-foreground mt-1">
          List of all accounts with debit and credit balances
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Trial Balance</CardTitle>
          <CardDescription>Select a date to generate the trial balance as of that date</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1 max-w-sm space-y-2">
              <Label htmlFor="asOf">As Of Date</Label>
              <Input
                id="asOf"
                type="date"
                value={formAsOf}
                onChange={(e) => setFormAsOf(e.target.value)}
                data-testid="input-asof-date"
              />
            </div>
            <Button 
              onClick={handleGenerate} 
              disabled={isLoading || isFetching}
              data-testid="button-generate-report"
            >
              {isFetching ? 'Generating...' : 'Generate Report'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {data && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <div>
              <CardTitle>Trial Balance</CardTitle>
              <CardDescription>
                As of {new Date(data.asOf).toLocaleDateString('en-NG', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {data.balanced ? (
                <Badge variant="default" className="bg-green-600" data-testid="badge-balanced">
                  Balanced
                </Badge>
              ) : (
                <Badge variant="destructive" data-testid="badge-unbalanced">
                  Unbalanced
                </Badge>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportCSV}
                disabled={isFetching || !data}
                data-testid="button-export-csv"
              >
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportJSON}
                disabled={isFetching || !data}
                data-testid="button-export-json"
              >
                <FileJson className="w-4 h-4 mr-2" />
                JSON
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportPDF}
                disabled={isFetching || !data}
                data-testid="button-export-pdf"
              >
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account #</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.accounts.map((account: any) => (
                  <TableRow key={account.accountId} data-testid={`row-account-${account.accountId}`}>
                    <TableCell className="font-mono">{account.accountNumber}</TableCell>
                    <TableCell>{account.accountName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{account.accountType}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {account.debitBalance > 0 ? formatCurrency(account.debitBalance) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {account.creditBalance > 0 ? formatCurrency(account.creditBalance) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted font-semibold">
                  <TableCell colSpan={3} className="text-right">Total:</TableCell>
                  <TableCell className="text-right font-mono" data-testid="text-total-debits">
                    {formatCurrency(data.totalDebits)}
                  </TableCell>
                  <TableCell className="text-right font-mono" data-testid="text-total-credits">
                    {formatCurrency(data.totalCredits)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {!data.balanced && (
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive rounded-lg">
                <p className="text-sm text-destructive font-medium">
                  ⚠️ Trial Balance is unbalanced! Total debits and credits do not match.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Difference: {formatCurrency(Math.abs(data.totalDebits - data.totalCredits))}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
