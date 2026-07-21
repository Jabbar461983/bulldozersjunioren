import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

interface ToastItem {
  id: number;
  icon?: string;
  title: string;
  body?: string;
}

type ToastInput = Omit<ToastItem, 'id'>;

interface ToastContextValue {
  showToast: (toast: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const ANZEIGEDAUER_MS = 6000;

// In-App-Fallback-Benachrichtigung (Phase 7): laeuft unabhaengig davon, ob
// Web Push erlaubt/verfuegbar ist, damit Badge-/Level-Events immer sichtbar
// werden, solange die App gerade offen ist – auch wenn der Nutzer Push
// abgelehnt hat oder der Browser es nicht unterstuetzt.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const showToast = useCallback((toast: ToastInput) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, ANZEIGEDAUER_MS);
  }, []);

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className="toast-card" onClick={() => dismiss(t.id)}>
            {t.icon && <span className="toast-icon">{t.icon}</span>}
            <div>
              <div style={{ fontWeight: 700 }}>{t.title}</div>
              {t.body && <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{t.body}</div>}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast muss innerhalb eines ToastProvider verwendet werden.');
  }
  return ctx;
}
