// Zentrale Typdefinitionen fuer das Datenmodell aus Phase 1.
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
  name: string;
  email: string;
  rolle: Rolle;
  team_id: string | null;
  punkte_total: number;
  level_aktuell: number;
  streak_counter: number;
  streak_letzte_aktivitaet: string | null;
  created_at: string;
};

export type Uebung = {
  id: string;
  titel: string;
  beschreibung: string | null;
  bild_url: string | null;
  // Noch ungenutzt (Phase 2): Formular zeigt das Feld bereits ausgegraut an,
  // damit ein spaeteres Video-Feature ohne Schemaaenderung auskommt.
  video_url: string | null;
  kategorie: UebungKategorie;
  erstellt_von: string | null;
  altersgruppen: Altersgruppe[];
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

// Minimales Database-Schema fuer den typisierten Supabase-Client, im gleichen
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
        Insert: Partial<User> & Pick<User, 'id' | 'name' | 'email'>;
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
    };
    Views: Record<string, never>;
    Functions: {
      admin_exists: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: Rolle;
      };
      current_user_team_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
    };
  };
};
