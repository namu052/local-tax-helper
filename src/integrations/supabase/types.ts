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
      ai_reviews: {
        Row: {
          application_id: string
          check_points: Json | null
          created_at: string
          draft_answer: string | null
          id: string
          manual_references: Json | null
          missing_documents: Json | null
          officer_check_points: Json | null
          possibility_reason: string | null
          review_result: string | null
          risk_level: string | null
          summary: string | null
        }
        Insert: {
          application_id: string
          check_points?: Json | null
          created_at?: string
          draft_answer?: string | null
          id?: string
          manual_references?: Json | null
          missing_documents?: Json | null
          officer_check_points?: Json | null
          possibility_reason?: string | null
          review_result?: string | null
          risk_level?: string | null
          summary?: string | null
        }
        Update: {
          application_id?: string
          check_points?: Json | null
          created_at?: string
          draft_answer?: string | null
          id?: string
          manual_references?: Json | null
          missing_documents?: Json | null
          officer_check_points?: Json | null
          possibility_reason?: string | null
          review_result?: string | null
          risk_level?: string | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_reviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "tax_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applicants: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          phone: string
          rrn_front: string | null
          rrn_masked: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          phone: string
          rrn_front?: string | null
          rrn_masked?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string
          rrn_front?: string | null
          rrn_masked?: string | null
        }
        Relationships: []
      }
      application_documents: {
        Row: {
          application_id: string
          created_at: string
          document_name: string
          id: string
          is_submitted: boolean
          note: string | null
        }
        Insert: {
          application_id: string
          created_at?: string
          document_name: string
          id?: string
          is_submitted?: boolean
          note?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string
          document_name?: string
          id?: string
          is_submitted?: boolean
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "tax_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      exemption_types: {
        Row: {
          caution_text: string | null
          checklist_rules: Json
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          required_documents: Json
          tax_type: string
          title: string
          updated_at: string
        }
        Insert: {
          caution_text?: string | null
          checklist_rules?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          required_documents?: Json
          tax_type: string
          title: string
          updated_at?: string
        }
        Update: {
          caution_text?: string | null
          checklist_rules?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          required_documents?: Json
          tax_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      manual_chunks: {
        Row: {
          chunk_summary: string | null
          chunk_text: string | null
          created_at: string
          embedding: string | null
          exemption_type: string | null
          id: string
          keywords: Json | null
          legal_basis: string | null
          manual_volume_id: string
          page_number: number | null
          section_id: string | null
          tax_type: string | null
        }
        Insert: {
          chunk_summary?: string | null
          chunk_text?: string | null
          created_at?: string
          embedding?: string | null
          exemption_type?: string | null
          id?: string
          keywords?: Json | null
          legal_basis?: string | null
          manual_volume_id: string
          page_number?: number | null
          section_id?: string | null
          tax_type?: string | null
        }
        Update: {
          chunk_summary?: string | null
          chunk_text?: string | null
          created_at?: string
          embedding?: string | null
          exemption_type?: string | null
          id?: string
          keywords?: Json | null
          legal_basis?: string | null
          manual_volume_id?: string
          page_number?: number | null
          section_id?: string | null
          tax_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manual_chunks_manual_volume_id_fkey"
            columns: ["manual_volume_id"]
            isOneToOne: false
            referencedRelation: "manual_volumes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_chunks_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "manual_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_sections: {
        Row: {
          chapter_title: string | null
          created_at: string
          exemption_type: string | null
          id: string
          keywords: Json | null
          manual_volume_id: string
          page_end: number | null
          page_start: number | null
          section_title: string | null
          summary: string | null
          tax_type: string | null
        }
        Insert: {
          chapter_title?: string | null
          created_at?: string
          exemption_type?: string | null
          id?: string
          keywords?: Json | null
          manual_volume_id: string
          page_end?: number | null
          page_start?: number | null
          section_title?: string | null
          summary?: string | null
          tax_type?: string | null
        }
        Update: {
          chapter_title?: string | null
          created_at?: string
          exemption_type?: string | null
          id?: string
          keywords?: Json | null
          manual_volume_id?: string
          page_end?: number | null
          page_start?: number | null
          section_title?: string | null
          summary?: string | null
          tax_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manual_sections_manual_volume_id_fkey"
            columns: ["manual_volume_id"]
            isOneToOne: false
            referencedRelation: "manual_volumes"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_sets: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          title: string
          updated_at: string
          year: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: []
      }
      manual_volumes: {
        Row: {
          file_name: string | null
          file_url: string | null
          id: string
          manual_set_id: string
          page_count: number | null
          title: string | null
          uploaded_at: string | null
          volume_number: number
        }
        Insert: {
          file_name?: string | null
          file_url?: string | null
          id?: string
          manual_set_id: string
          page_count?: number | null
          title?: string | null
          uploaded_at?: string | null
          volume_number: number
        }
        Update: {
          file_name?: string | null
          file_url?: string | null
          id?: string
          manual_set_id?: string
          page_count?: number | null
          title?: string | null
          uploaded_at?: string | null
          volume_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "manual_volumes_manual_set_id_fkey"
            columns: ["manual_set_id"]
            isOneToOne: false
            referencedRelation: "manual_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      officer_answers: {
        Row: {
          answer_content: string | null
          answer_title: string | null
          application_id: string
          created_at: string
          final_status: string | null
          id: string
          internal_memo: string | null
          officer_name: string | null
          supplement_request: string | null
          updated_at: string
        }
        Insert: {
          answer_content?: string | null
          answer_title?: string | null
          application_id: string
          created_at?: string
          final_status?: string | null
          id?: string
          internal_memo?: string | null
          officer_name?: string | null
          supplement_request?: string | null
          updated_at?: string
        }
        Update: {
          answer_content?: string | null
          answer_title?: string | null
          application_id?: string
          created_at?: string
          final_status?: string | null
          id?: string
          internal_memo?: string | null
          officer_name?: string | null
          supplement_request?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "officer_answers_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "tax_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      status_logs: {
        Row: {
          application_id: string
          created_at: string
          id: string
          memo: string | null
          status: string
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          memo?: string | null
          status: string
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          memo?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_logs_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "tax_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_applications: {
        Row: {
          additional_note: string | null
          applicant_id: string
          application_reason: string | null
          created_at: string
          exemption_type_id: string | null
          id: string
          receipt_number: string
          status: string
          tax_type: string
          updated_at: string
        }
        Insert: {
          additional_note?: string | null
          applicant_id: string
          application_reason?: string | null
          created_at?: string
          exemption_type_id?: string | null
          id?: string
          receipt_number?: string
          status?: string
          tax_type: string
          updated_at?: string
        }
        Update: {
          additional_note?: string | null
          applicant_id?: string
          application_reason?: string | null
          created_at?: string
          exemption_type_id?: string | null
          id?: string
          receipt_number?: string
          status?: string
          tax_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "applicants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_applications_exemption_type_id_fkey"
            columns: ["exemption_type_id"]
            isOneToOne: false
            referencedRelation: "exemption_types"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          auth_user_id: string | null
          created_at: string
          department: string | null
          email: string
          id: string
          name: string
          role: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          department?: string | null
          email: string
          id?: string
          name: string
          role?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          department?: string | null
          email?: string
          id?: string
          name?: string
          role?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_receipt_number: { Args: never; Returns: string }
      has_any_staff_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      lookup_application_by_receipt: {
        Args: { _phone: string; _receipt: string }
        Returns: {
          additional_note: string
          application_reason: string
          created_at: string
          exemption_types: Json
          officer_answers: Json
          receipt_number: string
          status: string
          tax_type: string
        }[]
      }
      submit_tax_application: {
        Args: {
          p_additional_note: string
          p_address: string
          p_application_reason: string
          p_documents: Json
          p_exemption_type_id: string
          p_name: string
          p_phone: string
          p_rrn_front: string
          p_rrn_masked: string
          p_tax_type: string
        }
        Returns: {
          application_id: string
          receipt_number: string
        }[]
      }
    }
    Enums: {
      app_role: "officer" | "admin"
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
    Enums: {
      app_role: ["officer", "admin"],
    },
  },
} as const
