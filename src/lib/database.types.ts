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
      aircraft_counters: {
        Row: {
          aircraft_id: string
          betriebsminuten: number
          created_at: string
          erfasst_von: string | null
          id: number
          landungen: number | null
          notiz: string | null
          quelle: Database['public']['Enums']['zaehler_quelle']
          stand_am: string
        }
        ComputedFields: never
        Insert: {
          aircraft_id: string
          betriebsminuten: number
          created_at?: string
          erfasst_von?: string | null
          id?: never
          landungen?: number | null
          notiz?: string | null
          quelle?: Database['public']['Enums']['zaehler_quelle']
          stand_am: string
        }
        Update: {
          aircraft_id?: string
          betriebsminuten?: number
          created_at?: string
          erfasst_von?: string | null
          id?: never
          landungen?: number | null
          notiz?: string | null
          quelle?: Database['public']['Enums']['zaehler_quelle']
          stand_am?: string
        }
        Relationships: [
          {
            foreignKeyName: 'aircraft_counters_aircraft_id_fkey'
            columns: ['aircraft_id']
            isOneToOne: false
            referencedRelation: 'aircraft'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'aircraft_counters_aircraft_id_fkey'
            columns: ['aircraft_id']
            isOneToOne: false
            referencedRelation: 'aircraft_overview'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'aircraft_counters_erfasst_von_fkey'
            columns: ['erfasst_von']
            isOneToOne: false
            referencedRelation: 'profile_names'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'aircraft_counters_erfasst_von_fkey'
            columns: ['erfasst_von']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      deadline_events: {
        Row: {
          created_at: string
          deadline_id: string
          id: number
          text: string | null
          typ: Database['public']['Enums']['frist_event_typ']
          user_id: string | null
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          deadline_id: string
          id?: never
          text?: string | null
          typ: Database['public']['Enums']['frist_event_typ']
          user_id?: string | null
        }
        Update: {
          created_at?: string
          deadline_id?: string
          id?: never
          text?: string | null
          typ?: Database['public']['Enums']['frist_event_typ']
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'deadline_events_deadline_id_fkey'
            columns: ['deadline_id']
            isOneToOne: false
            referencedRelation: 'deadline_list'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'deadline_events_deadline_id_fkey'
            columns: ['deadline_id']
            isOneToOne: false
            referencedRelation: 'deadlines'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'deadline_events_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profile_names'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'deadline_events_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      deadlines: {
        Row: {
          aircraft_id: string
          aktiv: boolean
          beschreibung: string
          created_at: string
          erstellt_von: string | null
          faellig_am: string | null
          faellig_bei_minuten: number | null
          id: string
          intervall_minuten: number | null
          intervall_monate: number | null
          titel: string
          updated_at: string
          vorlauf_minuten: number
          vorlauf_tage: number
          zuletzt_am: string | null
          zuletzt_bei_minuten: number | null
        }
        ComputedFields: never
        Insert: {
          aircraft_id: string
          aktiv?: boolean
          beschreibung?: string
          created_at?: string
          erstellt_von?: string | null
          faellig_am?: string | null
          faellig_bei_minuten?: number | null
          id?: string
          intervall_minuten?: number | null
          intervall_monate?: number | null
          titel: string
          updated_at?: string
          vorlauf_minuten?: number
          vorlauf_tage?: number
          zuletzt_am?: string | null
          zuletzt_bei_minuten?: number | null
        }
        Update: {
          aircraft_id?: string
          aktiv?: boolean
          beschreibung?: string
          created_at?: string
          erstellt_von?: string | null
          faellig_am?: string | null
          faellig_bei_minuten?: number | null
          id?: string
          intervall_minuten?: number | null
          intervall_monate?: number | null
          titel?: string
          updated_at?: string
          vorlauf_minuten?: number
          vorlauf_tage?: number
          zuletzt_am?: string | null
          zuletzt_bei_minuten?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'deadlines_aircraft_id_fkey'
            columns: ['aircraft_id']
            isOneToOne: false
            referencedRelation: 'aircraft'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'deadlines_aircraft_id_fkey'
            columns: ['aircraft_id']
            isOneToOne: false
            referencedRelation: 'aircraft_overview'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'deadlines_erstellt_von_fkey'
            columns: ['erstellt_von']
            isOneToOne: false
            referencedRelation: 'profile_names'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'deadlines_erstellt_von_fkey'
            columns: ['erstellt_von']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      maintenance_template_items: {
        Row: {
          id: string
          position: number
          template_id: string
          text: string
        }
        ComputedFields: never
        Insert: {
          id?: string
          position?: number
          template_id: string
          text: string
        }
        Update: {
          id?: string
          position?: number
          template_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: 'maintenance_template_items_template_id_fkey'
            columns: ['template_id']
            isOneToOne: false
            referencedRelation: 'maintenance_templates'
            referencedColumns: ['id']
          },
        ]
      }
      maintenance_templates: {
        Row: {
          aktiv: boolean
          beschreibung: string
          created_at: string
          erstellt_von: string | null
          id: string
          muster: string | null
          titel: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          aktiv?: boolean
          beschreibung?: string
          created_at?: string
          erstellt_von?: string | null
          id?: string
          muster?: string | null
          titel: string
          updated_at?: string
        }
        Update: {
          aktiv?: boolean
          beschreibung?: string
          created_at?: string
          erstellt_von?: string | null
          id?: string
          muster?: string | null
          titel?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'maintenance_templates_erstellt_von_fkey'
            columns: ['erstellt_von']
            isOneToOne: false
            referencedRelation: 'profile_names'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maintenance_templates_erstellt_von_fkey'
            columns: ['erstellt_von']
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
            referencedRelation: 'report_list'
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
            referencedRelation: 'report_list'
            referencedColumns: ['id']
          },
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
          beobachten: boolean
          created_at: string
          eingestuft_am: string | null
          eingestuft_von: string | null
          erledigt_am: string | null
          id: string
          kategorie: number | null
          massnahme: string | null
          melder_id: string
          nr: number
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
          beobachten?: boolean
          created_at?: string
          eingestuft_am?: string | null
          eingestuft_von?: string | null
          erledigt_am?: string | null
          id?: string
          kategorie?: number | null
          massnahme?: string | null
          melder_id: string
          nr?: never
          pilotenhinweis?: string | null
          pilotenhinweis_sichtbar?: boolean
          status?: Database['public']['Enums']['meldung_status']
          text: string
          vorlaeufig_nicht_flugklar?: boolean
          ziel?: string | null
        }
        Update: {
          aircraft_id?: string
          beobachten?: boolean
          created_at?: string
          eingestuft_am?: string | null
          eingestuft_von?: string | null
          erledigt_am?: string | null
          id?: string
          kategorie?: number | null
          massnahme?: string | null
          melder_id?: string
          nr?: never
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
      task_events: {
        Row: {
          created_at: string
          id: number
          task_id: string
          text: string | null
          typ: Database['public']['Enums']['aufgabe_event_typ']
          user_id: string | null
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          id?: never
          task_id: string
          text?: string | null
          typ: Database['public']['Enums']['aufgabe_event_typ']
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: never
          task_id?: string
          text?: string | null
          typ?: Database['public']['Enums']['aufgabe_event_typ']
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'task_events_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'task_list'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'task_events_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'task_events_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profile_names'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'task_events_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      task_items: {
        Row: {
          created_at: string
          erledigt: boolean
          erledigt_am: string | null
          erledigt_von: string | null
          id: string
          position: number
          task_id: string
          text: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          erledigt?: boolean
          erledigt_am?: string | null
          erledigt_von?: string | null
          id?: string
          position?: number
          task_id: string
          text: string
        }
        Update: {
          created_at?: string
          erledigt?: boolean
          erledigt_am?: string | null
          erledigt_von?: string | null
          id?: string
          position?: number
          task_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: 'task_items_erledigt_von_fkey'
            columns: ['erledigt_von']
            isOneToOne: false
            referencedRelation: 'profile_names'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'task_items_erledigt_von_fkey'
            columns: ['erledigt_von']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'task_items_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'task_list'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'task_items_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
        ]
      }
      tasks: {
        Row: {
          aircraft_id: string | null
          beschreibung: string
          created_at: string
          erledigt_am: string | null
          erledigt_von: string | null
          erstellt_von: string | null
          faellig_am: string | null
          id: string
          nr: number
          prioritaet: Database['public']['Enums']['aufgabe_prioritaet']
          report_id: string | null
          status: Database['public']['Enums']['aufgabe_status']
          template_id: string | null
          titel: string
          updated_at: string
          wartet_auf: string | null
          zustaendig_id: string | null
        }
        ComputedFields: never
        Insert: {
          aircraft_id?: string | null
          beschreibung?: string
          created_at?: string
          erledigt_am?: string | null
          erledigt_von?: string | null
          erstellt_von?: string | null
          faellig_am?: string | null
          id?: string
          nr?: never
          prioritaet?: Database['public']['Enums']['aufgabe_prioritaet']
          report_id?: string | null
          status?: Database['public']['Enums']['aufgabe_status']
          template_id?: string | null
          titel: string
          updated_at?: string
          wartet_auf?: string | null
          zustaendig_id?: string | null
        }
        Update: {
          aircraft_id?: string | null
          beschreibung?: string
          created_at?: string
          erledigt_am?: string | null
          erledigt_von?: string | null
          erstellt_von?: string | null
          faellig_am?: string | null
          id?: string
          nr?: never
          prioritaet?: Database['public']['Enums']['aufgabe_prioritaet']
          report_id?: string | null
          status?: Database['public']['Enums']['aufgabe_status']
          template_id?: string | null
          titel?: string
          updated_at?: string
          wartet_auf?: string | null
          zustaendig_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tasks_aircraft_id_fkey'
            columns: ['aircraft_id']
            isOneToOne: false
            referencedRelation: 'aircraft'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_aircraft_id_fkey'
            columns: ['aircraft_id']
            isOneToOne: false
            referencedRelation: 'aircraft_overview'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_erledigt_von_fkey'
            columns: ['erledigt_von']
            isOneToOne: false
            referencedRelation: 'profile_names'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_erledigt_von_fkey'
            columns: ['erledigt_von']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_erstellt_von_fkey'
            columns: ['erstellt_von']
            isOneToOne: false
            referencedRelation: 'profile_names'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_erstellt_von_fkey'
            columns: ['erstellt_von']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_report_id_fkey'
            columns: ['report_id']
            isOneToOne: false
            referencedRelation: 'report_list'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_report_id_fkey'
            columns: ['report_id']
            isOneToOne: false
            referencedRelation: 'reports'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_template_id_fkey'
            columns: ['template_id']
            isOneToOne: false
            referencedRelation: 'maintenance_templates'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_zustaendig_id_fkey'
            columns: ['zustaendig_id']
            isOneToOne: false
            referencedRelation: 'profile_names'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_zustaendig_id_fkey'
            columns: ['zustaendig_id']
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
          beobachtungen: Json | null
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
            referencedRelation: 'report_list'
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
      aircraft_zaehler: {
        Row: {
          aircraft_id: string
          betriebsminuten: number
          created_at: string
          kennzeichen: string
          landungen: number | null
          muster: string
          quelle: Database['public']['Enums']['zaehler_quelle']
          stand_am: string
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'aircraft_counters_aircraft_id_fkey'
            columns: ['aircraft_id']
            isOneToOne: false
            referencedRelation: 'aircraft'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'aircraft_counters_aircraft_id_fkey'
            columns: ['aircraft_id']
            isOneToOne: false
            referencedRelation: 'aircraft_overview'
            referencedColumns: ['id']
          },
        ]
      }
      deadline_list: {
        Row: {
          aircraft_id: string
          aktiv: boolean
          aktuelle_minuten: number | null
          beschreibung: string
          created_at: string
          faellig_am: string | null
          faellig_bei_minuten: number | null
          id: string
          intervall_minuten: number | null
          intervall_monate: number | null
          kennzeichen: string
          muster: string
          rest_minuten: number | null
          rest_tage: number | null
          stand: string | null
          titel: string
          updated_at: string
          vorlauf_minuten: number
          vorlauf_tage: number
          zaehler_stand_am: string | null
          zuletzt_am: string | null
          zuletzt_bei_minuten: number | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'deadlines_aircraft_id_fkey'
            columns: ['aircraft_id']
            isOneToOne: false
            referencedRelation: 'aircraft'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'deadlines_aircraft_id_fkey'
            columns: ['aircraft_id']
            isOneToOne: false
            referencedRelation: 'aircraft_overview'
            referencedColumns: ['id']
          },
        ]
      }
      deadline_verlauf: {
        Row: {
          created_at: string
          deadline_id: string
          id: number
          text: string | null
          typ: Database['public']['Enums']['frist_event_typ']
          user_id: string | null
          user_name: string | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'deadline_events_deadline_id_fkey'
            columns: ['deadline_id']
            isOneToOne: false
            referencedRelation: 'deadline_list'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'deadline_events_deadline_id_fkey'
            columns: ['deadline_id']
            isOneToOne: false
            referencedRelation: 'deadlines'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'deadline_events_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profile_names'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'deadline_events_user_id_fkey'
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
      report_list: {
        Row: {
          aircraft_id: string
          anzahl_aufgaben_offen: number | null
          anzahl_fotos: number | null
          beobachten: boolean
          created_at: string
          eingestuft_am: string | null
          eingestuft_von: string | null
          eingestuft_von_name: string | null
          erledigt_am: string | null
          id: string
          kategorie: number | null
          kennzeichen: string
          letzte_aktivitaet: string | null
          massnahme: string | null
          melder_id: string
          melder_name: string | null
          muster: string
          nr: number
          pilotenhinweis: string | null
          pilotenhinweis_sichtbar: boolean
          status: Database['public']['Enums']['meldung_status']
          text: string
          vorlaeufig_nicht_flugklar: boolean
          ziel: string | null
        }
        ComputedFields: never
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
      task_list: {
        Row: {
          aircraft_id: string | null
          anzahl_kommentare: number | null
          anzahl_schritte: number | null
          anzahl_schritte_erledigt: number | null
          beschreibung: string
          created_at: string
          erledigt_am: string | null
          erstellt_von: string | null
          erstellt_von_name: string | null
          faellig_am: string | null
          id: string
          kennzeichen: string | null
          letzte_aktivitaet: string | null
          muster: string | null
          nr: number
          prioritaet: Database['public']['Enums']['aufgabe_prioritaet']
          report_id: string | null
          report_nr: number | null
          status: Database['public']['Enums']['aufgabe_status']
          template_id: string | null
          titel: string
          ueberfaellig: boolean | null
          updated_at: string
          wartet_auf: string | null
          zustaendig_id: string | null
          zustaendig_name: string | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'tasks_aircraft_id_fkey'
            columns: ['aircraft_id']
            isOneToOne: false
            referencedRelation: 'aircraft'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_aircraft_id_fkey'
            columns: ['aircraft_id']
            isOneToOne: false
            referencedRelation: 'aircraft_overview'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_erstellt_von_fkey'
            columns: ['erstellt_von']
            isOneToOne: false
            referencedRelation: 'profile_names'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_erstellt_von_fkey'
            columns: ['erstellt_von']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_report_id_fkey'
            columns: ['report_id']
            isOneToOne: false
            referencedRelation: 'report_list'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_report_id_fkey'
            columns: ['report_id']
            isOneToOne: false
            referencedRelation: 'reports'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_template_id_fkey'
            columns: ['template_id']
            isOneToOne: false
            referencedRelation: 'maintenance_templates'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_zustaendig_id_fkey'
            columns: ['zustaendig_id']
            isOneToOne: false
            referencedRelation: 'profile_names'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_zustaendig_id_fkey'
            columns: ['zustaendig_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      task_verlauf: {
        Row: {
          created_at: string
          id: number
          task_id: string
          text: string | null
          typ: Database['public']['Enums']['aufgabe_event_typ']
          user_id: string | null
          user_name: string | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'task_events_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'task_list'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'task_events_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'task_events_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profile_names'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'task_events_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
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
      aircraft_counter_add: {
        Args: {
          p_aircraft_id: string
          p_betriebsminuten: number
          p_landungen?: number
          p_notiz?: string
          p_stand_am: string
        }
        Returns: undefined
      }
      aircraft_entsperren: { Args: { p_aircraft_id: string; p_grund: string }; Returns: undefined }
      aircraft_sperren: { Args: { p_aircraft_id: string; p_grund: string }; Returns: undefined }
      aufgabe_status_text: {
        Args: { p_status: Database['public']['Enums']['aufgabe_status'] }
        Returns: string
      }
      current_rolle: {
        Args: Record<PropertyKey, never>
        Returns: Database['public']['Enums']['rolle']
      }
      deadline_abschliessen: { Args: { p_id: string; p_text: string }; Returns: undefined }
      deadline_erledigen: {
        Args: { p_am: string; p_bei_minuten?: number; p_id: string; p_text?: string }
        Returns: undefined
      }
      deadline_save: {
        Args: {
          p_aircraft_id: string
          p_beschreibung?: string
          p_faellig_am?: string
          p_faellig_bei_minuten?: number
          p_id?: string
          p_intervall_minuten?: number
          p_intervall_monate?: number
          p_titel: string
          p_vorlauf_minuten?: number
          p_vorlauf_tage?: number
        }
        Returns: string
      }
      heute: { Args: Record<PropertyKey, never>; Returns: string }
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
      is_approved: { Args: Record<PropertyKey, never>; Returns: boolean }
      is_wart: { Args: Record<PropertyKey, never>; Returns: boolean }
      offene_aufgabe: {
        Args: { p_task_id: string }
        Returns: {
          aircraft_id: string | null
          beschreibung: string
          created_at: string
          erledigt_am: string | null
          erledigt_von: string | null
          erstellt_von: string | null
          faellig_am: string | null
          id: string
          nr: number
          prioritaet: Database['public']['Enums']['aufgabe_prioritaet']
          report_id: string | null
          status: Database['public']['Enums']['aufgabe_status']
          titel: string
          updated_at: string
          wartet_auf: string | null
          zustaendig_id: string | null
        }
        SetofOptions: {
          from: '*'
          to: 'tasks'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      profil_name: { Args: { p_id: string }; Returns: string }
      pruefe_zustaendig: { Args: { p_id: string }; Returns: undefined }
      report_beobachtung_beenden: {
        Args: { p_report_id: string; p_text: string }
        Returns: undefined
      }
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
          p_beobachten?: boolean
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
      stunden_text: { Args: { p_minuten: number }; Returns: string }
      task_comment: { Args: { p_task_id: string; p_text: string }; Returns: undefined }
      task_create: {
        Args: {
          p_aircraft_id?: string
          p_beschreibung?: string
          p_faellig_am?: string
          p_prioritaet?: Database['public']['Enums']['aufgabe_prioritaet']
          p_report_id?: string
          p_teilschritte?: string[]
          p_titel: string
          p_zustaendig_id?: string
        }
        Returns: string
      }
      task_item_add: { Args: { p_task_id: string; p_text: string }; Returns: string }
      task_item_delete: { Args: { p_item_id: string }; Returns: undefined }
      task_item_set: { Args: { p_erledigt: boolean; p_item_id: string }; Returns: undefined }
      task_set_status: {
        Args: {
          p_status: Database['public']['Enums']['aufgabe_status']
          p_task_id: string
          p_text?: string
        }
        Returns: undefined
      }
      task_update: {
        Args: {
          p_aircraft_id: string
          p_beschreibung: string
          p_faellig_am: string
          p_prioritaet: Database['public']['Enums']['aufgabe_prioritaet']
          p_task_id: string
          p_titel: string
          p_zustaendig_id: string
        }
        Returns: undefined
      }
      template_save: {
        Args: {
          p_beschreibung?: string
          p_id?: string
          p_muster?: string
          p_teilschritte?: string[]
          p_titel: string
        }
        Returns: string
      }
      template_set_aktiv: { Args: { p_aktiv: boolean; p_id: string }; Returns: undefined }
      wartung_starten: {
        Args: {
          p_aircraft_id: string
          p_faellig_am?: string
          p_sperren?: boolean
          p_template_id: string
          p_zustaendig_id?: string
        }
        Returns: string
      }
    }
    Enums: {
      ampel: 'gruen' | 'gelb' | 'rot'
      aufgabe_event_typ: 'erstellt' | 'geaendert' | 'status' | 'kommentar' | 'teilschritt'
      aufgabe_prioritaet: 'niedrig' | 'normal' | 'hoch'
      aufgabe_status: 'offen' | 'in_arbeit' | 'wartet' | 'erledigt' | 'verworfen'
      event_typ: 'erstellt' | 'kommentar' | 'statuswechsel' | 'kategorie' | 'sperre' | 'entsperrt'
      flugzeug_art: 'segler' | 'motorsegler' | 'ul' | 'schlepp' | 'motorflugzeug'
      freigabe: 'ausstehend' | 'freigegeben' | 'abgelehnt' | 'deaktiviert'
      frist_event_typ: 'erstellt' | 'geaendert' | 'erledigt' | 'abgeschlossen'
      meldung_status: 'neu' | 'zurueckgestellt' | 'in_arbeit' | 'erledigt' | 'abgelegt'
      rolle: 'pilot' | 'wart' | 'admin'
      zaehler_quelle: 'manuell' | 'vereinsflieger'
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
      aufgabe_event_typ: ['erstellt', 'geaendert', 'status', 'kommentar', 'teilschritt'],
      aufgabe_prioritaet: ['niedrig', 'normal', 'hoch'],
      aufgabe_status: ['offen', 'in_arbeit', 'wartet', 'erledigt', 'verworfen'],
      event_typ: ['erstellt', 'kommentar', 'statuswechsel', 'kategorie', 'sperre', 'entsperrt'],
      flugzeug_art: ['segler', 'motorsegler', 'ul', 'schlepp', 'motorflugzeug'],
      freigabe: ['ausstehend', 'freigegeben', 'abgelehnt', 'deaktiviert'],
      frist_event_typ: ['erstellt', 'geaendert', 'erledigt', 'abgeschlossen'],
      meldung_status: ['neu', 'zurueckgestellt', 'in_arbeit', 'erledigt', 'abgelegt'],
      rolle: ['pilot', 'wart', 'admin'],
      zaehler_quelle: ['manuell', 'vereinsflieger'],
    },
  },
} as const
