# Streethockey Junioren-Tracker

Progressive Web App (PWA) fuer Streethockey-Junioren: Uebungen zum Zuhause-Trainieren,
Selbsteinschaetzung und Ranglisten zum Vergleichen mit dem Team.

**Phase 1:** Projekt-Grundgerüst, Authentifizierung, Rollen- und Berechtigungssystem, Datenmodell.
**Phase 2 (dieses Repo-Stadium):** Übungsverwaltung für Trainer/Admin (Erstellen, Bearbeiten,
Löschen, Filtern). Ranglisten, Badges, Selbsteinschätzung etc. folgen in späteren Phasen.

## Tech-Stack

- **Frontend:** React 19 + TypeScript + Vite. Begründung: React ist der Industriestandard mit dem
  grössten Ökosystem, Vite bietet extrem schnelles HMR/Bundling, und beide zusammen haben
  ausgereifte, offiziell unterstützte PWA-Tools (`vite-plugin-pwa`), was Wartbarkeit und
  Entwicklergeschwindigkeit für ein wachsendes Schülerprojekt maximiert.
- **Backend/Datenbank:** [Supabase](https://supabase.com) (Postgres + Auth + Realtime).
  Begründung: liefert E-Mail/Passwort-Authentifizierung, eine relationale Datenbank mit
  Row-Level-Security (passt ideal zum Rollen-/Rechtesystem), Realtime-Subscriptions (für
  spätere Live-Ranglisten) und einen typisierten JS-Client — alles ohne eigenes Backend
  schreiben zu müssen.
- **Routing:** React Router.
- **PWA:** `vite-plugin-pwa` (Web App Manifest + Workbox-Service-Worker für Offline-App-Shell-Caching).

## Projektstruktur

```
src/
  components/       Wiederverwendbare UI-/Routing-Bausteine (ProtectedRoute, RoleRoute, ...)
  contexts/         AuthContext (Session, Profil, signUp/signIn/signOut)
  lib/              Supabase-Client, Rollen-Hilfsfunktionen
  pages/            Login, Register, Junior/Trainer/Admin-Startseiten
  types/            TypeScript-Typen für das Datenmodell (spiegelt das SQL-Schema)
supabase/
  migrations/       SQL-Migrationen (Schema, Rollen-Funktionen, RLS-Policies)
scripts/
  generate-icons.mjs  Erzeugt die Platzhalter-App-Icons unter public/icons
```

## Lokal starten

### 1. Voraussetzungen

- Node.js 20+
- Ein [Supabase](https://supabase.com)-Projekt (kostenloser Tier reicht für die Entwicklung)

### 2. Supabase-Projekt einrichten

1. Neues Projekt auf [supabase.com](https://supabase.com) anlegen.
2. Unter **Project Settings → API** die `Project URL` und den `anon public` Key kopieren.
3. Das Datenbankschema anlegen: Inhalt von `supabase/migrations/0001_init.sql` und danach
   `supabase/migrations/0002_uebungen_phase2.sql` im **SQL Editor** des Supabase-Dashboards
   ausführen (oder via Supabase CLI: `supabase db push`, sofern das Projekt lokal verlinkt ist).
   Die zweite Migration legt u. a. den Storage-Bucket `uebung-bilder` für Bild-Uploads an.
4. Optional für die lokale Entwicklung: Unter **Authentication → Providers → Email** die
   E-Mail-Bestätigung deaktivieren, damit neue Konten sofort ohne Klick auf einen
   Bestätigungslink eingeloggt werden.

### 3. Umgebungsvariablen

```bash
cp .env.example .env.local
```

`.env.local` mit den Werten aus Schritt 2 befüllen:

```
VITE_SUPABASE_URL=https://DEIN-PROJEKT.supabase.co
VITE_SUPABASE_ANON_KEY=DEIN-ANON-KEY
```

### 4. Abhängigkeiten installieren & starten

```bash
npm install
npm run dev
```

Die App läuft danach unter `http://localhost:5173`.

### Weitere Skripte

```bash
npm run build     # Typecheck + Produktions-Build (inkl. Service Worker)
npm run preview   # Produktions-Build lokal ausliefern
npm run lint      # Oxlint
node scripts/generate-icons.mjs   # Platzhalter-App-Icons neu erzeugen
```

## Erste Schritte in der App

1. **Registrieren** (`/register`): Der erste registrierte Nutzer kann die Rolle **Admin** wählen
   (Bootstrap). Danach ist die Admin-Option für neue Registrierungen gesperrt (siehe
   Sicherheitshinweise unten).
2. Als Admin einloggen und auf der Admin-Startseite ein **Team** anlegen (Name + Altersgruppe).
3. Danach können sich **Trainer** und **Junioren** registrieren und dieses Team auswählen.
4. Nach dem Login leitet die App automatisch zur passenden Startseite weiter:
   `/junior`, `/trainer` oder `/admin`.

## Rollen & Berechtigungen

| Rolle   | Rechte |
|---------|--------|
| Junior  | Eigene Daten, Übungen der eigenen Altersgruppe, Ranglisten |
| Trainer | Wie Junior, zusätzlich Lese-/Schreibzugriff auf Junioren des eigenen Teams, Übungen erstellen/bearbeiten |
| Admin   | Voller Zugriff auf alle Teams, Junioren, Übungen, Nutzerverwaltung |

Die Durchsetzung erfolgt auf zwei Ebenen:

- **Client-seitig:** `ProtectedRoute` (erfordert Login) und `RoleRoute` (erfordert passende Rolle)
  in `src/components/`.
- **Datenbank-seitig (massgeblich):** Row-Level-Security-Policies in
  `supabase/migrations/0001_init.sql`. Selbst bei einem Bug im Frontend kann ein Junior z. B.
  keine fremden Nutzerdaten lesen, weil Postgres die Anfrage bereits ablehnt.

## Sicherheitshinweise (Phase 1)

- **Admin-Selbstregistrierung ist bewusst eingeschränkt:** Die Aufgabenstellung sieht vor, dass
  "Admin" bei der Registrierung wählbar ist. Damit sich aber nicht beliebige Nutzer selbst zum
  Admin machen können, erlaubt die Datenbank (`handle_new_user()`-Trigger) die Rolle `admin` nur
  für den allerersten registrierten Nutzer (Bootstrap). Jede weitere Registrierung mit
  gewünschter Admin-Rolle wird serverseitig automatisch auf `junior` zurückgestuft. Das
  Registrierungsformular blendet die Option zusätzlich aus, sobald ein Admin existiert. Weitere
  Admins zu ernennen ist in Phase 1 noch nicht per UI möglich (späteren Phasen: Admin befördert
  Nutzer über die Nutzerverwaltung).
- Nutzer können ihre eigene `rolle` oder `team_id` nicht nachträglich selbst ändern
  (Privilege-Escalation-Schutz per DB-Trigger) — das darf nur ein Admin.
- Alle Tabellen haben Row-Level-Security aktiviert; es gibt keinen ungeschützten Vollzugriff.

## Datenmodell

Siehe `supabase/migrations/0001_init.sql` für das vollständige Schema inkl. Kommentaren:

- `teams` — Name, Altersgruppe (U9/U12/U15/U18), Platzhalter für Logo/Farben
- `users` — Profil, Rolle, Team-Zugehörigkeit, Punkte/Level/Streak (Felder für spätere Phasen)
- `uebungen` — Titel, Beschreibung, Kategorie, Ziel-Altersgruppen, Bild-URL, Ersteller.
  `video_url` existiert im Schema bereits, wird aber erst in einer späteren Phase genutzt
  (im Formular als ausgegrautes Feld sichtbar).
- `selbsteinschaetzungen` — Junior bewertet eine Übung (geschafft, Sterne, Punkte)
- `badges` / `junior_badges` — Auszeichnungs-Katalog und Zuordnung zu Junioren

## Übungsverwaltung (Phase 2)

Trainer und Admin sehen auf ihrer Startseite eine **Übungen**-Karte (`UebungenManager`):

- **Erstellen/Bearbeiten** (`UebungForm`): Titel, Beschreibung, Kategorie (genau eine),
  Altersgruppen (Mehrfachauswahl), Bild entweder als externe URL oder als Datei-Upload in den
  Supabase-Storage-Bucket `uebung-bilder`. Das Feld `Video-URL` ist bewusst deaktiviert
  ("Kommt in einer späteren Version") — Vorbereitung für eine spätere Phase.
- **Validierung:** Titel/Beschreibung sind Pflichtfelder (native HTML-Validierung), Kategorie
  und mindestens eine Altersgruppe müssen ausgewählt sein, bevor gespeichert werden kann.
- **Filter:** Übersicht lässt sich nach Kategorie und Altersgruppe filtern, sortiert nach
  Kategorie.
- **Rechte:** Bearbeiten/Löschen ist nur für die eigene Übung (Ersteller) bzw. für Admin (alle)
  sichtbar — serverseitig zusätzlich über RLS-Policies auf `uebungen` und `storage.objects`
  erzwungen. Löschen erfordert eine Bestätigung im Dialog (`ConfirmDialog`).
- Welche Übungen ein Trainer überhaupt sieht, wird bereits über RLS auf die Altersgruppe(n)
  seines eigenen Teams beschränkt; Admin sieht alle Übungen aller Altersgruppen.

## Bekannte Grenzen dieser Phase

- Home-Seiten für Junior sind weiterhin bewusst rudimentär (Platzhalter-Karten) — Übungen für
  Junioren, Selbsteinschätzung, Ranglisten und Badges folgen in späteren Bauphasen.
- Nutzerverwaltung (Admin) ist noch ein Platzhalter.
- E-Mail-Templates, Passwort-Reset-UI und Profilbearbeitung sind noch nicht umgesetzt.
