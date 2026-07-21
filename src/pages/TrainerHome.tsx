import { DashboardLayout } from '../components/DashboardLayout';
import { UebungenManager } from '../components/UebungenManager';

export function TrainerHome() {
  return (
    <DashboardLayout>
      <div className="card">
        <h2>Meine Junioren</h2>
        <p>Hier erscheinen bald die Junioren deines Teams samt Fortschritt.</p>
      </div>
      <UebungenManager />
    </DashboardLayout>
  );
}
