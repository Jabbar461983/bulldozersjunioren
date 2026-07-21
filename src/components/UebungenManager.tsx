import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { ALTERSGRUPPEN, KATEGORIE_ICONS, KATEGORIE_LABELS, KATEGORIEN } from '../lib/constants';
import type { Altersgruppe, Uebung, UebungKategorie } from '../types/database';
import { UebungForm } from './UebungForm';
import { ConfirmDialog } from './ConfirmDialog';

export function UebungenManager() {
  const { profile } = useAuth();

  const [uebungen, setUebungen] = useState<Uebung[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterKategorie, setFilterKategorie] = useState<UebungKategorie | ''>('');
  const [filterAltersgruppe, setFilterAltersgruppe] = useState<Altersgruppe | ''>('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Uebung | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Uebung | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadUebungen = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from('uebungen')
      .select('*')
      .order('kategorie', { ascending: true })
      .order('titel', { ascending: true });

    if (filterKategorie) query = query.eq('kategorie', filterKategorie);
    if (filterAltersgruppe) query = query.contains('altersgruppen', [filterAltersgruppe]);

    const { data, error } = await query;
    if (error) setError(error.message);
    else setUebungen(data ?? []);
    setLoading(false);
  }, [filterKategorie, filterAltersgruppe]);

  useEffect(() => {
    void loadUebungen();
  }, [loadUebungen]);

  function canManage(u: Uebung): boolean {
    if (!profile) return false;
    return profile.rolle === 'admin' || u.erstellt_von === profile.id;
  }

  function openCreateForm() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEditForm(u: Uebung) {
    setEditing(u);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
  }

  function handleSaved() {
    closeForm();
    void loadUebungen();
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('uebungen').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setDeleteTarget(null);
      await loadUebungen();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Uebung konnte nicht geloescht werden.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {formOpen && (
        <UebungForm initial={editing} onSaved={handleSaved} onCancel={closeForm} />
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
          <h2 style={{ margin: 0 }}>Uebungen</h2>
          {!formOpen && (
            <button className="btn-primary" style={{ width: 'auto' }} onClick={openCreateForm}>
              + Neue Uebung
            </button>
          )}
        </div>

        {error && <div className="alert-error">{error}</div>}

        <div className="filter-bar">
          <div className="field">
            <label htmlFor="filter-kategorie">Kategorie</label>
            <select
              id="filter-kategorie"
              value={filterKategorie}
              onChange={(e) => setFilterKategorie(e.target.value as UebungKategorie | '')}
            >
              <option value="">Alle Kategorien</option>
              {KATEGORIEN.map((k) => (
                <option key={k} value={k}>
                  {KATEGORIE_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="filter-altersgruppe">Altersgruppe</label>
            <select
              id="filter-altersgruppe"
              value={filterAltersgruppe}
              onChange={(e) => setFilterAltersgruppe(e.target.value as Altersgruppe | '')}
            >
              <option value="">Alle Altersgruppen</option>
              {ALTERSGRUPPEN.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && <p>Wird geladen …</p>}
        {!loading && uebungen.length === 0 && <p>Keine Uebungen gefunden.</p>}

        {!loading && uebungen.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="uebungen-table">
              <thead>
                <tr>
                  <th>Titel</th>
                  <th>Kategorie</th>
                  <th>Altersgruppen</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {uebungen.map((u) => (
                  <tr key={u.id}>
                    <td>{u.titel}</td>
                    <td>
                      <span className="kategorie-icon">{KATEGORIE_ICONS[u.kategorie]}</span>
                      {KATEGORIE_LABELS[u.kategorie]}
                    </td>
                    <td>
                      {u.altersgruppen.map((a) => (
                        <span key={a} className="tag">
                          {a}
                        </span>
                      ))}
                    </td>
                    <td>
                      {canManage(u) ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn-secondary" onClick={() => openEditForm(u)}>
                            Bearbeiten
                          </button>
                          <button className="btn-danger" onClick={() => setDeleteTarget(u)}>
                            Loeschen
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Uebung loeschen?"
        message={`Moechtest du "${deleteTarget?.titel}" wirklich unwiderruflich loeschen?`}
        busy={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
