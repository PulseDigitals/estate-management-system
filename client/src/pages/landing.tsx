import { Building2, Shield, Receipt, QrCode, CheckCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import estateImage from "@assets/Real-Estate-2_1763014188361.jpg";
import { API_BASE, withApiBase } from "@/lib/apiBase";

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-6 md:px-12">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Building2 className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-semibold text-gray-900">Magodo Estate Management System</span>
            </div>
            <Button asChild data-testid="button-login" className="min-h-9">
              <a href={withApiBase("/login")}>Sign In</a>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section - Split Layout */}
      <div className="container mx-auto px-6 md:px-12">
        <div className="grid lg:grid-cols-5 gap-12 lg:gap-16 items-center py-12 lg:py-20 min-h-[calc(100vh-4rem)]">
          {/* Left Side - Content (40%) */}
          <div className="space-y-8 lg:col-span-2">
            {/* Badge */}
            <Badge className="bg-green-500 hover:bg-green-600 text-white">
              <Shield className="h-3 w-3 mr-1" />
              Secure & Compliant
            </Badge>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Comprehensive{" "}
              <span className="text-green-600">Estate Management</span>{" "}
              Platform
            </h1>

            {/* Description */}
            <p className="text-lg text-gray-600 leading-relaxed max-w-xl">
              Streamline resident billing, visitor access control, and security operations for your gated estate. 
              Automated compliance, real-time notifications, and comprehensive reporting—all in one platform.
            </p>
            
            {/* Signup Info */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-xl">
              <p className="text-sm text-gray-700">
                <span className="font-semibold text-green-700">New residents:</span> Click "Get Started" to create your account. 
                You'll be guided through a quick signup to access your unit's billing, visitor management, and more.
              </p>
            </div>

            {/* Role Selection Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <Card className="hover-elevate border-2 border-primary/20 bg-white cursor-pointer transition-all hover:border-primary" data-testid="card-signin-admin">
                <CardHeader className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-3">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg mb-2">Sign in as Admin</CardTitle>
                  <CardDescription className="text-sm mb-4">
                    Access administrative dashboard, resident management, billing controls, and system settings.
                  </CardDescription>
                  <Button 
                    size="lg" 
                    className="w-full min-h-11" 
                    asChild 
                    data-testid="button-signin-admin"
                  >
                    <a href={withApiBase("/login?role=admin")}>
                      <Shield className="h-4 w-4 mr-2" />
                      Admin Login
                    </a>
                  </Button>
                </CardHeader>
              </Card>

              <Card className="hover-elevate border-2 border-green-500/20 bg-white cursor-pointer transition-all hover:border-green-500" data-testid="card-signin-resident">
                <CardHeader className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10 mb-3">
                    <Building2 className="h-6 w-6 text-green-600" />
                  </div>
                  <CardTitle className="text-lg mb-2">Sign in as Resident</CardTitle>
                  <CardDescription className="text-sm mb-4">
                    Access your bills, make payments, manage visitors, and view announcements.
                  </CardDescription>
                  <Button 
                    size="lg" 
                    variant="secondary"
                    className="w-full min-h-11 bg-green-600 hover:bg-green-700 text-white" 
                    asChild 
                    data-testid="button-signin-resident"
                  >
                    <a href={withApiBase("/login?role=resident")}>
                      <Building2 className="h-4 w-4 mr-2" />
                      Resident Login
                    </a>
                  </Button>
                </CardHeader>
              </Card>
            </div>
            
            {/* Additional Info */}
            <p className="text-sm text-gray-500 max-w-2xl">
              Security personnel can also access the system through the Admin login.
            </p>

            {/* Quick Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <Card className="border-2 border-yellow-500 shadow-md bg-gray-100">
                <CardHeader className="p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 mb-2">
                    <Receipt className="h-5 w-5 text-green-600" />
                  </div>
                  <CardTitle className="text-base">Automated Billing</CardTitle>
                </CardHeader>
              </Card>

              <Card className="border-2 border-yellow-500 shadow-md bg-gray-100">
                <CardHeader className="p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 mb-2">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                  </div>
                  <CardTitle className="text-base">Residents Forums and Communities</CardTitle>
                </CardHeader>
              </Card>

              <Card className="border-2 border-yellow-500 shadow-md bg-gray-100">
                <CardHeader className="p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 mb-2">
                    <Shield className="h-5 w-5 text-purple-600" />
                  </div>
                  <CardTitle className="text-base">Integrated Security Management</CardTitle>
                </CardHeader>
              </Card>
            </div>
          </div>

          {/* Right Side - Image (60%) */}
          <div className="relative lg:col-span-3">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img
                src={estateImage}
                alt="Modern gated residential estate"
                className="w-full h-auto object-cover min-h-[500px]"
                data-testid="img-estate-hero"
              />
              
              {/* Image Badge */}
              <div className="absolute bottom-6 left-6 bg-white rounded-lg shadow-lg p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Smart Access Control</p>
                  <p className="text-sm text-gray-600">QR Code Verification</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Features Section */}
      <div className="bg-gray-50 py-16 lg:py-20">
        <div className="container mx-auto px-6 md:px-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Manage Your Estate
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Powerful features designed for residents, administrators, and security personnel
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            <Card className="border-0 shadow-lg hover-elevate bg-white">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 mb-4">
                  <Receipt className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle className="text-xl">Automated Billing</CardTitle>
                <CardDescription className="text-base">
                  Real-time VAT and levy calculations that automatically adjust to regulations. 
                  Zero manual work required.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover-elevate bg-white">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 mb-4">
                  <QrCode className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-xl">QR Code Access</CardTitle>
                <CardDescription className="text-base">
                  Generate and verify visitor passes instantly. Pre-filled forms, automatic validation, 
                  instant confirmation.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover-elevate bg-white">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 mb-4">
                  <Shield className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle className="text-xl">Security Protection</CardTitle>
                <CardDescription className="text-base">
                  Automatic compliance monitoring alerts you before issues arise. Built-in audit trails 
                  and full documentation.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>

      {/* Additional Features */}
      <div className="container mx-auto px-6 md:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover-elevate">
            <CardHeader>
              <CheckCircle className="h-10 w-10 text-green-600 mb-3" />
              <CardTitle>Real-time Notifications</CardTitle>
              <CardDescription>
                Instant alerts for bills, payments, announcements, and visitor arrivals across multiple channels.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <TrendingUp className="h-10 w-10 text-blue-600 mb-3" />
              <CardTitle>Detailed Analytics</CardTitle>
              <CardDescription>
                Comprehensive reports on collections, delinquency rates, visitor traffic, and estate operations.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <Building2 className="h-10 w-10 text-purple-600 mb-3" />
              <CardTitle>Multi-Role System</CardTitle>
              <CardDescription>
                Tailored dashboards and permissions for residents, estate administrators, and security personnel.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-50 border-t">
        <div className="container mx-auto px-6 md:px-12 py-16">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Ready to Transform Your Estate Management?
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Join modern residential estates using our platform to streamline operations and improve resident satisfaction.
            </p>
            <Button size="lg" className="min-h-12 px-8" asChild>
              <a href={withApiBase("/login")}>Get Started Today</a>
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-white">
        <div className="container mx-auto px-6 md:px-12 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Building2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-medium text-gray-900">Magodo Estate Management System</span>
            </div>
            <p className="text-sm text-gray-600">
              © 2024 Magodo Estate Management System. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
