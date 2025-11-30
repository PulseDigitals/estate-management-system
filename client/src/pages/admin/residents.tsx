import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, CheckCircle, XCircle, Clock, Eye, User, Home, Car, Phone, Users } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { formatNaira } from "@/lib/currency";
import type { Resident } from "@shared/schema";

export default function AdminResidents() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    unitNumber: "",
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
    endDate: "",
  });
  const [selectedResident, setSelectedResident] = useState<(Resident & { user: { email: string; firstName: string; lastName: string } }) | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== "admin")) {
      toast({
        title: "Unauthorized",
        description: "Admin access required",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  const { data: residents = [] } = useQuery<(Resident & { user: { email: string; firstName: string; lastName: string } })[]>({
    queryKey: ["/api/admin/residents"],
    enabled: isAuthenticated && user?.role === "admin",
  });

  const createResidentMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      await apiRequest("POST", "/api/admin/residents", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/residents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Success",
        description: "Resident added successfully",
      });
      setOpen(false);
      setFormData({
        email: "",
        firstName: "",
        lastName: "",
        unitNumber: "",
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
        endDate: "",
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

  if (isLoading || !isAuthenticated || user?.role !== "admin") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const filteredResidents = residents.filter(r =>
    r.user?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.user?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.unitNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants = {
      active: { variant: "default" as const, icon: CheckCircle, className: "bg-green-500 hover:bg-green-600" },
      inactive: { variant: "secondary" as const, icon: Clock, className: "" },
      delinquent: { variant: "destructive" as const, icon: XCircle, className: "" },
    };
    const config = variants[status as keyof typeof variants] || variants.active;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createResidentMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Residents Management</h1>
          <p className="text-muted-foreground mt-1">Manage resident accounts and profiles</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/residents/list">
            <Button variant="outline" data-testid="button-view-directory">
              <Users className="h-4 w-4 mr-2" />
              View Residents Directory
            </Button>
          </Link>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-resident">
                <Plus className="h-4 w-4 mr-2" />
                Add Resident
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
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
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      data-testid="input-email"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        required
                        data-testid="input-first-name"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
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
                        value={formData.unitNumber}
                        onChange={(e) => setFormData({ ...formData, unitNumber: e.target.value })}
                        required
                        data-testid="input-unit-number"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <Input
                        id="phoneNumber"
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                        data-testid="input-phone"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="property" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="moveInDate">Move-In Date</Label>
                      <Input
                        id="moveInDate"
                        type="date"
                        value={formData.moveInDate}
                        onChange={(e) => setFormData({ ...formData, moveInDate: e.target.value })}
                        data-testid="input-move-in-date"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="occupancyType">Occupancy Type</Label>
                      <Select
                        value={formData.occupancyType}
                        onValueChange={(value: "owner" | "tenant") => setFormData({ ...formData, occupancyType: value })}
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
                        value={formData.numberOfOccupants}
                        onChange={(e) => setFormData({ ...formData, numberOfOccupants: e.target.value })}
                        data-testid="input-occupants"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="bedrooms">Bedrooms</Label>
                      <Input
                        id="bedrooms"
                        type="number"
                        min="0"
                        value={formData.bedrooms}
                        onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
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
                        value={formData.propertySize}
                        onChange={(e) => setFormData({ ...formData, propertySize: e.target.value })}
                        data-testid="input-property-size"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="parkingSpaces">Parking Spaces</Label>
                      <Input
                        id="parkingSpaces"
                        type="number"
                        min="0"
                        value={formData.parkingSpaces}
                        onChange={(e) => setFormData({ ...formData, parkingSpaces: e.target.value })}
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
                      value={formData.serviceCharge}
                      onChange={(e) => setFormData({ ...formData, serviceCharge: e.target.value })}
                      data-testid="input-service-charge"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => {
                          const startDate = e.target.value;
                          let endDate = "";
                          
                          if (startDate) {
                            const start = new Date(startDate);
                            const end = new Date(start);
                            end.setMonth(end.getMonth() + 12);
                            endDate = end.toISOString().split('T')[0];
                          }
                          
                          setFormData({ ...formData, startDate, endDate });
                        }}
                        data-testid="input-start-date"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="endDate">End Date (Auto-calculated)</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        data-testid="input-end-date"
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="emergency" className="space-y-4 mt-4">
                  <div className="grid gap-2">
                    <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
                    <Input
                      id="emergencyContactName"
                      value={formData.emergencyContactName}
                      onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                      data-testid="input-emergency-name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
                    <Input
                      id="emergencyContactPhone"
                      type="tel"
                      value={formData.emergencyContactPhone}
                      onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                      data-testid="input-emergency-phone"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="emergencyContactRelationship">Relationship</Label>
                    <Input
                      id="emergencyContactRelationship"
                      placeholder="e.g., Spouse, Parent, Sibling"
                      value={formData.emergencyContactRelationship}
                      onChange={(e) => setFormData({ ...formData, emergencyContactRelationship: e.target.value })}
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
                      value={formData.vehicles}
                      onChange={(e) => setFormData({ ...formData, vehicles: e.target.value })}
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
                      value={formData.specialNotes}
                      onChange={(e) => setFormData({ ...formData, specialNotes: e.target.value })}
                      rows={4}
                      data-testid="input-notes"
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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

      {/* Residents List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Residents ({filteredResidents.length})</CardTitle>
              <CardDescription>Manage resident accounts and status</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search residents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredResidents.map((resident) => (
              <div
                key={resident.id}
                className="flex items-center justify-between p-4 rounded-lg border hover-elevate"
                data-testid={`resident-${resident.id}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-medium">
                      {resident.user.firstName} {resident.user.lastName}
                    </h4>
                    {getStatusBadge(resident.accountStatus)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Unit {resident.unitNumber}</span>
                    <span>•</span>
                    <span>{resident.user.email}</span>
                    {resident.phoneNumber && (
                      <>
                        <span>•</span>
                        <span>{resident.phoneNumber}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right mr-4">
                    <p className="text-sm text-muted-foreground">Balance</p>
                    <p className="text-lg font-semibold">
                      {formatNaira(resident.totalBalance)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedResident(resident);
                      setDetailsOpen(true);
                    }}
                    data-testid={`button-view-details-${resident.id}`}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resident Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          {selectedResident && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selectedResident.user.firstName} {selectedResident.user.lastName}
                </DialogTitle>
                <DialogDescription>
                  Unit {selectedResident.unitNumber} • {selectedResident.accountStatus}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Basic Information */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium">{selectedResident.user.email}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Phone</p>
                      <p className="font-medium">{selectedResident.phoneNumber || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Account Status</p>
                      <div className="mt-1">{getStatusBadge(selectedResident.accountStatus)}</div>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Balance</p>
                      <p className="font-semibold">{formatNaira(selectedResident.totalBalance)}</p>
                    </div>
                  </div>
                </div>

                {/* Property Information */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Property Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Move-In Date</p>
                      <p className="font-medium">
                        {selectedResident.moveInDate 
                          ? new Date(selectedResident.moveInDate).toLocaleDateString()
                          : "Not provided"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Occupancy Type</p>
                      <p className="font-medium capitalize">{selectedResident.occupancyType || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Number of Occupants</p>
                      <p className="font-medium">{selectedResident.numberOfOccupants || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Bedrooms</p>
                      <p className="font-medium">{selectedResident.bedrooms || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Property Size</p>
                      <p className="font-medium">{selectedResident.propertySize || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Parking Spaces</p>
                      <p className="font-medium">{selectedResident.parkingSpaces || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                {(selectedResident.emergencyContactName || selectedResident.emergencyContactPhone) && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Emergency Contact
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Name</p>
                        <p className="font-medium">{selectedResident.emergencyContactName || "Not provided"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Phone</p>
                        <p className="font-medium">{selectedResident.emergencyContactPhone || "Not provided"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Relationship</p>
                        <p className="font-medium">{selectedResident.emergencyContactRelationship || "Not provided"}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Vehicles */}
                {selectedResident.vehicles && selectedResident.vehicles.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      Vehicles
                    </h3>
                    <div className="space-y-2">
                      {selectedResident.vehicles.map((vehicle, index) => (
                        <div key={index} className="p-3 rounded-lg bg-muted text-sm">
                          {vehicle}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Special Notes */}
                {selectedResident.specialNotes && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Special Notes</h3>
                    <div className="p-3 rounded-lg bg-muted text-sm whitespace-pre-wrap">
                      {selectedResident.specialNotes}
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="pt-4 border-t">
                  <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                    <div>
                      <p>Created</p>
                      <p>{new Date(selectedResident.createdAt!).toLocaleString()}</p>
                    </div>
                    <div>
                      <p>Last Updated</p>
                      <p>{new Date(selectedResident.updatedAt!).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
