import type { Badge } from '../types/database';

interface BadgeGridProps {
  badges: Badge[];
  erreichtByBadgeId: Map<string, string>;
}

export function BadgeGrid({ badges, erreichtByBadgeId }: BadgeGridProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 12,
      }}
    >
      {badges.map((badge) => {
        const erreichtAm = erreichtByBadgeId.get(badge.id);
        const erreicht = erreichtAm !== undefined;
        return (
          <div
            key={badge.id}
            title={erreicht ? `Erreicht am ${new Date(erreichtAm).toLocaleDateString('de-CH')}` : 'Noch nicht erreicht'}
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)',
              padding: 12,
              textAlign: 'center',
              opacity: erreicht ? 1 : 0.35,
              background: erreicht ? 'var(--color-surface)' : 'var(--color-bg)',
            }}
          >
            <div style={{ fontSize: '2rem', lineHeight: 1 }}>{badge.icon ?? '🏅'}</div>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', marginTop: 6 }}>{badge.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
              {badge.beschreibung}
            </div>
          </div>
        );
      })}
    </div>
  );
}
