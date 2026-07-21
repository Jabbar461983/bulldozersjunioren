import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingScreen } from './LoadingScreen';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
