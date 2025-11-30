import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, QrCode, CheckCircle, XCircle, Clock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Visitor, Resident } from "@shared/schema";
import QRCodeDisplay from "@/components/qr-code-display";

export default function Visitors() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [formData, setFormData] = useState({
    visitorName: "",
    visitorPhone: "",
    purpose: "",
    validFrom: new Date().toISOString().slice(0, 16),
    validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: resident } = useQuery<Resident>({
    queryKey: ["/api/resident/profile"],
    enabled: isAuthenticated,
  });

  const { data: visitors = [] } = useQuery<Visitor[]>({
    queryKey: ["/api/resident/visitors"],
    enabled: isAuthenticated,
  });

  const createVisitorMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      await apiRequest("POST", "/api/resident/visitors", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resident/visitors"] });
      toast({
        title: "Success",
        description: "Visitor access code generated successfully",
      });
      setOpen(false);
      setFormData({
        visitorName: "",
        visitorPhone: "",
        purpose: "",
        validFrom: new Date().toISOString().slice(0, 16),
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to create visitor access",
        variant: "destructive",
      });
    },
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const canAddVisitor = resident?.accountStatus === "active";

  const getStatusBadge = (visitor: Visitor) => {
    if (visitor.status === "used") {
      return <Badge variant="secondary"><CheckCircle className="h-3 w-3 mr-1" />Used</Badge>;
    }
    if (visitor.status === "expired") {
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Expired</Badge>;
    }
    if (visitor.status === "denied") {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Denied</Badge>;
    }
    if (new Date(visitor.validUntil) < new Date()) {
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Expired</Badge>;
    }
    return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createVisitorMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Visitor Management</h1>
          <p className="text-muted-foreground mt-1">Pre-approve visitors and manage access</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={!canAddVisitor} data-testid="button-add-visitor">
              <Plus className="h-4 w-4 mr-2" />
              Pre-approve Visitor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Pre-approve Visitor</DialogTitle>
                <DialogDescription>
                  Generate a secure QR code for your visitor. They can use this at the gate.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="visitorName">Visitor Name *</Label>
                  <Input
                    id="visitorName"
                    value={formData.visitorName}
                    onChange={(e) => setFormData({ ...formData, visitorName: e.target.value })}
                    required
                    data-testid="input-visitor-name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="visitorPhone">Phone Number</Label>
                  <Input
                    id="visitorPhone"
                    type="tel"
                    value={formData.visitorPhone}
                    onChange={(e) => setFormData({ ...formData, visitorPhone: e.target.value })}
                    data-testid="input-visitor-phone"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="purpose">Purpose of Visit</Label>
                  <Textarea
                    id="purpose"
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    data-testid="input-purpose"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="validFrom">Valid From</Label>
                    <Input
                      id="validFrom"
                      type="datetime-local"
                      value={formData.validFrom}
                      onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                      required
                      data-testid="input-valid-from"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="validUntil">Valid Until</Label>
                    <Input
                      id="validUntil"
                      type="datetime-local"
                      value={formData.validUntil}
                      onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                      required
                      data-testid="input-valid-until"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createVisitorMutation.isPending} data-testid="button-submit-visitor">
                  {createVisitorMutation.isPending ? "Generating..." : "Generate Access Code"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!canAddVisitor && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium">Visitor access temporarily restricted</p>
                <p className="text-sm text-muted-foreground">
                  Please settle your outstanding balance to pre-approve visitors.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Visitors List */}
      <Card>
        <CardHeader>
          <CardTitle>My Visitors</CardTitle>
          <CardDescription>All pre-approved visitor access codes</CardDescription>
        </CardHeader>
        <CardContent>
          {visitors.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <QrCode className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No visitors yet</p>
              <p className="text-sm mt-1">Pre-approve visitors to generate QR access codes</p>
            </div>
          ) : (
            <div className="space-y-4">
              {visitors.map((visitor) => (
                <div
                  key={visitor.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-lg border hover-elevate gap-4"
                  data-testid={`visitor-${visitor.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <QrCode className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-semibold text-lg">{visitor.visitorName}</h3>
                      {getStatusBadge(visitor)}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                      {visitor.visitorPhone && <p>Phone: {visitor.visitorPhone}</p>}
                      {visitor.purpose && <p>Purpose: {visitor.purpose}</p>}
                      <p>Valid: {new Date(visitor.validFrom).toLocaleString()}</p>
                      <p>Until: {new Date(visitor.validUntil).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedVisitor(visitor)}
                      data-testid={`button-view-qr-${visitor.id}`}
                    >
                      <QrCode className="h-4 w-4 mr-1" />
                      View QR
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code Display Dialog */}
      {selectedVisitor && (
        <QRCodeDisplay
          visitor={selectedVisitor}
          open={!!selectedVisitor}
          onClose={() => setSelectedVisitor(null)}
        />
      )}
    </div>
  );
}
