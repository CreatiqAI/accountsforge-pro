import { useState, useEffect } from 'react';
import { Plus, TrendingUp, DollarSign, Target, Calendar, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface PerformanceRecord {
  id: string;
  user_id: string;
  month: number;
  year: number;
  total_sales_amount: number;
  total_sales_count: number;
  total_approved_expenses: number;
  commission_rate: number;
  commission_earned: number;
  bonus_amount: number;
  total_payout: number;
  payment_status: 'pending' | 'paid' | 'partial';
  payment_date?: string;
  notes?: string;
  profiles?: {
    full_name: string;
    phone_number: string;
  };
}

const PerformancePage = () => {
  const { userProfile, user } = useAuth();
  const { toast } = useToast();
  const [performances, setPerformances] = useState<PerformanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [users, setUsers] = useState<any[]>([]);
  const [newPerformance, setNewPerformance] = useState({
    user_id: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    commission_rate: '0.10',
    bonus_amount: '0',
    notes: ''
  });

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    fetchPerformances();
    if (userProfile?.role === 'admin') {
      fetchUsers();
    }
  }, [selectedMonth, selectedYear, selectedUserId]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone_number')
        .eq('role', 'salesman');
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchPerformances = async () => {
    try {
      let query = supabase
        .from('salesman_performance')
        .select(`
          *,
          profiles(full_name, phone_number)
        `)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      // Apply filters
      if (selectedMonth && selectedMonth !== 'all') {
        query = query.eq('month', parseInt(selectedMonth));
      }
      if (selectedYear && selectedYear !== 'all') {
        query = query.eq('year', parseInt(selectedYear));
      }
      if (selectedUserId && selectedUserId !== 'all') {
        query = query.eq('user_id', selectedUserId);
      }

      // Non-admins can only see their own performance
      if (userProfile?.role !== 'admin') {
        query = query.eq('user_id', user?.id);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setPerformances(data as unknown as PerformanceRecord[]);
    } catch (error) {
      console.error('Error fetching performance records:', error);
      toast({
        title: "Error",
        description: "Failed to fetch performance records",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generatePerformanceData = async (userId: string, month: number, year: number) => {
    try {
      // Calculate sales data
      const { data: salesData, error: salesError } = await supabase
        .from('revenues')
        .select('amount')
        .eq('user_id', userId)
        .eq('status', 'approved')
        .gte('revenue_date', `${year}-${month.toString().padStart(2, '0')}-01`)
        .lt('revenue_date', `${month === 12 ? year + 1 : year}-${month === 12 ? '01' : (month + 1).toString().padStart(2, '0')}-01`);

      if (salesError) throw salesError;

      // Calculate expenses data
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('amount')
        .eq('user_id', userId)
        .eq('status', 'approved')
        .gte('expense_date', `${year}-${month.toString().padStart(2, '0')}-01`)
        .lt('expense_date', `${month === 12 ? year + 1 : year}-${month === 12 ? '01' : (month + 1).toString().padStart(2, '0')}-01`);

      if (expensesError) throw expensesError;

      const totalSalesAmount = salesData?.reduce((sum, sale) => sum + Number(sale.amount), 0) || 0;
      const totalSalesCount = salesData?.length || 0;
      const totalApprovedExpenses = expensesData?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
      const commissionRate = Number(newPerformance.commission_rate);
      const commissionEarned = totalSalesAmount * commissionRate;
      const bonusAmount = Number(newPerformance.bonus_amount);
      const totalPayout = commissionEarned + bonusAmount;

      return {
        total_sales_amount: totalSalesAmount,
        total_sales_count: totalSalesCount,
        total_approved_expenses: totalApprovedExpenses,
        commission_rate: commissionRate,
        commission_earned: commissionEarned,
        bonus_amount: bonusAmount,
        total_payout: totalPayout
      };
    } catch (error) {
      console.error('Error calculating performance data:', error);
      throw error;
    }
  };

  const handleAddPerformance = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const performanceData = await generatePerformanceData(
        newPerformance.user_id,
        newPerformance.month,
        newPerformance.year
      );

      const { error } = await supabase
        .from('salesman_performance')
        .insert({
          user_id: newPerformance.user_id,
          month: newPerformance.month,
          year: newPerformance.year,
          notes: newPerformance.notes,
          ...performanceData
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Performance record created successfully"
      });

      setNewPerformance({
        user_id: '',
        month: currentMonth,
        year: currentYear,
        commission_rate: '0.10',
        bonus_amount: '0',
        notes: ''
      });
      setIsAddDialogOpen(false);
      fetchPerformances();
    } catch (error: any) {
      console.error('Error adding performance record:', error);
      toast({
        title: "Error",
        description: error.message?.includes('duplicate') ? 
          "Performance record already exists for this month/year" : 
          "Failed to add performance record",
        variant: "destructive"
      });
    }
  };

  const handleUpdatePaymentStatus = async (performanceId: string, status: 'paid' | 'partial') => {
    try {
      const { error } = await supabase
        .from('salesman_performance')
        .update({ 
          payment_status: status,
          payment_date: status === 'paid' ? new Date().toISOString().split('T')[0] : null
        })
        .eq('id', performanceId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Payment status updated to ${status}`
      });

      fetchPerformances();
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-success text-success-foreground">Paid</Badge>;
      case 'partial':
        return <Badge className="bg-warning text-warning-foreground">Partial</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const getMonthName = (month: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-1/4 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Calculate summary stats for current month
  const currentMonthPerformances = performances.filter(p => 
    p.month === currentMonth && p.year === currentYear &&
    (userProfile?.role === 'admin' || p.user_id === user?.id)
  );
  
  const totalSales = currentMonthPerformances.reduce((sum, p) => sum + p.total_sales_amount, 0);
  const totalCommissions = currentMonthPerformances.reduce((sum, p) => sum + p.commission_earned, 0);
  const totalPayouts = currentMonthPerformances.reduce((sum, p) => sum + p.total_payout, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Performance Tracking</h1>
          <p className="text-muted-foreground">
            {userProfile?.role === 'admin' 
              ? 'Track salesman performance and manage payouts' 
              : 'View your performance metrics and commission earnings'
            }
          </p>
        </div>
        {userProfile?.role === 'admin' && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary-dark">
                <Plus className="h-4 w-4 mr-2" />
                Generate Performance
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Performance Record</DialogTitle>
                <DialogDescription>
                  Create a new performance record for a salesman.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddPerformance} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="user_id">Salesman</Label>
                  <Select 
                    value={newPerformance.user_id} 
                    onValueChange={(value) => setNewPerformance({ ...newPerformance, user_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select salesman" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.user_id} value={user.user_id}>
                          {user.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="month">Month</Label>
                    <Select 
                      value={newPerformance.month.toString()} 
                      onValueChange={(value) => setNewPerformance({ ...newPerformance, month: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>
                            {getMonthName(i + 1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Input
                      id="year"
                      type="number"
                      value={newPerformance.year}
                      onChange={(e) => setNewPerformance({ ...newPerformance, year: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="commission_rate">Commission Rate</Label>
                    <Input
                      id="commission_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={newPerformance.commission_rate}
                      onChange={(e) => setNewPerformance({ ...newPerformance, commission_rate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bonus_amount">Bonus Amount</Label>
                    <Input
                      id="bonus_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={newPerformance.bonus_amount}
                      onChange={(e) => setNewPerformance({ ...newPerformance, bonus_amount: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes..."
                    value={newPerformance.notes}
                    onChange={(e) => setNewPerformance({ ...newPerformance, notes: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">Generate Record</Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Month Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatCurrency(totalSales)}</div>
            <p className="text-xs text-muted-foreground">
              {getMonthName(currentMonth)} {currentYear}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commissions</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCommissions)}</div>
            <p className="text-xs text-muted-foreground">
              Earned this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payouts</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPayouts)}</div>
            <p className="text-xs text-muted-foreground">
              Including bonuses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="All months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All months</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {getMonthName(i + 1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="All years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All years</SelectItem>
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = currentYear - i;
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            {userProfile?.role === 'admin' && (
              <div className="space-y-2">
                <Label>Salesman</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All salesmen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All salesmen</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.user_id} value={user.user_id}>
                        {user.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedMonth('all');
                  setSelectedYear('all');
                  setSelectedUserId('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Records</CardTitle>
          <CardDescription>
            {performances.length} total performance records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {performances.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              {userProfile?.role === 'admin' ? (
                <>
                  <p className="text-muted-foreground">No performance records found</p>
                  <Button 
                    className="mt-4" 
                    onClick={() => setIsAddDialogOpen(true)}
                  >
                    Generate First Record
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground">No performance records available</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Performance records are generated by administrators. Contact your admin to generate your performance data.
                  </p>
                </>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  {userProfile?.role === 'admin' && <TableHead>Salesman</TableHead>}
                  <TableHead>Sales</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Bonus</TableHead>
                  <TableHead>Total Payout</TableHead>
                  <TableHead>Status</TableHead>
                  {userProfile?.role === 'admin' && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {performances.map((performance) => (
                  <TableRow key={performance.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {getMonthName(performance.month)} {performance.year}
                      </div>
                    </TableCell>
                    {userProfile?.role === 'admin' && (
                      <TableCell>
                        <div>
                          <p className="font-medium">{performance.profiles?.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {performance.profiles?.phone_number}
                          </p>
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="font-medium text-success">
                      {formatCurrency(performance.total_sales_amount)}
                    </TableCell>
                    <TableCell>{performance.total_sales_count}</TableCell>
                    <TableCell>
                      {formatCurrency(performance.commission_earned)}
                      <div className="text-xs text-muted-foreground">
                        {(performance.commission_rate * 100).toFixed(1)}% rate
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatCurrency(performance.bonus_amount)}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(performance.total_payout)}
                    </TableCell>
                    <TableCell>
                      {getPaymentStatusBadge(performance.payment_status)}
                    </TableCell>
                    {userProfile?.role === 'admin' && (
                      <TableCell>
                        <div className="flex gap-1">
                          {performance.payment_status === 'pending' && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleUpdatePaymentStatus(performance.id, 'partial')}
                              >
                                Mark Partial
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleUpdatePaymentStatus(performance.id, 'paid')}
                              >
                                Mark Paid
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformancePage;