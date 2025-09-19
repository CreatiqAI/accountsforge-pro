import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, Phone, Lock, User, UserCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const AuthPage = () => {
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [signInData, setSignInData] = useState({
    phone: '+60',
    password: ''
  });
  
  const [signUpData, setSignUpData] = useState({
    phone: '+60',
    password: '',
    fullName: '',
    role: 'employee'
  });

  // Format phone number to ensure +60 prefix
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digitsOnly = value.replace(/\D/g, '');
    
    // If it starts with 60, add the + prefix
    if (digitsOnly.startsWith('60')) {
      return '+' + digitsOnly;
    }
    
    // If it starts with 0, replace with +60
    if (digitsOnly.startsWith('0')) {
      return '+60' + digitsOnly.substring(1);
    }
    
    // If it's just digits without 60 prefix, add +60
    if (digitsOnly.length > 0 && !digitsOnly.startsWith('60')) {
      return '+60' + digitsOnly;
    }
    
    // Default to +60
    return '+60';
  };

  const handlePhoneChange = (value: string, isSignUp: boolean = false) => {
    const formatted = formatPhoneNumber(value);
    
    if (isSignUp) {
      setSignUpData({ ...signUpData, phone: formatted });
    } else {
      setSignInData({ ...signInData, phone: formatted });
    }
  };

  // Redirect if already authenticated
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await signIn(signInData.phone, signInData.password);
    
    if (error) {
      toast({
        title: "Sign In Failed",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "You have been signed in successfully."
      });
    }
    
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await signUp(signUpData.phone, signUpData.password, signUpData.fullName, signUpData.role);
    
    if (error) {
      toast({
        title: "Sign Up Failed",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Account Created",
        description: "Your account has been created successfully. Please sign in."
      });
      // Switch to sign in tab
      // Reset form but keep +60 prefix
      setSignUpData({ phone: '+60', password: '', fullName: '', role: 'employee' });
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light to-accent flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Calculator className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-primary-dark">AccountsForge Pro</h1>
          <p className="text-muted-foreground mt-2">Professional Accounting Software</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-center text-primary-dark">Access Your Account</CardTitle>
            <CardDescription className="text-center">
              Sign in to manage your finances
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                   <div className="space-y-2">
                     <Label htmlFor="signin-phone">Phone Number</Label>
                     <div className="relative">
                       <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                       <Input
                         id="signin-phone"
                         type="tel"
                         placeholder="+60123456789"
                         value={signInData.phone}
                         onChange={(e) => handlePhoneChange(e.target.value, false)}
                         className="pl-9"
                         required
                         maxLength={15}
                       />
                     </div>
                     <p className="text-xs text-muted-foreground">
                       Malaysian phone number format: +60123456789
                     </p>
                   </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="••••••••"
                        value={signInData.password}
                        onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary-dark" 
                    disabled={loading}
                  >
                    {loading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="John Doe"
                        value={signUpData.fullName}
                        onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>
                  
                   <div className="space-y-2">
                     <Label htmlFor="signup-phone">Phone Number</Label>
                     <div className="relative">
                       <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                       <Input
                         id="signup-phone"
                         type="tel"
                         placeholder="+60123456789"
                         value={signUpData.phone}
                         onChange={(e) => handlePhoneChange(e.target.value, true)}
                         className="pl-9"
                         required
                         maxLength={15}
                       />
                     </div>
                     <p className="text-xs text-muted-foreground">
                       Malaysian phone number format: +60123456789
                     </p>
                   </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-role">Role</Label>
                    <div className="relative">
                      <UserCheck className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                      <Select 
                        value={signUpData.role} 
                        onValueChange={(value) => setSignUpData({ ...signUpData, role: value })}
                      >
                        <SelectTrigger className="pl-9">
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="salesman">Salesman</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Employee: Submit expenses and claims | Salesman: Track sales + commissions | Admin: Full access
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={signUpData.password}
                        onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                        className="pl-9"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary-dark" 
                    disabled={loading}
                  >
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;