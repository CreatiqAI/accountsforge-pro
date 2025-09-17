import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from 'date-fns';
import { DollarSign, TrendingUp, TrendingDown, Calendar as CalendarIcon } from 'lucide-react';

interface FinancialActivity {
  date: string;
  revenues: number;
  expenses: number;
  revenueCount: number;
  expenseCount: number;
  netAmount: number;
}

export const FinancialCalendar = () => {
  const { userProfile, user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [activities, setActivities] = useState<FinancialActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    fetchCalendarData();
  }, [user, userProfile, currentMonth]);

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      // Fetch revenues for the current month
      let revenueQuery = supabase
        .from('revenues')
        .select('amount, revenue_date, customer_name')
        .gte('revenue_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('revenue_date', format(monthEnd, 'yyyy-MM-dd'));

      if (userProfile?.role !== 'admin') {
        revenueQuery = revenueQuery.eq('user_id', user?.id);
      }

      // Fetch approved expenses for the current month
      let expenseQuery = supabase
        .from('expenses')
        .select('amount, expense_date, description')
        .gte('expense_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('expense_date', format(monthEnd, 'yyyy-MM-dd'))
        .eq('status', 'approved');

      if (userProfile?.role !== 'admin') {
        expenseQuery = expenseQuery.eq('user_id', user?.id);
      }

      const [revenueResult, expenseResult] = await Promise.all([
        revenueQuery,
        expenseQuery
      ]);

      const revenues = revenueResult.data || [];
      const expenses = expenseResult.data || [];

      // Group by date and calculate totals
      const activityMap = new Map<string, FinancialActivity>();

      // Initialize all days of the month with zero values
      eachDayOfInterval({ start: monthStart, end: monthEnd }).forEach(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        activityMap.set(dateStr, {
          date: dateStr,
          revenues: 0,
          expenses: 0,
          revenueCount: 0,
          expenseCount: 0,
          netAmount: 0
        });
      });

      // Add revenue data
      revenues.forEach(revenue => {
        const date = revenue.revenue_date;
        const existing = activityMap.get(date)!;
        existing.revenues += Number(revenue.amount);
        existing.revenueCount += 1;
        existing.netAmount = existing.revenues - existing.expenses;
        activityMap.set(date, existing);
      });

      // Add expense data
      expenses.forEach(expense => {
        const date = expense.expense_date;
        const existing = activityMap.get(date)!;
        existing.expenses += Number(expense.amount);
        existing.expenseCount += 1;
        existing.netAmount = existing.revenues - existing.expenses;
        activityMap.set(date, existing);
      });

      setActivities(Array.from(activityMap.values()));
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return activities.find(activity => activity.date === dateStr);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getDayContent = (date: Date) => {
    const activity = getActivityForDate(date);
    const hasRevenue = activity && activity.revenues > 0;
    const hasExpenses = activity && activity.expenses > 0;
    
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="text-xs font-medium">{format(date, 'd')}</div>
        
        {/* Activity indicators - smaller and positioned better */}
        <div className="absolute bottom-0.5 right-0.5 flex gap-0.5">
          {hasRevenue && (
            <div className="w-1 h-1 bg-success rounded-full"></div>
          )}
          {hasExpenses && (
            <div className="w-1 h-1 bg-destructive rounded-full"></div>
          )}
        </div>
        
        {/* Today indicator */}
        {isToday(date) && !selectedDate && (
          <div className="absolute top-0.5 right-0.5 w-1 h-1 bg-primary rounded-full"></div>
        )}
      </div>
    );
  };

  const selectedActivity = selectedDate ? getActivityForDate(selectedDate) : null;
  const monthTotals = activities.reduce((totals, activity) => ({
    revenues: totals.revenues + activity.revenues,
    expenses: totals.expenses + activity.expenses,
    transactions: totals.transactions + activity.revenueCount + activity.expenseCount
  }), { revenues: 0, expenses: 0, transactions: 0 });

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-1/3"></div>
        <div className="h-64 bg-muted rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Month Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <div>
                <p className="text-sm font-medium">Monthly Revenue</p>
                <p className="text-lg font-bold text-success">{formatCurrency(monthTotals.revenues)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <div>
                <p className="text-sm font-medium">Monthly Expenses</p>
                <p className="text-lg font-bold text-destructive">{formatCurrency(monthTotals.expenses)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Net Amount</p>
                <p className={`text-lg font-bold ${
                  monthTotals.revenues - monthTotals.expenses >= 0 ? 'text-success' : 'text-destructive'
                }`}>
                  {formatCurrency(monthTotals.revenues - monthTotals.expenses)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        {/* Calendar View - More compact */}
        <div className="md:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {format(currentMonth, 'MMMM yyyy')}
            </h3>
          </div>
          
          <div className="border rounded-lg overflow-hidden bg-card">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              className="w-full p-3"
              classNames={{
                months: "flex w-full",
                month: "space-y-4 w-full",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-sm font-medium",
                nav: "space-x-1 flex items-center",
                nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse",
                head_row: "flex w-full",
                head_cell: "text-muted-foreground rounded-md w-full font-normal text-xs flex-1 text-center p-1",
                row: "flex w-full mt-1",
                cell: "relative p-0.5 text-center text-sm focus-within:relative focus-within:z-20 flex-1",
                day: "h-9 w-full p-0 font-normal hover:bg-accent hover:text-accent-foreground rounded",
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                day_today: "bg-accent text-accent-foreground",
                day_outside: "text-muted-foreground opacity-50",
                day_disabled: "text-muted-foreground opacity-50",
              }}
              components={{
                Day: ({ date }) => (
                  <button 
                    className={`w-full h-9 text-center hover:bg-accent rounded transition-colors relative ${
                      selectedDate && isSameDay(date, selectedDate) 
                        ? 'bg-primary text-primary-foreground' 
                        : isToday(date)
                        ? 'bg-accent text-accent-foreground'
                        : ''
                    }`}
                    onClick={() => setSelectedDate(date)}
                  >
                    {getDayContent(date)}
                  </button>
                )
              }}
            />
          </div>
          
          {/* Compact Legend */}
          <div className="flex justify-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-success"></div>
              <span>Revenue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-destructive"></div>
              <span>Expenses</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
              <span>Today</span>
            </div>
          </div>
        </div>

        {/* Selected Date Details - Compact sidebar */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold">
            {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Select a date'}
          </h3>
          
          {selectedActivity ? (
            <div className="space-y-3">
              {selectedActivity.revenueCount > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-success" />
                      Revenue ({selectedActivity.revenueCount} transaction{selectedActivity.revenueCount !== 1 ? 's' : ''})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-2xl font-bold text-success">
                      {formatCurrency(selectedActivity.revenues)}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {selectedActivity.expenseCount > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-destructive" />
                      Expenses ({selectedActivity.expenseCount} transaction{selectedActivity.expenseCount !== 1 ? 's' : ''})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-2xl font-bold text-destructive">
                      {formatCurrency(selectedActivity.expenses)}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {(selectedActivity.revenueCount > 0 || selectedActivity.expenseCount > 0) && (
                <Card className={`${
                  selectedActivity.netAmount >= 0 ? 'bg-success/5' : 'bg-destructive/5'
                }`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Net Amount
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className={`text-2xl font-bold ${
                      selectedActivity.netAmount >= 0 ? 'text-success' : 'text-destructive'
                    }`}>
                      {selectedActivity.netAmount >= 0 ? '+' : ''}{formatCurrency(selectedActivity.netAmount)}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {selectedActivity.revenueCount === 0 && selectedActivity.expenseCount === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No financial activity on this date</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a date to view financial details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};