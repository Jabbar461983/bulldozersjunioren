import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';
import { uploadUebungBild } from '../lib/storage';
import { useAuth } from '../contexts/AuthContext';
import { ALTERSGRUPPEN, KATEGORIE_LABELS, KATEGORIEN } from '../lib/constants';
import type { Altersgruppe, Uebung, UebungKategorie } from '../types/database';

type BildModus = 'url' | 'upload';

interface UebungFormProps {
  initial: Uebung | null;
  onSaved: () => void;
  onCancel: () => void;
}

export function UebungForm({ initial, onSaved, onCancel }: UebungFormProps) {
  const { profile } = useAuth();

  const [titel, setTitel] = useState(initial?.titel ?? '');
  const [beschreibung, setBeschreibung] = useState(initial?.beschreibung ?? '');
  const [kategorie, setKategorie] = useState<UebungKategorie | ''>(initial?.kategorie ?? '');
  const [altersgruppen, setAltersgruppen] = useState<Altersgruppe[]>(
    initial?.altersgruppen ?? []
  );
  const [bildModus, setBildModus] = useState<BildModus>('url');
  const [bildUrl, setBildUrl] = useState(initial?.bild_url ?? '');
  const [bildFile, setBildFile] = useState<File | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleAltersgruppe(a: Altersgruppe) {
    setAltersgruppen((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!titel.trim()) {
      setError('Bitte einen Titel eingeben.');
      return;
    }
    if (!beschreibung.trim()) {
      setError('Bitte eine Beschreibung eingeben.');
      return;
    }
    if (!kategorie) {
      setError('Bitte eine Kategorie auswählen.');
      return;
    }
    if (altersgruppen.length === 0) {
      setError('Bitte mindestens eine Altersgruppe auswählen.');
      return;
    }
    if (!profile) {
      setError('Nicht angemeldet.');
      return;
    }

    setSubmitting(true);
    try {
      let finalBildUrl: string | null = initial?.bild_url ?? null;

      if (bildModus === 'upload' && bildFile) {
        finalBildUrl = await uploadUebungBild(bildFile, profile.id);
      } else if (bildModus === 'url') {
        finalBildUrl = bildUrl.trim() || null;
      }

      const payload = {
        titel: titel.trim(),
        beschreibung: beschreibung.trim(),
        kategorie,
        altersgruppen,
        bild_url: finalBildUrl,
      };

      if (initial) {
        const { error } = await supabase.from('uebungen').update(payload).eq('id', initial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('uebungen')
          .insert({ ...payload, erstellt_von: profile.id });
        if (error) throw error;
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Übung konnte nicht gespeichert werden.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card">
      <h2>{initial ? 'Übung bearbeiten' : 'Neue Übung erstellen'}</h2>
      {error && <div className="alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="uebung-titel">Titel</label>
          <input
            id="uebung-titel"
            type="text"
            required
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="uebung-beschreibung">Beschreibung</label>
          <textarea
            id="uebung-beschreibung"
            required
            rows={4}
            value={beschreibung}
            onChange={(e) => setBeschreibung(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="uebung-kategorie">Kategorie</label>
          <select
            id="uebung-kategorie"
            required
            value={kategorie}
            onChange={(e) => setKategorie(e.target.value as UebungKategorie)}
          >
            <option value="" disabled>
              Bitte wählen …
            </option>
            {KATEGORIEN.map((k) => (
              <option key={k} value={k}>
                {KATEGORIE_LABELS[k]}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Altersgruppen (Mehrfachauswahl)</label>
          <div className="radio-group">
            {ALTERSGRUPPEN.map((a) => (
              <label key={a}>
                <input
                  type="checkbox"
                  checked={altersgruppen.includes(a)}
                  onChange={() => toggleAltersgruppe(a)}
                />
                {a}
              </label>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Bild</label>
          <div className="radio-group" style={{ marginBottom: 10 }}>
            <label>
              <input
                type="radio"
                name="bild-modus"
                checked={bildModus === 'url'}
                onChange={() => setBildModus('url')}
              />
              Externe URL
            </label>
            <label>
              <input
                type="radio"
                name="bild-modus"
                checked={bildModus === 'upload'}
                onChange={() => setBildModus('upload')}
              />
              Datei hochladen
            </label>
          </div>

          {bildModus === 'url' ? (
            <input
              type="url"
              placeholder="https://…"
              value={bildUrl}
              onChange={(e) => setBildUrl(e.target.value)}
            />
          ) : (
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setBildFile(e.target.files?.[0] ?? null)}
            />
          )}
        </div>

        <div className="field">
          <label htmlFor="uebung-video">Video-URL</label>
          <input id="uebung-video" type="url" disabled placeholder="Kommt in einer späteren Version" />
          <small style={{ color: 'var(--color-text-muted)' }}>Kommt in einer späteren Version.</small>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Wird gespeichert …' : initial ? 'Speichern' : 'Übung erstellen'}
          </button>
          <button
            className="btn-secondary"
            type="button"
            onClick={onCancel}
            disabled={submitting}
          >
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  );
}
