// Zentrale Typdefinitionen für das Datenmodell aus Phase 1.
// Spiegelt die Tabellen aus supabase/migrations/0001_init.sql wider.

export type Rolle = 'junior' | 'trainer' | 'admin';

export type Altersgruppe = 'U9' | 'U12' | 'U15' | 'U18';

export type UebungKategorie =
  | 'technik'
  | 'schuss'
  | 'kraft'
  | 'koordination'
  | 'kondition'
  | 'schnelligkeit';

export type Team = {
  id: string;
  name: string;
  altersgruppe: Altersgruppe;
  logo_url: string | null;
  farbe_primaer: string | null;
  farbe_sekundaer: string | null;
  created_at: string;
};

export type User = {
  id: string;
  vorname: string;
  nachname: string;
  email: string;
  rolle: Rolle;
  team_id: string | null;
  punkte_total: number;
  level_aktuell: number;
  streak_counter: number;
  streak_letzte_aktivitaet: string | null;
  // Wöchentlicher Streak (Phase 4): streak_letzte_woche speichert den Montag
  // der zuletzt aktiven ISO-Woche.
  streak_wochen: number;
  streak_letzte_woche: string | null;
  created_at: string;
};

export type Uebung = {
  id: string;
  titel: string;
  beschreibung: string | null;
  bild_url: string | null;
  // Noch ungenutzt (Phase 2): Formular zeigt das Feld bereits ausgegraut an,
  // damit ein späteres Video-Feature ohne Schemaänderung auskommt.
  video_url: string | null;
  kategorie: UebungKategorie;
  erstellt_von: string | null;
  altersgruppen: Altersgruppe[];
  // Punkte, die ein Junior für eine erfolgreiche Selbsteinschätzung dieser
  // Übung erhält. Individuell pro Übung durch einen Admin konfigurierbar,
  // Default für neue Übungen: 10.
  punkte: number;
  created_at: string;
};

export type Selbsteinschaetzung = {
  id: string;
  junior_id: string;
  uebung_id: string;
  datum: string;
  geschafft: boolean;
  gefuehl_sterne: number | null;
  punkte_vergeben: number;
  created_at: string;
};

export type Badge = {
  id: string;
  name: string;
  beschreibung: string | null;
  icon: string | null;
  kategorie: string | null;
  kriterium_typ: string | null;
  kriterium_wert: number | null;
  created_at: string;
};

export type JuniorBadge = {
  junior_id: string;
  badge_id: string;
  erreicht_am: string;
};

export type PunkteKonfiguration = {
  id: number;
  basis_punkte_pro_uebung: number;
};

export type FreundeschallengeStatus =
  | 'angefragt'
  | 'aktiv'
  | 'erfolgreich'
  | 'gescheitert'
  | 'abgelehnt';

export type Freundeschallenge = {
  id: string;
  kategorie: UebungKategorie;
  ersteller_id: string;
  empfaenger_id: string;
  status: FreundeschallengeStatus;
  start_datum: string | null;
  ersteller_tage: number;
  empfaenger_tage: number;
  ersteller_letzter_tag: string | null;
  empfaenger_letzter_tag: string | null;
  punkte_vergeben: number;
  created_at: string;
  entschieden_am: string | null;
  abgeschlossen_am: string | null;
};

export type FreundeschallengeKonfiguration = {
  id: number;
  extra_punkte: number;
};

// Zeile aus public.meine_freundeschallengen(): bereits um den Anzeigenamen
// des Gegners angereichert (Vorname + Nachname-Initiale, gleiches
// Datenschutz-Muster wie bei RanglisteEintrag) und relativ zum aufrufenden
// Junior aufgelöst (meine_tage/gegner_tage statt ersteller_tage/empfaenger_tage).
export type MeineFreundeschallenge = {
  id: string;
  kategorie: UebungKategorie;
  status: FreundeschallengeStatus;
  bin_ich_ersteller: boolean;
  gegner_id: string;
  gegner_vorname: string;
  gegner_nachname_initiale: string | null;
  meine_tage: number;
  gegner_tage: number;
  start_datum: string | null;
  punkte_vergeben: number;
  created_at: string;
};

export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
};

// Rückgabetyp von submit_selbsteinschaetzung(): neben der gespeicherten
// Einschätzung auch, ob dadurch ein Level-Aufstieg ausgelöst wurde und
// welche Badges neu vergeben wurden (für die Push-Benachrichtigung).
export type SelbsteinschaetzungErgebnis = {
  einschaetzung: Selbsteinschaetzung;
  level_aufstieg: boolean;
  neues_level: number;
  neue_badges: Badge[];
  // Freundeschallenge (Phase 8): gesetzt, wenn diese Einschätzung eine laufende
  // Freundeschallenge in derselben Kategorie abgeschlossen hat (erfolgreich
  // oder gescheitert) – sonst überall null.
  freundeschallenge_status: FreundeschallengeStatus | null;
  freundeschallenge_gegner_id: string | null;
  freundeschallenge_gegner_vorname: string | null;
  freundeschallenge_gegner_nachname_initiale: string | null;
  freundeschallenge_punkte: number | null;
};

// Zeile aus der public.rangliste()-Funktion: bewusst nur unkritische Felder,
// Nachname ist bereits serverseitig auf den ersten Buchstaben gekürzt.
export type RanglisteEintrag = {
  id: string;
  vorname: string;
  nachname_initiale: string | null;
  punkte_total: number;
  level_aktuell: number;
  team_id: string | null;
  team_name: string | null;
};

// Zeile aus der public.team_rangliste()-Funktion: Gesamtpunktzahl pro Team
// (Summe aller Junioren des Teams), optional nach Übungs-Kategorie gefiltert.
export type TeamRanglisteEintrag = {
  team_id: string;
  team_name: string;
  altersgruppe: Altersgruppe;
  punkte_total: number;
};

// Minimales Database-Schema für den typisierten Supabase-Client, im gleichen
// Format wie von `supabase gen types typescript` generiert (Tables/Views/
// Functions je Tabelle mit Row/Insert/Update/Relationships).
export type Database = {
  public: {
    Tables: {
      teams: {
        Row: Team;
        Insert: Partial<Team> & Pick<Team, 'name' | 'altersgruppe'>;
        Update: Partial<Team>;
        Relationships: [];
      };
      users: {
        Row: User;
        Insert: Partial<User> & Pick<User, 'id' | 'vorname' | 'nachname' | 'email'>;
        Update: Partial<User>;
        Relationships: [];
      };
      uebungen: {
        Row: Uebung;
        Insert: Partial<Uebung> &
          Pick<Uebung, 'titel' | 'kategorie' | 'altersgruppen' | 'erstellt_von'>;
        Update: Partial<Uebung>;
        Relationships: [];
      };
      selbsteinschaetzungen: {
        Row: Selbsteinschaetzung;
        Insert: Partial<Selbsteinschaetzung> &
          Pick<Selbsteinschaetzung, 'junior_id' | 'uebung_id'>;
        Update: Partial<Selbsteinschaetzung>;
        Relationships: [];
      };
      badges: {
        Row: Badge;
        Insert: Partial<Badge> & Pick<Badge, 'name'>;
        Update: Partial<Badge>;
        Relationships: [];
      };
      junior_badges: {
        Row: JuniorBadge;
        Insert: JuniorBadge;
        Update: Partial<JuniorBadge>;
        Relationships: [];
      };
      punkte_konfiguration: {
        Row: PunkteKonfiguration;
        Insert: Partial<PunkteKonfiguration>;
        Update: Partial<PunkteKonfiguration>;
        Relationships: [];
      };
      push_subscriptions: {
        Row: PushSubscriptionRow;
        Insert: Partial<PushSubscriptionRow> &
          Pick<PushSubscriptionRow, 'user_id' | 'endpoint' | 'p256dh' | 'auth'>;
        Update: Partial<PushSubscriptionRow>;
        Relationships: [];
      };
      freundeschallenge_konfiguration: {
        Row: FreundeschallengeKonfiguration;
        Insert: Partial<FreundeschallengeKonfiguration>;
        Update: Partial<FreundeschallengeKonfiguration>;
        Relationships: [];
      };
      freundeschallenges: {
        Row: Freundeschallenge;
        Insert: Partial<Freundeschallenge> &
          Pick<Freundeschallenge, 'kategorie' | 'ersteller_id' | 'empfaenger_id'>;
        Update: Partial<Freundeschallenge>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;

    Functions: {
      admin_exists: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      rangliste: {
        Args: { p_team_id: string | null };
        Returns: RanglisteEintrag[];
      };
      team_rangliste: {
        Args: { p_kategorie: UebungKategorie | null };
        Returns: TeamRanglisteEintrag[];
      };
      current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: Rolle;
      };
      current_user_team_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      submit_selbsteinschaetzung: {
        Args: {
          p_uebung_id: string;
          p_geschafft: boolean;
          p_gefuehl_sterne: number | null;
        };
        Returns: SelbsteinschaetzungErgebnis;
      };
      freundeschallenge_anfragen: {
        Args: { p_empfaenger_id: string; p_kategorie: UebungKategorie };
        Returns: Freundeschallenge;
      };
      freundeschallenge_antworten: {
        Args: { p_challenge_id: string; p_annehmen: boolean };
        Returns: Freundeschallenge;
      };
      meine_freundeschallengen: {
        Args: Record<PropertyKey, never>;
        Returns: MeineFreundeschallenge[];
      };
    };
  };
};
