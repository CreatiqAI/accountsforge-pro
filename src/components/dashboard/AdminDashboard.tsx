import { useState, useEffect } from 'react';
import { Users, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, DollarSign, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';

interface AdminData {
  totalUsers: number;
  totalSales: number;
  totalExpenses: number;
  netProfit: number;
  pendingApprovals: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  pendingExpenses: any[];
  pendingSales: any[];
  pendingClaims: any[];
  recentActivity: any[];
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState<AdminData>({
    totalUsers: 0,
    totalSales: 0,
    totalExpenses: 0,
    netProfit: 0,
    pendingApprovals: 0,
    monthlyRevenue: 0,
    monthlyExpenses: 0,
    pendingExpenses: [],
    pendingSales: [],
    pendingClaims: [],
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAdminData();
    }
  }, [user]);

  const fetchAdminData = async () => {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Fetch all data concurrently
      const [
        { data: users },
        { data: sales },
        { data: expenses },
        { data: claims }
      ] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('revenues').select('*').order('revenue_date', { ascending: false }),
        supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
        supabase.from('claims').select('*').order('submitted_date', { ascending: false })
      ]);

      if (users && sales && expenses && claims) {
        const totalSales = sales
          .filter(s => s.status === 'approved')
          .reduce((sum, s) => sum + Number(s.amount), 0);

        const totalExpenses = expenses
          .filter(e => e.status === 'approved')
          .reduce((sum, e) => sum + Number(e.amount), 0);

        const monthlyRevenue = sales
          .filter(s => s.status === 'approved' && new Date(s.revenue_date) >= monthStart)
          .reduce((sum, s) => sum + Number(s.amount), 0);

        const monthlyExpenses = expenses
          .filter(e => e.status === 'approved' && new Date(e.expense_date) >= monthStart)
          .reduce((sum, e) => sum + Number(e.amount), 0);

        const pendingExpenses = expenses.filter(e => e.status === 'pending');
        const pendingSales = sales.filter(s => s.status === 'pending');
        const pendingClaims = claims.filter(c => c.status === 'pending');

        const pendingApprovals = pendingExpenses.length + pendingSales.length + pendingClaims.length;

        // Add profile data to expenses and claims for display
        const expensesWithProfiles = pendingExpenses.map(expense => ({
          ...expense,
          profiles: users?.find(u => u.user_id === expense.user_id)
        }));

        const claimsWithProfiles = pendingClaims.map(claim => ({
          ...claim,
          profiles: users?.find(u => u.user_id === claim.user_id)
        }));

        // Combine recent activity
        const recentActivity = [
          ...expensesWithProfiles.slice(0, 3).map(e => ({ ...e, type: 'expense' })),
          ...pendingSales.slice(0, 3).map(s => ({ ...s, type: 'sale' })),
          ...claimsWithProfiles.slice(0, 3).map(c => ({ ...c, type: 'claim' }))
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8);

        setData({
          totalUsers: users.length,
          totalSales,
          totalExpenses,
          netProfit: totalSales - totalExpenses,
          pendingApprovals,
          monthlyRevenue,
          monthlyExpenses,
          pendingExpenses: pendingExpenses.slice(0, 5),
          pendingSales: pendingSales.slice(0, 5),
          pendingClaims: pendingClaims.slice(0, 5),
          recentActivity
        });
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (type: string, id: string, status: 'approved' | 'rejected') => {
    try {
      const table = type === 'expense' ? 'expenses' : type === 'sale' ? 'revenues' : 'claims';

      const { error } = await supabase
        .from(table)
        .update({
          status,
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      // Refresh data
      fetchAdminData();
    } catch (error) {
      console.error('Error updating approval:', error);
    }
  };


  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'expense': return <TrendingDown className="h-4 w-4 text-destructive" />;
      case 'sale': return <TrendingUp className="h-4 w-4 text-success" />;
      case 'claim': return <FileText className="h-4 w-4 text-primary" />;
      default: return <FileText className="h-4 w-4" />;
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
              Admin Dashboard
            </h1>
            <p className="text-lg text-muted-foreground">Company overview and approval management</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="bg-background/80 backdrop-blur-sm border-border/50 hover:bg-accent" asChild>
              <a href="/reports">
                <FileText className="h-4 w-4 mr-2" />
                View Reports
              </a>
            </Button>
            <Button className="bg-primary hover:bg-primary/90 shadow-lg" asChild>
              <a href="/user-management">
                <Users className="h-4 w-4 mr-2" />
                Manage Users
              </a>
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          <Card className="bg-background/60 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{data.totalUsers}</div>
              <p className="text-sm text-muted-foreground mt-1">Active employees & salesmen</p>
            </CardContent>
          </Card>

          <Card className="bg-background/60 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
              <div className="p-2 bg-success/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{formatCurrency(data.totalSales)}</div>
              <p className="text-sm text-muted-foreground mt-1">
                {formatCurrency(data.monthlyRevenue)} this month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-background/60 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
              <div className="p-2 bg-destructive/10 rounded-lg">
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{formatCurrency(data.totalExpenses)}</div>
              <p className="text-sm text-muted-foreground mt-1">
                {formatCurrency(data.monthlyExpenses)} this month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-background/60 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
              <div className={`p-2 rounded-lg ${data.netProfit >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                <DollarSign className={`h-5 w-5 ${data.netProfit >= 0 ? 'text-success' : 'text-destructive'}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${data.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(data.netProfit)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Revenue - Expenses</p>
            </CardContent>
          </Card>

          <Card className="bg-background/60 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approvals</CardTitle>
              <div className="p-2 bg-warning/10 rounded-lg">
                <Clock className="h-5 w-5 text-warning" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">{data.pendingApprovals}</div>
              <p className="text-sm text-muted-foreground mt-1">Require your review</p>
            </CardContent>
          </Card>

          <Card className="bg-background/60 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Profit Margin</CardTitle>
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {data.totalSales > 0
                  ? `${((data.netProfit / data.totalSales) * 100).toFixed(1)}%`
                  : '0%'
                }
              </div>
              <p className="text-sm text-muted-foreground mt-1">Revenue to profit ratio</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Approvals Section */}
        <Card className="bg-background/60 backdrop-blur-sm border-border/50 shadow-xl">
          <CardHeader className="border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <CardTitle className="text-xl">Pending Approvals</CardTitle>
                <CardDescription>Items requiring your immediate attention</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {data.recentActivity.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 bg-success/10 rounded-full w-fit mx-auto mb-6">
                  <CheckCircle className="h-16 w-16 text-success" />
                </div>
                <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                <p className="text-muted-foreground">No pending approvals at the moment.</p>
              </div>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentActivity.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(item.type)}
                        <Badge variant="outline">{item.type}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {item.description || item.customer_name || item.claim_type}
                    </TableCell>
                    <TableCell>
                      {item.profiles?.full_name || 'Unknown User'}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(item.amount)}
                    </TableCell>
                    <TableCell>
                      {new Date(
                        item.expense_date || item.revenue_date || item.submitted_date
                      ).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-success hover:text-success hover:bg-success/10 border-success/20"
                          onClick={() => handleApproval(item.type, item.id, 'approved')}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                          onClick={() => handleApproval(item.type, item.id, 'rejected')}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;