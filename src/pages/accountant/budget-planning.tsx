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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Eye, Play, X, Trash2, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Account } from "@shared/schema";

type BudgetStatus = "draft" | "active" | "closed";
type PeriodType = "monthly" | "quarterly" | "annual";

interface Budget {
  id: string;
  name: string;
  description: string | null;
  fiscalYear: number;
  periodType: PeriodType;
  startDate: Date;
  endDate: Date;
  status: BudgetStatus;
  totalBudgetAmount: string;
  totalConsumedAmount: string;
  totalRemainingAmount: string;
  projectedCollections: string;
  actualCollections: string;
  createdBy: string;
  creatorName?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface BudgetLine {
  id?: string;
  accountId: string;
  accountNumber?: string;
  accountName?: string;
  accountType?: string;
  allocatedAmount: string;
  consumedAmount?: string;
  remainingAmount?: string;
  notes?: string;
}

interface BudgetWithLines extends Budget {
  budgetLines: BudgetLine[];
}

const statusBadgeVariants: Record<BudgetStatus, string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  closed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const periodTypeLabels: Record<PeriodType, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
};

export default function BudgetPlanning() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [selectedBudgetWithLines, setSelectedBudgetWithLines] = useState<BudgetWithLines | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    fiscalYear: new Date().getFullYear(),
    periodType: "annual" as PeriodType,
    startDate: "",
    endDate: "",
    projectedCollections: "",
  });

  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([]);
  const [newLine, setNewLine] = useState({
    accountId: "",
    allocatedAmount: "",
    notes: "",
  });

  const { data: budgets, isLoading } = useQuery<Budget[]>({
    queryKey: ['/api/accountant/budgets'],
  });

  const { data: accounts } = useQuery<Account[]>({
    queryKey: ['/api/accountant/accounts'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { budget: any; lines: BudgetLine[] }) => {
      return await apiRequest('POST', '/api/accountant/budgets', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accountant/budgets'] });
      setCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Budget created",
        description: "The budget has been created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create budget",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('POST', `/api/accountant/budgets/${id}/activate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accountant/budgets'] });
      setActivateDialogOpen(false);
      setSelectedBudget(null);
      toast({
        title: "Budget activated",
        description: "The budget is now active",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to activate budget",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const closeMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('POST', `/api/accountant/budgets/${id}/close`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accountant/budgets'] });
      setCloseDialogOpen(false);
      setSelectedBudget(null);
      toast({
        title: "Budget closed",
        description: "The budget has been closed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to close budget",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/accountant/budgets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accountant/budgets'] });
      setDeleteDialogOpen(false);
      setSelectedBudget(null);
      toast({
        title: "Budget deleted",
        description: "The budget has been deleted",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete budget",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      fiscalYear: new Date().getFullYear(),
      periodType: "annual",
      startDate: "",
      endDate: "",
      projectedCollections: "",
    });
    setBudgetLines([]);
    setNewLine({
      accountId: "",
      allocatedAmount: "",
      notes: "",
    });
  };

  const addBudgetLine = () => {
    if (!newLine.accountId || !newLine.allocatedAmount) {
      toast({
        title: "Missing information",
        description: "Please select an account and enter an amount",
        variant: "destructive",
      });
      return;
    }

    const account = accounts?.find(a => a.id === newLine.accountId);
    if (!account) return;

    setBudgetLines([
      ...budgetLines,
      {
        accountId: newLine.accountId,
        accountNumber: account.accountNumber,
        accountName: account.accountName,
        accountType: account.accountType,
        allocatedAmount: parseFloat(newLine.allocatedAmount).toFixed(2),
        notes: newLine.notes,
      },
    ]);

    setNewLine({
      accountId: "",
      allocatedAmount: "",
      notes: "",
    });
  };

  const removeBudgetLine = (index: number) => {
    setBudgetLines(budgetLines.filter((_, i) => i !== index));
  };

  const handleCreateBudget = () => {
    // Validate required fields
    if (!formData.name || !formData.startDate || !formData.endDate) {
      toast({
        title: "Missing information",
        description: "Please fill in Budget Name, Start Date, and End Date",
        variant: "destructive",
      });
      return;
    }
    
    // Check if we have budget lines
    if (budgetLines.length === 0) {
      // Check if user has filled in line details but forgot to click "Add Line"
      if (newLine.accountId && newLine.allocatedAmount) {
        toast({
          title: "Don't forget to add the budget line",
          description: "Click the 'Add Line' button to add your budget line before creating the budget",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Missing budget lines",
          description: "Please add at least one budget line (select an account, enter an amount, and click 'Add Line')",
          variant: "destructive",
        });
      }
      return;
    }

    const budgetData = {
      name: formData.name,
      description: formData.description || null,
      fiscalYear: formData.fiscalYear,
      periodType: formData.periodType,
      startDate: new Date(formData.startDate),
      endDate: new Date(formData.endDate),
      status: "draft" as const,
      projectedCollections: formData.projectedCollections || "0",
    };

    createMutation.mutate({ budget: budgetData, lines: budgetLines });
  };

  const handleViewBudget = async (budget: Budget) => {
    try {
      const budgetWithLines = await queryClient.fetchQuery<BudgetWithLines>({
        queryKey: ['/api/accountant/budgets', budget.id],
      });
      setSelectedBudgetWithLines(budgetWithLines);
      setViewDialogOpen(true);
    } catch (error) {
      toast({
        title: "Failed to load budget details",
        description: "An error occurred while loading the budget",
        variant: "destructive",
      });
    }
  };

  const totalBudgetAmount = budgetLines.reduce((sum, line) => sum + parseFloat(line.allocatedAmount), 0);

  // Calculate active budget summary
  const activeBudgets = budgets?.filter(b => b.status === 'active') || [];
  const totalActiveBudget = activeBudgets.reduce((sum, b) => sum + parseFloat(b.totalBudgetAmount), 0);
  const totalActiveConsumed = activeBudgets.reduce((sum, b) => sum + parseFloat(b.totalConsumedAmount), 0);
  const totalActiveRemaining = activeBudgets.reduce((sum, b) => sum + parseFloat(b.totalRemainingAmount), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading budgets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Budget & Planning</h1>
          <p className="text-muted-foreground">Create and manage budget projections for the estate</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-budget">
              <Plus className="h-4 w-4 mr-2" />
              Create Budget
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Budget</DialogTitle>
              <DialogDescription>
                Set up a new budget plan with account allocations
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Budget Name *</Label>
                  <Input
                    id="name"
                    data-testid="input-budget-name"
                    placeholder="e.g., 2025 Annual Budget"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fiscalYear">Fiscal Year</Label>
                  <Input
                    id="fiscalYear"
                    type="number"
                    data-testid="input-fiscal-year"
                    value={formData.fiscalYear}
                    onChange={(e) => setFormData({ ...formData, fiscalYear: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  data-testid="input-budget-description"
                  placeholder="Optional description of this budget"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="periodType">Period Type</Label>
                  <Select
                    value={formData.periodType}
                    onValueChange={(value) => setFormData({ ...formData, periodType: value as PeriodType })}
                  >
                    <SelectTrigger data-testid="select-period-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    data-testid="input-start-date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    data-testid="input-end-date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="projectedCollections">Projected Collections (₦)</Label>
                <Input
                  id="projectedCollections"
                  type="number"
                  step="0.01"
                  data-testid="input-projected-collections"
                  placeholder="0.00"
                  value={formData.projectedCollections}
                  onChange={(e) => setFormData({ ...formData, projectedCollections: e.target.value })}
                />
              </div>

              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Budget Line Items</h3>
                    <p className="text-sm text-muted-foreground">
                      {budgetLines.length > 0 
                        ? `${budgetLines.length} line${budgetLines.length > 1 ? 's' : ''} added` 
                        : "Add accounts and allocate budget amounts"}
                    </p>
                  </div>
                  {budgetLines.length > 0 && (
                    <Badge variant="secondary" className="font-mono">
                      Total: ₦{budgetLines.reduce((sum, line) => sum + parseFloat(line.allocatedAmount), 0).toLocaleString('en-NG', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <Label>Account</Label>
                    <Select
                      value={newLine.accountId}
                      onValueChange={(value) => setNewLine({ ...newLine, accountId: value })}
                    >
                      <SelectTrigger data-testid="select-account">
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts
                          ?.filter(a => a.accountType === "expense")
                          .map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.accountNumber} - {account.accountName}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Amount (₦)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      data-testid="input-line-amount"
                      placeholder="0.00"
                      value={newLine.allocatedAmount}
                      onChange={(e) => setNewLine({ ...newLine, allocatedAmount: e.target.value })}
                    />
                  </div>
                  <div className="col-span-3">
                    <Label>Notes</Label>
                    <Input
                      data-testid="input-line-notes"
                      placeholder="Optional"
                      value={newLine.notes}
                      onChange={(e) => setNewLine({ ...newLine, notes: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Button
                      type="button"
                      className="w-full"
                      data-testid="button-add-line"
                      onClick={addBudgetLine}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Line
                    </Button>
                  </div>
                </div>

                {budgetLines.length > 0 && (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Account</TableHead>
                          <TableHead className="text-right">Amount (₦)</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {budgetLines.map((line, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              {line.accountNumber} - {line.accountName}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {parseFloat(line.allocatedAmount).toLocaleString('en-NG', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {line.notes || "-"}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeBudgetLine(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-semibold">
                          <TableCell>Total Budget</TableCell>
                          <TableCell className="text-right font-mono">
                            ₦{totalBudgetAmount.toLocaleString('en-NG', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell colSpan={2}></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
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
                onClick={handleCreateBudget}
                disabled={createMutation.isPending}
                data-testid="button-submit-budget"
              >
                {createMutation.isPending ? "Creating..." : "Create Budget"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Budget Summary */}
      {activeBudgets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Active Budget</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₦{totalActiveBudget.toLocaleString('en-NG', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Across {activeBudgets.length} active budget{activeBudgets.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Consumed Amount</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₦{totalActiveConsumed.toLocaleString('en-NG', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {((totalActiveConsumed / totalActiveBudget) * 100).toFixed(1)}% of total budget
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Remaining Budget</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₦{totalActiveRemaining.toLocaleString('en-NG', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Available for spending
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Budgets Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Budgets</CardTitle>
          <CardDescription>View and manage budget projections</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Budget Name</TableHead>
                <TableHead>Fiscal Year</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Date Range</TableHead>
                <TableHead className="text-right">Total Budget</TableHead>
                <TableHead className="text-right">Consumed</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {budgets?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    No budgets created yet
                  </TableCell>
                </TableRow>
              ) : (
                budgets?.map((budget) => (
                  <TableRow key={budget.id}>
                    <TableCell className="font-medium" data-testid={`text-budget-name-${budget.id}`}>
                      {budget.name}
                    </TableCell>
                    <TableCell>{budget.fiscalYear}</TableCell>
                    <TableCell>{periodTypeLabels[budget.periodType]}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(budget.startDate), 'MMM d, yyyy')} - {format(new Date(budget.endDate), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ₦{parseFloat(budget.totalBudgetAmount).toLocaleString('en-NG', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ₦{parseFloat(budget.totalConsumedAmount).toLocaleString('en-NG', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ₦{parseFloat(budget.totalRemainingAmount).toLocaleString('en-NG', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusBadgeVariants[budget.status]} data-testid={`badge-status-${budget.id}`}>
                        {budget.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewBudget(budget)}
                          data-testid={`button-view-${budget.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {budget.status === 'draft' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedBudget(budget);
                              setActivateDialogOpen(true);
                            }}
                            data-testid={`button-activate-${budget.id}`}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        {budget.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedBudget(budget);
                              setCloseDialogOpen(true);
                            }}
                            data-testid={`button-close-${budget.id}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        {budget.status === 'draft' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedBudget(budget);
                              setDeleteDialogOpen(true);
                            }}
                            data-testid={`button-delete-${budget.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Budget Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedBudgetWithLines?.name}</DialogTitle>
            <DialogDescription>
              Budget details and line items
            </DialogDescription>
          </DialogHeader>
          {selectedBudgetWithLines && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Fiscal Year</p>
                  <p className="font-medium">{selectedBudgetWithLines.fiscalYear}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Period Type</p>
                  <p className="font-medium">{periodTypeLabels[selectedBudgetWithLines.periodType]}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-medium">{format(new Date(selectedBudgetWithLines.startDate), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p className="font-medium">{format(new Date(selectedBudgetWithLines.endDate), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={statusBadgeVariants[selectedBudgetWithLines.status]}>
                    {selectedBudgetWithLines.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created By</p>
                  <p className="font-medium">{selectedBudgetWithLines.creatorName || "Unknown"}</p>
                </div>
              </div>

              {selectedBudgetWithLines.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="font-medium">{selectedBudgetWithLines.description}</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      ₦{parseFloat(selectedBudgetWithLines.totalBudgetAmount).toLocaleString('en-NG', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Consumed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      ₦{parseFloat(selectedBudgetWithLines.totalConsumedAmount).toLocaleString('en-NG', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Remaining</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      ₦{parseFloat(selectedBudgetWithLines.totalRemainingAmount).toLocaleString('en-NG', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">Budget Line Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Allocated</TableHead>
                      <TableHead className="text-right">Consumed</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      <TableHead className="text-right">% Used</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedBudgetWithLines.budgetLines.map((line) => {
                      const percentUsed = (parseFloat(line.consumedAmount || '0') / parseFloat(line.allocatedAmount)) * 100;
                      return (
                        <TableRow key={line.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{line.accountNumber} - {line.accountName}</p>
                              <p className="text-sm text-muted-foreground">{line.accountType}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            ₦{parseFloat(line.allocatedAmount).toLocaleString('en-NG', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            ₦{parseFloat(line.consumedAmount || '0').toLocaleString('en-NG', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            ₦{parseFloat(line.remainingAmount || line.allocatedAmount).toLocaleString('en-NG', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={percentUsed > 90 ? "text-red-600 font-semibold" : ""}>
                              {percentUsed.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {line.notes || "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Activate Budget Dialog */}
      <AlertDialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate Budget</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to activate "{selectedBudget?.name}"? This will make the budget active and ready to track expenses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-activate">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedBudget && activateMutation.mutate(selectedBudget.id)}
              data-testid="button-confirm-activate"
            >
              Activate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Close Budget Dialog */}
      <AlertDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close Budget</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to close "{selectedBudget?.name}"? This will prevent further expense tracking against this budget.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-close">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedBudget && closeMutation.mutate(selectedBudget.id)}
              data-testid="button-confirm-close"
            >
              Close Budget
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Budget Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedBudget?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedBudget && deleteMutation.mutate(selectedBudget.id)}
              className="bg-destructive text-destructive-foreground hover-elevate active-elevate-2"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
