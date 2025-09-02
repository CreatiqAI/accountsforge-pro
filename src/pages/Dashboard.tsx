import { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, DollarSign, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RevenueExpenseChart, ProfitChart } from '@/components/charts/FinancialCharts';
import { FinancialCalendar } from '@/components/dashboard/FinancialCalendar';

interface FinancialData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  monthlyProfit: number;
}

interface ChartData {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

const Dashboard = () => {
  const { userProfile, user } = useAuth();
  const [financialData, setFinancialData] = useState<FinancialData>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    monthlyRevenue: 0,
    monthlyExpenses: 0,
    monthlyProfit: 0
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinancialData();
    fetchChartData();
  }, [user, userProfile]);

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
          monthlyProfit: monthlyRevenue - monthlyExpenses
        });
      }
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async () => {
    try {
      const currentDate = new Date();
      const last6Months = [];
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthStart = date.toISOString().split('T')[0];
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
        
        // Get revenues for this month
        let revenueQuery = supabase
          .from('revenues')
          .select('amount')
          .gte('revenue_date', monthStart)
          .lte('revenue_date', monthEnd);
          
        if (userProfile?.role !== 'admin') {
          revenueQuery = revenueQuery.eq('user_id', user?.id);
        }
        
        const { data: revenueData } = await revenueQuery;
        
        // Get expenses for this month
        let expenseQuery = supabase
          .from('expenses')
          .select('amount')
          .gte('expense_date', monthStart)
          .lte('expense_date', monthEnd);
          
        if (userProfile?.role !== 'admin') {
          expenseQuery = expenseQuery.eq('user_id', user?.id);
        } else {
          expenseQuery = expenseQuery.eq('status', 'approved');
        }
        
        const { data: expenseData } = await expenseQuery;
        
        const monthRevenue = revenueData?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
        const monthExpenses = expenseData?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
        
        last6Months.push({
          month: date.toLocaleDateString('en-US', { month: 'short' }),
          revenue: monthRevenue,
          expenses: monthExpenses,
          profit: monthRevenue - monthExpenses
        });
      }
      
      setChartData(last6Months);
    } catch (error) {
      console.error('Error fetching chart data:', error);
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
          <h1 className="text-3xl font-bold text-foreground">
            {userProfile?.role === 'admin' ? 'Admin Dashboard' : 'My Dashboard'}
          </h1>
          <p className="text-muted-foreground">
            {userProfile?.role === 'admin' ? 'Company Overview' : 'My Financial Summary'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="/expenses">
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </a>
          </Button>
          <Button className="bg-primary hover:bg-primary-dark" asChild>
            <a href="/revenue">
              <Plus className="h-4 w-4 mr-2" />
              Add Revenue
            </a>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatCurrency(financialData.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              +{formatCurrency(financialData.monthlyRevenue)} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(financialData.totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              +{formatCurrency(financialData.monthlyExpenses)} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${financialData.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(financialData.netProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              {financialData.monthlyProfit >= 0 ? '+' : ''}{formatCurrency(financialData.monthlyProfit)} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {financialData.totalRevenue > 0 
                ? `${((financialData.netProfit / financialData.totalRevenue) * 100).toFixed(1)}%`
                : '0%'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Revenue to profit ratio
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Financial Calendar Section */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Calendar</CardTitle>
          <CardDescription>
            Daily financial activities overview
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FinancialCalendar />
        </CardContent>
      </Card>

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
              <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg border border-success/20">
                <div>
                  <p className="font-medium">No recent entries</p>
                  <p className="text-sm text-muted-foreground">Add your first revenue entry</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href="/revenue">Add Revenue</a>
                </Button>
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
              <div className="flex items-center justify-between p-3 bg-warning/10 rounded-lg border border-warning/20">
                <div>
                  <p className="font-medium">No recent entries</p>
                  <p className="text-sm text-muted-foreground">Add your first expense entry</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href="/expenses">Add Expense</a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;