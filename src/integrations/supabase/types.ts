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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      quiz_questions: {
        Row: {
          chunk_id: string
          correct_answer: string
          created_at: string | null
          explanation: string | null
          id: string
          options: string[]
          question: string
        }
        Insert: {
          chunk_id: string
          correct_answer: string
          created_at?: string | null
          explanation?: string | null
          id?: string
          options: string[]
          question: string
        }
        Update: {
          chunk_id?: string
          correct_answer?: string
          created_at?: string | null
          explanation?: string | null
          id?: string
          options?: string[]
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "study_chunks"
            referencedColumns: ["id"]
          },
        ]
      }
      study_chunks: {
        Row: {
          chunk_number: number
          content: string
          created_at: string | null
          difficulty: string | null
          estimated_minutes: number | null
          id: string
          key_terms: string[] | null
          main_concept: string | null
          material_id: string
          title: string
        }
        Insert: {
          chunk_number: number
          content: string
          created_at?: string | null
          difficulty?: string | null
          estimated_minutes?: number | null
          id?: string
          key_terms?: string[] | null
          main_concept?: string | null
          material_id: string
          title: string
        }
        Update: {
          chunk_number?: number
          content?: string
          created_at?: string | null
          difficulty?: string | null
          estimated_minutes?: number | null
          id?: string
          key_terms?: string[] | null
          main_concept?: string | null
          material_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_chunks_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "study_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      study_materials: {
        Row: {
          created_at: string | null
          estimated_read_time: number | null
          file_name: string
          file_path: string
          file_size: number
          full_text: string | null
          id: string
          processing_status: string | null
          title: string
          updated_at: string | null
          user_id: string
          word_count: number | null
        }
        Insert: {
          created_at?: string | null
          estimated_read_time?: number | null
          file_name: string
          file_path: string
          file_size: number
          full_text?: string | null
          id?: string
          processing_status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          word_count?: number | null
        }
        Update: {
          created_at?: string | null
          estimated_read_time?: number | null
          file_name?: string
          file_path?: string
          file_size?: number
          full_text?: string | null
          id?: string
          processing_status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          word_count?: number | null
        }
        Relationships: []
      }
      study_progress: {
        Row: {
          chunk_id: string
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          id: string
          quiz_score: number | null
          time_spent_minutes: number | null
          user_id: string
        }
        Insert: {
          chunk_id: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          quiz_score?: number | null
          time_spent_minutes?: number | null
          user_id: string
        }
        Update: {
          chunk_id?: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          quiz_score?: number | null
          time_spent_minutes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_progress_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "study_chunks"
            referencedColumns: ["id"]
          },
        ]
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
