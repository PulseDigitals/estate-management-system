import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, Eye, Edit, UserX, FileText, Calendar, Home, Phone, Mail, Users, Car, MapPin, User, AlertTriangle, Plus, Download } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Resident, Bill, Payment } from "@shared/schema";

type ResidentWithUser = Resident & { user: { id: string; email: string; firstName: string; lastName: string } };

export default function ResidentsListPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [statementDialogOpen, setStatementDialogOpen] = useState(false);
  const [invoicesDialogOpen, setInvoicesDialogOpen] = useState(false);
  const [selectedResident, setSelectedResident] = useState<ResidentWithUser | null>(null);
  
  const [addFormData, setAddFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    unitNumber: "",
    streetName: "",
    phoneNumber: "",
    moveInDate: "",
    occupancyType: "owner" as "owner" | "tenant",
    numberOfOccupants: "",
    propertySize: "",
    bedrooms: "",
    parkingSpaces: "0",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelationship: "",
    vehicles: "",
    specialNotes: "",
    serviceCharge: "",
    startDate: "",
  });

  const [editForm, setEditForm] = useState({
    unitNumber: "",
    streetName: "",
    phoneNumber: "",
    occupancyType: "",
    numberOfOccupants: "",
    bedrooms: "",
    parkingSpaces: "",
    propertySize: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelationship: "",
    vehicles: "",
    specialNotes: "",
    serviceCharge: "",
    startDate: "",
  });

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== "admin")) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Admin access required",
      });
      setLocation("/");
    }
  }, [authLoading, isAuthenticated, user, setLocation, toast]);

  const { data: residentsData = [], isLoading } = useQuery<
    Array<{ residents: Resident; users: { id: string; email: string; firstName: string; lastName: string } | null }>
  >({
    queryKey: ["/api/admin/residents"],
    enabled: isAuthenticated && user?.role === "admin",
  });

  const residents = residentsData.map(item => ({
    ...item.residents,
    user: item.users || { id: '', email: '', firstName: '', lastName: '' }
  }));

  const filteredResidents = residents.filter(resident => {
    const query = searchQuery.toLowerCase();
    const fullName = `${resident.user.firstName} ${resident.user.lastName}`.toLowerCase();
    const email = resident.user.email.toLowerCase();
    const unitNumber = (resident.unitNumber ?? "").toLowerCase();
    const phoneNumber = (resident.phoneNumber ?? "").toLowerCase();
    
    return fullName.includes(query) || 
           email.includes(query) || 
           unitNumber.includes(query) ||
           phoneNumber.includes(query);
  });

  const createResidentMutation = useMutation({
    mutationFn: async (data: typeof addFormData) => {
      await apiRequest("POST", "/api/admin/residents", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/residents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Success", description: "Resident added successfully" });
      setAddDialogOpen(false);
      setAddFormData({
        email: "",
        firstName: "",
        lastName: "",
        unitNumber: "",
        streetName: "",
        phoneNumber: "",
        moveInDate: "",
        occupancyType: "owner",
        numberOfOccupants: "",
        propertySize: "",
        bedrooms: "",
        parkingSpaces: "0",
        emergencyContactName: "",
        emergencyContactPhone: "",
        emergencyContactRelationship: "",
        vehicles: "",
        specialNotes: "",
        serviceCharge: "",
        startDate: "",
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
        description: error.message || "Failed to add resident",
        variant: "destructive",
      });
    },
  });

  const updateResidentMutation = useMutation({
    mutationFn: async (data: { id: string; updates: any }) => {
      return await apiRequest("PATCH", `/api/admin/residents/${data.id}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/residents"] });
      toast({ title: "Success", description: "Resident updated successfully" });
      setEditDialogOpen(false);
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "Failed to update resident" });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (data: { id: string; status: string }) => {
      return await apiRequest("PATCH", `/api/admin/residents/${data.id}/status`, { status: data.status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/residents"] });
      toast({ title: "Success", description: "Resident status updated successfully" });
      setDeactivateDialogOpen(false);
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "Failed to update status" });
    },
  });

  const handleView = (resident: ResidentWithUser) => {
    setSelectedResident(resident);
    setViewDialogOpen(true);
  };

  const handleEdit = (resident: ResidentWithUser) => {
    setSelectedResident(resident);
    setEditForm({
      unitNumber: resident.unitNumber || "",
      streetName: resident.streetName || "",
      phoneNumber: resident.phoneNumber || "",
      occupancyType: resident.occupancyType || "",
      numberOfOccupants: resident.numberOfOccupants?.toString() || "",
      bedrooms: resident.bedrooms?.toString() || "",
      parkingSpaces: resident.parkingSpaces?.toString() || "",
      propertySize: resident.propertySize || "",
      emergencyContactName: resident.emergencyContactName || "",
      emergencyContactPhone: resident.emergencyContactPhone || "",
      emergencyContactRelationship: resident.emergencyContactRelationship || "",
      vehicles: resident.vehicles?.join('\n') || "",
      specialNotes: resident.specialNotes || "",
      serviceCharge: resident.serviceCharge || "",
      startDate: resident.startDate ? new Date(resident.startDate).toISOString().split('T')[0] : "",
    });
    setEditDialogOpen(true);
  };

  const handleDeactivate = (resident: ResidentWithUser) => {
    setSelectedResident(resident);
    setDeactivateDialogOpen(true);
  };

  const handleStatement = (resident: ResidentWithUser) => {
    setSelectedResident(resident);
    setStatementDialogOpen(true);
  };

  const handleInvoices = (resident: ResidentWithUser) => {
    setSelectedResident(resident);
    setInvoicesDialogOpen(true);
  };

  const handleEditSubmit = () => {
    if (!selectedResident) return;

    updateResidentMutation.mutate({
      id: selectedResident.id,
      updates: {
        unitNumber: editForm.unitNumber,
        streetName: editForm.streetName || null,
        phoneNumber: editForm.phoneNumber || null,
        occupancyType: editForm.occupancyType || null,
        numberOfOccupants: editForm.numberOfOccupants || null,
        bedrooms: editForm.bedrooms || null,
        parkingSpaces: editForm.parkingSpaces || null,
        propertySize: editForm.propertySize || null,
        emergencyContactName: editForm.emergencyContactName || null,
        emergencyContactPhone: editForm.emergencyContactPhone || null,
        emergencyContactRelationship: editForm.emergencyContactRelationship || null,
        vehicles: editForm.vehicles || null,
        specialNotes: editForm.specialNotes || null,
        serviceCharge: editForm.serviceCharge || null,
        startDate: editForm.startDate || null,
      },
    });
  };

  const handleStatusToggle = () => {
    if (!selectedResident) return;

    const newStatus = selectedResident.accountStatus === "active" ? "inactive" : "active";
    toggleStatusMutation.mutate({
      id: selectedResident.id,
      status: newStatus,
    });
  };

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createResidentMutation.mutate(addFormData);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Registered Residents</h1>
          <p className="text-muted-foreground">
            Complete directory of all estate residents
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" data-testid="badge-count">
            {residents.length} {residents.length === 1 ? "Resident" : "Residents"}
          </Badge>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-resident">
                <Plus className="h-4 w-4 mr-2" />
                Add Resident
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleAddSubmit}>
                <DialogHeader>
                  <DialogTitle>Add New Resident</DialogTitle>
                  <DialogDescription>
                    Create a comprehensive resident profile
                  </DialogDescription>
                </DialogHeader>
                
                <Tabs defaultValue="basic" className="py-4">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="basic" data-testid="tab-basic">
                      <User className="h-4 w-4 mr-2" />
                      Basic
                    </TabsTrigger>
                    <TabsTrigger value="property" data-testid="tab-property">
                      <Home className="h-4 w-4 mr-2" />
                      Property
                    </TabsTrigger>
                    <TabsTrigger value="emergency" data-testid="tab-emergency">
                      <Phone className="h-4 w-4 mr-2" />
                      Emergency
                    </TabsTrigger>
                    <TabsTrigger value="other" data-testid="tab-other">
                      <Car className="h-4 w-4 mr-2" />
                      Other
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-4 mt-4">
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={addFormData.email}
                        onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                        required
                        data-testid="input-email"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          value={addFormData.firstName}
                          onChange={(e) => setAddFormData({ ...addFormData, firstName: e.target.value })}
                          required
                          data-testid="input-first-name"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          value={addFormData.lastName}
                          onChange={(e) => setAddFormData({ ...addFormData, lastName: e.target.value })}
                          required
                          data-testid="input-last-name"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="unitNumber">Unit Number *</Label>
                        <Input
                          id="unitNumber"
                          value={addFormData.unitNumber}
                          onChange={(e) => setAddFormData({ ...addFormData, unitNumber: e.target.value })}
                          required
                          data-testid="input-unit-number"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="phoneNumber">Phone Number</Label>
                        <Input
                          id="phoneNumber"
                          type="tel"
                          value={addFormData.phoneNumber}
                          onChange={(e) => setAddFormData({ ...addFormData, phoneNumber: e.target.value })}
                          data-testid="input-phone"
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="streetName">Street Name</Label>
                      <Input
                        id="streetName"
                        value={addFormData.streetName}
                        onChange={(e) => setAddFormData({ ...addFormData, streetName: e.target.value })}
                        placeholder="e.g., Magodo Street"
                        data-testid="input-street-name"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="property" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="moveInDate">Move-In Date</Label>
                        <Input
                          id="moveInDate"
                          type="date"
                          value={addFormData.moveInDate}
                          onChange={(e) => setAddFormData({ ...addFormData, moveInDate: e.target.value })}
                          data-testid="input-move-in-date"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="occupancyType">Occupancy Type</Label>
                        <Select
                          value={addFormData.occupancyType}
                          onValueChange={(value: "owner" | "tenant") => setAddFormData({ ...addFormData, occupancyType: value })}
                        >
                          <SelectTrigger data-testid="select-occupancy-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owner">Owner</SelectItem>
                            <SelectItem value="tenant">Tenant</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="numberOfOccupants">Number of Occupants</Label>
                        <Input
                          id="numberOfOccupants"
                          type="number"
                          min="0"
                          value={addFormData.numberOfOccupants}
                          onChange={(e) => setAddFormData({ ...addFormData, numberOfOccupants: e.target.value })}
                          data-testid="input-occupants"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="bedrooms">Bedrooms</Label>
                        <Input
                          id="bedrooms"
                          type="number"
                          min="0"
                          value={addFormData.bedrooms}
                          onChange={(e) => setAddFormData({ ...addFormData, bedrooms: e.target.value })}
                          data-testid="input-bedrooms"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="propertySize">Property Size</Label>
                        <Input
                          id="propertySize"
                          placeholder="e.g., 2000 sq ft"
                          value={addFormData.propertySize}
                          onChange={(e) => setAddFormData({ ...addFormData, propertySize: e.target.value })}
                          data-testid="input-property-size"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="parkingSpaces">Parking Spaces</Label>
                        <Input
                          id="parkingSpaces"
                          type="number"
                          min="0"
                          value={addFormData.parkingSpaces}
                          onChange={(e) => setAddFormData({ ...addFormData, parkingSpaces: e.target.value })}
                          data-testid="input-parking"
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="serviceCharge">Service Charge (₦)</Label>
                      <Input
                        id="serviceCharge"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g., 50000"
                        value={addFormData.serviceCharge}
                        onChange={(e) => setAddFormData({ ...addFormData, serviceCharge: e.target.value })}
                        data-testid="input-service-charge"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="startDate">Start Date</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={addFormData.startDate}
                          onChange={(e) => setAddFormData({ ...addFormData, startDate: e.target.value })}
                          data-testid="input-start-date"
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          Billing period starts from this date. System will auto-generate 12-month bills.
                        </p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="emergency" className="space-y-4 mt-4">
                    <div className="grid gap-2">
                      <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
                      <Input
                        id="emergencyContactName"
                        value={addFormData.emergencyContactName}
                        onChange={(e) => setAddFormData({ ...addFormData, emergencyContactName: e.target.value })}
                        data-testid="input-emergency-name"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
                      <Input
                        id="emergencyContactPhone"
                        type="tel"
                        value={addFormData.emergencyContactPhone}
                        onChange={(e) => setAddFormData({ ...addFormData, emergencyContactPhone: e.target.value })}
                        data-testid="input-emergency-phone"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="emergencyContactRelationship">Relationship</Label>
                      <Input
                        id="emergencyContactRelationship"
                        placeholder="e.g., Spouse, Parent, Sibling"
                        value={addFormData.emergencyContactRelationship}
                        onChange={(e) => setAddFormData({ ...addFormData, emergencyContactRelationship: e.target.value })}
                        data-testid="input-emergency-relationship"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="other" className="space-y-4 mt-4">
                    <div className="grid gap-2">
                      <Label htmlFor="vehicles">Vehicles (one per line)</Label>
                      <Textarea
                        id="vehicles"
                        placeholder="e.g., &#10;Toyota Camry - ABC123XY&#10;Honda CR-V - XYZ789AB"
                        value={addFormData.vehicles}
                        onChange={(e) => setAddFormData({ ...addFormData, vehicles: e.target.value })}
                        rows={4}
                        data-testid="input-vehicles"
                      />
                      <p className="text-xs text-muted-foreground">Enter vehicle details, one per line</p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="specialNotes">Special Notes</Label>
                      <Textarea
                        id="specialNotes"
                        placeholder="Any additional information about this resident..."
                        value={addFormData.specialNotes}
                        onChange={(e) => setAddFormData({ ...addFormData, specialNotes: e.target.value })}
                        rows={4}
                        data-testid="input-notes"
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createResidentMutation.isPending} data-testid="button-submit-resident">
                    {createResidentMutation.isPending ? "Adding..." : "Add Resident"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, unit number, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
      </div>

      {filteredResidents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? "No residents found matching your search" : "No residents registered yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResidents.map((resident) => (
                <TableRow key={resident.id} data-testid={`row-resident-${resident.id}`}>
                  <TableCell className="font-medium" data-testid={`text-name-${resident.id}`}>
                    {resident.user.firstName} {resident.user.lastName}
                  </TableCell>
                  <TableCell data-testid={`text-unit-${resident.id}`}>
                    {resident.unitNumber}
                  </TableCell>
                  <TableCell data-testid={`text-email-${resident.id}`}>
                    {resident.user.email}
                  </TableCell>
                  <TableCell data-testid={`text-phone-${resident.id}`}>
                    {resident.phoneNumber || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={resident.accountStatus === "active" ? "default" : "destructive"}
                      data-testid={`badge-status-${resident.id}`}
                    >
                      {resident.accountStatus}
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`text-balance-${resident.id}`}>
                    {resident.totalBalance && parseFloat(resident.totalBalance) > 0 ? (
                      <span className="font-semibold text-destructive">
                        ₦{parseFloat(resident.totalBalance).toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">₦0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(resident)}
                        data-testid={`button-view-${resident.id}`}
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(resident)}
                        data-testid={`button-edit-${resident.id}`}
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeactivate(resident)}
                        data-testid={`button-deactivate-${resident.id}`}
                      >
                        <UserX className="h-4 w-4" />
                        {resident.accountStatus === "active" ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStatement(resident)}
                        data-testid={`button-statement-${resident.id}`}
                      >
                        <FileText className="h-4 w-4" />
                        Statement
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleInvoices(resident)}
                        data-testid={`button-invoices-${resident.id}`}
                      >
                        <Download className="h-4 w-4" />
                        Invoices
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* View Dialog */}
      <ViewResidentDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        resident={selectedResident}
      />

      {/* Edit Dialog */}
      <EditResidentDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        resident={selectedResident}
        editForm={editForm}
        setEditForm={setEditForm}
        onSubmit={handleEditSubmit}
        isPending={updateResidentMutation.isPending}
      />

      {/* Deactivate Dialog */}
      <AlertDialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <AlertDialogContent data-testid="dialog-deactivate">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedResident?.accountStatus === "active" ? "Deactivate" : "Activate"} Resident?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedResident?.accountStatus === "active" 
                ? `Are you sure you want to deactivate ${selectedResident?.user.firstName} ${selectedResident?.user.lastName}? They will not be able to approve visitors or access resident features.`
                : `Are you sure you want to activate ${selectedResident?.user.firstName} ${selectedResident?.user.lastName}? They will regain access to all resident features.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-deactivate">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStatusToggle}
              disabled={toggleStatusMutation.isPending}
              data-testid="button-confirm-deactivate"
            >
              {toggleStatusMutation.isPending ? "Processing..." : selectedResident?.accountStatus === "active" ? "Deactivate" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Statement Dialog */}
      <StatementDialog
        open={statementDialogOpen}
        onOpenChange={setStatementDialogOpen}
        resident={selectedResident}
      />

      {/* Invoices Dialog */}
      <InvoicesDialog
        open={invoicesDialogOpen}
        onOpenChange={setInvoicesDialogOpen}
        resident={selectedResident}
      />
    </div>
  );
}

function ViewResidentDialog({ open, onOpenChange, resident }: { open: boolean; onOpenChange: (open: boolean) => void; resident: ResidentWithUser | null }) {
  if (!resident) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-view">
        <DialogHeader>
          <DialogTitle>Resident Details</DialogTitle>
          <DialogDescription>
            Complete information for {resident.user.firstName} {resident.user.lastName}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="property">Property</TabsTrigger>
            <TabsTrigger value="emergency">Emergency</TabsTrigger>
            <TabsTrigger value="other">Other</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid gap-4">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label className="text-muted-foreground">Full Name</Label>
                  <p className="font-medium">{resident.user.firstName} {resident.user.lastName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{resident.user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Home className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label className="text-muted-foreground">Unit Number</Label>
                  <p className="font-medium">{resident.unitNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label className="text-muted-foreground">Phone Number</Label>
                  <p className="font-medium">{resident.phoneNumber || "Not provided"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label className="text-muted-foreground">Account Status</Label>
                  <div className="mt-1">
                    <Badge variant={resident.accountStatus === "active" ? "default" : "destructive"}>
                      {resident.accountStatus}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="property" className="space-y-4">
            <div className="grid gap-4">
              {resident.moveInDate && (
                <div>
                  <Label className="text-muted-foreground">Move-in Date</Label>
                  <p className="font-medium">{new Date(resident.moveInDate).toLocaleDateString()}</p>
                </div>
              )}
              {resident.occupancyType && (
                <div>
                  <Label className="text-muted-foreground">Occupancy Type</Label>
                  <p className="font-medium capitalize">{resident.occupancyType}</p>
                </div>
              )}
              {resident.numberOfOccupants && (
                <div>
                  <Label className="text-muted-foreground">Number of Occupants</Label>
                  <p className="font-medium">{resident.numberOfOccupants}</p>
                </div>
              )}
              {resident.bedrooms && (
                <div>
                  <Label className="text-muted-foreground">Bedrooms</Label>
                  <p className="font-medium">{resident.bedrooms}</p>
                </div>
              )}
              {resident.propertySize && (
                <div>
                  <Label className="text-muted-foreground">Property Size</Label>
                  <p className="font-medium">{resident.propertySize}</p>
                </div>
              )}
              {resident.parkingSpaces !== null && resident.parkingSpaces !== undefined && (
                <div>
                  <Label className="text-muted-foreground">Parking Spaces</Label>
                  <p className="font-medium">{resident.parkingSpaces}</p>
                </div>
              )}
              {resident.serviceCharge && (
                <div>
                  <Label className="text-muted-foreground">Service Charge</Label>
                  <p className="font-medium">₦{parseFloat(resident.serviceCharge).toLocaleString()}</p>
                </div>
              )}
              {resident.startDate && (
                <div>
                  <Label className="text-muted-foreground">Billing Start Date</Label>
                  <p className="font-medium">{new Date(resident.startDate).toLocaleDateString()}</p>
                </div>
              )}
              {resident.endDate && (
                <div>
                  <Label className="text-muted-foreground">Last Bill End Date (System-Managed)</Label>
                  <p className="font-medium">{new Date(resident.endDate).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="emergency" className="space-y-4">
            <div className="grid gap-4">
              {resident.emergencyContactName && (
                <div>
                  <Label className="text-muted-foreground">Contact Name</Label>
                  <p className="font-medium">{resident.emergencyContactName}</p>
                </div>
              )}
              {resident.emergencyContactPhone && (
                <div>
                  <Label className="text-muted-foreground">Contact Phone</Label>
                  <p className="font-medium">{resident.emergencyContactPhone}</p>
                </div>
              )}
              {resident.emergencyContactRelationship && (
                <div>
                  <Label className="text-muted-foreground">Relationship</Label>
                  <p className="font-medium capitalize">{resident.emergencyContactRelationship}</p>
                </div>
              )}
              {!resident.emergencyContactName && (
                <p className="text-muted-foreground">No emergency contact information provided</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="other" className="space-y-4">
            <div className="grid gap-4">
              {resident.vehicles && resident.vehicles.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Vehicles</Label>
                  <ul className="mt-2 space-y-1">
                    {resident.vehicles.map((vehicle, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        <span>{vehicle}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {resident.specialNotes && (
                <div>
                  <Label className="text-muted-foreground">Special Notes</Label>
                  <p className="mt-1 text-sm">{resident.specialNotes}</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function EditResidentDialog({ 
  open, 
  onOpenChange, 
  resident, 
  editForm, 
  setEditForm, 
  onSubmit, 
  isPending 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  resident: ResidentWithUser | null;
  editForm: any;
  setEditForm: (form: any) => void;
  onSubmit: () => void;
  isPending: boolean;
}) {
  if (!resident) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-edit">
        <DialogHeader>
          <DialogTitle>Edit Resident</DialogTitle>
          <DialogDescription>
            Update information for {resident.user.firstName} {resident.user.lastName}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="property">Property</TabsTrigger>
            <TabsTrigger value="emergency">Emergency</TabsTrigger>
            <TabsTrigger value="other">Other</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="unitNumber">Unit Number *</Label>
                <Input
                  id="unitNumber"
                  value={editForm.unitNumber}
                  onChange={(e) => setEditForm({ ...editForm, unitNumber: e.target.value })}
                  placeholder="e.g., A101"
                  data-testid="input-edit-unit"
                />
              </div>
              <div>
                <Label htmlFor="streetName">Street Name</Label>
                <Input
                  id="streetName"
                  value={editForm.streetName}
                  onChange={(e) => setEditForm({ ...editForm, streetName: e.target.value })}
                  placeholder="e.g., Magodo Street"
                  data-testid="input-edit-street-name"
                />
              </div>
              <div>
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  value={editForm.phoneNumber}
                  onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                  placeholder="e.g., +234 123 456 7890"
                  data-testid="input-edit-phone"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="property" className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="occupancyType">Occupancy Type</Label>
                <Select
                  value={editForm.occupancyType}
                  onValueChange={(value) => setEditForm({ ...editForm, occupancyType: value })}
                >
                  <SelectTrigger data-testid="select-edit-occupancy">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="tenant">Tenant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="numberOfOccupants">Number of Occupants</Label>
                <Input
                  id="numberOfOccupants"
                  type="number"
                  value={editForm.numberOfOccupants}
                  onChange={(e) => setEditForm({ ...editForm, numberOfOccupants: e.target.value })}
                  placeholder="e.g., 4"
                  data-testid="input-edit-occupants"
                />
              </div>
              <div>
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  value={editForm.bedrooms}
                  onChange={(e) => setEditForm({ ...editForm, bedrooms: e.target.value })}
                  placeholder="e.g., 3"
                  data-testid="input-edit-bedrooms"
                />
              </div>
              <div>
                <Label htmlFor="propertySize">Property Size</Label>
                <Input
                  id="propertySize"
                  value={editForm.propertySize}
                  onChange={(e) => setEditForm({ ...editForm, propertySize: e.target.value })}
                  placeholder="e.g., 150 sqm"
                  data-testid="input-edit-property-size"
                />
              </div>
              <div>
                <Label htmlFor="parkingSpaces">Parking Spaces</Label>
                <Input
                  id="parkingSpaces"
                  type="number"
                  value={editForm.parkingSpaces}
                  onChange={(e) => setEditForm({ ...editForm, parkingSpaces: e.target.value })}
                  placeholder="e.g., 2"
                  data-testid="input-edit-parking"
                />
              </div>
              <div>
                <Label htmlFor="serviceCharge">Service Charge (₦)</Label>
                <Input
                  id="serviceCharge"
                  type="number"
                  step="0.01"
                  value={editForm.serviceCharge}
                  onChange={(e) => setEditForm({ ...editForm, serviceCharge: e.target.value })}
                  placeholder="e.g., 50000"
                  data-testid="input-edit-service-charge"
                />
              </div>
              <div>
                <Label htmlFor="startDate">Billing Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={editForm.startDate}
                  onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                  data-testid="input-edit-start-date"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Note: End date is system-managed and updated automatically when bills are generated
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="emergency" className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="emergencyContactName">Contact Name</Label>
                <Input
                  id="emergencyContactName"
                  value={editForm.emergencyContactName}
                  onChange={(e) => setEditForm({ ...editForm, emergencyContactName: e.target.value })}
                  placeholder="e.g., John Doe"
                  data-testid="input-edit-emergency-name"
                />
              </div>
              <div>
                <Label htmlFor="emergencyContactPhone">Contact Phone</Label>
                <Input
                  id="emergencyContactPhone"
                  value={editForm.emergencyContactPhone}
                  onChange={(e) => setEditForm({ ...editForm, emergencyContactPhone: e.target.value })}
                  placeholder="e.g., +234 123 456 7890"
                  data-testid="input-edit-emergency-phone"
                />
              </div>
              <div>
                <Label htmlFor="emergencyContactRelationship">Relationship</Label>
                <Input
                  id="emergencyContactRelationship"
                  value={editForm.emergencyContactRelationship}
                  onChange={(e) => setEditForm({ ...editForm, emergencyContactRelationship: e.target.value })}
                  placeholder="e.g., Spouse, Parent, Sibling"
                  data-testid="input-edit-emergency-relationship"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="other" className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="vehicles">Vehicles (one per line)</Label>
                <Textarea
                  id="vehicles"
                  value={editForm.vehicles}
                  onChange={(e) => setEditForm({ ...editForm, vehicles: e.target.value })}
                  placeholder="e.g.,&#10;Toyota Camry - ABC123XY&#10;Honda Civic - DEF456ZW"
                  rows={4}
                  data-testid="textarea-edit-vehicles"
                />
              </div>
              <div>
                <Label htmlFor="specialNotes">Special Notes</Label>
                <Textarea
                  id="specialNotes"
                  value={editForm.specialNotes}
                  onChange={(e) => setEditForm({ ...editForm, specialNotes: e.target.value })}
                  placeholder="Any additional notes about the resident"
                  rows={3}
                  data-testid="textarea-edit-notes"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-edit">
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isPending || !editForm.unitNumber} data-testid="button-save-edit">
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatementDialog({ open, onOpenChange, resident }: { open: boolean; onOpenChange: (open: boolean) => void; resident: ResidentWithUser | null }) {
  const { data: bills = [], isLoading: billsLoading } = useQuery<Bill[]>({
    queryKey: ["/api/admin/residents", resident?.id, "bills"],
    enabled: open && !!resident,
  });

  const { data: payments = [], isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ["/api/admin/residents", resident?.id, "payments"],
    enabled: open && !!resident,
  });

  if (!resident) return null;

  const totalBills = bills.reduce((sum, bill) => sum + parseFloat(bill.amount), 0);
  const totalPaid = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
  const balance = totalBills - totalPaid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-statement">
        <DialogHeader>
          <DialogTitle>Financial Statement</DialogTitle>
          <DialogDescription>
            Billing and payment history for {resident.user.firstName} {resident.user.lastName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Billed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">₦{totalBills.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">₦{totalPaid.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${balance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                  ₦{balance.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="bills" className="w-full">
            <TabsList>
              <TabsTrigger value="bills">Bills ({bills.length})</TabsTrigger>
              <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="bills" className="space-y-4">
              {billsLoading ? (
                <div className="text-center py-8">Loading bills...</div>
              ) : bills.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No bills found</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bills.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell>{bill.description}</TableCell>
                        <TableCell className="font-medium">₦{parseFloat(bill.amount).toLocaleString()}</TableCell>
                        <TableCell>{new Date(bill.dueDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={bill.status === "paid" ? "default" : bill.status === "overdue" ? "destructive" : "secondary"}>
                            {bill.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="payments" className="space-y-4">
              {paymentsLoading ? (
                <div className="text-center py-8">Loading payments...</div>
              ) : payments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No payments found</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : "—"}</TableCell>
                        <TableCell className="font-medium text-green-600">₦{parseFloat(payment.amount).toLocaleString()}</TableCell>
                        <TableCell className="capitalize">{payment.paymentMethod}</TableCell>
                        <TableCell className="text-muted-foreground">{payment.transactionId || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InvoicesDialog({ open, onOpenChange, resident }: { open: boolean; onOpenChange: (open: boolean) => void; resident: ResidentWithUser | null }) {
  const { toast } = useToast();
  const [downloadingBillId, setDownloadingBillId] = useState<string | null>(null);

  const { data: bills = [], isLoading: billsLoading } = useQuery<Bill[]>({
    queryKey: ["/api/admin/residents", resident?.id, "bills"],
    enabled: open && !!resident,
  });

  if (!resident) return null;

  const handleDownloadInvoice = async (billId: string, invoiceNumber: string) => {
    try {
      setDownloadingBillId(billId);

      const response = await fetch(`/api/admin/residents/${resident.id}/bills/${billId}/pdf`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to download invoice');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invoiceNumber || billId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Invoice downloaded successfully",
      });
    } catch (error) {
      console.error("Error downloading invoice:", error);
      toast({
        title: "Error",
        description: "Failed to download invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloadingBillId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-invoices">
        <DialogHeader>
          <DialogTitle>Invoice PDFs</DialogTitle>
          <DialogDescription>
            Download invoice PDFs for {resident.user.firstName} {resident.user.lastName} - Unit {resident.unitNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {billsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="mt-4 text-muted-foreground">Loading invoices...</p>
            </div>
          ) : bills.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No invoices found</p>
              <p className="text-sm mt-1">This resident has no bills yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.map((bill) => (
                  <TableRow key={bill.id} data-testid={`invoice-row-${bill.id}`}>
                    <TableCell className="font-medium">
                      {bill.invoiceNumber || `INV-${bill.id.slice(0, 8)}`}
                    </TableCell>
                    <TableCell>{bill.description}</TableCell>
                    <TableCell className="font-semibold">
                      ₦{parseFloat(bill.amount).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>{new Date(bill.dueDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={bill.status === "paid" ? "default" : bill.status === "overdue" ? "destructive" : "secondary"}>
                        {bill.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadInvoice(bill.id, bill.invoiceNumber || '')}
                        disabled={downloadingBillId === bill.id}
                        data-testid={`button-download-invoice-${bill.id}`}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {downloadingBillId === bill.id ? 'Downloading...' : 'Download PDF'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
