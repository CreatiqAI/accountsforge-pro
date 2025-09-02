import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calculator, Plus } from 'lucide-react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface FinancialData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
}

const Dashboard = () => {
  const { userProfile } = useAuth();
  const [financialData, setFinancialData] = useState<FinancialData>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    monthlyRevenue: 0,
    monthlyExpenses: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    try {
      // Get current month start
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Fetch revenues
      const { data: revenues } = await supabase
        .from('revenues')
        .select('amount, revenue_date');
      
      // Fetch expenses (only approved for non-admins)
      const expenseQuery = supabase
        .from('expenses')
        .select('amount, expense_date, status');
      
      const { data: expenses } = userProfile?.role === 'admin' 
        ? await expenseQuery
        : await expenseQuery.eq('status', 'approved');

      if (revenues && expenses) {
        const totalRevenue = revenues.reduce((sum, r) => sum + Number(r.amount), 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
        
        const monthlyRevenue = revenues
          .filter(r => new Date(r.revenue_date) >= monthStart)
          .reduce((sum, r) => sum + Number(r.amount), 0);
        
        const monthlyExpenses = expenses
          .filter(e => new Date(e.expense_date) >= monthStart)
          .reduce((sum, e) => sum + Number(e.amount), 0);

        setFinancialData({
          totalRevenue,
          totalExpenses,
          netProfit: totalRevenue - totalExpenses,
          monthlyRevenue,
          monthlyExpenses,
        });
      }
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {userProfile?.full_name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button className="bg-primary hover:bg-primary-dark">
            <Plus className="h-4 w-4 mr-2" />
            Add Entry
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Revenue"
          value={formatCurrency(financialData.totalRevenue)}
          change={`$${financialData.monthlyRevenue.toFixed(2)} this month`}
          changeType="positive"
          icon={TrendingUp}
        />
        <StatsCard
          title="Total Expenses"
          value={formatCurrency(financialData.totalExpenses)}
          change={`$${financialData.monthlyExpenses.toFixed(2)} this month`}
          changeType="negative"
          icon={TrendingDown}
        />
        <StatsCard
          title="Net Profit"
          value={formatCurrency(financialData.netProfit)}
          changeType={financialData.netProfit >= 0 ? 'positive' : 'negative'}
          icon={DollarSign}
        />
        <StatsCard
          title="Monthly P&L"
          value={formatCurrency(financialData.monthlyRevenue - financialData.monthlyExpenses)}
          changeType={
            (financialData.monthlyRevenue - financialData.monthlyExpenses) >= 0 
              ? 'positive' 
              : 'negative'
          }
          icon={Calculator}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              Recent Revenue
            </CardTitle>
            <CardDescription>
              Latest revenue entries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-success-light rounded-lg">
                <div>
                  <p className="font-medium">No recent entries</p>
                  <p className="text-sm text-muted-foreground">Add your first revenue entry</p>
                </div>
                <Button variant="outline" size="sm">Add Revenue</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-destructive" />
              Recent Expenses
            </CardTitle>
            <CardDescription>
              Latest expense entries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-warning-light rounded-lg">
                <div>
                  <p className="font-medium">No recent entries</p>
                  <p className="text-sm text-muted-foreground">Add your first expense entry</p>
                </div>
                <Button variant="outline" size="sm">Add Expense</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;