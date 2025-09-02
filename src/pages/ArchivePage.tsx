import { useState, useEffect } from 'react';
import { Search, Download, Eye, FileText, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ArchiveItem {
  id: string;
  type: 'expense' | 'revenue';
  description: string;
  amount: number;
  date: string;
  proof_url?: string;
  customer_name?: string;
  status?: string;
}

const ArchivePage = () => {
  const { userProfile, user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<ArchiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchArchiveItems();
  }, []);

  const fetchArchiveItems = async () => {
    try {
      // Fetch expenses
      let expenseQuery = supabase
        .from('expenses')
        .select('id, amount, description, expense_date, proof_url, status');
      
      // Fetch revenues
      let revenueQuery = supabase
        .from('revenues')
        .select('id, amount, customer_name, revenue_date, proof_url');

      // Apply user filtering if not admin
      if (userProfile?.role !== 'admin') {
        expenseQuery = expenseQuery.eq('user_id', user?.id);
        revenueQuery = revenueQuery.eq('user_id', user?.id);
      }

      const [expenseResult, revenueResult] = await Promise.all([
        expenseQuery,
        revenueQuery
      ]);

      if (expenseResult.error) throw expenseResult.error;
      if (revenueResult.error) throw revenueResult.error;

      // Transform and combine data
      const expenseItems: ArchiveItem[] = (expenseResult.data || []).map(expense => ({
        id: expense.id,
        type: 'expense' as const,
        description: expense.description,
        amount: expense.amount,
        date: expense.expense_date,
        proof_url: expense.proof_url,
        status: expense.status
      }));

      const revenueItems: ArchiveItem[] = (revenueResult.data || []).map(revenue => ({
        id: revenue.id,
        type: 'revenue' as const,
        description: `Revenue from ${revenue.customer_name}`,
        amount: revenue.amount,
        date: revenue.revenue_date,
        proof_url: revenue.proof_url,
        customer_name: revenue.customer_name
      }));

      // Combine and sort by date
      const allItems = [...expenseItems, ...revenueItems]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setItems(allItems);
    } catch (error) {
      console.error('Error fetching archive items:', error);
      toast({
        title: "Error",
        description: "Failed to fetch archive items",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item =>
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getTypeBadge = (type: string) => {
    return type === 'revenue' 
      ? <Badge className="bg-success text-success-foreground">Revenue</Badge>
      : <Badge variant="secondary">Expense</Badge>;
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    switch (status) {
      case 'approved':
        return <Badge className="bg-success text-success-foreground">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge className="bg-warning text-warning-foreground">Pending</Badge>;
    }
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
          <h1 className="text-3xl font-bold text-foreground">Archive</h1>
          <p className="text-muted-foreground">
            View and manage all uploaded proofs and transaction records
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export All
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Archive Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Archive</CardTitle>
          <CardDescription>
            {filteredItems.length} items found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? 'No items match your search' : 'No archived items found'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Proof</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={`${item.type}-${item.id}`}>
                    <TableCell>
                      {new Date(item.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {getTypeBadge(item.type)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {item.description}
                    </TableCell>
                    <TableCell className={`font-medium ${
                      item.type === 'revenue' ? 'text-success' : 'text-foreground'
                    }`}>
                      {formatCurrency(item.amount)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(item.status)}
                    </TableCell>
                    <TableCell>
                      {item.proof_url ? (
                        <div className="flex items-center gap-1">
                          <Image className="h-4 w-4 text-primary" />
                          <span className="text-sm text-primary">Available</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {item.proof_url && (
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
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

export default ArchivePage;