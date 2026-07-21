import { DashboardLayout } from '../components/DashboardLayout';

export function TrainerHome() {
  return (
    <DashboardLayout>
      <div className="card">
        <h2>Meine Junioren</h2>
        <p>Hier erscheinen bald die Junioren deines Teams samt Fortschritt.</p>
      </div>
      <div className="card">
        <h2>Uebungen verwalten</h2>
        <p>Hier kannst du bald Uebungen fuer deine Altersgruppe erstellen und bearbeiten.</p>
      </div>
    </DashboardLayout>
  );
}
