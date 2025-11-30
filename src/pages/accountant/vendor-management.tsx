import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Edit, 
  FileText, 
  DollarSign, 
  Ban,
  Search,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Vendor } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function VendorManagement() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [payBillDialogOpen, setPayBillDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    tinNumber: "",
    email: "",
    phoneNumber: "",
    address: "",
    contactPerson: "",
    bankName: "",
    bankAccountNumber: "",
    bankAccountName: "",
    notes: "",
  });
  const [deactivateReason, setDeactivateReason] = useState("");

  const { data: vendors, isLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/accountant/vendors"],
  });

  const { data: outstandingBills } = useQuery<Record<string, number>>({
    queryKey: ["/api/accountant/vendors/outstanding-bills"],
  });

  const updateVendorMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest("PATCH", `/api/accountant/vendors/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accountant/vendors"] });
      toast({
        title: "Success",
        description: "Vendor updated successfully",
      });
      setEditDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update vendor",
        variant: "destructive",
      });
    },
  });

  const deactivateVendorMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return apiRequest("POST", `/api/accountant/vendors/${id}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accountant/vendors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accountant/vendors/outstanding-bills"] });
      toast({
        title: "Success",
        description: "Vendor deactivated successfully",
      });
      setDeactivateDialogOpen(false);
      setDeactivateReason("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to deactivate vendor",
        variant: "destructive",
      });
    },
  });

  const handleEditClick = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setEditFormData({
      name: vendor.name,
      tinNumber: vendor.tinNumber,
      email: vendor.email || "",
      phoneNumber: vendor.phoneNumber || "",
      address: vendor.address || "",
      contactPerson: vendor.contactPerson || "",
      bankName: vendor.bankName || "",
      bankAccountNumber: vendor.bankAccountNumber || "",
      bankAccountName: vendor.bankAccountName || "",
      notes: vendor.notes || "",
    });
    setEditDialogOpen(true);
  };

  const handleViewStatement = (vendor: Vendor) => {
    navigate(`/accountant/vendor-statement?vendorId=${vendor.id}`);
  };

  const handlePayBillClick = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setPayBillDialogOpen(true);
  };

  const handleDeactivateClick = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setDeactivateDialogOpen(true);
  };

  const handleEditSubmit = () => {
    if (!selectedVendor) return;
    updateVendorMutation.mutate({
      id: selectedVendor.id,
      data: editFormData,
    });
  };

  const handleDeactivateSubmit = () => {
    if (!selectedVendor) return;
    if (!deactivateReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for deactivation",
        variant: "destructive",
      });
      return;
    }
    deactivateVendorMutation.mutate({
      id: selectedVendor.id,
      reason: deactivateReason,
    });
  };

  const handlePayBill = () => {
    if (!selectedVendor) return;
    navigate(`/accountant/expense-request?vendorId=${selectedVendor.id}&action=pay`);
    setPayBillDialogOpen(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);
  };

  const filteredVendors = vendors?.filter((vendor) => {
    const search = searchTerm.toLowerCase();
    return (
      vendor.name.toLowerCase().includes(search) ||
      vendor.tinNumber.toLowerCase().includes(search) ||
      vendor.email?.toLowerCase().includes(search) ||
      vendor.phoneNumber?.toLowerCase().includes(search)
    );
  });

  const approvedVendors = filteredVendors?.filter(v => v.status === "approved");

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold" data-testid="text-title">Vendor Management</h1>
        <p className="text-muted-foreground">Manage vendor accounts and payments</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search Vendors</CardTitle>
          <CardDescription>Filter vendors by name, TIN, email, or phone</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search vendors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div>
              <CardTitle>Registered Vendors</CardTitle>
              <CardDescription>
                {approvedVendors?.length || 0} approved vendor{approvedVendors?.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading vendors...</div>
          ) : approvedVendors?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No approved vendors found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>TIN</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Bank Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvedVendors?.map((vendor) => (
                    <TableRow key={vendor.id} data-testid={`row-vendor-${vendor.id}`}>
                      <TableCell className="font-medium">
                        <div>
                          <div data-testid={`text-vendor-name-${vendor.id}`}>{vendor.name}</div>
                          {vendor.contactPerson && (
                            <div className="text-sm text-muted-foreground">
                              Contact: {vendor.contactPerson}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-vendor-tin-${vendor.id}`}>
                        {vendor.tinNumber}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {vendor.email && <div>{vendor.email}</div>}
                          {vendor.phoneNumber && <div>{vendor.phoneNumber}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {vendor.bankName ? (
                          <div className="text-sm">
                            <div>{vendor.bankName}</div>
                            {vendor.bankAccountNumber && (
                              <div className="text-muted-foreground">
                                {vendor.bankAccountNumber}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            vendor.status === "approved"
                              ? "default"
                              : vendor.status === "pending"
                              ? "secondary"
                              : "destructive"
                          }
                          data-testid={`badge-status-${vendor.id}`}
                        >
                          {vendor.status}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-outstanding-${vendor.id}`}>
                        {outstandingBills?.[vendor.id] ? (
                          <span className="font-medium text-destructive">
                            {formatCurrency(outstandingBills[vendor.id])}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">₦0.00</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClick(vendor)}
                            data-testid={`button-edit-${vendor.id}`}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewStatement(vendor)}
                            data-testid={`button-statement-${vendor.id}`}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Statement
                          </Button>
                          {outstandingBills?.[vendor.id] ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePayBillClick(vendor)}
                              data-testid={`button-pay-${vendor.id}`}
                            >
                              <DollarSign className="h-4 w-4 mr-1" />
                              Pay Bill
                            </Button>
                          ) : null}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeactivateClick(vendor)}
                            data-testid={`button-deactivate-${vendor.id}`}
                          >
                            <Ban className="h-4 w-4 mr-1" />
                            Deactivate
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Vendor Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
            <DialogDescription>
              Update vendor information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  data-testid="input-edit-name"
                />
              </div>
              <div>
                <Label htmlFor="edit-tin">TIN Number *</Label>
                <Input
                  id="edit-tin"
                  value={editFormData.tinNumber}
                  onChange={(e) => setEditFormData({ ...editFormData, tinNumber: e.target.value })}
                  data-testid="input-edit-tin"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  data-testid="input-edit-email"
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">Phone Number</Label>
                <Input
                  id="edit-phone"
                  value={editFormData.phoneNumber}
                  onChange={(e) => setEditFormData({ ...editFormData, phoneNumber: e.target.value })}
                  data-testid="input-edit-phone"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-address">Address</Label>
              <Textarea
                id="edit-address"
                value={editFormData.address}
                onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                data-testid="input-edit-address"
              />
            </div>

            <div>
              <Label htmlFor="edit-contact-person">Contact Person</Label>
              <Input
                id="edit-contact-person"
                value={editFormData.contactPerson}
                onChange={(e) => setEditFormData({ ...editFormData, contactPerson: e.target.value })}
                data-testid="input-edit-contact-person"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-bank-name">Bank Name</Label>
                <Input
                  id="edit-bank-name"
                  value={editFormData.bankName}
                  onChange={(e) => setEditFormData({ ...editFormData, bankName: e.target.value })}
                  data-testid="input-edit-bank-name"
                />
              </div>
              <div>
                <Label htmlFor="edit-account-number">Account Number</Label>
                <Input
                  id="edit-account-number"
                  value={editFormData.bankAccountNumber}
                  onChange={(e) => setEditFormData({ ...editFormData, bankAccountNumber: e.target.value })}
                  data-testid="input-edit-account-number"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-account-name">Account Name</Label>
              <Input
                id="edit-account-name"
                value={editFormData.bankAccountName}
                onChange={(e) => setEditFormData({ ...editFormData, bankAccountName: e.target.value })}
                data-testid="input-edit-account-name"
              />
            </div>

            <div>
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={editFormData.notes}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                data-testid="input-edit-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={updateVendorMutation.isPending}
              data-testid="button-save-edit"
            >
              {updateVendorMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Vendor Dialog */}
      <Dialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Vendor</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate {selectedVendor?.name}?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="deactivate-reason">Reason for Deactivation *</Label>
            <Textarea
              id="deactivate-reason"
              placeholder="Enter reason for deactivation..."
              value={deactivateReason}
              onChange={(e) => setDeactivateReason(e.target.value)}
              className="mt-2"
              data-testid="input-deactivate-reason"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeactivateDialogOpen(false);
                setDeactivateReason("");
              }}
              data-testid="button-cancel-deactivate"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeactivateSubmit}
              disabled={deactivateVendorMutation.isPending}
              data-testid="button-confirm-deactivate"
            >
              {deactivateVendorMutation.isPending ? "Deactivating..." : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Bill Dialog */}
      <Dialog open={payBillDialogOpen} onOpenChange={setPayBillDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay Outstanding Bill</DialogTitle>
            <DialogDescription>
              Process payment for {selectedVendor?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div>
                <Label>Outstanding Amount</Label>
                <div className="text-2xl font-bold text-destructive" data-testid="text-outstanding-amount">
                  {selectedVendor && outstandingBills?.[selectedVendor.id]
                    ? formatCurrency(outstandingBills[selectedVendor.id])
                    : "₦0.00"}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                You will be redirected to create an expense request to pay this vendor's outstanding bills.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPayBillDialogOpen(false)}
              data-testid="button-cancel-pay"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayBill}
              data-testid="button-proceed-pay"
            >
              Proceed to Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
