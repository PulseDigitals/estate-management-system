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

export default function IncomeStatement() {
  const currentYear = new Date().getFullYear();
  const [formStartDate, setFormStartDate] = useState(`${currentYear}-01-01`);
  const [formEndDate, setFormEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [appliedParams, setAppliedParams] = useState<{ startDate: string; endDate: string } | null>(null);

  const queryKey = useMemo(() => 
    appliedParams 
      ? ['api', 'accountant', 'reports', 'income-statement', { 
          startDate: appliedParams.startDate, 
          endDate: appliedParams.endDate 
        }]
      : null,
    [appliedParams]
  );

  const { data, isLoading, isFetching } = useQuery<any>({
    queryKey: queryKey ?? ['__disabled__'],
    enabled: Boolean(queryKey),
  });

  const handleGenerate = () => {
    setAppliedParams({ startDate: formStartDate, endDate: formEndDate });
  };

  const handleExportJSON = () => {
    if (!data || !appliedParams || isFetching) return;
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `income-statement-${appliedParams.startDate}-to-${appliedParams.endDate}.json`;
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
    
    // Combine revenues and expenses into one CSV
    const csvData = [
      // Revenue section
      ...data.revenues.map((revenue: any) => ({
        'Section': 'Revenue',
        'Account Number': revenue.accountNumber,
        'Account Name': revenue.accountName,
        'Amount': formatCurrencyForCSV(revenue.amount)
      })),
      // Revenue total
      {
        'Section': 'Revenue',
        'Account Number': '',
        'Account Name': 'Total Revenue',
        'Amount': formatCurrencyForCSV(data.totalRevenue)
      },
      // Expense section
      ...data.expenses.map((expense: any) => ({
        'Section': 'Expense',
        'Account Number': expense.accountNumber,
        'Account Name': expense.accountName,
        'Amount': formatCurrencyForCSV(expense.amount)
      })),
      // Expense total
      {
        'Section': 'Expense',
        'Account Number': '',
        'Account Name': 'Total Expenses',
        'Amount': formatCurrencyForCSV(data.totalExpenses)
      },
      // Net income
      {
        'Section': 'Summary',
        'Account Number': '',
        'Account Name': 'Net Income',
        'Amount': formatCurrencyForCSV(data.netIncome)
      }
    ];
    
    const csv = convertToCSV(csvData);
    downloadCSV(csv, `income-statement-${data.startDate}-to-${data.endDate}.csv`);
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
        <h1 className="text-3xl font-semibold">Income Statement</h1>
        <p className="text-muted-foreground mt-1">
          Statement of revenues and expenses for a period
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Income Statement</CardTitle>
          <CardDescription>Select a date range to generate the income statement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end flex-wrap">
            <div className="flex-1 min-w-[200px] space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
                data-testid="input-start-date"
              />
            </div>
            <div className="flex-1 min-w-[200px] space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)}
                data-testid="input-end-date"
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
              <CardTitle>Income Statement</CardTitle>
              <CardDescription>
                For the period from {new Date(data.startDate).toLocaleDateString('en-NG')} to{' '}
                {new Date(data.endDate).toLocaleDateString('en-NG')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
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
            <div className="space-y-6">
              {/* Revenue Section */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Revenue</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account #</TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.revenues.map((revenue: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono">{revenue.accountNumber}</TableCell>
                        <TableCell>{revenue.accountName}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(revenue.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted font-semibold">
                      <TableCell colSpan={2} className="text-right">Total Revenue:</TableCell>
                      <TableCell className="text-right font-mono" data-testid="text-total-revenue">
                        {formatCurrency(data.totalRevenue)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Expenses Section */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Expenses</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account #</TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.expenses.map((expense: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono">{expense.accountNumber}</TableCell>
                        <TableCell>{expense.accountName}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(expense.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted font-semibold">
                      <TableCell colSpan={2} className="text-right">Total Expenses:</TableCell>
                      <TableCell className="text-right font-mono" data-testid="text-total-expenses">
                        {formatCurrency(data.totalExpenses)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Net Income */}
              <div className="border-t-2 border-primary pt-4">
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold">Net Income</span>
                    {data.netIncome >= 0 ? (
                      <Badge variant="default" className="bg-green-600">Profit</Badge>
                    ) : (
                      <Badge variant="destructive">Loss</Badge>
                    )}
                  </div>
                  <span 
                    className={`text-2xl font-bold font-mono ${data.netIncome >= 0 ? 'text-green-600' : 'text-destructive'}`}
                    data-testid="text-net-income"
                  >
                    {formatCurrency(data.netIncome)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
