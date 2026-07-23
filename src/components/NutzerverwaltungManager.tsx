import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { leseEdgeFunctionFehler } from '../lib/functionsError';
import type { Rolle, Team, User } from '../types/database';
import { NutzerForm } from './NutzerForm';
import { ConfirmDialog } from './ConfirmDialog';

const ROLE_LABELS: Record<Rolle, string> = {
  junior: 'Junior',
  trainer: 'Trainer',
  admin: 'Admin',
};

const ROLLEN: Rolle[] = ['junior', 'trainer', 'admin'];

interface NutzerverwaltungManagerProps {
  teams: Team[];
}

export function NutzerverwaltungManager({ teams }: NutzerverwaltungManagerProps) {
  const { profile } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterRolle, setFilterRolle] = useState<Rolle | ''>('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const teamNameById = useMemo(() => new Map(teams.map((t) => [t.id, t.name])), [teams]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from('users')
      .select('*')
      .order('rolle', { ascending: true })
      .order('vorname', { ascending: true });

    if (filterRolle) query = query.eq('rolle', filterRolle);

    const { data, error } = await query;
    if (error) setError(error.message);
    else setUsers(data ?? []);
    setLoading(false);
  }, [filterRolle]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  function openCreateForm() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEditForm(u: User) {
    setEditing(u);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
  }

  function handleSaved() {
    closeForm();
    void loadUsers();
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-management', {
        body: { action: 'delete', user_id: deleteTarget.id },
      });
      if (error) {
        throw new Error(await leseEdgeFunctionFehler(error, 'Nutzer konnte nicht gelöscht werden.'));
      }
      if (data?.error) throw new Error(data.error);

      setDeleteTarget(null);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nutzer konnte nicht gelöscht werden.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {formOpen && (
        <NutzerForm initial={editing} teams={teams} onSaved={handleSaved} onCancel={closeForm} />
      )}

      <div className="card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: 0 }}>Nutzerverwaltung</h2>
          {!formOpen && (
            <button className="btn-primary" style={{ width: 'auto' }} onClick={openCreateForm}>
              + Neuer Nutzer
            </button>
          )}
        </div>

        {error && <div className="alert-error">{error}</div>}

        <div className="filter-bar">
          <div className="field">
            <label htmlFor="filter-rolle">Rolle</label>
            <select
              id="filter-rolle"
              value={filterRolle}
              onChange={(e) => setFilterRolle(e.target.value as Rolle | '')}
            >
              <option value="">Alle Rollen</option>
              {ROLLEN.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && <p>Wird geladen …</p>}
        {!loading && users.length === 0 && <p>Keine Nutzer gefunden.</p>}

        {!loading && users.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="uebungen-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>E-Mail</th>
                  <th>Rolle</th>
                  <th>Team</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const istEigenesKonto = u.id === profile?.id;
                  return (
                    <tr key={u.id}>
                      <td>
                        {u.vorname} {u.nachname}
                        {istEigenesKonto && ' (Du)'}
                      </td>
                      <td>{u.email}</td>
                      <td>{ROLE_LABELS[u.rolle]}</td>
                      <td>{u.team_id ? teamNameById.get(u.team_id) ?? '—' : '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn-secondary" onClick={() => openEditForm(u)}>
                            Bearbeiten
                          </button>
                          <button
                            className="btn-danger"
                            onClick={() => setDeleteTarget(u)}
                            disabled={istEigenesKonto}
                            title={
                              istEigenesKonto
                                ? 'Du kannst dein eigenes Konto nicht löschen.'
                                : undefined
                            }
                          >
                            Löschen
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Nutzer löschen?"
        message={`Möchtest du "${deleteTarget?.vorname} ${deleteTarget?.nachname}" wirklich unwiderruflich löschen? Alle zugehörigen Daten (Selbsteinschätzungen, Badges, Freundeschallenges) werden ebenfalls entfernt.`}
        busy={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
