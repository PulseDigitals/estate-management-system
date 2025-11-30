import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle2, XCircle, Clock, Building2 } from "lucide-react";
import type { Vendor } from "@shared/schema";

export default function VendorApproval() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: vendors, isLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/accountant/vendors"],
  });

  const approveMutation = useMutation({
    mutationFn: async (vendorId: string) => {
      return await apiRequest("POST", `/api/accountant/vendors/${vendorId}/approve`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Vendor approved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/accountant/vendors"] });
      setShowApproveDialog(false);
      setSelectedVendor(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve vendor",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ vendorId, reason }: { vendorId: string; reason: string }) => {
      return await apiRequest("POST", `/api/accountant/vendors/${vendorId}/reject`, { reason });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Vendor rejected successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/accountant/vendors"] });
      setShowRejectDialog(false);
      setSelectedVendor(null);
      setRejectionReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject vendor",
        variant: "destructive",
      });
    },
  });

  const handleApprove = () => {
    if (selectedVendor) {
      approveMutation.mutate(selectedVendor.id);
    }
  };

  const handleReject = () => {
    if (selectedVendor && rejectionReason.trim()) {
      rejectMutation.mutate({ vendorId: selectedVendor.id, reason: rejectionReason });
    }
  };

  const pendingVendors = vendors?.filter(v => v.status === "pending") || [];
  const approvedVendors = vendors?.filter(v => v.status === "approved") || [];
  const rejectedVendors = vendors?.filter(v => v.status === "rejected") || [];

  const VendorCard = ({ vendor }: { vendor: Vendor }) => (
    <Card key={vendor.id} className="hover-elevate" data-testid={`card-vendor-${vendor.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2" data-testid={`text-vendor-name-${vendor.id}`}>
              <Building2 className="h-4 w-4" />
              {vendor.name}
            </CardTitle>
            <CardDescription data-testid={`text-vendor-tin-${vendor.id}`}>
              TIN: {vendor.tinNumber}
            </CardDescription>
          </div>
          <Badge 
            variant={
              vendor.status === "approved" ? "default" :
              vendor.status === "rejected" ? "destructive" :
              "secondary"
            }
            data-testid={`badge-status-${vendor.id}`}
          >
            {vendor.status === "approved" && <CheckCircle2 className="h-3 w-3 mr-1" />}
            {vendor.status === "rejected" && <XCircle className="h-3 w-3 mr-1" />}
            {vendor.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
            {vendor.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          {vendor.contactPerson && (
            <div>
              <span className="font-medium">Contact Person:</span> {vendor.contactPerson}
            </div>
          )}
          {vendor.phoneNumber && (
            <div>
              <span className="font-medium">Phone:</span> {vendor.phoneNumber}
            </div>
          )}
          {vendor.email && (
            <div>
              <span className="font-medium">Email:</span> {vendor.email}
            </div>
          )}
          {vendor.address && (
            <div>
              <span className="font-medium">Address:</span> {vendor.address}
            </div>
          )}
          {vendor.bankName && (
            <div>
              <span className="font-medium">Bank:</span> {vendor.bankName} - {vendor.bankAccountNumber}
            </div>
          )}
          {vendor.rejectionReason && (
            <div className="mt-3 p-2 bg-destructive/10 rounded">
              <span className="font-medium">Rejection Reason:</span> {vendor.rejectionReason}
            </div>
          )}
        </div>

        {vendor.status === "pending" && (
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedVendor(vendor);
                setShowRejectDialog(true);
              }}
              data-testid={`button-reject-${vendor.id}`}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setSelectedVendor(vendor);
                setShowApproveDialog(true);
              }}
              data-testid={`button-approve-${vendor.id}`}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Approve
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading vendors...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold" data-testid="text-title">Vendor Approval</h1>
        <p className="text-muted-foreground">Review and approve vendor registrations</p>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending ({pendingVendors.length})
          </TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved">
            Approved ({approvedVendors.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" data-testid="tab-rejected">
            Rejected ({rejectedVendors.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingVendors.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No pending vendors for approval
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {pendingVendors.map(vendor => (
                <VendorCard key={vendor.id} vendor={vendor} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {approvedVendors.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No approved vendors yet
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {approvedVendors.map(vendor => (
                <VendorCard key={vendor.id} vendor={vendor} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {rejectedVendors.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No rejected vendors
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {rejectedVendors.map(vendor => (
                <VendorCard key={vendor.id} vendor={vendor} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Vendor</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve <strong>{selectedVendor?.name}</strong>?
              This will allow them to be used in transactions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
              data-testid="button-cancel-approve"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approveMutation.isPending}
              data-testid="button-confirm-approve"
            >
              {approveMutation.isPending ? "Approving..." : "Approve Vendor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Vendor</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting <strong>{selectedVendor?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rejection-reason">Rejection Reason *</Label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter reason for rejection..."
              data-testid="input-rejection-reason"
              rows={4}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason("");
              }}
              data-testid="button-cancel-reject"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject Vendor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
