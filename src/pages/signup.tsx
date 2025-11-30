import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

export default function Signup() {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    unitNumber: "",
    phoneNumber: "",
    serviceCharge: "",
  });

  const signupMutation = useMutation({
    mutationFn: async (data: { unitNumber: string; phoneNumber?: string; serviceCharge?: string }) => {
      await apiRequest("POST", "/api/signup/complete", data);
    },
    onSuccess: () => {
      // Invalidate profile query so App.tsx can detect the new profile
      queryClient.invalidateQueries({ queryKey: ["/api/resident/profile"] });
      
      toast({
        title: "Success",
        description: "Your resident account has been set up successfully",
      });
      // Redirect to resident dashboard
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete signup",
        variant: "destructive",
      });
    },
  });

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.unitNumber.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter your unit number",
        variant: "destructive",
      });
      return;
    }

    signupMutation.mutate({
      unitNumber: formData.unitNumber,
      phoneNumber: formData.phoneNumber,
      serviceCharge: formData.serviceCharge,
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to Estate Management</CardTitle>
          <CardDescription>
            Hi {user?.firstName}! Please complete your resident profile to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Resident Information */}
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="unitNumber">
                  Unit Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="unitNumber"
                  placeholder="e.g., A-101, Unit No 2, B-205"
                  value={formData.unitNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, unitNumber: e.target.value })
                  }
                  data-testid="input-unit-number"
                  required
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Enter your assigned unit number in the estate
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="e.g., +234 801 234 5678"
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, phoneNumber: e.target.value })
                  }
                  data-testid="input-phone-number"
                />
                <p className="text-xs text-muted-foreground">
                  Optional: For notifications and contact purposes
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="serviceCharge">Monthly Service Charge (₦)</Label>
                <Input
                  id="serviceCharge"
                  type="number"
                  placeholder="e.g., 50000"
                  value={formData.serviceCharge}
                  onChange={(e) =>
                    setFormData({ ...formData, serviceCharge: e.target.value })
                  }
                  data-testid="input-service-charge"
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-muted-foreground">
                  Optional: Your monthly estate maintenance fee. Can be updated by admin later.
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={signupMutation.isPending}
              data-testid="button-complete-signup"
            >
              {signupMutation.isPending ? "Setting up..." : "Complete Setup"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
