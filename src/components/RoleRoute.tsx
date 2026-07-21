import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { Rolle } from '../types/database';
import { homePathForRole } from '../lib/roles';
import { LoadingScreen } from './LoadingScreen';

export function RoleRoute({
  allowed,
  children,
}: {
  allowed: Rolle[];
  children: ReactNode;
}) {
  const { profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!profile) return <Navigate to="/login" replace />;
  if (!allowed.includes(profile.rolle)) {
    return <Navigate to={homePathForRole(profile.rolle)} replace />;
  }

  return <>{children}</>;
}
