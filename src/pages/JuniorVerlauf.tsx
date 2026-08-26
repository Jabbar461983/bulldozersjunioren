import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { DashboardLayout } from '../components/DashboardLayout';
import { KATEGORIE_ICONS, KATEGORIE_LABELS } from '../lib/constants';
import type { Selbsteinschaetzung, Uebung } from '../types/database';

export function JuniorVerlauf() {
  const { profile } = useAuth();

  const [verlauf, setVerlauf] = useState<Selbsteinschaetzung[]>([]);
  const [uebungenById, setUebungenById] = useState<Map<string, Uebung>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;

    async function load() {
      setLoading(true);
      setError(null);

      const { data: einschaetzungen, error: verlaufError } = await supabase
        .from('selbsteinschaetzungen')
        .select('*')
        .eq('junior_id', profile!.id)
        .order('datum', { ascending: false })
        .order('created_at', { ascending: false });

      if (verlaufError) {
        setError(verlaufError.message);
        setLoading(false);
        return;
      }

      setVerlauf(einschaetzungen ?? []);

      const uebungIds = [...new Set((einschaetzungen ?? []).map((e) => e.uebung_id))];
      if (uebungIds.length > 0) {
        const { data: uebungen } = await supabase
          .from('uebungen')
          .select('*')
          .in('id', uebungIds);
        setUebungenById(new Map((uebungen ?? []).map((u) => [u.id, u])));
      }

      setLoading(false);
    }

    void load();
  }, [profile]);

  return (
    <DashboardLayout>
      <Link to="/junior">← Zurück</Link>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Mein Verlauf</h2>
        {error && <div className="alert-error">{error}</div>}
        {loading && <p>Wird geladen …</p>}
        {!loading && verlauf.length === 0 && <p>Noch keine Selbsteinschätzungen erfasst.</p>}

        {!loading &&
          verlauf.map((v) => {
            const uebung = uebungenById.get(v.uebung_id);
            return (
              <div key={v.id} className="history-row">
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {uebung && <span className="kategorie-icon">{KATEGORIE_ICONS[uebung.kategorie]}</span>}
                    {uebung?.titel ?? 'Übung gelöscht'}
                  </div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                    {new Date(v.datum).toLocaleDateString('de-CH')}
                    {uebung && ` · ${KATEGORIE_LABELS[uebung.kategorie]}`}
                  </div>
                </div>
                <span className="tag">{v.geschafft ? 'Geschafft' : 'Nicht geschafft'}</span>
                <span style={{ color: 'var(--color-text-muted)' }}>+{v.punkte_vergeben} Pkt.</span>
              </div>
            );
          })}
      </div>
    </DashboardLayout>
  );
}
