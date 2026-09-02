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
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
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
      clients: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          seat_quota: number | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          seat_quota?: number | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          seat_quota?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      email_notifications: {
        Row: {
          body: string
          event: Database["public"]["Enums"]["notification_event"]
          id: string
          recipient_email: string
          sent_at: string
          subject: string
          ticket_id: string
        }
        Insert: {
          body: string
          event: Database["public"]["Enums"]["notification_event"]
          id?: string
          recipient_email: string
          sent_at?: string
          subject: string
          ticket_id: string
        }
        Update: {
          body?: string
          event?: Database["public"]["Enums"]["notification_event"]
          id?: string
          recipient_email?: string
          sent_at?: string
          subject?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_notifications_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "ticket_metrics"
            referencedColumns: ["ticket_id"]
          },
          {
            foreignKeyName: "email_notifications_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          client_id: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_id: string
          code: string
          created_at: string
          default_poc_id: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          client_id: string
          code: string
          created_at?: string
          default_poc_id?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          code?: string
          created_at?: string
          default_poc_id?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_default_poc_id_fkey"
            columns: ["default_poc_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size_bytes: number | null
          id: string
          message_id: string | null
          mime_type: string | null
          storage_path: string
          ticket_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size_bytes?: number | null
          id?: string
          message_id?: string | null
          mime_type?: string | null
          storage_path: string
          ticket_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size_bytes?: number | null
          id?: string
          message_id?: string | null
          mime_type?: string | null
          storage_path?: string
          ticket_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "ticket_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "ticket_metrics"
            referencedColumns: ["ticket_id"]
          },
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_dependencies: {
        Row: {
          created_at: string
          created_by: string | null
          depends_on_ticket_id: string
          id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          depends_on_ticket_id: string
          id?: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          depends_on_ticket_id?: string
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_dependencies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_dependencies_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_dependencies_depends_on_ticket_id_fkey"
            columns: ["depends_on_ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_events: {
        Row: {
          actor_id: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["ticket_status"] | null
          id: string
          notes: string | null
          ticket_id: string
          to_status: Database["public"]["Enums"]["ticket_status"]
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["ticket_status"] | null
          id?: string
          notes?: string | null
          ticket_id: string
          to_status: Database["public"]["Enums"]["ticket_status"]
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["ticket_status"] | null
          id?: string
          notes?: string | null
          ticket_id?: string
          to_status?: Database["public"]["Enums"]["ticket_status"]
        }
        Relationships: [
          {
            foreignKeyName: "ticket_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "ticket_metrics"
            referencedColumns: ["ticket_id"]
          },
          {
            foreignKeyName: "ticket_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_message_reads: {
        Row: {
          last_read_at: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          last_read_at?: string
          ticket_id: string
          user_id: string
        }
        Update: {
          last_read_at?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_message_reads_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_message_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          id: string
          ticket_id: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          id?: string
          ticket_id: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "ticket_metrics"
            referencedColumns: ["ticket_id"]
          },
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_watchers: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_watchers_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "ticket_metrics"
            referencedColumns: ["ticket_id"]
          },
          {
            foreignKeyName: "ticket_watchers_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          actual_hours: number | null
          admin_approved_at: string | null
          admin_approved_by: string | null
          admin_rejected_at: string | null
          admin_rejection_reason: string | null
          ai_summary: Json | null
          category: Database["public"]["Enums"]["ticket_category"]
          client_approval_notes: string | null
          client_approved_at: string | null
          client_id: string
          closed_at: string | null
          created_at: string
          delivered_at: string | null
          delivery_lead_id: string | null
          description: string | null
          development_completed_at: string | null
          environment: string
          estimated_hours: number | null
          id: string
          poc_id: string | null
          poc_responded_at: string | null
          priority: Database["public"]["Enums"]["ticket_priority"]
          project_id: string
          raised_at: string
          raised_by: string | null
          requirement_completed_at: string | null
          requires_admin_approval: boolean
          specialist_id: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          target_date: string | null
          title: string
          token: string | null
          updated_at: string
        }
        Insert: {
          actual_hours?: number | null
          admin_approved_at?: string | null
          admin_approved_by?: string | null
          admin_rejected_at?: string | null
          admin_rejection_reason?: string | null
          ai_summary?: Json | null
          category: Database["public"]["Enums"]["ticket_category"]
          client_approval_notes?: string | null
          client_approved_at?: string | null
          client_id: string
          closed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_lead_id?: string | null
          description?: string | null
          development_completed_at?: string | null
          environment?: string
          estimated_hours?: number | null
          id?: string
          poc_id?: string | null
          poc_responded_at?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          project_id: string
          raised_at?: string
          raised_by?: string | null
          requirement_completed_at?: string | null
          requires_admin_approval?: boolean
          specialist_id?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          target_date?: string | null
          title: string
          token?: string | null
          updated_at?: string
        }
        Update: {
          actual_hours?: number | null
          admin_approved_at?: string | null
          admin_approved_by?: string | null
          admin_rejected_at?: string | null
          admin_rejection_reason?: string | null
          ai_summary?: Json | null
          category?: Database["public"]["Enums"]["ticket_category"]
          client_approval_notes?: string | null
          client_approved_at?: string | null
          client_id?: string
          closed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_lead_id?: string | null
          description?: string | null
          development_completed_at?: string | null
          environment?: string
          estimated_hours?: number | null
          id?: string
          poc_id?: string | null
          poc_responded_at?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          project_id?: string
          raised_at?: string
          raised_by?: string | null
          requirement_completed_at?: string | null
          requires_admin_approval?: boolean
          specialist_id?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          target_date?: string | null
          title?: string
          token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_admin_approved_by_fkey"
            columns: ["admin_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_delivery_lead_id_fkey"
            columns: ["delivery_lead_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_poc_id_fkey"
            columns: ["poc_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_raised_by_fkey"
            columns: ["raised_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      ticket_metrics: {
        Row: {
          actual_hours: number | null
          category: Database["public"]["Enums"]["ticket_category"] | null
          client_approval_delay: string | null
          client_id: string | null
          effort_variance_pct: number | null
          estimated_hours: number | null
          estimation_duration: string | null
          poc_tat: string | null
          project_id: string | null
          status: Database["public"]["Enums"]["ticket_status"] | null
          ticket_id: string | null
          token: string | null
          total_cycle_time: string | null
        }
        Insert: {
          actual_hours?: number | null
          category?: Database["public"]["Enums"]["ticket_category"] | null
          client_approval_delay?: never
          client_id?: string | null
          effort_variance_pct?: never
          estimated_hours?: number | null
          estimation_duration?: never
          poc_tat?: never
          project_id?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          ticket_id?: string | null
          token?: string | null
          total_cycle_time?: never
        }
        Update: {
          actual_hours?: number | null
          category?: Database["public"]["Enums"]["ticket_category"] | null
          client_approval_delay?: never
          client_id?: string | null
          effort_variance_pct?: never
          estimated_hours?: number | null
          estimation_duration?: never
          poc_tat?: never
          project_id?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          ticket_id?: string | null
          token?: string | null
          total_cycle_time?: never
        }
        Relationships: [
          {
            foreignKeyName: "tickets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      auth_client_id: { Args: never; Returns: string }
      auth_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      notification_event:
        | "ticket_raised"
        | "poc_triaged"
        | "estimate_submitted"
        | "estimate_approved"
        | "estimate_rejected"
        | "development_completed"
        | "delivered"
        | "closed"
      ticket_category: "bug" | "enhancement" | "kt" | "training"
      ticket_priority: "low" | "medium" | "high" | "critical"
      ticket_status:
        | "raised"
        | "poc_triage"
        | "requirement_estimation"
        | "client_approval"
        | "development"
        | "delivery"
        | "closed"
      user_role:
        | "super_admin"
        | "poc"
        | "specialist"
        | "delivery_lead"
        | "client_admin"
        | "project_admin"
        | "client_raiser"
        | "client_viewer"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      notification_event: [
        "ticket_raised",
        "poc_triaged",
        "estimate_submitted",
        "estimate_approved",
        "estimate_rejected",
        "development_completed",
        "delivered",
        "closed",
      ],
      ticket_category: ["bug", "enhancement", "kt", "training"],
      ticket_priority: ["low", "medium", "high", "critical"],
      ticket_status: [
        "raised",
        "poc_triage",
        "requirement_estimation",
        "client_approval",
        "development",
        "delivery",
        "closed",
      ],
      user_role: [
        "super_admin",
        "poc",
        "specialist",
        "delivery_lead",
        "client_admin",
        "project_admin",
        "client_raiser",
        "client_viewer",
      ],
    },
  },
} as const
