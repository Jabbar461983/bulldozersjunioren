import { useAuth } from '../contexts/AuthContext';
import { DashboardLayout } from '../components/DashboardLayout';

export function JuniorHome() {
  const { profile } = useAuth();

  return (
    <DashboardLayout>
      <div className="card">
        <h2>Meine Statistik</h2>
        <p>Punkte gesamt: {profile?.punkte_total ?? 0}</p>
        <p>Level: {profile?.level_aktuell ?? 1}</p>
        <p>Streak: {profile?.streak_counter ?? 0} Tage</p>
      </div>
      <div className="card">
        <h2>Uebungen</h2>
        <p>Hier erscheinen bald die Uebungen deiner Altersgruppe.</p>
      </div>
      <div className="card">
        <h2>Rangliste</h2>
        <p>Hier erscheint bald die Rangliste deines Teams.</p>
      </div>
    </DashboardLayout>
  );
}
