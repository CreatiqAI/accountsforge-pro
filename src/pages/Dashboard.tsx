import { useAuth } from '@/hooks/useAuth';
import EmployeeDashboard from '@/components/dashboard/EmployeeDashboard';
import SalesmanDashboard from '@/components/dashboard/SalesmanDashboard';
import AdminDashboard from '@/components/dashboard/AdminDashboard';

const Dashboard = () => {
  const { userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="relative mb-8">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-primary/20 border-t-primary mx-auto"></div>
            <div className="absolute inset-0 rounded-full bg-primary/5 animate-pulse"></div>
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-2">
            Loading Dashboard
          </h2>
          <p className="text-muted-foreground">Preparing your personalized experience...</p>
        </div>
      </div>
    );
  }

  // Render role-specific dashboard
  switch (userProfile?.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'salesman':
      return <SalesmanDashboard />;
    case 'employee':
      return <EmployeeDashboard />;
    default:
      return (
        <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="p-6 bg-destructive/10 rounded-full w-fit mx-auto mb-6">
              <svg className="h-16 w-16 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-3">Access Denied</h2>
            <p className="text-muted-foreground text-lg">Please contact admin for role assignment.</p>
          </div>
        </div>
      );
  }
};

export default Dashboard;