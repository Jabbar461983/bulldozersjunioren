import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';

const ROLE_LABELS: Record<string, string> = {
  junior: 'Junior',
  trainer: 'Trainer',
  admin: 'Admin',
};

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { profile, team, signOut } = useAuth();

  return (
    <div className="app-shell app-shell--dashboard">
      <div className="dashboard-header">
        <div className="dashboard-brand">
          {team?.logo_url ? (
            <img src={team.logo_url} alt={team.name} className="dashboard-logo" />
          ) : (
            <img
              src="/logo-bulldozers_farbig.png"
              alt="Streethockeyclub Bulldozers"
              className="dashboard-logo"
            />
          )}
          <div>
            <h1 style={{ fontSize: '1.4rem', margin: 0 }}>
              Hallo, {profile?.vorname} {profile?.nachname}
            </h1>
            {profile && <span className="role-pill">{ROLE_LABELS[profile.rolle]}</span>}
          </div>
        </div>
        <button className="btn-secondary" onClick={() => void signOut()}>
          Abmelden
        </button>
      </div>
      {children}
    </div>
  );
}
