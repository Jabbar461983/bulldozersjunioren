# Bulldozers Challenge

Progressive Web App (PWA) für die Junioren des Streethockeyclub Bulldozers: Übungen zum
Zuhause-Trainieren, Selbsteinschätzung und Ranglisten zum Vergleichen mit dem Team.

**Phase 1:** Projekt-Grundgerüst, Authentifizierung, Rollen- und Berechtigungssystem, Datenmodell.
**Phase 2:** Übungsverwaltung für Trainer/Admin (Erstellen, Bearbeiten, Löschen, Filtern).
**Phase 3:** Junior-Ansicht mit Selbsteinschätzung und Verlauf.
**Phase 4:** Gamification-Engine — Punkte, Level, tägliche/wöchentliche Streaks, 27 Badges und
Web-Push-Benachrichtigungen.
**Phase 6:** Comic-artiges Design, Vereins-Branding (Logo + Farben) und Maskottchen "Pucky".
**Phase 7:** Push-Notifications abgerundet — Berechtigungs-Flow beim ersten Login und
In-App-Fallback-Benachrichtigung (Toast).
**Phase 8 (dieses Repo-Stadium):** Freundeschallenges — ein Junior fordert einen anderen heraus,
3 Tage in Folge dieselbe Kategorie, Extrapunkte bei Erfolg (admin-konfigurierbar), Push-Benachrichtigung
bei jedem Ereignis.

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
3. Das Datenbankschema anlegen: Die Migrationen unter `supabase/migrations/` der Reihe nach
   (0001 → 0012) im **SQL Editor** des Supabase-Dashboards ausführen (oder via Supabase CLI:
   `supabase db push`, sofern das Projekt lokal verlinkt ist). Migration 0002 legt u. a. den
   Storage-Bucket `uebung-bilder` an, 0003 die Funktion `submit_selbsteinschaetzung()`, 0004 das
   komplette Gamification-Schema (Level-/Streak-Funktionen, Badge-Katalog, Push-Abos), 0005 den
   Storage-Bucket `team-logos` für den Vereinslogo-Upload, 0006 die Trennung von Vorname/Nachname,
   0007 die `rangliste()`-Funktion, 0008 Seed-Übungen für Kondition/Schnelligkeit, 0009 Seed-Übungen
   für Schuss/Technik, 0010 die `team_rangliste()`-Funktion, 0011 das Freundeschallenge-Schema,
   0012 die Freundeschallenge-Badges (siehe Abschnitt "Freundeschallenges" weiter unten).
4. Optional für die lokale Entwicklung: Unter **Authentication → Providers → Email** die
   E-Mail-Bestätigung deaktivieren, damit neue Konten sofort ohne Klick auf einen
   Bestätigungslink eingeloggt werden.
5. Für Web Push (Phase 4, optional): VAPID-Schlüssel generieren mit
   `npx web-push generate-vapid-keys`, dann die Edge Function deployen und die Secrets setzen
   (siehe Abschnitt "Web-Push-Benachrichtigungen" weiter unten).

### 3. Umgebungsvariablen

```bash
cp .env.example .env.local
```

`.env.local` mit den Werten aus Schritt 2 befüllen:

```
VITE_SUPABASE_URL=https://DEIN-PROJEKT.supabase.co
VITE_SUPABASE_ANON_KEY=DEIN-ANON-KEY
VITE_VAPID_PUBLIC_KEY=DEIN-VAPID-PUBLIC-KEY   # optional, nur für Web Push (Phase 4)
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

- `teams` — Name, Altersgruppe (U9/U12/U15/U18), `logo_url`/`farbe_primaer`/`farbe_sekundaer`
  (seit Phase 6 im Admin-Bereich editierbar, siehe unten)
- `users` — Profil, Rolle, Team-Zugehörigkeit, Punkte/Level/täglicher+wöchentlicher Streak
  (seit Phase 4 aktiv befüllt)
- `uebungen` — Titel, Beschreibung, Kategorie, Ziel-Altersgruppen, Bild-URL, Ersteller.
  `video_url` existiert im Schema bereits, wird aber erst in einer späteren Phase genutzt
  (im Formular als ausgegrautes Feld sichtbar).
- `selbsteinschaetzungen` — Junior bewertet eine Übung (geschafft, Sterne, Punkte). Wird
  ausschliesslich über die RPC-Funktion `submit_selbsteinschaetzung()` befüllt (siehe unten).
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

## Junior-Ansicht & Selbsteinschätzung (Phase 3)

- **Übungsliste** (`/junior`): zeigt automatisch nur Übungen der eigenen Altersgruppe (via RLS
  über das eigene Team bestimmt, kein manueller Filter im Frontend nötig), filterbar nach
  Kategorie.
- **Detailansicht** (`/junior/uebungen/:id`, `JuniorUebungDetail`): Titel, Beschreibung, Bild,
  plus die zweistufige Selbsteinschätzung:
  1. **Geschafft?** Ja/Nein — bestimmt allein, ob Punkte gutgeschrieben werden.
  2. **Wie hat es sich angefühlt?** 1–5 Sterne (`SterneAuswahl`) — rein persönliche Reflexion,
     hat keinen Einfluss auf die Punktevergabe.
  Jede Einreichung legt einen neuen, datierten Verlaufseintrag an (mehrfache Einschätzungen
  derselben Übung an verschiedenen Tagen bleiben alle sichtbar) und läuft direkt, ohne
  Trainer-Freigabe.
- **Verlaufsansicht** (`/junior/verlauf`, `JuniorVerlauf`): alle bisherigen Selbsteinschätzungen
  des eigenen Kontos, neueste zuerst.
- **Punktevergabe:** Bei "Geschafft = Ja" werden serverseitig Punkte auf `users.punkte_total`
  gutgeschrieben (Basiswert konfigurierbar, siehe Phase 4).

### Sicherheitshinweise (Phase 3)

Da hier zum ersten Mal echte Punktevergabe hinzukommt, wurde der Schreibzugriff verschärft:

- Selbsteinschätzungen können von Junioren **nicht mehr direkt** per `insert`/`update` angelegt
  werden, sondern ausschliesslich über die SECURITY-DEFINER-Funktion
  `submit_selbsteinschaetzung(uebung_id, geschafft, gefuehl_sterne)`. Die Funktion bindet
  `junior_id` fest an `auth.uid()` und berechnet den Punktewert serverseitig — der Client kann
  weder für einen anderen Nutzer einreichen noch einen eigenen Punktewert vorgeben.
- `users.punkte_total` (sowie `level_aktuell`/`streak_*`) sind per DB-Trigger vor direkten
  Client-Updates geschützt; nur Admin oder die genannte Funktion (über ein transaktionslokales
  Flag) dürfen diese Felder ändern. Ohne diesen Schutz könnte sich ein Junior sonst per
  `supabase.from('users').update({ punkte_total: ... })` beliebig Punkte gutschreiben.

## Vorname/Nachname & Rangliste

- **Registrierung:** Statt einem einzelnen "Name"-Feld werden **Vorname** und **Nachname**
  getrennt erfasst (`users.vorname`/`users.nachname`, siehe Migration 0006). Grund: Nur so lässt
  sich die Rangliste zuverlässig auf "Vorname + erster Buchstabe des Nachnamens" kürzen, ohne
  einen Freitext-Namen nachträglich raten zu müssen.
- **Rangliste** (Karte auf `/junior`, `RanglisteCard`): zeigt alle Junioren, standardmässig
  teamübergreifend, mit einem Dropdown-Filter nach Team. Sortiert nach Punkten absteigend, die
  eigene Zeile ist hervorgehoben ("(Du)").
- **Datenschutz:** Angezeigt wird nur `Vorname Nachname-Initiale.` (z. B. "Max M."). Das passiert
  nicht erst im Frontend, sondern schon in der Datenbank: Die Funktion `public.rangliste(p_team_id)`
  (Migration 0007) liefert von vornherein nur `left(nachname, 1)` statt des vollen Nachnamens — der
  volle Nachname (und erst recht die E-Mail-Adresse) verlässt die Datenbank nie. Die Funktion läuft
  bewusst mit erweiterten Rechten (SECURITY DEFINER) und umgeht damit gezielt die RLS-Policies von
  `users` (die einem Junior sonst nur die eigene Zeile zeigen würden) — sicher, weil sie selbst nur
  diese unkritischen Spalten zurückgibt. Ursprünglich als View umgesetzt, dann wegen des
  Supabase-Security-Linter-Hinweises "Security Definer View" in eine Funktion umgewandelt (gleiches
  Sicherheitsverhalten, aber kein Linter-Fehlalarm mehr – passt ausserdem zum bereits etablierten
  Muster von `admin_exists()`/`submit_selbsteinschaetzung()`).
- **Team-Rangliste** (zweiter Tab "Teams" in derselben Karte): zeigt die Gesamtpunktzahl pro Team
  (Summe aller Junioren des Teams), mit einem Dropdown-Filter nach Altersgruppe (U9/U12/U15/U18 —
  "Alle Altersgruppen" zeigt alle Teams gemischt, mit Altersgruppen-Tag pro Zeile). Sortiert nach
  Gesamtpunktzahl absteigend, das eigene Team ist hervorgehoben ("(Dein Team)"). Serverseitig über
  die Funktion `public.team_rangliste(p_altersgruppe)` (Migration 0010) berechnet — ebenfalls
  SECURITY DEFINER, da die Summenbildung über alle Junioren eines Teams die normalen RLS-Policies
  von `users` umgehen muss; zurückgegeben werden aber ausschliesslich Team-Stammdaten und eine
  aggregierte Summe, keine einzelnen Junioren-Daten.

## Gamification-Engine (Phase 4)

Alle Berechnungen (Punkte, Level, Streaks, Badge-Vergabe) laufen **serverseitig** in Postgres
(`supabase/migrations/0004_gamification.sql`) — das Frontend zeigt nur an, was der Server bereits
validiert und gespeichert hat. Einziger Schreibpfad bleibt `submit_selbsteinschaetzung()`.

### Punkte

Der Basiswert pro erfolgreich eingeschätzter Übung liegt in der Singleton-Tabelle
`punkte_konfiguration.basis_punkte_pro_uebung` (Default 20) statt hart codiert in einer Funktion —
kann direkt in der Supabase-Tabellenansicht angepasst werden, ohne Code/Migrationen anzufassen.

### Level

Dreieckszahlen-Formel: um Level `n` zu erreichen, werden insgesamt
`punkte_fuer_level(n) = 50 * (n - 1) * n` Punkte benötigt (Level 2 = 100, Level 3 = 300,
Level 4 = 600, Level 5 = 1000, …) — jede Stufe braucht spürbar mehr als die vorherige. Implementiert
in SQL (`berechne_level()`, massgeblich) und identisch gespiegelt in `src/lib/gamification.ts`
(nur für die Anzeige/den Fortschrittsbalken, damit nicht für jede Darstellung ein Server-Roundtrip
nötig ist).

### Streaks

`aktualisiere_streaks()` pflegt zwei unabhängige Zähler, beide nur bei "Geschafft = Ja" bewertet:

- **Täglich** (`streak_counter`/`streak_letzte_aktivitaet`): +1 bei Aktivität am Folgetag, Reset
  auf 1 bei einer Lücke von ≥ 2 Tagen.
- **Wöchentlich** (`streak_wochen`/`streak_letzte_woche`, ISO-Woche ab Montag): +1 bei Aktivität in
  der Folgewoche, Reset auf 1 bei einer Lücke von ≥ 2 Wochen.

Da beide nur bei einer neuen Einschätzung neu berechnet werden, würde ein bereits abgebrochener
Streak ohne neue Aktivität stur den alten Wert zeigen — deshalb prüft das Frontend
(`effektiverTagesStreak`/`effektiverWochenStreak`) beim Anzeigen zusätzlich, ob seither schon zu
viel Zeit vergangen ist, und zeigt in dem Fall 0 an (Anzeige-Detail, keine Sicherheitsfrage: die
nächste echte Einschätzung berechnet ohnehin serverseitig neu).

### Badges (31, datengetrieben)

`public.badges` ist ein Konfigurationskatalog (`kriterium_typ` + `kriterium_wert`), keine
hart codierte Logik — weitere Badges lassen sich per `INSERT` ergänzen:

| kriterium_typ | Bedeutung | Anzahl |
|---|---|---|
| `kategorie_geschafft` | X "geschafft"-Einschätzungen in einer Kategorie (5/20/50 × 6 Kategorien) | 18 |
| `streak_tage` | täglicher Streak ≥ X (3/7/30) | 3 |
| `streak_wochen` | wöchentlicher Streak ≥ X (4) | 1 |
| `level` | Level ≥ X (5/10/15/20) | 4 |
| `allrounder` | mindestens 1 "geschafft" in allen 6 Kategorien | 1 |
| `freundeschallenge_erfolgreich` | X erfolgreich abgeschlossene Freundeschallenges (3/5/10) | 3 |
| `freundeschallenge_teamplayer` | 5 erfolgreiche Freundeschallenges mit jeweils unterschiedlichen Gegnern | 1 |

`pruefe_und_vergib_badges()` wertet nach jeder Einschätzung alle noch nicht erreichten Badges
generisch anhand von `kriterium_typ` aus und vergibt neu erreichte sofort. Die beiden
Freundeschallenge-Kriterien kamen mit Migration 0012 dazu; dabei wurde auch die Reihenfolge in
`submit_selbsteinschaetzung()` korrigiert, sodass eine Einschätzung, die eine Freundeschallenge im
selben Aufruf erfolgreich abschliesst (inkl. Extrapunkte), bereits denselben Aufruf für
Level-Aufstieg und neue Badges berücksichtigt.

### Junior-Profilseite (`/junior/profil`)

Level mit Fortschrittsbalken, Punkte, beide Streaks, Badge-Grid (erreichte hervorgehoben, Rest
ausgegraut) sowie der Opt-in für Push-Benachrichtigungen.

### Web-Push-Benachrichtigungen

Ausgelöst ausschliesslich bei **neuem Badge** und **Level-Aufstieg** (keine weiteren Trigger wie
Trainingserinnerungen in dieser Phase):

1. `submit_selbsteinschaetzung()` gibt `level_aufstieg`/`neues_level`/`neue_badges` zurück.
2. Bei einem Treffer ruft das Frontend (`sendeGamificationPush`) die Supabase Edge Function
   `send-push-notification` auf (`supabase/functions/send-push-notification`), die per
   `web-push`/VAPID an alle abonnierten Geräte des Nutzers sendet.
3. `public/push-sw.js` (per `workbox.importScripts` in den generierten Service Worker eingebunden)
   zeigt die eingehende Push-Nachricht als Benachrichtigung an.

Setup für ein echtes Supabase-Projekt:

```bash
npx web-push generate-vapid-keys          # liefert Public/Private Key
supabase functions deploy send-push-notification
supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com
```

Den Public Key zusätzlich als `VITE_VAPID_PUBLIC_KEY` in `.env.local` eintragen. Ohne diese Secrets
funktioniert die App normal weiter — der "Benachrichtigungen aktivieren"-Button meldet dann nur,
dass Push noch nicht konfiguriert ist, und ein fehlgeschlagener Push-Versand wird verschluckt statt
den Selbsteinschätzungs-Flow zu stören. Der Berechtigungs-Flow (erklärender Hinweistext beim ersten
Login) und die In-App-Fallback-Benachrichtigung sind in Phase 7 abgerundet, siehe dort.

### Sicherheitshinweise (Phase 4)

- `punkte_total`, `level_aktuell`, `streak_counter`, `streak_letzte_aktivitaet`, `streak_wochen`
  und `streak_letzte_woche` bleiben (wie schon in Phase 3) per DB-Trigger vor direkten
  Client-Updates geschützt; jetzt auch für die beiden neuen Streak-Spalten.
- `push_subscriptions` ist per RLS auf die eigenen Zeilen beschränkt; die Edge Function nutzt das
  JWT des Aufrufers (nicht den Service-Role-Key), sendet also ausschliesslich an die eigenen
  Geräte des jeweils authentifizierten Nutzers.
- Badge-Vergabe passiert ausschliesslich serverseitig in `pruefe_und_vergib_badges()` — es gibt
  keine Insert-Policy für `junior_badges`, ein Client kann sich also keine Badges selbst verleihen.

## Design, Branding & Maskottchen (Phase 6)

### Vereinslogo & Farben

Jedes Team hat sein eigenes Branding (`teams.logo_url`/`farbe_primaer`/`farbe_sekundaer`, bereits
seit Phase 1 im Schema vorgesehen). Admin verwaltet es direkt in der Teams-Liste der
Admin-Startseite (Button **"Branding"** → `TeamBrandingForm`):

- Logo-Upload (Bild-Datei) in den Storage-Bucket `team-logos` (öffentlich lesbar, Schreibzugriff
  nur Admin — Migration 0005). Ein erneuter Upload ersetzt das bisherige Logo.
- Primär-/Sekundärfarbe als Hex-Code-Eingabe **und** natives Farbwähler-Feld (`<input type="color">`),
  synchron gehalten. Keine automatische Farbextraktion aus dem Logo nötig (bewusst nicht gefordert).

Sobald ein Nutzer eingeloggt ist, lädt `AuthContext` das Team des Nutzers und wendet dessen Farben
als CSS-Design-Tokens (`--color-primary`/`--color-accent`, siehe `src/lib/theme.ts`) global auf die
App an — Buttons, Progress-Bar, Tags etc. übernehmen die Vereinsfarben automatisch, ohne dass
einzelne Komponenten das Team kennen müssen. Nutzer ohne Team (i. d. R. Admin) sehen das
Standard-Theme. Das Logo erscheint prominent im App-Header (`DashboardLayout`); auf dem
Login-/Register-Screen (vor der Anmeldung, wenn das Team noch nicht bekannt ist) bleibt bewusst das
generische App-Branding.

### Comic-Stil

Durchgängig überarbeitet für eine junge, mobile Zielgruppe (`src/index.css`/`src/App.css`):

- Rundliche, freundliche Schriftarten (**Baloo 2** für Überschriften/Buttons, **Nunito** für
  Fliesstext, via Google Fonts).
- Grosszügiger Radius (Karten, Buttons, Inputs) statt scharfer Ecken, "Sticker"-Schatten
  (versetzter Farbrand) auf Karten/Buttons, kleine Press-Animation auf Buttons.
- Grosszügige Touch-Flächen (Inputs/Buttons/Listenzeilen ≥ 48 px Höhe) und reduzierte Textmengen,
  passend für eine Zielgruppe ab ca. 6 Jahren.
- Die 6 Trainingskategorien haben je ein Emoji-Icon (`KATEGORIE_ICONS` in `src/lib/constants.ts`,
  dieselben wie bei den zugehörigen Badges), das überall dort erscheint, wo eine Kategorie
  angezeigt wird (Übungsliste, Detailansicht, Verlauf, Übungsverwaltung).
- Mobile-first: Alle Ansichten sind von Phase 1 an einspaltig für Smartphones ausgelegt; die
  Layout-Breite wächst nur massvoll auf grösseren Bildschirmen.

### Maskottchen "Pucky"

Ein freundlicher, comic-artiger Hockey-Puck mit Gesicht (`src/components/Maskottchen.tsx`), als
einfache SVG-Illustration mit 3 Zuständen (keine Animation/Video):

- **neutral** – Begrüsst den Junior mit einem zufälligen Spruch auf der Startseite (`/junior`).
- **freudig** – Nach einer Selbsteinschätzung mit "Geschafft = Ja" (motivierender Spruch + erzielte
  Punkte); erscheint zusätzlich **gross und feiernd** (mit Sternchen/Funken) bei Level-Aufstieg
  oder neuem Badge.
- **aufmunternd** – Nach "Geschafft = Nein" (aufmunternder Spruch, kein Punkteabzug/Bewertung).

Bewusst nur in den Junior-Ansichten eingebunden (Begrüssung + Rückmeldung), da die Aufgabenstellung
das Maskottchen explizit als Begleiter "den Junior durch die App" beschreibt; Trainer/Admin-Ansichten
erhalten denselben Comic-Stil, aber ohne Maskottchen.

## Push-Notifications: Berechtigungs-Flow & In-App-Fallback (Phase 7)

Die Grundlage (Edge Function, `push_subscriptions`, Service-Worker-Handler, Auslösung bei
Badge/Level-Events) entstand bereits in Phase 4. Phase 7 rundet zwei Dinge ab, die vorher fehlten:

### Berechtigungs-Flow beim ersten Login

`PushOnboarding` (`src/components/PushOnboarding.tsx`) erscheint als eigene Karte oben auf der
Junior-Startseite (`/junior`), aber nur wenn Push vom Browser unterstützt wird, die
Benachrichtigungs-Berechtigung noch nicht entschieden ist (`Notification.permission === 'default'`)
und die Einladung nicht bereits einmal weggeklickt/beantwortet wurde (Flag in `localStorage`, siehe
`pushOnboardingBereitsEntschieden()`/`pushOnboardingAlsEntschiedenMarkieren()` in `src/lib/push.ts`).
Sie zeigt den geforderten Hinweistext ("Wir informieren dich, wenn du ein Abzeichen oder
Level-Aufstieg erreichst") mit zwei Optionen — **Aktivieren** (löst den nativen Browser-Prompt aus)
oder **Später** — und verschwindet danach dauerhaft für dieses Gerät, statt bei jedem Login erneut
zu nerven. Wer sich gegen Push entscheidet, kann es jederzeit über den bestehenden Button auf der
Profilseite (`/junior/profil`) nachholen.

### In-App-Fallback-Benachrichtigung (Toast)

Neu: `ToastProvider`/`useToast` (`src/contexts/ToastContext.tsx`), am App-Root eingehängt. Bei
Level-Aufstieg oder neuem Badge zeigt `JuniorUebungDetail` jetzt zusätzlich zur grossen
Maskottchen-Feier einen kurzen, selbst verschwindenden Toast oben auf dem Bildschirm — **unabhängig
davon**, ob der Nutzer Push erlaubt, abgelehnt hat oder der Browser es gar nicht unterstützt. Das
erfüllt die Vorgabe "Toast soll trotzdem erscheinen, sobald die App offen ist" ohne Sonderfall-Logik:
der Toast läuft immer, das eigentliche Web Push (`sendeGamificationPush`) läuft parallel und
zusätzlich für den Fall, dass die App gerade geschlossen/im Hintergrund ist. Es gibt weiterhin
bewusst keine weiteren Trigger (keine Trainingserinnerungen, keine Ranglisten-Änderungen).

## Freundeschallenges (Phase 8)

Ein Junior kann einen anderen Junior aus dem eigenen Team herausfordern: In einer gewählten
Kategorie (Schuss, Technik, …) muss danach an **3 aufeinanderfolgenden Tagen** je eine Übung dieser
Kategorie "geschafft" eingeschätzt werden. Umgesetzt in `supabase/migrations/0011_freundeschallenge.sql`
und `src/pages/JuniorFreundeschallenge.tsx` (`/junior/freundeschallenge`, verlinkt von `/junior`).

- **Anfrage & Annahme:** `freundeschallenge_anfragen(p_empfaenger_id, p_kategorie)` legt die Anfrage
  an, `freundeschallenge_antworten(p_challenge_id, p_annehmen)` nimmt sie an (Start = heute) oder
  lehnt sie ab. Beide sind SECURITY-DEFINER-Funktionen, die `auth.uid()` fest an Ersteller/Empfänger
  binden.
- **Nur eine aktive Challenge pro Junior:** `freundeschallenge_anfragen()` prüft serverseitig, ob
  Ersteller **oder** Empfänger bereits eine Challenge im Status `angefragt`/`aktiv` haben, und bricht
  sonst mit der Fehlermeldung "Aktuell schon eine Freundeschallenge am Laufen." ab – das Frontend
  zeigt diese Meldung unverändert im Fehlerbereich an.
- **Fortschritt & Scheitern:** `submit_selbsteinschaetzung()` ruft nach jeder Einschätzung
  `aktualisiere_freundeschallenge_bei_einschaetzung()` auf: Bei "geschafft" in der passenden
  Kategorie zählt der Tag für die jeweilige Person (mehrfache Einschätzungen am selben Tag zählen
  nur einmal), bei "nicht geschafft" endet die Challenge sofort ohne Punkte. Lässt eine Person einen
  Tag komplett verstreichen, ohne die Übung einzuschätzen, erkennt `freundeschallenge_ablaufen_lassen()`
  das lazy beim nächsten Aufruf einer Freundeschallenge-Funktion (kein Cron-Job nötig) und beendet die
  Challenge ebenfalls ohne Punkte.
- **Erfolg & Extrapunkte:** Schaffen beide Personen alle 3 Tage, wird die Challenge auf
  "erfolgreich" gesetzt und beide erhalten dieselben Extrapunkte gutgeschrieben. Die Höhe legt der
  Admin im Admin-Bereich fest (Karte "Freundeschallenge", `FreundeschallengeKonfigurationCard`, liest/
  schreibt die Singleton-Tabelle `freundeschallenge_konfiguration.extra_punkte`, Default 100).
- **Push-Benachrichtigungen:** Jedes Ereignis (neue Anfrage, Annahme/Ablehnung, Erfolg, Scheitern)
  löst eine Push-Benachrichtigung an die jeweils andere Person aus (`sendeFreundeschallengePush()` in
  `src/lib/push.ts`). Da `send-push-notification` bisher nur an die eigenen Geräte des Aufrufers
  senden konnte, akzeptiert die Edge Function jetzt zusätzlich ein `target_user_id`-Feld: Mit
  Service-Role-Key werden dann die Abos der Zielperson geladen – aber nur, nachdem serverseitig
  geprüft wurde, dass zwischen Aufrufer und Ziel überhaupt eine `freundeschallenges`-Zeile existiert
  (verhindert Missbrauch als beliebiger Push-Spam-Versand an fremde Nutzer).
- **Sichtbarkeit:** `meine_freundeschallengen()` liefert (wie `rangliste()`) nur Vorname +
  Nachname-Initiale der Gegenperson; die Auswahl möglicher Herausforderungspartner beschränkt sich
  auf das eigene Team (wiederverwendet `rangliste(p_team_id)`).
- **Badges (Migration 0012):** "Freundeschallenge-Neuling/-Ass/-Meister" für 3/5/10 erfolgreich
  abgeschlossene Freundeschallenges sowie "Teamplayer" für 5 erfolgreiche Freundeschallenges mit
  jeweils unterschiedlichen Gegnern (`kriterium_typ` `freundeschallenge_erfolgreich` bzw.
  `freundeschallenge_teamplayer`, datengetrieben wie der restliche Badge-Katalog).

## Bekannte Grenzen dieser Phase

- Ranglisten (Team-/Altersgruppen-Vergleich) sind noch nicht umgesetzt.
- Kalenderansicht des Verlaufs ist bewusst eine einfache Liste (kein echter Kalender).
- Nutzerverwaltung (Admin) ist noch ein Platzhalter.
- E-Mail-Templates, Passwort-Reset-UI und Profilbearbeitung sind noch nicht umgesetzt.
- Web Push erfordert ein deploytes Supabase-Projekt mit Edge Functions + VAPID-Secrets; lokal ohne
  diese Konfiguration bleibt der Rest der App uneingeschränkt nutzbar.
- Automatische Farbextraktion aus dem Logo gibt es nicht (laut Aufgabenstellung nicht nötig) —
  Primär-/Sekundärfarbe werden manuell eingegeben.
- Login-/Register-Screen zeigen bewusst das generische App-Branding statt Team-Logo/-Farben, da vor
  der Anmeldung noch kein Team bekannt ist (die App unterstützt mehrere Teams/Vereine gleichzeitig).
- Freundeschallenges lassen sich aktuell nur an Junioren aus dem eigenen Team schicken (kein
  teamübergreifendes Herausfordern) und eine offene Anfrage kann vom Ersteller nicht zurückgezogen
  werden — sie läuft weiter, bis Empfänger annimmt/ablehnt oder sie durch Zeitablauf scheitert.
