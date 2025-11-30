import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, FileText, LayoutList } from "lucide-react";
import { Link } from "wouter";

export default function AccountantDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Accounting Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage the estate's financial records and accounting system
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Link href="/accountant/accounts">
          <Card className="hover-elevate cursor-pointer" data-testid="card-chart-of-accounts">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <CardTitle>Chart of Accounts</CardTitle>
              </div>
              <CardDescription>
                Manage the estate's chart of accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">View Accounts</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/accountant/templates">
          <Card className="hover-elevate cursor-pointer" data-testid="card-transaction-templates">
            <CardHeader>
              <div className="flex items-center gap-2">
                <LayoutList className="w-5 h-5 text-primary" />
                <CardTitle>Transaction Templates</CardTitle>
              </div>
              <CardDescription>
                Configure debit-credit pairs for transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">Manage Templates</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/accountant/entries">
          <Card className="hover-elevate cursor-pointer" data-testid="card-journal-entries">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <CardTitle>Journal Entries</CardTitle>
              </div>
              <CardDescription>
                Record and view journal entries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">View Entries</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
