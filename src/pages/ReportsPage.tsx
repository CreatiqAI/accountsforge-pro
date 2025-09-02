import { useState, useEffect } from 'react';
import { Download, Calendar, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ProfitLossData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  revenueEntries: any[];
  expenseEntries: any[];
}

const ReportsPage = () => {
  const { userProfile, user } = useAuth();
  const { toast } = useToast();
  const [plData, setPlData] = useState<ProfitLossData>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    revenueEntries: [],
    expenseEntries: []
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of current year
    end: new Date().toISOString().split('T')[0] // Today
  });
  const [selectedSalesman, setSelectedSalesman] = useState<string>('all');

  useEffect(() => {
    fetchPLData();
  }, [dateRange, selectedSalesman]);

  const fetchPLData = async () => {
    try {
      setLoading(true);
      
      // Build revenue query
      let revenueQuery = supabase
        .from('revenues')
        .select('amount, revenue_date, customer_name, user_id')
        .gte('revenue_date', dateRange.start)
        .lte('revenue_date', dateRange.end);

      // Build expense query - only approved expenses count toward P&L
      let expenseQuery = supabase
        .from('expenses')
        .select('amount, expense_date, description, status, user_id')
        .eq('status', 'approved')
        .gte('expense_date', dateRange.start)
        .lte('expense_date', dateRange.end);

      // If not admin or specific salesman selected, filter by user
      if (userProfile?.role !== 'admin') {
        revenueQuery = revenueQuery.eq('user_id', user?.id);
        expenseQuery = expenseQuery.eq('user_id', user?.id);
      } else if (selectedSalesman !== 'all') {
        revenueQuery = revenueQuery.eq('user_id', selectedSalesman);
        expenseQuery = expenseQuery.eq('user_id', selectedSalesman);
      }

      const [revenueResult, expenseResult] = await Promise.all([
        revenueQuery,
        expenseQuery
      ]);

      if (revenueResult.error) throw revenueResult.error;
      if (expenseResult.error) throw expenseResult.error;

      const revenues = revenueResult.data || [];
      const expenses = expenseResult.data || [];

      const totalRevenue = revenues.reduce((sum, r) => sum + Number(r.amount), 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

      setPlData({
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        revenueEntries: revenues,
        expenseEntries: expenses
      });
    } catch (error) {
      console.error('Error fetching P&L data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch P&L data",
        variant: "destructive"
      });
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

  const exportToCSV = () => {
    const headers = ['Type', 'Date', 'Description', 'Amount'];
    const rows = [
      ...plData.revenueEntries.map(r => [
        'Revenue',
        r.revenue_date,
        r.customer_name,
        r.amount
      ]),
      ...plData.expenseEntries.map(e => [
        'Expense',
        e.expense_date,
        e.description,
        e.amount
      ])
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pl-statement-${dateRange.start}-to-${dateRange.end}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "P&L statement exported to CSV"
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-1/4 animate-pulse"></div>
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
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
          <h1 className="text-3xl font-bold text-foreground">P&L Statement</h1>
          <p className="text-muted-foreground">
            Profit and Loss statement for financial analysis
          </p>
        </div>
        <Button onClick={exportToCSV} className="bg-primary hover:bg-primary-dark">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
            {userProfile?.role === 'admin' && (
              <div className="space-y-2">
                <Label>Salesman</Label>
                <Select value={selectedSalesman} onValueChange={setSelectedSalesman}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select salesman" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Salesmen</SelectItem>
                    {/* TODO: Add dynamic salesman list */}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* P&L Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(plData.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {plData.revenueEntries.length} entries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Expenses
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(plData.totalExpenses)}
            </div>
            <p className="text-xs text-muted-foreground">
              {plData.expenseEntries.length} entries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Profit/Loss
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              plData.netProfit >= 0 ? 'text-success' : 'text-destructive'
            }`}>
              {formatCurrency(plData.netProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              {plData.netProfit >= 0 ? 'Profit' : 'Loss'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Statement */}
      <Card>
        <CardHeader>
          <CardTitle>Profit & Loss Statement</CardTitle>
          <CardDescription>
            For period from {new Date(dateRange.start).toLocaleDateString()} to {new Date(dateRange.end).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Revenue Section */}
            <div>
              <h3 className="text-lg font-semibold text-success mb-3">Revenue</h3>
              <div className="space-y-2">
                {plData.revenueEntries.map((revenue, index) => (
                  <div key={index} className="flex justify-between py-2 border-b border-border">
                    <div>
                      <p className="font-medium">{revenue.customer_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(revenue.revenue_date).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="font-medium text-success">
                      {formatCurrency(revenue.amount)}
                    </p>
                  </div>
                ))}
                <div className="flex justify-between py-2 font-bold text-lg border-t-2 border-success">
                  <p>Total Revenue</p>
                  <p className="text-success">{formatCurrency(plData.totalRevenue)}</p>
                </div>
              </div>
            </div>

            {/* Expenses Section */}
            <div>
              <h3 className="text-lg font-semibold text-destructive mb-3">Expenses</h3>
              <div className="space-y-2">
                {plData.expenseEntries.map((expense, index) => (
                  <div key={index} className="flex justify-between py-2 border-b border-border">
                    <div>
                      <p className="font-medium">{expense.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(expense.expense_date).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="font-medium text-destructive">
                      {formatCurrency(expense.amount)}
                    </p>
                  </div>
                ))}
                <div className="flex justify-between py-2 font-bold text-lg border-t-2 border-destructive">
                  <p>Total Expenses</p>
                  <p className="text-destructive">{formatCurrency(plData.totalExpenses)}</p>
                </div>
              </div>
            </div>

            {/* Net Profit/Loss */}
            <div className={`p-4 rounded-lg ${
              plData.netProfit >= 0 ? 'bg-success-light' : 'bg-destructive/10'
            }`}>
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Net {plData.netProfit >= 0 ? 'Profit' : 'Loss'}</h3>
                <p className={`text-2xl font-bold ${
                  plData.netProfit >= 0 ? 'text-success' : 'text-destructive'
                }`}>
                  {formatCurrency(Math.abs(plData.netProfit))}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsPage;