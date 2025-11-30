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

export default function BalanceSheet() {
  const [formAsOf, setFormAsOf] = useState(new Date().toISOString().split('T')[0]);
  const [appliedParams, setAppliedParams] = useState<{ asOf: string } | null>(null);

  const queryKey = useMemo(() => 
    appliedParams 
      ? ['api', 'accountant', 'reports', 'balance-sheet', { asOf: appliedParams.asOf }]
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
    link.download = `balance-sheet-${appliedParams.asOf}.json`;
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
    
    // Combine assets, liabilities, and equity into one CSV
    const csvData = [
      // Assets section
      ...data.assets.map((asset: any) => ({
        'Section': 'Assets',
        'Account Number': asset.accountNumber,
        'Account Name': asset.accountName,
        'Amount': formatCurrencyForCSV(asset.amount)
      })),
      // Assets total
      {
        'Section': 'Assets',
        'Account Number': '',
        'Account Name': 'Total Assets',
        'Amount': formatCurrencyForCSV(data.totalAssets)
      },
      // Liabilities section
      ...data.liabilities.map((liability: any) => ({
        'Section': 'Liabilities',
        'Account Number': liability.accountNumber,
        'Account Name': liability.accountName,
        'Amount': formatCurrencyForCSV(liability.amount)
      })),
      // Liabilities total
      {
        'Section': 'Liabilities',
        'Account Number': '',
        'Account Name': 'Total Liabilities',
        'Amount': formatCurrencyForCSV(data.totalLiabilities)
      },
      // Equity section
      ...data.equity.map((eq: any) => ({
        'Section': 'Equity',
        'Account Number': eq.accountNumber,
        'Account Name': eq.accountName,
        'Amount': formatCurrencyForCSV(eq.amount)
      })),
      // Equity total
      {
        'Section': 'Equity',
        'Account Number': '',
        'Account Name': 'Total Equity',
        'Amount': formatCurrencyForCSV(data.totalEquity)
      },
      // Total Liabilities + Equity
      {
        'Section': 'Summary',
        'Account Number': '',
        'Account Name': 'Total Liabilities & Equity',
        'Amount': formatCurrencyForCSV(data.totalLiabilitiesAndEquity)
      }
    ];
    
    const csv = convertToCSV(csvData);
    downloadCSV(csv, `balance-sheet-${data.asOf}.csv`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const balanced = data && Math.abs(data.totalAssets - data.totalLiabilitiesAndEquity) < 0.01;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Balance Sheet</h1>
        <p className="text-muted-foreground mt-1">
          Statement of financial position showing assets, liabilities, and equity
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Balance Sheet</CardTitle>
          <CardDescription>Select a date to generate the balance sheet as of that date</CardDescription>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assets */}
          <Card>
            <CardHeader>
              <CardTitle>Assets</CardTitle>
              <CardDescription>
                As of {new Date(data.asOf).toLocaleDateString('en-NG', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.assets.map((asset: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{asset.accountName}</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {asset.accountNumber}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(asset.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted font-semibold">
                    <TableCell>Total Assets</TableCell>
                    <TableCell className="text-right font-mono" data-testid="text-total-assets">
                      {formatCurrency(data.totalAssets)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Liabilities and Equity */}
          <Card>
            <CardHeader>
              <CardTitle>Liabilities & Equity</CardTitle>
              <CardDescription>
                As of {new Date(data.asOf).toLocaleDateString('en-NG', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Liabilities Section */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Liabilities</h4>
                  <Table>
                    <TableBody>
                      {data.liabilities.map((liability: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{liability.accountName}</span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {liability.accountNumber}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(liability.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted font-semibold">
                        <TableCell>Total Liabilities</TableCell>
                        <TableCell className="text-right font-mono" data-testid="text-total-liabilities">
                          {formatCurrency(data.totalLiabilities)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Equity Section */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Equity</h4>
                  <Table>
                    <TableBody>
                      {data.equity.map((eq: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{eq.accountName}</span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {eq.accountNumber}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(eq.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted font-semibold">
                        <TableCell>Total Equity</TableCell>
                        <TableCell className="text-right font-mono" data-testid="text-total-equity">
                          {formatCurrency(data.totalEquity)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Total Liabilities + Equity */}
                <div className="border-t-2 border-primary pt-2">
                  <Table>
                    <TableBody>
                      <TableRow className="bg-primary/10 font-bold">
                        <TableCell>Total Liabilities & Equity</TableCell>
                        <TableCell className="text-right font-mono" data-testid="text-total-liabilities-equity">
                          {formatCurrency(data.totalLiabilitiesAndEquity)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Balance Verification */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <CardTitle>Balance Verification</CardTitle>
              <div className="flex items-center gap-2">
                {balanced ? (
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
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Assets</p>
                  <p className="text-2xl font-bold font-mono">{formatCurrency(data.totalAssets)}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Liabilities & Equity</p>
                  <p className="text-2xl font-bold font-mono">
                    {formatCurrency(data.totalLiabilitiesAndEquity)}
                  </p>
                </div>
              </div>

              {!balanced && (
                <div className="mt-4 p-4 bg-destructive/10 border border-destructive rounded-lg">
                  <p className="text-sm text-destructive font-medium">
                    ⚠️ Balance Sheet is unbalanced! Assets do not equal Liabilities + Equity.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Difference: {formatCurrency(Math.abs(data.totalAssets - data.totalLiabilitiesAndEquity))}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
