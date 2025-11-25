import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Ban, Trash2, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { JournalEntry, Account, TransactionTemplate } from "@shared/schema";

type JournalEntryLine = {
  accountId: string;
  lineType: "debit" | "credit";
  amount: string;
  description: string;
};

export default function JournalEntries() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [reversalDialogOpen, setReversalDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    description: "",
    reference: "",
  });

  const [lines, setLines] = useState<JournalEntryLine[]>([]);
  const [newLine, setNewLine] = useState<JournalEntryLine>({
    accountId: "",
    lineType: "debit",
    amount: "",
    description: "",
  });

  // Helper function to validate amount input (strict currency format)
  const isValidAmount = (value: string): boolean => {
    if (!value || value.trim() === "") return false;
    
    // Strict regex: optional digits, optional decimal with max 2 decimal places
    // Matches: "123", "123.45", "0.50", but NOT "123.", "123.456", "12..3", ".50"
    const currencyRegex = /^\d+(\.\d{1,2})?$/;
    if (!currencyRegex.test(value.trim())) {
      return false;
    }
    
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num) && num > 0;
  };

  // Helper function to sanitize amount input (allow only digits and single decimal point)
  const sanitizeAmount = (value: string): string => {
    // Step 1: Remove all non-numeric characters except decimal point
    let sanitized = value.replace(/[^0-9.]/g, '');
    
    // Step 2: Ensure only one decimal point exists
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      // Multiple decimals: keep first decimal and join remaining digits
      sanitized = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Step 3: Re-split and limit to 2 decimal places
    const finalParts = sanitized.split('.');
    if (finalParts.length === 2 && finalParts[1].length > 2) {
      sanitized = finalParts[0] + '.' + finalParts[1].substring(0, 2);
    }
    
    return sanitized;
  };

  const { data: entries, isLoading: entriesLoading } = useQuery<JournalEntry[]>({
    queryKey: ['/api/accountant/entries'],
  });

  const { data: accounts } = useQuery<Account[]>({
    queryKey: ['/api/accountant/accounts'],
  });

  const { data: templates } = useQuery<TransactionTemplate[]>({
    queryKey: ['/api/accountant/templates'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { entry: any; lines: Array<{ accountId: string; lineType: "debit" | "credit"; amount: number; description: string; }> }) => {
      return await apiRequest('POST', '/api/accountant/entries', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accountant/entries'] });
      setCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Journal entry created",
        description: "The journal entry has been posted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create entry",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const voidMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('PATCH', `/api/accountant/entries/${id}/void`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accountant/entries'] });
      setVoidDialogOpen(false);
      setSelectedEntry(null);
      toast({
        title: "Entry voided",
        description: "The journal entry has been voided",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to void entry",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const reversalMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('POST', `/api/accountant/entries/${id}/reverse`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accountant/entries'] });
      setReversalDialogOpen(false);
      setSelectedEntry(null);
      toast({
        title: "Entry reversed",
        description: "A reversing journal entry has been created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to reverse entry",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      date: format(new Date(), "yyyy-MM-dd"),
      description: "",
      reference: "",
    });
    setLines([]);
    setNewLine({
      accountId: "",
      lineType: "debit",
      amount: "",
      description: "",
    });
  };

  const addLine = () => {
    if (!newLine.accountId) {
      toast({
        title: "Account required",
        description: "Please select an account",
        variant: "destructive",
      });
      return;
    }

    if (!isValidAmount(newLine.amount)) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid positive amount",
        variant: "destructive",
      });
      return;
    }

    setLines([...lines, newLine]);
    setNewLine({
      accountId: "",
      lineType: "debit",
      amount: "",
      description: "",
    });
  };

  const updateLineAmount = (index: number, value: string) => {
    const sanitized = sanitizeAmount(value);
    const newLines = [...lines];
    newLines[index].amount = sanitized;
    setLines(newLines);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const applyTemplate = (templateId: string) => {
    const template = templates?.find((t) => t.id === templateId);
    if (!template) return;

    const newLines: JournalEntryLine[] = [];
    
    // Add debit line
    newLines.push({
      accountId: template.debitAccountId,
      lineType: "debit",
      amount: "",
      description: "",
    });

    // Add credit line
    newLines.push({
      accountId: template.creditAccountId,
      lineType: "credit",
      amount: "",
      description: "",
    });

    setLines(newLines);
    setFormData({
      ...formData,
      description: template.name,
    });
  };

  const calculateTotals = () => {
    let totalDebit = 0;
    let totalCredit = 0;

    // Calculate totals only if ALL lines have valid amounts (fail fast)
    for (const line of lines) {
      if (!isValidAmount(line.amount)) {
        // Any invalid line → return unbalanced totals
        return { totalDebit: 0, totalCredit: 0, balanced: false };
      }
      
      const num = parseFloat(line.amount);
      if (line.lineType === "debit") {
        totalDebit += num;
      } else {
        totalCredit += num;
      }
    }

    return { totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 };
  };

  const handleCreate = () => {
    // Validate all lines have valid amounts
    const invalidLines = lines.filter((line) => !isValidAmount(line.amount));
    if (invalidLines.length > 0) {
      toast({
        title: "Invalid line amounts",
        description: "All lines must have valid positive amounts",
        variant: "destructive",
      });
      return;
    }

    // Validate all lines have accounts
    const linesWithoutAccount = lines.filter((line) => !line.accountId);
    if (linesWithoutAccount.length > 0) {
      toast({
        title: "Missing accounts",
        description: "All lines must have an account selected",
        variant: "destructive",
      });
      return;
    }

    const { balanced } = calculateTotals();
    if (!balanced) {
      toast({
        title: "Entry not balanced",
        description: "Debits and credits must be equal",
        variant: "destructive",
      });
      return;
    }

    // Send numeric amounts to backend
    createMutation.mutate({
      entry: {
        date: formData.date,
        description: formData.description,
        reference: formData.reference || undefined,
        status: "posted",
      },
      lines: lines.map((line) => ({
        accountId: line.accountId,
        lineType: line.lineType,
        amount: parseFloat(line.amount),
        description: line.description,
      })),
    });
  };

  const handleView = async (entry: JournalEntry) => {
    try {
      const res = await apiRequest('GET', `/api/accountant/entries/${entry.id}`);
      const fullEntry = await res.json();
      console.log("Full entry loaded:", fullEntry);
      setSelectedEntry(fullEntry);
      setViewDialogOpen(true);
    } catch (error) {
      console.error("Error loading entry details:", error);
      toast({
        title: "Error loading entry",
        description: "Failed to load journal entry details",
        variant: "destructive",
      });
    }
  };

  const handleVoid = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setVoidDialogOpen(true);
  };

  const confirmVoid = () => {
    if (!selectedEntry) return;
    voidMutation.mutate(selectedEntry.id);
  };

  const handleReverse = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setReversalDialogOpen(true);
  };

  const confirmReverse = () => {
    if (!selectedEntry) return;
    reversalMutation.mutate(selectedEntry.id);
  };

  const getAccountName = (accountId: string) => {
    const account = accounts?.find((a) => a.id === accountId);
    return account ? `${account.accountNumber} - ${account.accountName}` : accountId;
  };

  const { totalDebit, totalCredit, balanced } = calculateTotals();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Journal Entries</h1>
          <p className="text-muted-foreground mt-2">
            Record and view double-entry journal entries
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-entry">
              <Plus className="mr-2 h-4 w-4" />
              New Journal Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-create-entry">
            <DialogHeader>
              <DialogTitle>Create Journal Entry</DialogTitle>
              <DialogDescription>
                Create a new double-entry journal entry
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    data-testid="input-entry-date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="reference">Reference (Optional)</Label>
                  <Input
                    id="reference"
                    data-testid="input-entry-reference"
                    placeholder="e.g., Invoice #123"
                    value={formData.reference}
                    onChange={(e) =>
                      setFormData({ ...formData, reference: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  data-testid="input-entry-description"
                  placeholder="Brief description of this transaction"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
              
              <div className="space-y-2">
                <Label>Use Template (Optional)</Label>
                <Select onValueChange={applyTemplate}>
                  <SelectTrigger data-testid="select-template">
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates?.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-4">Journal Entry Lines</h3>
                
                <div className="space-y-4 mb-4">
                  {lines.map((line, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-12 gap-2 items-end"
                      data-testid={`line-item-${index}`}
                    >
                      <div className="col-span-4">
                        <Label className="text-xs">Account</Label>
                        <Input
                          value={getAccountName(line.accountId)}
                          disabled
                          className="text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Type</Label>
                        <Badge
                          variant={line.lineType === "debit" ? "default" : "secondary"}
                          className="w-full justify-center"
                        >
                          {line.lineType === "debit" ? "DR" : "CR"}
                        </Badge>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Amount</Label>
                        <Input
                          type="text"
                          value={line.amount}
                          onChange={(e) => updateLineAmount(index, e.target.value)}
                          className="text-sm"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs">Description</Label>
                        <Input
                          value={line.description}
                          onChange={(e) => {
                            const newLines = [...lines];
                            newLines[index].description = e.target.value;
                            setLines(newLines);
                          }}
                          className="text-sm"
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLine(index)}
                          data-testid={`button-remove-line-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-12 gap-2 items-end border-t pt-4">
                  <div className="col-span-4">
                    <Label htmlFor="newAccount">Account</Label>
                    <Select
                      value={newLine.accountId}
                      onValueChange={(value) =>
                        setNewLine({ ...newLine, accountId: value })
                      }
                    >
                      <SelectTrigger id="newAccount" data-testid="select-line-account">
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts?.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.accountNumber} - {account.accountName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="newType">Type</Label>
                    <Select
                      value={newLine.lineType}
                      onValueChange={(value: "debit" | "credit") =>
                        setNewLine({ ...newLine, lineType: value })
                      }
                    >
                      <SelectTrigger id="newType" data-testid="select-line-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="debit">Debit (DR)</SelectItem>
                        <SelectItem value="credit">Credit (CR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="newAmount">Amount</Label>
                    <Input
                      id="newAmount"
                      type="text"
                      data-testid="input-line-amount"
                      placeholder="0.00"
                      value={newLine.amount}
                      onChange={(e) =>
                        setNewLine({ ...newLine, amount: sanitizeAmount(e.target.value) })
                      }
                    />
                  </div>
                  <div className="col-span-3">
                    <Label htmlFor="newDescription">Description</Label>
                    <Input
                      id="newDescription"
                      data-testid="input-line-description"
                      placeholder="Line description"
                      value={newLine.description}
                      onChange={(e) =>
                        setNewLine({ ...newLine, description: e.target.value })
                      }
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      size="icon"
                      onClick={addLine}
                      disabled={!newLine.accountId || !newLine.amount}
                      data-testid="button-add-line"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total Debits:</span>
                      <span className="ml-2 font-semibold" data-testid="text-total-debits">
                        ₦{totalDebit.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Credits:</span>
                      <span className="ml-2 font-semibold" data-testid="text-total-credits">
                        ₦{totalCredit.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <Badge
                        variant={balanced ? "default" : "destructive"}
                        className="ml-2"
                        data-testid="badge-balance-status"
                      >
                        {balanced ? "Balanced" : "Not Balanced"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setCreateDialogOpen(false);
                  resetForm();
                }}
                data-testid="button-cancel-create"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={
                  !formData.description ||
                  lines.length === 0 ||
                  !balanced ||
                  createMutation.isPending
                }
                data-testid="button-submit-create"
              >
                {createMutation.isPending ? "Posting..." : "Post Entry"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {entriesLoading ? (
        <div className="text-center py-8">Loading journal entries...</div>
      ) : !entries || entries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No journal entries found. Create your first entry to get started.
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entry Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id} data-testid={`row-entry-${entry.id}`}>
                  <TableCell className="font-mono text-sm">
                    {entry.entryNumber}
                  </TableCell>
                  <TableCell>
                    {entry.entryDate && !isNaN(new Date(entry.entryDate).getTime())
                      ? format(new Date(entry.entryDate), "MMM dd, yyyy")
                      : "N/A"}
                  </TableCell>
                  <TableCell>{entry.description}</TableCell>
                  <TableCell className="font-semibold">
                    ₦{(parseFloat(entry.totalDebit) || 0).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        entry.status === "posted"
                          ? "default"
                          : entry.status === "void"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {entry.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleView(entry)}
                        data-testid={`button-view-${entry.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {entry.status === "posted" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleReverse(entry)}
                            data-testid={`button-reverse-${entry.id}`}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleVoid(entry)}
                            data-testid={`button-void-${entry.id}`}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl" data-testid="dialog-view-entry">
          <DialogHeader>
            <DialogTitle>Journal Entry Details</DialogTitle>
            <DialogDescription>
              Entry #{selectedEntry?.entryNumber}
            </DialogDescription>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <span className="ml-2 font-medium">
                    {selectedEntry.entryDate && !isNaN(new Date(selectedEntry.entryDate).getTime())
                      ? format(new Date(selectedEntry.entryDate), "MMM dd, yyyy")
                      : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className="ml-2" variant={selectedEntry.status === "posted" ? "default" : "destructive"}>
                    {selectedEntry.status}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Description:</span>
                  <p className="mt-1">{selectedEntry.description}</p>
                </div>
                {selectedEntry.reference && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Reference:</span>
                    <span className="ml-2 font-medium">{selectedEntry.reference}</span>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Lines</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedEntry.lines?.map((line: any) => (
                      <TableRow key={line.id}>
                        <TableCell>{getAccountName(line.accountId)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {line.description || "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {line.lineType === "debit"
                            ? `₦${(parseFloat(line.amount) || 0).toFixed(2)}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {line.lineType === "credit"
                            ? `₦${(parseFloat(line.amount) || 0).toFixed(2)}`
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-semibold">
                      <TableCell colSpan={2}>Total</TableCell>
                      <TableCell className="text-right">
                        ₦{(parseFloat(selectedEntry.totalDebit) || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        ₦{(parseFloat(selectedEntry.totalCredit) || 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewDialogOpen(false)} data-testid="button-close-view">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <AlertDialogContent data-testid="dialog-void-entry">
          <AlertDialogHeader>
            <AlertDialogTitle>Void Journal Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will void journal entry "{selectedEntry?.entryNumber}". 
              Voided entries cannot be modified and will be marked as void in the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-void">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmVoid}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-void"
            >
              {voidMutation.isPending ? "Voiding..." : "Void Entry"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={reversalDialogOpen} onOpenChange={setReversalDialogOpen}>
        <AlertDialogContent data-testid="dialog-reverse-entry">
          <AlertDialogHeader>
            <AlertDialogTitle>Reverse Journal Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new journal entry with opposite debits and credits to reverse the effects of "{selectedEntry?.entryNumber}". The original entry will remain posted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-reverse">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReverse}
              data-testid="button-confirm-reverse"
            >
              {reversalMutation.isPending ? "Creating Reversal..." : "Create Reversal"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
