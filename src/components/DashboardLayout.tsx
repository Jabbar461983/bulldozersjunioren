import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { levelFortschritt } from '../lib/gamification';

const ROLE_LABELS: Record<string, string> = {
  junior: 'Junior',
  admin: 'Admin',
};

// Globaler Header (design_handoff_junioren_pwa, "Globaler Header (gilt für
// alle Seiten)"): schwarze Fläche mit Wappen-Wasserzeichen, Eyebrow,
// Begrüssung. Punkte-/Levelzeile nur für Junioren, da nur diese punkten.
export function DashboardLayout({ children }: { children: ReactNode }) {
  const { profile, team, signOut } = useAuth();

  const fortschritt = profile ? levelFortschritt(profile.punkte_total) : null;

  return (
    <div className="app-shell app-shell--dashboard">
      <div className="dashboard-header">
        <img
          src="/logo-bulldozers_farbig.png"
          alt=""
          aria-hidden="true"
          className="dashboard-header-watermark"
        />
        <div className="dashboard-header-top">
          <div>
            <div className="dashboard-eyebrow">Bulldozers Juniorentraining</div>
            <h1 className="dashboard-greeting">
              Hallo
              <br />
              {profile?.vorname}
            </h1>
            {profile && (
              <div className="dashboard-role-row">
                <span className="role-pill">{team?.name ?? ROLE_LABELS[profile.rolle]}</span>
              </div>
            )}
          </div>
          <button className="dashboard-abmelden" onClick={() => void signOut()}>
            Abmelden
          </button>
        </div>

        {profile?.rolle === 'junior' && fortschritt && (
          <div>
            <div className="dashboard-points-row">
              <span className="dashboard-points-value">{profile.punkte_total}</span>
              <span className="dashboard-points-label">
                Punkte · Level {fortschritt.level}
              </span>
            </div>
            <div className="progress-track" style={{ marginTop: 14 }}>
              <div className="progress-fill" style={{ width: `${fortschritt.prozent}%` }} />
            </div>
            <div className="dashboard-restanzeige">
              Noch {fortschritt.punkteBisNaechstesLevel} Punkte bis Level {fortschritt.level + 1}
            </div>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
