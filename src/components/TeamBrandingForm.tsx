import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';
import { uploadTeamLogo } from '../lib/storage';
import type { Team } from '../types/database';

const HEX_MUSTER = /^#[0-9a-fA-F]{6}$/;

interface TeamBrandingFormProps {
  team: Team;
  onSaved: (team: Team) => void;
  onCancel: () => void;
}

export function TeamBrandingForm({ team, onSaved, onCancel }: TeamBrandingFormProps) {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState(team.logo_url ?? '');
  const [farbePrimaer, setFarbePrimaer] = useState(team.farbe_primaer ?? '#0f172a');
  const [farbeSekundaer, setFarbeSekundaer] = useState(team.farbe_sekundaer ?? '#38bdf8');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleFileChange(file: File | null) {
    setLogoFile(file);
    if (file) setLogoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!HEX_MUSTER.test(farbePrimaer) || !HEX_MUSTER.test(farbeSekundaer)) {
      setError('Bitte gueltige Hex-Farbcodes angeben (z. B. #0f172a).');
      return;
    }

    setSubmitting(true);
    try {
      let logoUrl = team.logo_url;
      if (logoFile) {
        logoUrl = await uploadTeamLogo(logoFile, team.id);
      }

      const { data, error } = await supabase
        .from('teams')
        .update({
          logo_url: logoUrl,
          farbe_primaer: farbePrimaer,
          farbe_sekundaer: farbeSekundaer,
        })
        .eq('id', team.id)
        .select()
        .single();
      if (error) throw error;

      onSaved(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Branding konnte nicht gespeichert werden.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card">
      <h2>Branding: {team.name}</h2>
      {error && <div className="alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Vereinslogo</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Logo-Vorschau"
                style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 12, border: '1px solid var(--color-border)' }}
              />
            ) : (
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 12,
                  border: '1px dashed var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                }}
              >
                🏒
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="farbe-primaer">Primärfarbe</label>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="color"
              value={HEX_MUSTER.test(farbePrimaer) ? farbePrimaer : '#0f172a'}
              onChange={(e) => setFarbePrimaer(e.target.value)}
              style={{ width: 48, height: 40, padding: 2, border: '1px solid var(--color-border)', borderRadius: 8 }}
            />
            <input
              id="farbe-primaer"
              type="text"
              value={farbePrimaer}
              onChange={(e) => setFarbePrimaer(e.target.value)}
              style={{ flex: 1 }}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="farbe-sekundaer">Sekundärfarbe</label>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="color"
              value={HEX_MUSTER.test(farbeSekundaer) ? farbeSekundaer : '#38bdf8'}
              onChange={(e) => setFarbeSekundaer(e.target.value)}
              style={{ width: 48, height: 40, padding: 2, border: '1px solid var(--color-border)', borderRadius: 8 }}
            />
            <input
              id="farbe-sekundaer"
              type="text"
              value={farbeSekundaer}
              onChange={(e) => setFarbeSekundaer(e.target.value)}
              style={{ flex: 1 }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Wird gespeichert …' : 'Branding speichern'}
          </button>
          <button className="btn-secondary" type="button" onClick={onCancel} disabled={submitting}>
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  );
}
