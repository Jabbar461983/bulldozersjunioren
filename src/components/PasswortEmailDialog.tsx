import { useState } from 'react';
import { Copy } from './icons';
import { useToast } from '../contexts/ToastContext';

interface PasswortEmailDialogProps {
  vorname: string;
  nachname: string;
  email: string;
  password: string;
  onClose: () => void;
}

// Popup nach dem Setzen eines neuen Passworts (Nutzerverwaltung / offene
// Passwort-Reset-Anfragen): liefert einen 1:1 in eine E-Mail kopierbaren
// Text, da es keinen eigenen Mailversand gibt (siehe README, Migration 0020)
// – der Admin verschickt das neue Passwort selbst manuell an den Nutzer.
export function PasswortEmailDialog({
  vorname,
  nachname,
  email,
  password,
  onClose,
}: PasswortEmailDialogProps) {
  const { showToast } = useToast();
  const [kopiert, setKopiert] = useState(false);

  const text = `Hallo ${vorname} ${nachname}

Dein Passwort für die Bulldozers Junioren App wurde neu gesetzt. Melde dich ab sofort mit folgenden Daten an:

E-Mail: ${email}
Neues Passwort: ${password}

Sportliche Grüsse
Dein Bulldozers-Team`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setKopiert(true);
      showToast({ title: 'Kopiert', body: 'Der Text wurde in die Zwischenablage kopiert.' });
    } catch {
      showToast({
        title: 'Kopieren fehlgeschlagen',
        body: 'Bitte den Text unten manuell markieren und kopieren.',
      });
    }
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="passwort-email-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="passwort-email-dialog-title">Passwort gesetzt</h3>
        <p>
          Kopiere diesen Text 1:1 in eine E-Mail und schicke ihn an {vorname} {nachname}, damit die
          Person sich wieder anmelden kann.
        </p>
        <textarea
          readOnly
          value={text}
          rows={9}
          style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
          onFocus={(e) => e.target.select()}
        />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="btn-secondary" type="button" onClick={onClose}>
            Schliessen
          </button>
          <button
            className="btn-primary"
            type="button"
            style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8 }}
            onClick={() => void handleCopy()}
          >
            <Copy size={16} strokeWidth={2} aria-hidden="true" />
            {kopiert ? 'Kopiert' : 'Text kopieren'}
          </button>
        </div>
      </div>
    </div>
  );
}
