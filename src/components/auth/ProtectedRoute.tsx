import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from './AuthForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const [authMode, setAuthMode] = React.useState<'login' | 'signup'>('login');

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Loading...</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Niles</h1>
            <p className="text-muted-foreground">Walsh Family Organizer</p>
          </div>
          
          <AuthForm 
            mode={authMode} 
            onToggleMode={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} 
          />
        </div>
      </div>
    );
  }

  return <>{children}</>;
};