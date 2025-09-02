import { useState, useEffect } from 'react';
import { Plus, Filter, Eye, Check, X, DollarSign, Calendar, FileText } from 'lucide-react';
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

interface Claim {
  id: string;
  user_id: string;
  claim_type: 'expense_reimbursement' | 'commission' | 'bonus' | 'other';
  amount: number;
  description: string;
  expense_id?: string;
  performance_id?: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  submitted_date: string;
  reviewed_date?: string;
  paid_date?: string;
  payment_method?: string;
  payment_reference?: string;
  notes?: string;
  profiles?: {
    full_name: string;
    phone_number: string;
  };
}

const ClaimsPage = () => {
  const { userProfile, user } = useAuth();
  const { toast } = useToast();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [newClaim, setNewClaim] = useState({
    claim_type: 'expense_reimbursement' as const,
    amount: '',
    description: '',
    notes: ''
  });

  useEffect(() => {
    fetchClaims();
  }, [statusFilter, typeFilter]);

  const fetchClaims = async () => {
    try {
      let query = supabase
        .from('claims')
        .select(`
          *,
          profiles!inner(full_name, phone_number)
        `)
        .order('submitted_date', { ascending: false });

      // Apply filters
      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }
      if (typeFilter) {
        query = query.eq('claim_type', typeFilter);
      }

      // Non-admins can only see their own claims
      if (userProfile?.role !== 'admin') {
        query = query.eq('user_id', user?.id);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setClaims(data as unknown as Claim[]);
    } catch (error) {
      console.error('Error fetching claims:', error);
      toast({
        title: "Error",
        description: "Failed to fetch claims",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('claims')
        .insert({
          user_id: user?.id,
          claim_type: newClaim.claim_type,
          amount: parseFloat(newClaim.amount),
          description: newClaim.description,
          notes: newClaim.notes || null
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Claim submitted successfully"
      });

      setNewClaim({
        claim_type: 'expense_reimbursement',
        amount: '',
        description: '',
        notes: ''
      });
      setIsAddDialogOpen(false);
      fetchClaims();
    } catch (error) {
      console.error('Error adding claim:', error);
      toast({
        title: "Error",
        description: "Failed to submit claim",
        variant: "destructive"
      });
    }
  };

  const handleStatusUpdate = async (claimId: string, status: 'approved' | 'rejected' | 'paid', paymentData?: { method: string; reference: string }) => {
    try {
      const updateData: any = { 
        status,
        reviewed_date: new Date().toISOString().split('T')[0],
        reviewed_by: user?.id
      };

      if (status === 'paid' && paymentData) {
        updateData.paid_date = new Date().toISOString().split('T')[0];
        updateData.payment_method = paymentData.method;
        updateData.payment_reference = paymentData.reference;
      }

      const { error } = await supabase
        .from('claims')
        .update(updateData)
        .eq('id', claimId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Claim ${status} successfully`
      });

      fetchClaims();
    } catch (error) {
      console.error('Error updating claim status:', error);
      toast({
        title: "Error",
        description: "Failed to update claim status",
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success text-success-foreground">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'paid':
        return <Badge className="bg-primary text-primary-foreground">Paid</Badge>;
      default:
        return <Badge className="bg-warning text-warning-foreground">Pending</Badge>;
    }
  };

  const getClaimTypeBadge = (type: string) => {
    const colors = {
      expense_reimbursement: 'bg-orange-100 text-orange-800',
      commission: 'bg-green-100 text-green-800',
      bonus: 'bg-blue-100 text-blue-800',
      other: 'bg-gray-100 text-gray-800'
    };

    const labels = {
      expense_reimbursement: 'Expense',
      commission: 'Commission',
      bonus: 'Bonus',
      other: 'Other'
    };

    return (
      <Badge className={colors[type as keyof typeof colors] || colors.other}>
        {labels[type as keyof typeof labels] || type}
      </Badge>
    );
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

  // Calculate summary stats
  const totalPendingAmount = claims
    .filter(c => c.status === 'pending')
    .reduce((sum, c) => sum + c.amount, 0);
  
  const totalApprovedAmount = claims
    .filter(c => c.status === 'approved')
    .reduce((sum, c) => sum + c.amount, 0);

  const totalPaidAmount = claims
    .filter(c => c.status === 'paid')
    .reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Claims Management</h1>
          <p className="text-muted-foreground">
            Track and manage expense claims and payments
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary-dark">
                <Plus className="h-4 w-4 mr-2" />
                Submit Claim
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Submit New Claim</DialogTitle>
                <DialogDescription>
                  Submit a new claim for reimbursement or payment.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddClaim} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="claim_type">Claim Type</Label>
                  <Select 
                    value={newClaim.claim_type} 
                    onValueChange={(value: any) => setNewClaim({ ...newClaim, claim_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense_reimbursement">Expense Reimbursement</SelectItem>
                      <SelectItem value="commission">Commission</SelectItem>
                      <SelectItem value="bonus">Bonus</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newClaim.amount}
                    onChange={(e) => setNewClaim({ ...newClaim, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your claim..."
                    value={newClaim.description}
                    onChange={(e) => setNewClaim({ ...newClaim, description: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional information..."
                    value={newClaim.notes}
                    onChange={(e) => setNewClaim({ ...newClaim, notes: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">Submit Claim</Button>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Claims</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{formatCurrency(totalPendingAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {claims.filter(c => c.status === 'pending').length} claims pending review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Claims</CardTitle>
            <Check className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatCurrency(totalApprovedAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {claims.filter(c => c.status === 'approved').length} claims awaiting payment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Claims</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPaidAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {claims.filter(c => c.status === 'paid').length} claims completed
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  <SelectItem value="expense_reimbursement">Expense Reimbursement</SelectItem>
                  <SelectItem value="commission">Commission</SelectItem>
                  <SelectItem value="bonus">Bonus</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setStatusFilter('');
                  setTypeFilter('');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Claims Table */}
      <Card>
        <CardHeader>
          <CardTitle>Claims</CardTitle>
          <CardDescription>
            {claims.length} total claims
          </CardDescription>
        </CardHeader>
        <CardContent>
          {claims.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No claims found</p>
              <Button 
                className="mt-4" 
                onClick={() => setIsAddDialogOpen(true)}
              >
                Submit Your First Claim
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Description</TableHead>
                  {userProfile?.role === 'admin' && <TableHead>Claimant</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.map((claim) => (
                  <TableRow key={claim.id}>
                    <TableCell>
                      {new Date(claim.submitted_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {getClaimTypeBadge(claim.claim_type)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(claim.amount)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {claim.description}
                    </TableCell>
                    {userProfile?.role === 'admin' && (
                      <TableCell>
                        <div>
                          <p className="font-medium">{claim.profiles?.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {claim.profiles?.phone_number}
                          </p>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      {getStatusBadge(claim.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {userProfile?.role === 'admin' && claim.status === 'pending' && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleStatusUpdate(claim.id, 'approved')}
                            >
                              <Check className="h-4 w-4 text-success" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleStatusUpdate(claim.id, 'rejected')}
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                        {userProfile?.role === 'admin' && claim.status === 'approved' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleStatusUpdate(claim.id, 'paid', { method: 'bank_transfer', reference: 'TXN-' + Date.now() })}
                          >
                            Mark Paid
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
    </div>
  );
};

export default ClaimsPage;