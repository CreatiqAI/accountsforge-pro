import { useState, useEffect } from 'react';
import { Plus, Filter, Eye, Check, X, Upload, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Expense {
  id: string;
  amount: number;
  description: string;
  expense_date: string;
  status: 'pending' | 'approved' | 'rejected';
  proof_url?: string;
  profiles?: {
    full_name: string;
    phone_number: string;
  };
}

const ExpensesPage = () => {
  const { userProfile, user } = useAuth();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [newExpense, setNewExpense] = useState({
    amount: '',
    description: '',
    expense_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      let query = supabase
        .from('expenses')
        .select(`
          id,
          amount,
          description,
          expense_date,
          status,
          proof_url,
          user_id,
          profiles(
            full_name,
            phone_number
          )
        `)
        .order('expense_date', { ascending: false });

      // Non-admins can only see their own expenses
      if (userProfile?.role !== 'admin') {
        query = query.eq('user_id', user?.id);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setExpenses((data || []) as Expense[]);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast({
        title: "Error",
        description: "Failed to fetch expenses",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('expenses')
        .insert({
          amount: parseFloat(newExpense.amount),
          description: newExpense.description,
          expense_date: newExpense.expense_date,
          user_id: user?.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Expense added successfully"
      });

      setNewExpense({
        amount: '',
        description: '',
        expense_date: new Date().toISOString().split('T')[0],
      });
      setIsAddDialogOpen(false);
      fetchExpenses();
    } catch (error) {
      console.error('Error adding expense:', error);
      toast({
        title: "Error",
        description: "Failed to add expense",
        variant: "destructive"
      });
    }
  };

  const handleStatusUpdate = async (expenseId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('expenses')
        .update({ status })
        .eq('id', expenseId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Expense ${status} successfully`
      });

      fetchExpenses();
    } catch (error) {
      console.error('Error updating expense status:', error);
      toast({
        title: "Error",
        description: "Failed to update expense status",
        variant: "destructive"
      });
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Expense deleted successfully"
      });

      fetchExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: "Error",
        description: "Failed to delete expense",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success text-success-foreground">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge className="bg-warning text-warning-foreground">Pending</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleViewExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsViewDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-1/4 animate-pulse"></div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Expenses</h1>
          <p className="text-muted-foreground">
            Manage and track expense entries
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary-dark">
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Expense</DialogTitle>
                <DialogDescription>
                  Enter the details for your new expense entry.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddExpense} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter expense description..."
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense_date">Date</Label>
                  <Input
                    id="expense_date"
                    type="date"
                    value={newExpense.expense_date}
                    onChange={(e) => setNewExpense({ ...newExpense, expense_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Proof (Optional)</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      File upload functionality coming soon
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">Add Expense</Button>
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
        </div>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Entries</CardTitle>
          <CardDescription>
            {expenses.length} total expenses
          </CardDescription>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No expenses found</p>
              <Button 
                className="mt-4" 
                onClick={() => setIsAddDialogOpen(true)}
              >
                Add Your First Expense
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Description</TableHead>
                  {userProfile?.role === 'admin' && <TableHead>Salesman</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      {new Date(expense.expense_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(expense.amount)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {expense.description}
                    </TableCell>
                    {userProfile?.role === 'admin' && (
                      <TableCell>
                        <div>
                          <p className="font-medium">{expense.profiles?.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {expense.profiles?.phone_number}
                          </p>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      {getStatusBadge(expense.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewExpense(expense)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {userProfile?.role === 'admin' && expense.status === 'pending' && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleStatusUpdate(expense.id, 'approved')}
                            >
                              <Check className="h-4 w-4 text-success" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleStatusUpdate(expense.id, 'rejected')}
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                        {userProfile?.role === 'admin' && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteExpense(expense.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Expense Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Expense Details</DialogTitle>
            <DialogDescription>
              View complete expense information
            </DialogDescription>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Amount</Label>
                  <p className="text-lg font-semibold">{formatCurrency(selectedExpense.amount)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Date</Label>
                  <p>{new Date(selectedExpense.expense_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedExpense.status)}</div>
                </div>
                {userProfile?.role === 'admin' && selectedExpense.profiles && (
                  <div>
                    <Label className="text-sm font-medium">Submitted by</Label>
                    <p>{selectedExpense.profiles.full_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedExpense.profiles.phone_number}</p>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="mt-1 p-3 bg-muted rounded-md">{selectedExpense.description}</p>
              </div>
              {selectedExpense.proof_url && (
                <div>
                  <Label className="text-sm font-medium">Proof/Receipt</Label>
                  <p className="text-sm text-muted-foreground mt-1">File attached</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExpensesPage;