export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      daily_task_selections: {
        Row: {
          created_at: string
          focused: boolean
          selected_date: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          focused?: boolean
          selected_date: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          focused?: boolean
          selected_date?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_task_selections_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      lists: {
        Row: {
          color: string
          default_view: string | null
          emoji: string | null
          id: string
          title: string | null
          user_id: string | null
        }
        Insert: {
          color?: string
          default_view?: string | null
          emoji?: string | null
          id?: string
          title?: string | null
          user_id?: string | null
        }
        Update: {
          color?: string
          default_view?: string | null
          emoji?: string | null
          id?: string
          title?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          all_day: boolean
          created_at: string
          description: string | null
          ends_at: string | null
          ends_on: string | null
          id: string
          list_id: string | null
          category_id: string | null
          color: string | null
          location: string | null
          recurrence_rule: Json | null
          show_in_upcoming: boolean
          starts_at: string | null
          starts_on: string | null
          title: string
          time_zone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          all_day?: boolean
          created_at?: string
          description?: string | null
          ends_at?: string | null
          ends_on?: string | null
          id?: string
          list_id?: string | null
          category_id?: string | null
          color?: string | null
          location?: string | null
          recurrence_rule?: Json | null
          show_in_upcoming?: boolean
          starts_at?: string | null
          starts_on?: string | null
          title: string
          time_zone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          all_day?: boolean
          created_at?: string
          description?: string | null
          ends_at?: string | null
          ends_on?: string | null
          id?: string
          list_id?: string | null
          category_id?: string | null
          color?: string | null
          location?: string | null
          recurrence_rule?: Json | null
          show_in_upcoming?: boolean
          starts_at?: string | null
          starts_on?: string | null
          title?: string
          time_zone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      event_occurrence_exceptions: {
        Row: {
          all_day: boolean | null
          cancelled: boolean
          created_at: string
          description: string | null
          ends_at: string | null
          ends_on: string | null
          event_id: string
          id: string
          list_id: string | null
          category_id: string | null
          color: string | null
          location: string | null
          show_in_upcoming: boolean | null
          occurrence_key: string
          time_zone: string | null
          starts_at: string | null
          starts_on: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          all_day?: boolean | null
          cancelled?: boolean
          created_at?: string
          description?: string | null
          ends_at?: string | null
          ends_on?: string | null
          event_id: string
          id?: string
          list_id?: string | null
          category_id?: string | null
          color?: string | null
          location?: string | null
          show_in_upcoming?: boolean | null
          occurrence_key: string
          time_zone?: string | null
          starts_at?: string | null
          starts_on?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          all_day?: boolean | null
          cancelled?: boolean
          created_at?: string
          description?: string | null
          ends_at?: string | null
          ends_on?: string | null
          event_id?: string
          id?: string
          list_id?: string | null
          category_id?: string | null
          color?: string | null
          location?: string | null
          show_in_upcoming?: boolean | null
          occurrence_key?: string
          time_zone?: string | null
          starts_at?: string | null
          starts_on?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_occurrence_exceptions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_occurrence_exceptions_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_occurrence_exceptions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          list_id: string
          position: number
          title: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          list_id: string
          position?: number
          title: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          list_id?: string
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
        ]
      }
      task_time_blocks: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          is_override: boolean
          occurrence_id: string | null
          session_index: number | null
          starts_at: string
          status: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          is_override?: boolean
          occurrence_id?: string | null
          session_index?: number | null
          starts_at: string
          status?: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          is_override?: boolean
          occurrence_id?: string | null
          session_index?: number | null
          starts_at?: string
          status?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_time_blocks_owned_task"
            columns: ["task_id", "user_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "task_time_blocks_owned_occurrence"
            columns: ["occurrence_id", "user_id", "task_id"]
            isOneToOne: false
            referencedRelation: "task_occurrences"
            referencedColumns: ["id", "user_id", "task_id"]
          },
        ]
      }
      task_occurrences: {
        Row: {
          cancelled: boolean
          completed: boolean
          created_at: string
          id: string
          occurrence_date: string
          override_data: Json | null
          skipped: boolean
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancelled?: boolean
          completed?: boolean
          created_at?: string
          id?: string
          occurrence_date: string
          override_data?: Json | null
          skipped?: boolean
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancelled?: boolean
          completed?: boolean
          created_at?: string
          id?: string
          occurrence_date?: string
          override_data?: Json | null
          skipped?: boolean
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_occurrences_owned_task"
            columns: ["task_id", "user_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      tasks: {
        Row: {
          completed: boolean
          created_at: string | null
          due_date: string | null
          due_time: string | null
          focused: boolean
          id: string
          list_id: string | null
          color: string | null
          notes: string | null
          position: number
          category_id: string | null
          recurrence_rule: Json | null
          stashed: boolean
          title: string | null
          user_id: string | null
        }
        Insert: {
          completed?: boolean
          created_at?: string | null
          due_date?: string | null
          due_time?: string | null
          focused?: boolean
          id?: string
          list_id?: string | null
          color?: string | null
          notes?: string | null
          position?: number
          category_id?: string | null
          recurrence_rule?: Json | null
          stashed?: boolean
          title?: string | null
          user_id?: string | null
        }
        Update: {
          completed?: boolean
          created_at?: string | null
          due_date?: string | null
          due_time?: string | null
          focused?: boolean
          id?: string
          list_id?: string | null
          color?: string | null
          notes?: string | null
          position?: number
          category_id?: string | null
          recurrence_rule?: Json | null
          stashed?: boolean
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_keychain: {
        Row: {
          created_at: string
          kdf: string
          kdf_iterations: number
          updated_at: string
          user_id: string
          version: number
          wrapped_master_key: string
          wrapping_algorithm: string
          wrapping_key_iv: string
          wrapping_key_salt: string
        }
        Insert: {
          created_at?: string
          kdf?: string
          kdf_iterations?: number
          updated_at?: string
          user_id?: string
          version?: number
          wrapped_master_key: string
          wrapping_algorithm: string
          wrapping_key_iv: string
          wrapping_key_salt: string
        }
        Update: {
          created_at?: string
          kdf?: string
          kdf_iterations?: number
          updated_at?: string
          user_id?: string
          version?: number
          wrapped_master_key?: string
          wrapping_algorithm?: string
          wrapping_key_iv?: string
          wrapping_key_salt?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          calendar_first_day: number
          created_at: string
          excluded_home_category_ids: string[]
          excluded_home_list_ids: string[]
          included_home_category_ids: string[]
          show_unsorted_on_home: boolean
          time_format: string
          updated_at: string
          user_id: string
        }
        Insert: {
          calendar_first_day?: number
          created_at?: string
          excluded_home_category_ids?: string[]
          excluded_home_list_ids?: string[]
          included_home_category_ids?: string[]
          show_unsorted_on_home?: boolean
          time_format?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          calendar_first_day?: number
          created_at?: string
          excluded_home_category_ids?: string[]
          excluded_home_list_ids?: string[]
          included_home_category_ids?: string[]
          show_unsorted_on_home?: boolean
          time_format?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_category: {
        Args: { p_category_id: string; p_list_id: string }
        Returns: undefined
      }
      set_daily_task_focus: {
        Args: { p_focused: boolean; p_selected_date: string; p_task_id: string }
        Returns: undefined
      }
      set_task_focus: {
        Args: { p_focused: boolean; p_task_id: string }
        Returns: undefined
      }
      set_home_list_visibility: {
        Args: {
          p_clear_category_overrides?: boolean
          p_list_id: string
          p_visible: boolean
        }
        Returns: undefined
      }
      set_home_category_visibility: {
        Args: { p_category_id: string; p_visible: boolean }
        Returns: undefined
      }
      set_home_unsorted_visibility: {
        Args: { p_show_unsorted: boolean }
        Returns: undefined
      }
      show_all_home_sources: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
