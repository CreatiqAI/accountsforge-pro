import { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Phone, Mail, Calendar, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  user_id: string;
  phone_number: string;
  full_name: string;
  role: 'admin' | 'salesman' | 'employee';
  created_at: string;
  updated_at: string;
}

const UserManagementPage = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    phone: '',
    password: '',
    fullName: '',
    role: 'employee'
  });

  useEffect(() => {
    if (userProfile?.role === 'admin') {
      fetchUsers();
    }
  }, [userProfile]);

  // Redirect if not admin
  if (userProfile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center bg-white rounded-lg shadow-sm border border-gray-200 p-12 max-w-md">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <Shield className="h-8 w-8 text-gray-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">
            Access Denied
          </h2>
          <p className="text-gray-600">
            Only administrators can access user management.
          </p>
        </div>
      </div>
    );
  }

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Create user in Supabase Auth
      const { data, error } = await supabase.auth.admin.createUser({
        phone: newUser.phone,
        password: newUser.password,
        user_metadata: {
          full_name: newUser.fullName,
          role: newUser.role
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "User created successfully"
      });

      setNewUser({
        phone: '',
        password: '',
        fullName: '',
        role: 'employee'
      });
      setIsAddDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'salesman' | 'employee') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole as any })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Role updated to ${newRole}`
      });

      fetchUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive"
      });
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'admin') {
      return (
        <Badge className="bg-gray-900 text-white border-0 font-medium">
          Admin
        </Badge>
      );
    } else if (role === 'salesman') {
      return (
        <Badge className="bg-gray-600 text-white border-0 font-medium">
          Salesman
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-blue-600 text-white border-0 font-medium">
          Employee
        </Badge>
      );
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse mb-8"></div>
          <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate summary stats
  const totalUsers = users.length;
  const adminCount = users.filter(u => u.role === 'admin').length;
  const employeeCount = users.filter(u => u.role === 'employee').length;
  const salesmanCount = users.filter(u => u.role === 'salesman').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              User Management
            </h1>
            <p className="text-gray-600">
              Manage user accounts and permissions
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-md font-medium transition-colors">
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border border-gray-200 rounded-lg shadow-lg">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-gray-900">
                  Add New User
                </DialogTitle>
                <DialogDescription className="text-gray-600">
                  Create a new user account for the system.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-gray-700 font-medium">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    value={newUser.fullName}
                    onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                    className="border-gray-300 focus:border-gray-500 focus:ring-gray-500/20"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-gray-700 font-medium">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1234567890"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    className="border-gray-300 focus:border-gray-500 focus:ring-gray-500/20"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="border-gray-300 focus:border-gray-500 focus:ring-gray-500/20"
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-gray-700 font-medium">Role</Label>
                  <Select
                    value={newUser.role}
                    onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                  >
                    <SelectTrigger className="border-gray-300 focus:border-gray-500 focus:ring-gray-500/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="salesman">Salesman</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
                    disabled={loading}
                  >
                    {loading ? 'Creating...' : 'Create User'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
              <div className="p-2 bg-gray-100 rounded-md">
                <Users className="h-4 w-4 text-gray-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{totalUsers}</div>
              <p className="text-xs text-gray-500 mt-1">
                Active user accounts
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Administrators</CardTitle>
              <div className="p-2 bg-gray-100 rounded-md">
                <Shield className="h-4 w-4 text-gray-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{adminCount}</div>
              <p className="text-xs text-gray-500 mt-1">
                Full system access
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Employees</CardTitle>
              <div className="p-2 bg-gray-100 rounded-md">
                <Users className="h-4 w-4 text-gray-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{employeeCount}</div>
              <p className="text-xs text-gray-500 mt-1">
                Expense & claim management
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Salesmen</CardTitle>
              <div className="p-2 bg-gray-100 rounded-md">
                <Users className="h-4 w-4 text-gray-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{salesmanCount}</div>
              <p className="text-xs text-gray-500 mt-1">
                Sales & commission tracking
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-md">
                <Users className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">All Users</CardTitle>
                <CardDescription className="text-gray-600">
                  {users.length} total users in the system
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {users.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                <p className="text-gray-600 mb-6">Get started by adding your first user to the system</p>
                <Button
                  className="bg-gray-900 hover:bg-gray-800 text-white"
                  onClick={() => setIsAddDialogOpen(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Your First User
                </Button>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-gray-700 font-medium">Name</TableHead>
                      <TableHead className="text-gray-700 font-medium">Phone</TableHead>
                      <TableHead className="text-gray-700 font-medium">Role</TableHead>
                      <TableHead className="text-gray-700 font-medium">Joined</TableHead>
                      <TableHead className="text-gray-700 font-medium">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow
                        key={user.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <TableCell className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-600">
                                {user.full_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium text-gray-900">{user.full_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">{user.phone_number}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          {getRoleBadge(user.role)}
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">{new Date(user.created_at).toLocaleDateString()}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-white border border-gray-200 shadow-lg">
                              {user.role !== 'admin' && (
                                <DropdownMenuItem
                                  onClick={() => handleRoleChange(user.user_id, 'admin')}
                                  className="text-gray-700 hover:bg-gray-100 cursor-pointer"
                                >
                                  <Shield className="h-4 w-4 mr-2" />
                                  Change to Admin
                                </DropdownMenuItem>
                              )}
                              {user.role !== 'salesman' && (
                                <DropdownMenuItem
                                  onClick={() => handleRoleChange(user.user_id, 'salesman')}
                                  className="text-gray-700 hover:bg-gray-100 cursor-pointer"
                                >
                                  <Users className="h-4 w-4 mr-2" />
                                  Change to Salesman
                                </DropdownMenuItem>
                              )}
                              {user.role !== 'employee' && (
                                <DropdownMenuItem
                                  onClick={() => handleRoleChange(user.user_id, 'employee')}
                                  className="text-gray-700 hover:bg-gray-100 cursor-pointer"
                                >
                                  <Users className="h-4 w-4 mr-2" />
                                  Change to Employee
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserManagementPage;