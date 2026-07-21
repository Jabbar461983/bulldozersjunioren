import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { homePathForRole } from '../lib/roles';
import { LoadingScreen } from '../components/LoadingScreen';

export function RoleRedirect() {
  const { session, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  if (!profile) return <LoadingScreen />;

  return <Navigate to={homePathForRole(profile.rolle)} replace />;
}
