import { useState, useEffect } from 'react';
import { Plus, TrendingUp, FileText, DollarSign, Calculator, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';

interface SalesmanData {
  totalSales: number;
  totalCommissions: number;
  totalExpenses: number;
  pendingSales: number;
  approvedSales: number;
  pendingClaims: number;
  monthlySales: number;
  monthlyCommissions: number;
  recentSales: any[];
  recentExpenses: any[];
  recentClaims: any[];
}

const SalesmanDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState<SalesmanData>({
    totalSales: 0,
    totalCommissions: 0,
    totalExpenses: 0,
    pendingSales: 0,
    approvedSales: 0,
    pendingClaims: 0,
    monthlySales: 0,
    monthlyCommissions: 0,
    recentSales: [],
    recentExpenses: [],
    recentClaims: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSalesmanData();
    }
  }, [user]);

  const fetchSalesmanData = async () => {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Fetch sales (revenues)
      const { data: sales } = await supabase
        .from('revenues')
        .select('*')
        .eq('user_id', user?.id)
        .order('revenue_date', { ascending: false });

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

      // Fetch commissions from salesman_performance
      const { data: commissions } = await supabase
        .from('salesman_performance')
        .select('*')
        .eq('user_id', user?.id);

      if (sales && expenses && claims && commissions) {
        const totalSales = sales
          .filter(s => s.status === 'approved')
          .reduce((sum, s) => sum + Number(s.amount), 0);

        const totalCommissions = commissions
          .reduce((sum, c) => sum + Number(c.commission_earned || 0), 0);

        const totalExpenses = expenses
          .filter(e => e.status === 'approved')
          .reduce((sum, e) => sum + Number(e.amount), 0);

        const monthlySales = sales
          .filter(s => s.status === 'approved' && new Date(s.revenue_date) >= monthStart)
          .reduce((sum, s) => sum + Number(s.amount), 0);

        const monthlyCommissions = commissions
          .filter(c => new Date(c.created_at) >= monthStart)
          .reduce((sum, c) => sum + Number(c.commission_earned || 0), 0);

        const pendingSales = sales.filter(s => s.status === 'pending').length;
        const approvedSales = sales.filter(s => s.status === 'approved').length;
        const pendingClaims = claims.filter(c => c.status === 'pending').length;

        setData({
          totalSales,
          totalCommissions,
          totalExpenses,
          pendingSales,
          approvedSales,
          pendingClaims,
          monthlySales,
          monthlyCommissions,
          recentSales: sales.slice(0, 5),
          recentExpenses: expenses.slice(0, 3),
          recentClaims: claims.slice(0, 3)
        });
      }
    } catch (error) {
      console.error('Error fetching salesman data:', error);
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {[...Array(6)].map((_, i) => (
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
              Salesman Dashboard
            </h1>
            <p className="text-lg text-muted-foreground">Track your sales, commissions, and expenses</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="bg-background/80 backdrop-blur-sm border-border/50 hover:bg-accent" asChild>
              <a href="/expenses">
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </a>
            </Button>
            <Button className="bg-primary hover:bg-primary/90 shadow-lg" asChild>
              <a href="/revenue">
                <TrendingUp className="h-4 w-4 mr-2" />
                Record Sale
              </a>
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          <Card className="bg-background/60 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
              <div className="p-2 bg-success/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{formatCurrency(data.totalSales)}</div>
              <p className="text-sm text-muted-foreground mt-1">
                {formatCurrency(data.monthlySales)} this month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-background/60 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Commissions</CardTitle>
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calculator className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{formatCurrency(data.totalCommissions)}</div>
              <p className="text-sm text-muted-foreground mt-1">
                {formatCurrency(data.monthlyCommissions)} this month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-background/60 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
              <div className="p-2 bg-destructive/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-destructive" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{formatCurrency(data.totalExpenses)}</div>
              <p className="text-sm text-muted-foreground mt-1">Approved expenses</p>
            </CardContent>
          </Card>

          <Card className="bg-background/60 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Sales</CardTitle>
              <div className="p-2 bg-warning/10 rounded-lg">
                <Users className="h-5 w-5 text-warning" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">{data.pendingSales}</div>
              <p className="text-sm text-muted-foreground mt-1">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card className="bg-background/60 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved Sales</CardTitle>
              <div className="p-2 bg-success/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{data.approvedSales}</div>
              <p className="text-sm text-muted-foreground mt-1">Successfully processed</p>
            </CardContent>
          </Card>

          <Card className="bg-background/60 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Claims</CardTitle>
              <div className="p-2 bg-warning/10 rounded-lg">
                <FileText className="h-5 w-5 text-warning" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">{data.pendingClaims}</div>
              <p className="text-sm text-muted-foreground mt-1">Awaiting review</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="bg-background/60 backdrop-blur-sm border-border/50 shadow-lg">
            <CardHeader className="border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
                <div>
                  <CardTitle className="text-lg">Recent Sales</CardTitle>
                  <CardDescription>Your latest sales transactions</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {data.recentSales.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="p-4 bg-muted/50 rounded-full w-fit mx-auto mb-4">
                      <TrendingUp className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground mb-4">No sales recorded yet</p>
                    <Button variant="outline" size="sm" className="shadow-sm" asChild>
                      <a href="/revenue">Record Your First Sale</a>
                    </Button>
                  </div>
                ) : (
                  data.recentSales.map((sale, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">{sale.customer_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(sale.revenue_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="font-bold text-lg">{formatCurrency(sale.amount)}</p>
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                          sale.status === 'approved' ? 'bg-success/20 text-success border border-success/30' :
                          sale.status === 'rejected' ? 'bg-destructive/20 text-destructive border border-destructive/30' :
                          'bg-warning/20 text-warning border border-warning/30'
                        }`}>
                          {sale.status}
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
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <DollarSign className="h-5 w-5 text-destructive" />
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
                    <p className="text-muted-foreground mb-4">No expenses recorded</p>
                    <Button variant="outline" size="sm" className="shadow-sm" asChild>
                      <a href="/expenses">Add Expense</a>
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
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
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
                    <p className="text-muted-foreground mb-4">No claims submitted</p>
                    <Button variant="outline" size="sm" className="shadow-sm" asChild>
                      <a href="/claims">Submit Claim</a>
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

export default SalesmanDashboard;