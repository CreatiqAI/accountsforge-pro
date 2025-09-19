import { useState, useEffect } from 'react';
import { Plus, FileText, Clock, CheckCircle, XCircle, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';

interface EmployeeData {
  totalExpenses: number;
  pendingClaims: number;
  approvedClaims: number;
  rejectedClaims: number;
  monthlyExpenses: number;
  recentExpenses: any[];
  recentClaims: any[];
}

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState<EmployeeData>({
    totalExpenses: 0,
    pendingClaims: 0,
    approvedClaims: 0,
    rejectedClaims: 0,
    monthlyExpenses: 0,
    recentExpenses: [],
    recentClaims: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchEmployeeData();
    }
  }, [user]);

  const fetchEmployeeData = async () => {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Fetch expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user?.id)
        .order('expense_date', { ascending: false });

      // Fetch claims
      const { data: claims } = await supabase
        .from('claims')
        .select('*')
        .eq('user_id', user?.id)
        .order('submitted_date', { ascending: false });

      if (expenses && claims) {
        const totalExpenses = expenses
          .filter(e => e.status === 'approved')
          .reduce((sum, e) => sum + Number(e.amount), 0);

        const monthlyExpenses = expenses
          .filter(e => e.status === 'approved' && new Date(e.expense_date) >= monthStart)
          .reduce((sum, e) => sum + Number(e.amount), 0);

        const pendingClaims = claims.filter(c => c.status === 'pending').length;
        const approvedClaims = claims.filter(c => c.status === 'approved').length;
        const rejectedClaims = claims.filter(c => c.status === 'rejected').length;

        setData({
          totalExpenses,
          pendingClaims,
          approvedClaims,
          rejectedClaims,
          monthlyExpenses,
          recentExpenses: expenses.slice(0, 5),
          recentClaims: claims.slice(0, 5)
        });
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="space-y-4">
            <div className="h-10 bg-muted/50 rounded-lg w-1/3 animate-pulse"></div>
            <div className="h-6 bg-muted/30 rounded w-1/2 animate-pulse"></div>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="bg-background/60 backdrop-blur-sm border-border/50 animate-pulse">
                <CardHeader className="space-y-0 pb-3">
                  <div className="h-4 bg-muted/50 rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted/50 rounded w-1/2"></div>
                  <div className="h-3 bg-muted/30 rounded w-2/3 mt-2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Employee Dashboard
            </h1>
            <p className="text-lg text-muted-foreground">Manage your expenses and claims</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="bg-background/80 backdrop-blur-sm border-border/50 hover:bg-accent" asChild>
              <a href="/expenses">
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </a>
            </Button>
            <Button className="bg-primary hover:bg-primary/90 shadow-lg" asChild>
              <a href="/claims">
                <FileText className="h-4 w-4 mr-2" />
                Submit Claim
              </a>
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-background/60 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{formatCurrency(data.totalExpenses)}</div>
              <p className="text-sm text-muted-foreground mt-1">
                {formatCurrency(data.monthlyExpenses)} this month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-background/60 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Claims</CardTitle>
              <div className="p-2 bg-warning/10 rounded-lg">
                <Clock className="h-5 w-5 text-warning" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">{data.pendingClaims}</div>
              <p className="text-sm text-muted-foreground mt-1">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card className="bg-background/60 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved Claims</CardTitle>
              <div className="p-2 bg-success/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{data.approvedClaims}</div>
              <p className="text-sm text-muted-foreground mt-1">Successfully processed</p>
            </CardContent>
          </Card>

          <Card className="bg-background/60 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Rejected Claims</CardTitle>
              <div className="p-2 bg-destructive/10 rounded-lg">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{data.rejectedClaims}</div>
              <p className="text-sm text-muted-foreground mt-1">Need attention</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-background/60 backdrop-blur-sm border-border/50 shadow-lg">
            <CardHeader className="border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Recent Expenses</CardTitle>
                  <CardDescription>Your latest expense submissions</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {data.recentExpenses.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="p-4 bg-muted/50 rounded-full w-fit mx-auto mb-4">
                      <DollarSign className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground mb-4">No expenses recorded yet</p>
                    <Button variant="outline" size="sm" className="shadow-sm" asChild>
                      <a href="/expenses">Add Your First Expense</a>
                    </Button>
                  </div>
                ) : (
                  data.recentExpenses.map((expense, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">{expense.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(expense.expense_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="font-bold text-lg">{formatCurrency(expense.amount)}</p>
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                          expense.status === 'approved' ? 'bg-success/20 text-success border border-success/30' :
                          expense.status === 'rejected' ? 'bg-destructive/20 text-destructive border border-destructive/30' :
                          'bg-warning/20 text-warning border border-warning/30'
                        }`}>
                          {expense.status}
                        </span>
                      </div>
                    </div>
                  ))
              )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background/60 backdrop-blur-sm border-border/50 shadow-lg">
            <CardHeader className="border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <FileText className="h-5 w-5 text-success" />
                </div>
                <div>
                  <CardTitle className="text-lg">Recent Claims</CardTitle>
                  <CardDescription>Your latest claim requests</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {data.recentClaims.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="p-4 bg-muted/50 rounded-full w-fit mx-auto mb-4">
                      <FileText className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground mb-4">No claims submitted yet</p>
                    <Button variant="outline" size="sm" className="shadow-sm" asChild>
                      <a href="/claims">Submit Your First Claim</a>
                    </Button>
                  </div>
                ) : (
                  data.recentClaims.map((claim, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">{claim.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(claim.submitted_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="font-bold text-lg">{formatCurrency(claim.amount)}</p>
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                          claim.status === 'approved' ? 'bg-success/20 text-success border border-success/30' :
                          claim.status === 'rejected' ? 'bg-destructive/20 text-destructive border border-destructive/30' :
                          claim.status === 'paid' ? 'bg-primary/20 text-primary border border-primary/30' :
                          'bg-warning/20 text-warning border border-warning/30'
                        }`}>
                          {claim.status}
                        </span>
                      </div>
                    </div>
                  ))
              )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;