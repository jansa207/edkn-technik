export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      aircraft: {
        Row: {
          aktiv: boolean
          art: Database['public']['Enums']['flugzeug_art']
          created_at: string
          gesperrt: boolean
          gesperrt_am: string | null
          gesperrt_von: string | null
          id: string
          kennzeichen: string
          muster: string
          sperrgrund: string | null
          wettbewerbskennzeichen: string | null
        }
        ComputedFields: never
        Insert: {
          aktiv?: boolean
          art: Database['public']['Enums']['flugzeug_art']
          created_at?: string
          gesperrt?: boolean
          gesperrt_am?: string | null
          gesperrt_von?: string | null
          id?: string
          kennzeichen: string
          muster: string
          sperrgrund?: string | null
          wettbewerbskennzeichen?: string | null
        }
        Update: {
          aktiv?: boolean
          art?: Database['public']['Enums']['flugzeug_art']
          created_at?: string
          gesperrt?: boolean
          gesperrt_am?: string | null
          gesperrt_von?: string | null
          id?: string
          kennzeichen?: string
          muster?: string
          sperrgrund?: string | null
          wettbewerbskennzeichen?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'aircraft_gesperrt_von_fkey'
            columns: ['gesperrt_von']
            isOneToOne: false
            referencedRelation: 'profile_names'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'aircraft_gesperrt_von_fkey'
            columns: ['gesperrt_von']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          freigabe: Database['public']['Enums']['freigabe']
          freigegeben_am: string | null
          freigegeben_von: string | null
          id: string
          nachname: string
          rolle: Database['public']['Enums']['rolle']
          vf_uid: number | null
          vorname: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          email: string
          freigabe?: Database['public']['Enums']['freigabe']
          freigegeben_am?: string | null
          freigegeben_von?: string | null
          id: string
          nachname?: string
          rolle?: Database['public']['Enums']['rolle']
          vf_uid?: number | null
          vorname?: string
        }
        Update: {
          created_at?: string
          email?: string
          freigabe?: Database['public']['Enums']['freigabe']
          freigegeben_am?: string | null
          freigegeben_von?: string | null
          id?: string
          nachname?: string
          rolle?: Database['public']['Enums']['rolle']
          vf_uid?: number | null
          vorname?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_freigegeben_von_fkey'
            columns: ['freigegeben_von']
            isOneToOne: false
            referencedRelation: 'profile_names'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'profiles_freigegeben_von_fkey'
            columns: ['freigegeben_von']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      report_events: {
        Row: {
          aircraft_id: string
          created_at: string
          id: number
          intern: boolean
          report_id: string | null
          text: string | null
          typ: Database['public']['Enums']['event_typ']
          user_id: string | null
        }
        ComputedFields: never
        Insert: {
          aircraft_id: string
          created_at?: string
          id?: never
          intern?: boolean
          report_id?: string | null
          text?: string | null
          typ: Database['public']['Enums']['event_typ']
          user_id?: string | null
        }
        Update: {
          aircraft_id?: string
          created_at?: string
          id?: never
          intern?: boolean
          report_id?: string | null
          text?: string | null
          typ?: Database['public']['Enums']['event_typ']
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'report_events_aircraft_id_fkey'
            columns: ['aircraft_id']
            isOneToOne: false
            referencedRelation: 'aircraft'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'report_events_aircraft_id_fkey'
            columns: ['aircraft_id']
            isOneToOne: false
            referencedRelation: 'aircraft_overview'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'report_events_report_id_fkey'
            columns: ['report_id']
            isOneToOne: false
            referencedRelation: 'reports'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'report_events_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profile_names'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'report_events_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      report_photos: {
        Row: {
          created_at: string
          id: string
          report_id: string
          storage_path: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          id?: string
          report_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          report_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: 'report_photos_report_id_fkey'
            columns: ['report_id']
            isOneToOne: false
            referencedRelation: 'reports'
            referencedColumns: ['id']
          },
        ]
      }
      reports: {
        Row: {
          aircraft_id: string
          created_at: string
          eingestuft_am: string | null
          eingestuft_von: string | null
          erledigt_am: string | null
          id: string
          kategorie: number | null
          melder_id: string
          pilotenhinweis: string | null
          pilotenhinweis_sichtbar: boolean
          status: Database['public']['Enums']['meldung_status']
          text: string
          vorlaeufig_nicht_flugklar: boolean
          ziel: string | null
        }
        ComputedFields: never
        Insert: {
          aircraft_id: string
          created_at?: string
          eingestuft_am?: string | null
          eingestuft_von?: string | null
          erledigt_am?: string | null
          id?: string
          kategorie?: number | null
          melder_id: string
          pilotenhinweis?: string | null
          pilotenhinweis_sichtbar?: boolean
          status?: Database['public']['Enums']['meldung_status']
          text: string
          vorlaeufig_nicht_flugklar?: boolean
          ziel?: string | null
        }
        Update: {
          aircraft_id?: string
          created_at?: string
          eingestuft_am?: string | null
          eingestuft_von?: string | null
          erledigt_am?: string | null
          id?: string
          kategorie?: number | null
          melder_id?: string
          pilotenhinweis?: string | null
          pilotenhinweis_sichtbar?: boolean
          status?: Database['public']['Enums']['meldung_status']
          text?: string
          vorlaeufig_nicht_flugklar?: boolean
          ziel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'reports_aircraft_id_fkey'
            columns: ['aircraft_id']
            isOneToOne: false
            referencedRelation: 'aircraft'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reports_aircraft_id_fkey'
            columns: ['aircraft_id']
            isOneToOne: false
            referencedRelation: 'aircraft_overview'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reports_eingestuft_von_fkey'
            columns: ['eingestuft_von']
            isOneToOne: false
            referencedRelation: 'profile_names'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reports_eingestuft_von_fkey'
            columns: ['eingestuft_von']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reports_melder_id_fkey'
            columns: ['melder_id']
            isOneToOne: false
            referencedRelation: 'profile_names'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reports_melder_id_fkey'
            columns: ['melder_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      aircraft_overview: {
        Row: {
          aktiv: boolean
          ampel: Database['public']['Enums']['ampel'] | null
          anzahl_in_pruefung: number | null
          art: Database['public']['Enums']['flugzeug_art']
          gesperrt: boolean
          gesperrt_am: string | null
          gesperrt_von_name: string | null
          hinweise: Json | null
          id: string
          kat1_offen: boolean | null
          kennzeichen: string
          muster: string
          sperrgruende: string[] | null
          sperrgrund: string | null
          vorlaeufig_gesperrt: boolean | null
          wettbewerbskennzeichen: string | null
        }
        ComputedFields: never
        Relationships: []
      }
      aircraft_verlauf: {
        Row: {
          aircraft_id: string
          created_at: string
          id: number
          intern: boolean
          report_id: string | null
          text: string | null
          typ: Database['public']['Enums']['event_typ']
          user_id: string | null
          user_name: string | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'report_events_aircraft_id_fkey'
            columns: ['aircraft_id']
            isOneToOne: false
            referencedRelation: 'aircraft'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'report_events_aircraft_id_fkey'
            columns: ['aircraft_id']
            isOneToOne: false
            referencedRelation: 'aircraft_overview'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'report_events_report_id_fkey'
            columns: ['report_id']
            isOneToOne: false
            referencedRelation: 'reports'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'report_events_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profile_names'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'report_events_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      profile_names: {
        Row: {
          id: string
          nachname: string
          rolle: Database['public']['Enums']['rolle']
          vorname: string
        }
        ComputedFields: never
        Insert: {
          id?: string | null
          nachname?: string | null
          rolle?: Database['public']['Enums']['rolle'] | null
          vorname?: string | null
        }
        Update: {
          id?: string | null
          nachname?: string | null
          rolle?: Database['public']['Enums']['rolle'] | null
          vorname?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_update_user: {
        Args: {
          p_freigabe: Database['public']['Enums']['freigabe']
          p_rolle: Database['public']['Enums']['rolle']
          p_user_id: string
        }
        Returns: undefined
      }
      aircraft_entsperren: { Args: { p_aircraft_id: string; p_grund: string }; Returns: undefined }
      aircraft_sperren: { Args: { p_aircraft_id: string; p_grund: string }; Returns: undefined }
      current_rolle: {
        Args: Record<PropertyKey, never>
        Returns: Database['public']['Enums']['rolle']
      }
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
      is_approved: { Args: Record<PropertyKey, never>; Returns: boolean }
      is_wart: { Args: Record<PropertyKey, never>; Returns: boolean }
      report_comment: {
        Args: { p_intern?: boolean; p_report_id: string; p_text: string }
        Returns: undefined
      }
      report_create: {
        Args: { p_aircraft_id: string; p_text: string; p_vorlaeufig_nicht_flugklar?: boolean }
        Returns: string
      }
      report_einstufen: {
        Args: {
          p_begruendung?: string
          p_kategorie: number
          p_pilotenhinweis?: string
          p_pilotenhinweis_sichtbar?: boolean
          p_report_id: string
          p_ziel?: string
        }
        Returns: undefined
      }
      report_hinweis_sichtbar: { Args: { p_report_id: string }; Returns: boolean }
      report_set_status: {
        Args: {
          p_flugklar_bestaetigt?: boolean
          p_report_id: string
          p_rueckmeldung?: string
          p_status: Database['public']['Enums']['meldung_status']
        }
        Returns: undefined
      }
    }
    Enums: {
      ampel: 'gruen' | 'gelb' | 'rot'
      event_typ: 'erstellt' | 'kommentar' | 'statuswechsel' | 'kategorie' | 'sperre' | 'entsperrt'
      flugzeug_art: 'segler' | 'motorsegler' | 'ul' | 'schlepp'
      freigabe: 'ausstehend' | 'freigegeben' | 'abgelehnt'
      meldung_status: 'neu' | 'zurueckgestellt' | 'in_arbeit' | 'erledigt' | 'abgelegt'
      rolle: 'pilot' | 'wart' | 'admin'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      ampel: ['gruen', 'gelb', 'rot'],
      event_typ: ['erstellt', 'kommentar', 'statuswechsel', 'kategorie', 'sperre', 'entsperrt'],
      flugzeug_art: ['segler', 'motorsegler', 'ul', 'schlepp'],
      freigabe: ['ausstehend', 'freigegeben', 'abgelehnt'],
      meldung_status: ['neu', 'zurueckgestellt', 'in_arbeit', 'erledigt', 'abgelegt'],
      rolle: ['pilot', 'wart', 'admin'],
    },
  },
} as const
