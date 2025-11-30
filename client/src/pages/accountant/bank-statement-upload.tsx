import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Upload, FileText, Trash2, Download } from "lucide-react";
import { format } from "date-fns";

interface ParsedEntry {
  transactionDate: string;
  description: string;
  referenceNumber: string;
  amount: string;
}

export default function BankStatementUpload() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<string>("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [statementDate, setStatementDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [entries, setEntries] = useState<ParsedEntry[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  // Download CSV template
  const downloadTemplate = () => {
    const headers = ['Transaction Date', 'Description', 'Reference Number', 'Amount'];
    const sampleData = [
      [format(new Date(), 'yyyy-MM-dd'), 'Payment from resident', 'INV-2025-0001', '50000.00'],
      [format(new Date(), 'yyyy-MM-dd'), 'Service charge payment', 'INV-2025-0002', '75000.00'],
      [format(new Date(), 'yyyy-MM-dd'), 'Security levy payment', 'INV-2025-0003', '25000.00'],
    ];

    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `bank_statement_template_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Template Downloaded",
      description: "CSV template downloaded successfully. Fill in your bank statement data and upload.",
    });
  };

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: {
      fileName: string;
      fileData: string;
      bankName: string;
      accountNumber: string;
      statementDate: string;
      entries: ParsedEntry[];
    }) => {
      const response = await apiRequest('POST', '/api/accountant/bank-statements/upload', data);
      return await response.json();
    },
    onSuccess: (response: any) => {
      const reconciliation = response.reconciliation;
      const totalReconciled = reconciliation.matched + reconciliation.partiallyMatched;
      const hasResiduals = reconciliation.residualAmounts && reconciliation.residualAmounts.length > 0;
      
      let description = `Statement uploaded successfully. ${totalReconciled} of ${reconciliation.totalEntries} entries reconciled automatically. Amount: ₦${parseFloat(reconciliation.totalMatched).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      
      if (hasResiduals) {
        const totalResidual = reconciliation.residualAmounts.reduce((sum: number, r: any) => sum + r.residualAmount, 0);
        description += `. ${reconciliation.residualAmounts.length} entries have residual amounts totaling ₦${totalResidual.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} requiring manual review.`;
      }
      
      toast({
        title: "Reconciliation Completed",
        description,
      });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload bank statement",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFile(null);
    setFileData("");
    setBankName("");
    setAccountNumber("");
    setStatementDate(format(new Date(), "yyyy-MM-dd"));
    setEntries([]);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.csv')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a CSV or Excel file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB max)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "File size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);

    // Read file as base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setFileData(base64);
    };
    reader.readAsDataURL(selectedFile);

    // Parse CSV
    if (selectedFile.name.endsWith('.csv') || selectedFile.type === 'text/csv') {
      parseCSV(selectedFile);
    }
  };

  const parseCSV = async (file: File) => {
    setIsParsing(true);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          toast({
            title: "Empty File",
            description: "The CSV file appears to be empty",
            variant: "destructive",
          });
          setIsParsing(false);
          return;
        }

        // Skip header row, parse data rows
        const parsedEntries: ParsedEntry[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          // Split by comma, handling quoted fields
          const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          
          if (values.length >= 4) {
            parsedEntries.push({
              transactionDate: values[0] || format(new Date(), "yyyy-MM-dd"),
              description: values[1] || '',
              referenceNumber: values[2] || '',
              amount: values[3] || '0.00',
            });
          }
        }

        setEntries(parsedEntries);
        toast({
          title: "File Parsed",
          description: `Successfully parsed ${parsedEntries.length} entries`,
        });
      } catch (error) {
        toast({
          title: "Parse Error",
          description: "Failed to parse CSV file. Please check the format.",
          variant: "destructive",
        });
      } finally {
        setIsParsing(false);
      }
    };

    reader.onerror = () => {
      toast({
        title: "Read Error",
        description: "Failed to read the file",
        variant: "destructive",
      });
      setIsParsing(false);
    };

    reader.readAsText(file);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setFileData("");
    setEntries([]);
  };

  const handleRemoveEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    // Validate form
    if (!file || !fileData) {
      toast({
        title: "Validation Error",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    if (!bankName || !accountNumber || !statementDate) {
      toast({
        title: "Validation Error",
        description: "Please fill in all bank details",
        variant: "destructive",
      });
      return;
    }

    if (entries.length === 0) {
      toast({
        title: "Validation Error",
        description: "No entries found in the file. Please check the file format.",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate({
      fileName: file.name,
      fileData,
      bankName,
      accountNumber,
      statementDate,
      entries,
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle data-testid="text-page-title">Upload Bank Statement</CardTitle>
          <CardDescription data-testid="text-page-description">
            Upload and parse bank statements for payment reconciliation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Bank Details Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Bank Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <Label htmlFor="statementDate">
                  Statement Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="statementDate"
                  type="date"
                  value={statementDate}
                  onChange={(e) => setStatementDate(e.target.value)}
                  data-testid="input-statement-date"
                />
              </div>
            </div>
          </div>

          {/* File Upload Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Statement File</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadTemplate}
                data-testid="button-download-template"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>
            <div className="border-2 border-dashed rounded-lg p-6">
              {!file ? (
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                  <div className="mt-4">
                    <Label
                      htmlFor="file-upload"
                      className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover-elevate active-elevate-2"
                      data-testid="button-select-file"
                    >
                      <FileText className="h-4 w-4" />
                      Select File
                    </Label>
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                      data-testid="input-file-upload"
                    />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Upload CSV or Excel file (max 5MB)
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Expected format: Transaction Date, Description, Reference Number, Amount
                  </p>
                  <p className="mt-1 text-xs text-primary">
                    💡 Download the template above to see the correct format with sample data
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium" data-testid="text-file-name">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveFile}
                    data-testid="button-remove-file"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Parsed Entries Preview */}
          {isParsing ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" data-testid="loader-parsing" />
              <span className="ml-2">Parsing file...</span>
            </div>
          ) : entries.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Parsed Entries ({entries.length})</h3>
                <p className="text-sm text-muted-foreground">
                  Total: ₦{entries.reduce((sum, e) => sum + parseFloat(e.amount || '0'), 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="rounded-md border max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry, index) => (
                      <TableRow key={index} data-testid={`row-entry-${index}`}>
                        <TableCell data-testid={`text-date-${index}`}>
                          {entry.transactionDate}
                        </TableCell>
                        <TableCell data-testid={`text-description-${index}`}>
                          {entry.description}
                        </TableCell>
                        <TableCell data-testid={`text-reference-${index}`}>
                          {entry.referenceNumber}
                        </TableCell>
                        <TableCell data-testid={`text-amount-${index}`}>
                          ₦{parseFloat(entry.amount).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveEntry(index)}
                            data-testid={`button-remove-entry-${index}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}

          {/* Submit Button */}
          <div className="flex gap-3">
            <Button
              onClick={handleSubmit}
              disabled={uploadMutation.isPending || !file || entries.length === 0}
              data-testid="button-upload-statement"
            >
              {uploadMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Upload Statement
            </Button>
            <Button
              variant="outline"
              onClick={resetForm}
              disabled={uploadMutation.isPending}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
