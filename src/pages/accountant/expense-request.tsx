import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { insertExpenseSchema } from "@shared/schema";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, Camera, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";

const expenseFormSchema = insertExpenseSchema.extend({
  expenseAmount: z.string().min(1, "Expense amount is required").regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format"),
  serviceCharge: z.string().optional().refine((val) => {
    if (!val || val === "") return true;
    return /^\d+(\.\d{1,2})?$/.test(val);
  }, "Invalid service charge format"),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export default function ExpenseRequest() {
  const { toast } = useToast();
  const [location] = useLocation();
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const vendorIdFromUrl = urlParams.get('vendorId') || "";
  const [selectedExpenseType, setSelectedExpenseType] = useState<string>("");
  const [receiptPreview, setReceiptPreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      vendorId: vendorIdFromUrl,
      expenseType: "Retail Expense",
      expenseClassification: undefined,
      description: "",
      expenseAmount: "",
      serviceCharge: "",
      receiptPath: "",
      accountId: "",
      status: "pending",
      submittedBy: "",
    },
  });

  // Update vendorId when URL changes
  useEffect(() => {
    if (vendorIdFromUrl) {
      form.setValue("vendorId", vendorIdFromUrl);
    }
  }, [vendorIdFromUrl, form]);

  const { data: vendors = [], isLoading: loadingVendors } = useQuery<any[]>({
    queryKey: ['/api/accountant/vendors'],
  });

  const { data: accounts = [], isLoading: loadingAccounts } = useQuery<any[]>({
    queryKey: ['/api/accountant/accounts'],
  });

  const approvedVendors = vendors.filter(v => v.status === 'approved');
  const activeAccounts = accounts.filter((acc: any) => acc.isActive === true);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Create canvas
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Calculate new dimensions (max 800px width/height for faster processing)
          const MAX_SIZE = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to base64 with optimized compression (0.5 quality for faster processing)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);
          resolve(compressedBase64);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Only image files are allowed",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Processing",
        description: "Compressing image...",
      });
      
      const compressedBase64 = await compressImage(file);
      setReceiptPreview(compressedBase64);
      form.setValue("receiptPath", compressedBase64);
      
      toast({
        title: "Success",
        description: "Receipt uploaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process image",
        variant: "destructive",
      });
    }
  };

  const removeReceipt = () => {
    setReceiptPreview("");
    form.setValue("receiptPath", "");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const createExpenseMutation = useMutation({
    mutationFn: async (data: ExpenseFormValues) => {
      return await apiRequest('POST', '/api/expenses', data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Expense request submitted successfully",
      });
      form.reset();
      setSelectedExpenseType("");
      setReceiptPreview("");
      queryClient.invalidateQueries({ queryKey: ['/api/expenses/my-expenses'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit expense request",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ExpenseFormValues) => {
    // Remove vendorId if empty
    if (!data.vendorId) {
      delete data.vendorId;
    }
    // Remove accountId if empty
    if (!data.accountId) {
      delete data.accountId;
    }
    // Remove serviceCharge if not a Service Payment
    if (data.expenseType !== "Service Payment" || !data.serviceCharge) {
      delete data.serviceCharge;
    }
    // Remove receiptPath if empty
    if (!data.receiptPath) {
      delete data.receiptPath;
    }
    createExpenseMutation.mutate(data);
  };

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle data-testid="text-page-title">Submit Expense Request</CardTitle>
          <CardDescription>
            Create a new expense request for accountant approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="vendorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor (Optional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                      disabled={loadingVendors}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-vendor">
                          <SelectValue placeholder="Select a vendor (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {approvedVendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.name} (TIN: {vendor.tinNumber})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expenseType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expense Type</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedExpenseType(value);
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-expense-type">
                          <SelectValue placeholder="Select expense type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Retail Expense">Retail Expense</SelectItem>
                        <SelectItem value="Service Payment">Service Payment</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expenseClassification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expense Classification (Optional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-expense-classification">
                          <SelectValue placeholder="Select expense category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Security & Guards">Security & Guards</SelectItem>
                        <SelectItem value="Cleaning & Janitorial">Cleaning & Janitorial</SelectItem>
                        <SelectItem value="Waste Management">Waste Management</SelectItem>
                        <SelectItem value="Diesel / Generator">Diesel / Generator</SelectItem>
                        <SelectItem value="Electrical Repairs">Electrical Repairs</SelectItem>
                        <SelectItem value="Plumbing Repairs">Plumbing Repairs</SelectItem>
                        <SelectItem value="Landscaping">Landscaping</SelectItem>
                        <SelectItem value="General Maintenance">General Maintenance</SelectItem>
                        <SelectItem value="Office/Admin Expenses">Office/Admin Expenses</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link to Account (Optional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                      disabled={loadingAccounts}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-link-account">
                          <SelectValue placeholder="Select an account from chart of accounts" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeAccounts.map((account: any) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.accountNumber} - {account.accountName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Link this expense to a specific account for budget tracking
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Describe the expense..."
                        rows={4}
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expenseAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expense Amount (₦)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        placeholder="0.00"
                        data-testid="input-expense-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {(selectedExpenseType === "Service Payment" || form.watch("expenseType") === "Service Payment") && (
                <FormField
                  control={form.control}
                  name="serviceCharge"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Charge (₦)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="text"
                          placeholder="0.00"
                          data-testid="input-service-charge"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="receiptPath"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Upload Receipt (Optional)</FormLabel>
                    <FormDescription>
                      Upload a photo of your receipt (max 5MB)
                    </FormDescription>
                    <div className="space-y-4">
                      {!receiptPreview ? (
                        <div className="flex gap-2">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                            data-testid="input-file-upload"
                          />
                          <input
                            ref={cameraInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleFileUpload}
                            className="hidden"
                            data-testid="input-camera-capture"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1"
                            data-testid="button-choose-file"
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Choose File
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => cameraInputRef.current?.click()}
                            className="flex-1"
                            data-testid="button-take-photo"
                          >
                            <Camera className="mr-2 h-4 w-4" />
                            Take Photo
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="relative border rounded-md p-2 bg-muted">
                            <img
                              src={receiptPreview}
                              alt="Receipt preview"
                              className="max-h-64 mx-auto rounded"
                              data-testid="img-receipt-preview"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2"
                              onClick={removeReceipt}
                              data-testid="button-remove-receipt"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={createExpenseMutation.isPending}
                  data-testid="button-submit"
                  className="flex-1"
                >
                  {createExpenseMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Submit Expense Request
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset();
                    setSelectedExpenseType("");
                  }}
                  data-testid="button-reset"
                >
                  Reset
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
