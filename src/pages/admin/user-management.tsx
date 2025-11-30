import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { UserPlus, Copy, CheckCircle2, XCircle, Clock, LogIn, AlertCircle, Edit, UserX, UserCheck } from "lucide-react";
import { format } from "date-fns";

interface UserInvite {
  id: string;
  inviteToken: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  unitNumber?: string;
  status: "pending" | "accepted" | "expired";
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
}

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export default function UserManagement() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [showInstructionsDialog, setShowInstructionsDialog] = useState(false);
  const [inviteInstructions, setInviteInstructions] = useState<{
    email: string;
    role: string;
    inviteLink: string;
  } | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Invite form state
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [unitNumber, setUnitNumber] = useState("");

  // Edit user form state
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editRole, setEditRole] = useState<string>("");

  const { data: invites = [], isLoading } = useQuery({
    queryKey: ['/api/admin/user-invites'],
    select: (data) => data as UserInvite[],
  });

  const createInviteMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/admin/user-invites', data);
      return await response.json();
    },
    onSuccess: (response: { success: boolean; invite: UserInvite; inviteLink: string }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/user-invites'] });
      
      // Show instructions dialog
      setInviteInstructions({
        email: email,
        role: role,
        inviteLink: response.inviteLink,
      });
      setShowInstructionsDialog(true);
      
      // Reset form
      setEmail("");
      setRole("");
      setFirstName("");
      setLastName("");
      setUnitNumber("");
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create invite",
      });
    },
  });

  const deleteInviteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/admin/user-invites/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/user-invites'] });
      toast({
        title: "Invite Expired",
        description: "The invite has been expired successfully.",
      });
    },
  });

  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['/api/admin/users'],
    select: (data) => data as User[],
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data: { id: string; firstName?: string; lastName?: string; role?: string }) => {
      const { id, ...updateData } = data;
      const response = await apiRequest('PATCH', `/api/admin/users/${id}`, updateData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "User Updated",
        description: "User has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update user",
      });
    },
  });

  const toggleUserActiveMutation = useMutation({
    mutationFn: async (data: { id: string; isActive: boolean }) => {
      const response = await apiRequest('PATCH', `/api/admin/users/${data.id}/deactivate`, { isActive: data.isActive });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "User Status Updated",
        description: "User status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update user status",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !role) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Email and role are required.",
      });
      return;
    }

    if (role === 'resident' && !unitNumber) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Unit number is required for resident invites.",
      });
      return;
    }

    createInviteMutation.mutate({
      email,
      role,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      unitNumber: role === 'resident' ? unitNumber : undefined,
    });
  };

  const copyInviteLink = (invite: UserInvite) => {
    const inviteLink = `${window.location.origin}/invite/${invite.inviteToken}`;
    navigator.clipboard.writeText(inviteLink);
    setCopiedToken(invite.inviteToken);
    
    toast({
      title: "Copied",
      description: "Invite link copied to clipboard",
    });

    setTimeout(() => setCopiedToken(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "accepted":
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Accepted</Badge>;
      case "expired":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Expired</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditFirstName(user.firstName || "");
    setEditLastName(user.lastName || "");
    setEditRole(user.role);
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    updateUserMutation.mutate({
      id: selectedUser.id,
      firstName: editFirstName || undefined,
      lastName: editLastName || undefined,
      role: editRole as any,
    });
  };

  const handleToggleUserActive = (user: User) => {
    toggleUserActiveMutation.mutate({
      id: user.id,
      isActive: !user.isActive,
    });
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'resident':
        return 'Resident';
      case 'security':
        return 'Security Personnel';
      case 'accountant':
        return 'Accountant';
      default:
        return role;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-user-management">User Management</h1>
          <p className="text-muted-foreground">Create and manage user invites</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-invite">
              <UserPlus className="w-4 h-4 mr-2" />
              Create Invite
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create User Invite</DialogTitle>
              <DialogDescription>
                Generate an invite link for a new user. They'll receive the specified role after signing in.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select value={role} onValueChange={setRole} required>
                  <SelectTrigger data-testid="select-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resident">Resident</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="accountant">Accountant</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    data-testid="input-first-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    data-testid="input-last-name"
                  />
                </div>
              </div>

              {role === 'resident' && (
                <div className="space-y-2">
                  <Label htmlFor="unitNumber">Unit Number *</Label>
                  <Input
                    id="unitNumber"
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                    placeholder="A-101"
                    required
                    data-testid="input-unit-number"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createInviteMutation.isPending}
                  data-testid="button-submit-invite"
                >
                  {createInviteMutation.isPending ? "Creating..." : "Create Invite"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Sign-in Instructions Dialog */}
        <Dialog open={showInstructionsDialog} onOpenChange={setShowInstructionsDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Invite Created Successfully
              </DialogTitle>
              <DialogDescription>
                Share these instructions with the invited user
              </DialogDescription>
            </DialogHeader>

            {inviteInstructions && (
              <div className="space-y-4">
                <Alert>
                  <LogIn className="h-4 w-4" />
                  <AlertTitle>Important: Replit Auth Sign-In Required</AlertTitle>
                  <AlertDescription>
                    This system uses Replit Auth (OAuth), NOT traditional username/password login.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3 p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold">Sign-In Instructions for {inviteInstructions.email}</h3>
                  
                  <div className="space-y-2 text-sm">
                    <p><strong>Step 1:</strong> Click the invite link below</p>
                    <div className="p-3 bg-background rounded border break-all">
                      <code className="text-xs">{inviteInstructions.inviteLink}</code>
                    </div>

                    <p><strong>Step 2:</strong> On the invite page, click "Continue to Replit Sign-In"</p>
                    
                    <p><strong>Step 3:</strong> You'll be redirected to Replit's secure login page</p>
                    
                    <p><strong>Step 4:</strong> Sign in using ONE of these methods:</p>
                    <ul className="list-disc list-inside pl-4 space-y-1">
                      <li>Click "Continue with Google" if your email is a Google account</li>
                      <li>Click "Continue with GitHub" if you have a GitHub account</li>
                      <li>Or use the "Email" option to receive a magic link</li>
                    </ul>

                    <Alert className="mt-3">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Critical: Email Must Match</AlertTitle>
                      <AlertDescription>
                        You MUST sign in with an account that uses the email: <strong>{inviteInstructions.email}</strong>
                        <br />
                        If you don't have a Replit account with this email, create one first at replit.com
                      </AlertDescription>
                    </Alert>

                    <p className="pt-2"><strong>Step 5:</strong> After signing in, you'll be automatically assigned the <Badge variant="outline">{inviteInstructions.role}</Badge> role and redirected to your dashboard</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      const instructions = `
Invitation to Magodo Estate Management System

Role: ${inviteInstructions.role.toUpperCase()}
Email: ${inviteInstructions.email}

SIGN-IN INSTRUCTIONS:

This system uses Replit Auth (OAuth) - NOT username/password login.

1. Click this invite link:
${inviteInstructions.inviteLink}

2. On the invite page, click "Continue to Replit Sign-In"

3. You'll be redirected to Replit's login page

4. Sign in using ONE of these methods:
   • Continue with Google (if ${inviteInstructions.email} is a Google account)
   • Continue with GitHub (if you have a GitHub account)
   • Email (to receive a magic link)

IMPORTANT: You MUST sign in with an account that uses ${inviteInstructions.email}

If you don't have a Replit account with this email, create one at replit.com first.

5. After signing in, you'll automatically receive ${inviteInstructions.role} access

Questions? Contact your administrator.
                      `.trim();
                      
                      navigator.clipboard.writeText(instructions);
                      toast({
                        title: "Instructions Copied",
                        description: "Full sign-in instructions copied to clipboard",
                      });
                    }}
                    className="flex-1"
                    data-testid="button-copy-instructions"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy All Instructions
                  </Button>
                  
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(inviteInstructions.inviteLink);
                      toast({
                        title: "Link Copied",
                        description: "Invite link copied to clipboard",
                      });
                    }}
                    variant="outline"
                    data-testid="button-copy-link-only"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link Only
                  </Button>

                  <Button
                    onClick={() => setShowInstructionsDialog(false)}
                    variant="outline"
                    data-testid="button-close-instructions"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="invites" className="w-full">
        <TabsList>
          <TabsTrigger value="invites" data-testid="tab-invites">User Invites</TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">All Users</TabsTrigger>
        </TabsList>

        <TabsContent value="invites">
          <Card>
            <CardHeader>
              <CardTitle>User Invites</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading invites...</div>
              ) : invites.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No invites created yet. Click "Create Invite" to get started.
                </div>
              ) : (
                <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite) => (
                  <TableRow key={invite.id} data-testid={`row-invite-${invite.id}`}>
                    <TableCell className="font-medium">{invite.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{invite.role}</Badge>
                    </TableCell>
                    <TableCell>
                      {invite.firstName || invite.lastName
                        ? `${invite.firstName || ""} ${invite.lastName || ""}`.trim()
                        : "-"}
                    </TableCell>
                    <TableCell>{invite.unitNumber || "-"}</TableCell>
                    <TableCell>{getStatusBadge(invite.status)}</TableCell>
                    <TableCell className="text-sm">
                      {invite.status === "accepted" && invite.acceptedAt
                        ? `Accepted ${format(new Date(invite.acceptedAt), "MMM d, yyyy")}`
                        : format(new Date(invite.expiresAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {invite.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyInviteLink(invite)}
                              data-testid={`button-copy-${invite.id}`}
                            >
                              {copiedToken === invite.inviteToken ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteInviteMutation.mutate(invite.id)}
                              data-testid={`button-expire-${invite.id}`}
                            >
                              Expire
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <div className="text-center py-8 text-muted-foreground">Loading users...</div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No users found.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                        <TableCell className="font-medium">{user.email || "-"}</TableCell>
                        <TableCell>
                          {user.firstName || user.lastName
                            ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getRoleName(user.role)}</Badge>
                        </TableCell>
                        <TableCell>
                          {user.isActive ? (
                            <Badge className="bg-green-500">
                              <UserCheck className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <UserX className="w-3 h-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {user.createdAt ? format(new Date(user.createdAt), "MMM d, yyyy") : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditUser(user)}
                              data-testid={`button-edit-${user.id}`}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant={user.isActive ? "destructive" : "default"}
                              onClick={() => handleToggleUserActive(user)}
                              disabled={toggleUserActiveMutation.isPending}
                              data-testid={`button-toggle-active-${user.id}`}
                            >
                              {user.isActive ? (
                                <>
                                  <UserX className="w-4 h-4 mr-1" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-4 h-4 mr-1" />
                                  Activate
                                </>
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and role
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editEmail">Email</Label>
              <Input
                id="editEmail"
                type="email"
                value={selectedUser?.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editFirstName">First Name</Label>
                <Input
                  id="editFirstName"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  placeholder="John"
                  data-testid="input-edit-first-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editLastName">Last Name</Label>
                <Input
                  id="editLastName"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  placeholder="Doe"
                  data-testid="input-edit-last-name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editRole">Role</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger data-testid="select-edit-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resident">Resident</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="accountant">Accountant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateUserMutation.isPending}
                data-testid="button-submit-edit"
              >
                {updateUserMutation.isPending ? "Updating..." : "Update User"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
