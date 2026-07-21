import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';

const ROLE_LABELS: Record<string, string> = {
  junior: 'Junior',
  trainer: 'Trainer',
  admin: 'Admin',
};

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();

  return (
    <div className="app-shell" style={{ maxWidth: 720 }}>
      <div className="dashboard-header">
        <div>
          <h1 style={{ fontSize: '1.4rem' }}>Hallo, {profile?.name}</h1>
          {profile && <span className="role-pill">{ROLE_LABELS[profile.rolle]}</span>}
        </div>
        <button className="btn-secondary" onClick={() => void signOut()}>
          Abmelden
        </button>
      </div>
      {children}
    </div>
  );
}
