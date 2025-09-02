import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, isSameDay } from 'date-fns';

interface FinancialActivity {
  date: string;
  revenues: number;
  expenses: number;
  count: number;
}

export const FinancialCalendar = () => {
  const { userProfile, user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [activities, setActivities] = useState<FinancialActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCalendarData();
  }, [user, userProfile]);

  const fetchCalendarData = async () => {
    try {
      const currentMonth = new Date();
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      // Fetch revenues
      let revenueQuery = supabase
        .from('revenues')
        .select('amount, revenue_date')
        .gte('revenue_date', startOfMonth.toISOString().split('T')[0])
        .lte('revenue_date', endOfMonth.toISOString().split('T')[0]);

      if (userProfile?.role !== 'admin') {
        revenueQuery = revenueQuery.eq('user_id', user?.id);
      }

      // Fetch expenses
      let expenseQuery = supabase
        .from('expenses')
        .select('amount, expense_date')
        .gte('expense_date', startOfMonth.toISOString().split('T')[0])
        .lte('expense_date', endOfMonth.toISOString().split('T')[0]);

      if (userProfile?.role !== 'admin') {
        expenseQuery = expenseQuery.eq('user_id', user?.id).eq('status', 'approved');
      } else {
        expenseQuery = expenseQuery.eq('status', 'approved');
      }

      const [revenueResult, expenseResult] = await Promise.all([
        revenueQuery,
        expenseQuery
      ]);

      const revenues = revenueResult.data || [];
      const expenses = expenseResult.data || [];

      // Group by date
      const activityMap = new Map<string, FinancialActivity>();

      revenues.forEach(revenue => {
        const date = revenue.revenue_date;
        const existing = activityMap.get(date) || { date, revenues: 0, expenses: 0, count: 0 };
        existing.revenues += Number(revenue.amount);
        existing.count += 1;
        activityMap.set(date, existing);
      });

      expenses.forEach(expense => {
        const date = expense.expense_date;
        const existing = activityMap.get(date) || { date, revenues: 0, expenses: 0, count: 0 };
        existing.expenses += Number(expense.amount);
        existing.count += 1;
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
    return activities.find(activity => 
      isSameDay(new Date(activity.date), date)
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const selectedActivity = selectedDate ? getActivityForDate(selectedDate) : null;

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-64 bg-muted rounded"></div>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Calendar */}
      <div className="space-y-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className="rounded-md border pointer-events-auto"
        />
        
        {/* Legend */}
        <div className="flex flex-wrap gap-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success/20 border border-success"></div>
            <span>Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive/20 border border-destructive"></div>
            <span>Expenses</span>
          </div>
        </div>
      </div>

      {/* Selected Date Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
        </h3>
        
        {selectedActivity ? (
          <div className="space-y-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Revenue</span>
                  <Badge variant="secondary" className="bg-success/10 text-success">
                    {formatCurrency(selectedActivity.revenues)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Expenses</span>
                  <Badge variant="secondary" className="bg-destructive/10 text-destructive">
                    {formatCurrency(selectedActivity.expenses)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Net</span>
                  <Badge variant="secondary" className={
                    selectedActivity.revenues - selectedActivity.expenses >= 0 
                      ? 'bg-success/10 text-success' 
                      : 'bg-destructive/10 text-destructive'
                  }>
                    {formatCurrency(selectedActivity.revenues - selectedActivity.expenses)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
            
            <div className="text-sm text-muted-foreground">
              {selectedActivity.count} transaction{selectedActivity.count !== 1 ? 's' : ''}
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground">
            {selectedDate ? 'No financial activity on this date' : 'Select a date to view details'}
          </div>
        )}
      </div>
    </div>
  );
};