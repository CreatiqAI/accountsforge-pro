import { useState, useEffect } from 'react';
import { Plus, Filter, Eye, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Revenue {
  id: string;
  amount: number;
  customer_name: string;
  invoice_number?: string;
  revenue_date: string;
  proof_url?: string;
  profiles?: {
    full_name: string;
    phone_number: string;
  };
}

const RevenuePage = () => {
  const { userProfile, user } = useAuth();
  const { toast } = useToast();
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newRevenue, setNewRevenue] = useState({
    amount: '',
    customer_name: '',
    invoice_number: '',
    revenue_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchRevenues();
  }, []);

  const fetchRevenues = async () => {
    try {
      let query = supabase
        .from('revenues')
        .select(`
          id,
          amount,
          customer_name,
          invoice_number,
          revenue_date,
          proof_url,
          user_id
        `)
        .order('revenue_date', { ascending: false });

      // Non-admins can only see their own revenues
      if (userProfile?.role !== 'admin') {
        query = query.eq('user_id', user?.id);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setRevenues((data || []) as Revenue[]);
    } catch (error) {
      console.error('Error fetching revenues:', error);
      toast({
        title: "Error",
        description: "Failed to fetch revenues",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRevenue = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('revenues')
        .insert({
          amount: parseFloat(newRevenue.amount),
          customer_name: newRevenue.customer_name,
          invoice_number: newRevenue.invoice_number || null,
          revenue_date: newRevenue.revenue_date,
          user_id: user?.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Revenue added successfully"
      });

      setNewRevenue({
        amount: '',
        customer_name: '',
        invoice_number: '',
        revenue_date: new Date().toISOString().split('T')[0],
      });
      setIsAddDialogOpen(false);
      fetchRevenues();
    } catch (error) {
      console.error('Error adding revenue:', error);
      toast({
        title: "Error",
        description: "Failed to add revenue",
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
          <h1 className="text-3xl font-bold text-foreground">Revenue</h1>
          <p className="text-muted-foreground">
            Manage and track revenue entries
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
                Add Revenue
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Revenue</DialogTitle>
                <DialogDescription>
                  Enter the details for your new revenue entry.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddRevenue} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newRevenue.amount}
                    onChange={(e) => setNewRevenue({ ...newRevenue, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_name">Customer Name</Label>
                  <Input
                    id="customer_name"
                    placeholder="Enter customer name..."
                    value={newRevenue.customer_name}
                    onChange={(e) => setNewRevenue({ ...newRevenue, customer_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice_number">Invoice Number (Optional)</Label>
                  <Input
                    id="invoice_number"
                    placeholder="INV-001"
                    value={newRevenue.invoice_number}
                    onChange={(e) => setNewRevenue({ ...newRevenue, invoice_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="revenue_date">Date</Label>
                  <Input
                    id="revenue_date"
                    type="date"
                    value={newRevenue.revenue_date}
                    onChange={(e) => setNewRevenue({ ...newRevenue, revenue_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Invoice Proof (Optional)</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      File upload functionality coming soon
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">Add Revenue</Button>
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

      {/* Revenue Table */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Entries</CardTitle>
          <CardDescription>
            {revenues.length} total revenue entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {revenues.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No revenue entries found</p>
              <Button 
                className="mt-4" 
                onClick={() => setIsAddDialogOpen(true)}
              >
                Add Your First Revenue Entry
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Invoice #</TableHead>
                  {userProfile?.role === 'admin' && <TableHead>Salesman</TableHead>}
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenues.map((revenue) => (
                  <TableRow key={revenue.id}>
                    <TableCell>
                      {new Date(revenue.revenue_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium text-success">
                      {formatCurrency(revenue.amount)}
                    </TableCell>
                    <TableCell>
                      {revenue.customer_name}
                    </TableCell>
                    <TableCell>
                      {revenue.invoice_number || '-'}
                    </TableCell>
                    {userProfile?.role === 'admin' && (
                      <TableCell>
                        <div>
                          <p className="font-medium">{revenue.profiles?.full_name || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">
                            {revenue.profiles?.phone_number || 'N/A'}
                          </p>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
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
  );
};

export default RevenuePage;