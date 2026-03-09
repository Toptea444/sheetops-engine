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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_alerts: {
        Row: {
          alert_type: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          message: string
          priority: number
          title: string
          updated_at: string
        }
        Insert: {
          alert_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          message: string
          priority?: number
          title: string
          updated_at?: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          message?: string
          priority?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      confirmed_identities: {
        Row: {
          confirmed_at: string
          device_fingerprint: string
          id: string
          worker_id: string
        }
        Insert: {
          confirmed_at?: string
          device_fingerprint: string
          id?: string
          worker_id: string
        }
        Update: {
          confirmed_at?: string
          device_fingerprint?: string
          id?: string
          worker_id?: string
        }
        Relationships: []
      }
      cycle_sheet_cache: {
        Row: {
          cycle_key: string
          id: string
          sheet_data: Json
          sheet_name: string
          updated_at: string
        }
        Insert: {
          cycle_key: string
          id?: string
          sheet_data: Json
          sheet_name: string
          updated_at?: string
        }
        Update: {
          cycle_key?: string
          id?: string
          sheet_data?: Json
          sheet_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      cycle_worker_cache: {
        Row: {
          cycle_key: string
          id: string
          result_data: Json
          sheet_name: string
          updated_at: string
          worker_id: string
        }
        Insert: {
          cycle_key: string
          id?: string
          result_data: Json
          sheet_name: string
          updated_at?: string
          worker_id: string
        }
        Update: {
          cycle_key?: string
          id?: string
          result_data?: Json
          sheet_name?: string
          updated_at?: string
          worker_id?: string
        }
        Relationships: []
      }
      day_transfers: {
        Row: {
          amount: number
          bonus_amount: number | null
          created_at: string
          created_by: string | null
          cycle_key: string
          id: string
          ranking_bonus_amount: number | null
          reason: string | null
          sheet_amounts: Json | null
          sheet_name: string
          source_worker_id: string
          target_worker_id: string
          transfer_date: string
        }
        Insert: {
          amount?: number
          bonus_amount?: number | null
          created_at?: string
          created_by?: string | null
          cycle_key: string
          id?: string
          ranking_bonus_amount?: number | null
          reason?: string | null
          sheet_amounts?: Json | null
          sheet_name: string
          source_worker_id: string
          target_worker_id: string
          transfer_date: string
        }
        Update: {
          amount?: number
          bonus_amount?: number | null
          created_at?: string
          created_by?: string | null
          cycle_key?: string
          id?: string
          ranking_bonus_amount?: number | null
          reason?: string | null
          sheet_amounts?: Json | null
          sheet_name?: string
          source_worker_id?: string
          target_worker_id?: string
          transfer_date?: string
        }
        Relationships: []
      }
      id_swaps: {
        Row: {
          created_at: string
          created_by: string | null
          cycle_key: string
          effective_date: string
          id: string
          new_worker_id: string
          notes: string | null
          old_worker_id: string
          worker_name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cycle_key: string
          effective_date: string
          id?: string
          new_worker_id: string
          notes?: string | null
          old_worker_id: string
          worker_name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cycle_key?: string
          effective_date?: string
          id?: string
          new_worker_id?: string
          notes?: string | null
          old_worker_id?: string
          worker_name?: string
        }
        Relationships: []
      }
      pin_reset_requests: {
        Row: {
          id: string
          requested_at: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          worker_id: string
        }
        Insert: {
          id?: string
          requested_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          worker_id: string
        }
        Update: {
          id?: string
          requested_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          worker_id?: string
        }
        Relationships: []
      }
      worker_notes: {
        Row: {
          created_at: string
          created_by: string
          id: string
          note: string
          updated_at: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          note: string
          updated_at?: string
          worker_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          note?: string
          updated_at?: string
          worker_id?: string
        }
        Relationships: []
      }
      worker_pins: {
        Row: {
          created_at: string
          id: string
          pin_hash: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pin_hash: string
          worker_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pin_hash?: string
          worker_id?: string
        }
        Relationships: []
      }
      worker_sessions: {
        Row: {
          created_at: string
          device_fingerprint: string
          id: string
          last_heartbeat: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          device_fingerprint: string
          id?: string
          last_heartbeat?: string
          worker_id: string
        }
        Update: {
          created_at?: string
          device_fingerprint?: string
          id?: string
          last_heartbeat?: string
          worker_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
