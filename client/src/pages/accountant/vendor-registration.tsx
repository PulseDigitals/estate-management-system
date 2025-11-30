import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertVendorSchema } from "@shared/schema";

const formSchema = insertVendorSchema.extend({
  status: z.string().default("pending").optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function VendorRegistration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
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
      status: "pending",
    },
  });

  const createVendorMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      // Sanitize optional fields - convert empty strings to undefined
      const sanitizedData = {
        ...data,
        email: data.email?.trim() || undefined,
        phoneNumber: data.phoneNumber?.trim() || undefined,
        address: data.address?.trim() || undefined,
        contactPerson: data.contactPerson?.trim() || undefined,
        bankName: data.bankName?.trim() || undefined,
        bankAccountNumber: data.bankAccountNumber?.trim() || undefined,
        bankAccountName: data.bankAccountName?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
      };
      return await apiRequest("POST", "/api/accountant/vendors", sanitizedData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Vendor registered successfully. Awaiting approval.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/accountant/vendors"] });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to register vendor",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    createVendorMutation.mutate(data);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle data-testid="text-title">Vendor Registration</CardTitle>
          <CardDescription>
            Register a new vendor for the estate. All vendor registrations require approval.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="ABC Company Ltd" 
                          data-testid="input-vendor-name"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tinNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>TIN Number *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="12345678-0001" 
                          data-testid="input-tin-number"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="vendor@example.com" 
                          data-testid="input-email"
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="+234 xxx xxx xxxx" 
                          data-testid="input-phone"
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="John Doe" 
                          data-testid="input-contact-person"
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="123 Business Street, Lagos, Nigeria" 
                        data-testid="input-address"
                        {...field} 
                        value={field.value || ""}
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Banking Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="bankName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="First Bank" 
                            data-testid="input-bank-name"
                            {...field} 
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bankAccountNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Number</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="0123456789" 
                            data-testid="input-account-number"
                            {...field} 
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bankAccountName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="ABC Company Ltd" 
                            data-testid="input-account-name"
                            {...field} 
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Additional information about the vendor..." 
                        data-testid="input-notes"
                        {...field} 
                        value={field.value || ""}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => form.reset()}
                  data-testid="button-reset"
                >
                  Reset
                </Button>
                <Button 
                  type="submit" 
                  disabled={createVendorMutation.isPending}
                  data-testid="button-submit"
                >
                  {createVendorMutation.isPending ? "Registering..." : "Register Vendor"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
