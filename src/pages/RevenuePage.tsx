import { useState, useEffect } from 'react';
import { Plus, Filter, Eye, Upload, Check, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';

interface Revenue {
  id: string;
  amount: number;
  customer_name: string;
  invoice_number?: string;
  revenue_date: string;
  proof_url?: string;
  status: string;
  user_id: string;
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
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedRevenue, setSelectedRevenue] = useState<Revenue | null>(null);
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
      // First get revenues
      let revenuesQuery = supabase
        .from('revenues')
        .select('*')
        .order('revenue_date', { ascending: false });

      // Non-admins can only see their own revenues
      if (userProfile?.role !== 'admin') {
        revenuesQuery = revenuesQuery.eq('user_id', user?.id);
      }

      const { data: revenuesData, error: revenuesError } = await revenuesQuery;

      if (revenuesError) throw revenuesError;

      // Get user profiles for admin view
      if (userProfile?.role === 'admin' && revenuesData?.length > 0) {
        const userIds = [...new Set(revenuesData.map(r => r.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name, phone_number')
          .in('user_id', userIds);

        // Merge profile data with revenues
        const revenuesWithProfiles = revenuesData.map(revenue => ({
          ...revenue,
          profiles: profilesData?.find(p => p.user_id === revenue.user_id)
        }));

        setRevenues(revenuesWithProfiles);
      } else {
        setRevenues(revenuesData || []);
      }
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

  const handleUpdateStatus = async (revenueId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('revenues')
        .update({ status: newStatus })
        .eq('id', revenueId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Revenue ${newStatus} successfully`
      });

      fetchRevenues();
    } catch (error) {
      console.error('Error updating revenue status:', error);
      toast({
        title: "Error",
        description: "Failed to update revenue status",
        variant: "destructive"
      });
    }
  };

  const handleDeleteRevenue = async (revenueId: string) => {
    if (!confirm('Are you sure you want to delete this revenue entry?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('revenues')
        .delete()
        .eq('id', revenueId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Revenue deleted successfully"
      });

      fetchRevenues();
    } catch (error) {
      console.error('Error deleting revenue:', error);
      toast({
        title: "Error",
        description: "Failed to delete revenue",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending', variant: 'secondary' as const },
      approved: { label: 'Approved', variant: 'default' as const },
      rejected: { label: 'Rejected', variant: 'destructive' as const }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleViewRevenue = (revenue: Revenue) => {
    setSelectedRevenue(revenue);
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
                  <TableHead>Status</TableHead>
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
                    <TableCell>
                      {getStatusBadge(revenue.status)}
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
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewRevenue(revenue)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {userProfile?.role === 'admin' && revenue.status === 'pending' && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleUpdateStatus(revenue.id, 'approved')}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleUpdateStatus(revenue.id, 'rejected')}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {userProfile?.role === 'admin' && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteRevenue(revenue.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* View Revenue Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revenue Details</DialogTitle>
            <DialogDescription>
              View complete revenue information
            </DialogDescription>
          </DialogHeader>
          {selectedRevenue && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Amount</Label>
                  <p className="text-lg font-semibold">{formatCurrency(selectedRevenue.amount)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Date</Label>
                  <p>{new Date(selectedRevenue.revenue_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedRevenue.status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Invoice Number</Label>
                  <p>{selectedRevenue.invoice_number || 'N/A'}</p>
                </div>
                {userProfile?.role === 'admin' && selectedRevenue.profiles && (
                  <div className="col-span-2">
                    <Label className="text-sm font-medium">Submitted by</Label>
                    <p>{selectedRevenue.profiles.full_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedRevenue.profiles.phone_number}</p>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium">Customer Name</Label>
                <p className="mt-1 p-3 bg-muted rounded-md">{selectedRevenue.customer_name}</p>
              </div>
              {selectedRevenue.proof_url && (
                <div>
                  <Label className="text-sm font-medium">Invoice Proof</Label>
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

export default RevenuePage;