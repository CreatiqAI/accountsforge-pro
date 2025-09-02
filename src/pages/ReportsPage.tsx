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

      {/* Official P&L Statement */}
      <Card>
        <CardHeader className="text-center border-b">
          <CardTitle className="text-2xl font-bold">PROFIT & LOSS STATEMENT</CardTitle>
          <CardDescription className="text-lg">
            For the Period Ended {new Date(dateRange.end).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* REVENUE SECTION */}
            <div className="space-y-3">
              <div className="font-bold text-lg border-b pb-2">REVENUE</div>
              <div className="pl-4 space-y-2">
                <div className="flex justify-between">
                  <span>Sales Revenue</span>
                  <span className="w-32 text-right">{formatCurrency(plData.totalRevenue)}</span>
                </div>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Total Revenue</span>
                <span className="w-32 text-right border-b-2 border-black pb-1">
                  {formatCurrency(plData.totalRevenue)}
                </span>
              </div>
            </div>

            {/* COST OF GOODS SOLD / EXPENSES SECTION */}
            <div className="space-y-3">
              <div className="font-bold text-lg border-b pb-2">OPERATING EXPENSES</div>
              <div className="pl-4 space-y-2">
                {/* Group expenses by category if needed */}
                <div className="flex justify-between">
                  <span>General & Administrative Expenses</span>
                  <span className="w-32 text-right">{formatCurrency(plData.totalExpenses)}</span>
                </div>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Total Operating Expenses</span>
                <span className="w-32 text-right border-b-2 border-black pb-1">
                  {formatCurrency(plData.totalExpenses)}
                </span>
              </div>
            </div>

            {/* GROSS PROFIT */}
            <div className="space-y-3">
              <div className="flex justify-between font-bold text-lg">
                <span>GROSS PROFIT</span>
                <span className="w-32 text-right border-b-2 border-black pb-1">
                  {formatCurrency(plData.totalRevenue - plData.totalExpenses)}
                </span>
              </div>
            </div>

            {/* NET INCOME */}
            <div className="space-y-3 pt-4">
              <div className="flex justify-between font-bold text-xl border-t-4 border-black pt-4">
                <span>NET {plData.netProfit >= 0 ? 'INCOME' : 'LOSS'}</span>
                <span className={`w-32 text-right border-b-4 border-black pb-1 ${
                  plData.netProfit >= 0 ? 'text-success' : 'text-destructive'
                }`}>
                  {formatCurrency(Math.abs(plData.netProfit))}
                </span>
              </div>
            </div>

            {/* EARNINGS PER SHARE (if applicable) */}
            <div className="mt-8 pt-6 border-t">
              <div className="text-center text-sm text-muted-foreground">
                <p>Statement prepared on {new Date().toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</p>
                <p className="mt-2">All amounts in USD</p>
              </div>
            </div>

            {/* DETAILED BREAKDOWN */}
            <div className="mt-8 pt-6 border-t">
              <h4 className="font-bold text-lg mb-4">DETAILED BREAKDOWN</h4>
              
              {/* Revenue Details */}
              <div className="mb-6">
                <h5 className="font-semibold mb-2 text-success">Revenue Entries:</h5>
                <div className="space-y-1 text-sm">
                  {plData.revenueEntries.length > 0 ? (
                    plData.revenueEntries.map((revenue, index) => (
                      <div key={index} className="flex justify-between pl-4">
                        <span>{revenue.customer_name} - {new Date(revenue.revenue_date).toLocaleDateString()}</span>
                        <span>{formatCurrency(revenue.amount)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground pl-4">No revenue entries for this period</p>
                  )}
                </div>
              </div>

              {/* Expense Details */}
              <div>
                <h5 className="font-semibold mb-2 text-destructive">Expense Entries:</h5>
                <div className="space-y-1 text-sm">
                  {plData.expenseEntries.length > 0 ? (
                    plData.expenseEntries.map((expense, index) => (
                      <div key={index} className="flex justify-between pl-4">
                        <span>{expense.description} - {new Date(expense.expense_date).toLocaleDateString()}</span>
                        <span>{formatCurrency(expense.amount)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground pl-4">No expense entries for this period</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsPage;