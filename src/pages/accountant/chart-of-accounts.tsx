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
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Account } from "@shared/schema";

type AccountType = "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";

const accountTypeBadgeVariants: Record<AccountType, string> = {
  Asset: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  Liability: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  Equity: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  Revenue: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Expense: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

export default function ChartOfAccounts() {
  const { toast } = useToast();
  const [filterType, setFilterType] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  
  const [formData, setFormData] = useState({
    accountNumber: "",
    accountName: "",
    accountType: "" as AccountType | "",
  });

  const { data: accounts, isLoading } = useQuery<Account[]>({
    queryKey: ['/api/accountant/accounts'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { accountNumber: string; accountName: string; accountType: string; normalBalance: "debit" | "credit" }) => {
      return await apiRequest('POST', '/api/accountant/accounts', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accountant/accounts'] });
      setCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Account created",
        description: "The account has been added to the chart of accounts",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create account",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Account> }) => {
      return await apiRequest('PATCH', `/api/accountant/accounts/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accountant/accounts'] });
      setEditDialogOpen(false);
      setSelectedAccount(null);
      resetForm();
      toast({
        title: "Account updated",
        description: "The account has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update account",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/accountant/accounts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accountant/accounts'] });
      setDeleteDialogOpen(false);
      setSelectedAccount(null);
      toast({
        title: "Account deleted",
        description: "The account has been removed from the chart of accounts",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete account",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      accountNumber: "",
      accountName: "",
      accountType: "",
    });
  };

  const getNormalBalance = (accountType: string): "debit" | "credit" => {
    const type = accountType.toLowerCase();
    // Asset and Expense accounts have debit normal balance
    // Liability, Equity, and Revenue accounts have credit normal balance
    return (type === "asset" || type === "expense") ? "debit" : "credit";
  };

  const handleCreate = () => {
    if (!formData.accountType) return;
    const accountType = formData.accountType.toLowerCase();
    createMutation.mutate({
      accountNumber: formData.accountNumber,
      accountName: formData.accountName,
      accountType: accountType as any,
      normalBalance: getNormalBalance(accountType),
    });
  };

  const handleEdit = (account: Account) => {
    setSelectedAccount(account);
    setFormData({
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      accountType: (account.accountType.charAt(0).toUpperCase() + account.accountType.slice(1)) as AccountType,
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedAccount || !formData.accountType) return;
    const accountType = formData.accountType.toLowerCase();
    updateMutation.mutate({
      id: selectedAccount.id,
      data: {
        accountNumber: formData.accountNumber,
        accountName: formData.accountName,
        accountType: accountType as any,
        normalBalance: getNormalBalance(accountType),
      },
    });
  };

  const handleDelete = (account: Account) => {
    setSelectedAccount(account);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!selectedAccount) return;
    deleteMutation.mutate(selectedAccount.id);
  };

  const filteredAccounts = accounts?.filter(
    (account) => filterType === "all" || account.accountType === filterType
  ) || [];

  const groupedAccounts = filteredAccounts.reduce((acc, account) => {
    const type = account.accountType;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(account);
    return acc;
  }, {} as Record<string, Account[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chart of Accounts</h1>
          <p className="text-muted-foreground mt-2">
            Manage the estate's accounting chart of accounts
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-account">
              <Plus className="mr-2 h-4 w-4" />
              New Account
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-create-account">
            <DialogHeader>
              <DialogTitle>Create New Account</DialogTitle>
              <DialogDescription>
                Add a new account to the chart of accounts
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  data-testid="input-account-number"
                  placeholder="e.g., 1010"
                  value={formData.accountNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, accountNumber: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountName">Account Name</Label>
                <Input
                  id="accountName"
                  data-testid="input-account-name"
                  placeholder="e.g., Cash in Bank"
                  value={formData.accountName}
                  onChange={(e) =>
                    setFormData({ ...formData, accountName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountType">Account Type</Label>
                <Select
                  value={formData.accountType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, accountType: value as AccountType })
                  }
                >
                  <SelectTrigger id="accountType" data-testid="select-account-type">
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asset">Asset</SelectItem>
                    <SelectItem value="Liability">Liability</SelectItem>
                    <SelectItem value="Equity">Equity</SelectItem>
                    <SelectItem value="Revenue">Revenue</SelectItem>
                    <SelectItem value="Expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
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
                  !formData.accountNumber ||
                  !formData.accountName ||
                  !formData.accountType ||
                  createMutation.isPending
                }
                data-testid="button-submit-create"
              >
                {createMutation.isPending ? "Creating..." : "Create Account"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <Label htmlFor="filter">Filter by Type:</Label>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48" id="filter" data-testid="select-filter-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Asset">Asset</SelectItem>
            <SelectItem value="Liability">Liability</SelectItem>
            <SelectItem value="Equity">Equity</SelectItem>
            <SelectItem value="Revenue">Revenue</SelectItem>
            <SelectItem value="Expense">Expense</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading accounts...</div>
      ) : filteredAccounts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No accounts found. Create your first account to get started.
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedAccounts).map(([type, typeAccounts]) => (
            <div key={type} className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                {type}
                <Badge className={accountTypeBadgeVariants[type as AccountType]}>
                  {typeAccounts.length}
                </Badge>
              </h2>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account Number</TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead className="w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {typeAccounts.map((account) => (
                      <TableRow key={account.id} data-testid={`row-account-${account.id}`}>
                        <TableCell className="font-mono">
                          {account.accountNumber}
                        </TableCell>
                        <TableCell>{account.accountName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(account)}
                              data-testid={`button-edit-${account.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(account)}
                              data-testid={`button-delete-${account.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent data-testid="dialog-edit-account">
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
            <DialogDescription>
              Update account information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-accountNumber">Account Number</Label>
              <Input
                id="edit-accountNumber"
                data-testid="input-edit-account-number"
                value={formData.accountNumber}
                onChange={(e) =>
                  setFormData({ ...formData, accountNumber: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-accountName">Account Name</Label>
              <Input
                id="edit-accountName"
                data-testid="input-edit-account-name"
                value={formData.accountName}
                onChange={(e) =>
                  setFormData({ ...formData, accountName: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-accountType">Account Type</Label>
              <Select
                value={formData.accountType}
                onValueChange={(value) =>
                  setFormData({ ...formData, accountType: value as AccountType })
                }
              >
                <SelectTrigger id="edit-accountType" data-testid="select-edit-account-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asset">Asset</SelectItem>
                  <SelectItem value="Liability">Liability</SelectItem>
                  <SelectItem value="Equity">Equity</SelectItem>
                  <SelectItem value="Revenue">Revenue</SelectItem>
                  <SelectItem value="Expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setSelectedAccount(null);
                resetForm();
              }}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={
                !formData.accountNumber ||
                !formData.accountName ||
                !formData.accountType ||
                updateMutation.isPending
              }
              data-testid="button-submit-edit"
            >
              {updateMutation.isPending ? "Updating..." : "Update Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-account">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the account "{selectedAccount?.accountName}
              " (#{selectedAccount?.accountNumber}). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
