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
      audit_log: {
        Row: {
          answer_preview: string | null
          company_id: string
          created_at: string
          id: string
          question: string
          sources: Json | null
          thread_id: string | null
          user_id: string
        }
        Insert: {
          answer_preview?: string | null
          company_id: string
          created_at?: string
          id?: string
          question: string
          sources?: Json | null
          thread_id?: string | null
          user_id: string
        }
        Update: {
          answer_preview?: string | null
          company_id?: string
          created_at?: string
          id?: string
          question?: string
          sources?: Json | null
          thread_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          active: boolean
          created_at: string
          id: string
          max_users: number
          min_confidence: number
          name: string
          subscription_plan: string
          subscription_status: string
          updated_at: string
          workspace_retention: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          max_users?: number
          min_confidence?: number
          name: string
          subscription_plan?: string
          subscription_status?: string
          updated_at?: string
          workspace_retention?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          max_users?: number
          min_confidence?: number
          name?: string
          subscription_plan?: string
          subscription_status?: string
          updated_at?: string
          workspace_retention?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          company_id: string
          created_at: string
          email: string | null
          id: string
          manager_id: string | null
          name: string
          phone: string | null
          shift_pattern: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          manager_id?: string | null
          name: string
          phone?: string | null
          shift_pattern?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          manager_id?: string | null
          name?: string
          phone?: string | null
          shift_pattern?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      document_chunks: {
        Row: {
          chunk_index: number
          company_id: string
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          page: number | null
          section: string | null
          token_count: number | null
        }
        Insert: {
          chunk_index: number
          company_id: string
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          page?: number | null
          section?: string | null
          token_count?: number | null
        }
        Update: {
          chunk_index?: number
          company_id?: string
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          page?: number | null
          section?: string | null
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "knowledge_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer_de: string
          answer_en: string
          category: string
          company_id: string
          created_at: string
          id: string
          question_de: string
          question_en: string
          updated_at: string
        }
        Insert: {
          answer_de: string
          answer_en: string
          category?: string
          company_id: string
          created_at?: string
          id?: string
          question_de: string
          question_en: string
          updated_at?: string
        }
        Update: {
          answer_de?: string
          answer_en?: string
          category?: string
          company_id?: string
          created_at?: string
          id?: string
          question_de?: string
          question_en?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "faqs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_requests: {
        Row: {
          answer: string | null
          answered_at: string | null
          answered_by: string | null
          company_id: string
          context: string | null
          created_at: string
          department_id: string | null
          id: string
          priority: string
          promoted_to_faq_id: string | null
          promoted_to_kb_id: string | null
          question: string
          status: string
          thread_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          company_id: string
          context?: string | null
          created_at?: string
          department_id?: string | null
          id?: string
          priority?: string
          promoted_to_faq_id?: string | null
          promoted_to_kb_id?: string | null
          question: string
          status?: string
          thread_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          company_id?: string
          context?: string | null
          created_at?: string
          department_id?: string | null
          id?: string
          priority?: string
          promoted_to_faq_id?: string | null
          promoted_to_kb_id?: string | null
          question?: string
          status?: string
          thread_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_requests_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_requests_promoted_to_faq_id_fkey"
            columns: ["promoted_to_faq_id"]
            isOneToOne: false
            referencedRelation: "faqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_requests_promoted_to_kb_id_fkey"
            columns: ["promoted_to_kb_id"]
            isOneToOne: false
            referencedRelation: "knowledge_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_requests_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_documents: {
        Row: {
          category: string
          change_notes: string | null
          chunk_count: number
          company_id: string
          content_text: string
          created_at: string
          department_id: string | null
          doc_code: string | null
          error: string | null
          file_path: string | null
          file_type: string | null
          id: string
          is_active: boolean
          is_critical: boolean
          page: number | null
          parent_document_id: string | null
          replaced_at: string | null
          section: string | null
          status: string
          title: string
          updated_at: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          category?: string
          change_notes?: string | null
          chunk_count?: number
          company_id: string
          content_text?: string
          created_at?: string
          department_id?: string | null
          doc_code?: string | null
          error?: string | null
          file_path?: string | null
          file_type?: string | null
          id?: string
          is_active?: boolean
          is_critical?: boolean
          page?: number | null
          parent_document_id?: string | null
          replaced_at?: string | null
          section?: string | null
          status?: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          category?: string
          change_notes?: string | null
          chunk_count?: number
          company_id?: string
          content_text?: string
          created_at?: string
          department_id?: string | null
          doc_code?: string | null
          error?: string | null
          file_path?: string | null
          file_type?: string | null
          id?: string
          is_active?: boolean
          is_critical?: boolean
          page?: number | null
          parent_document_id?: string | null
          replaced_at?: string | null
          section?: string | null
          status?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_documents_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "knowledge_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_gaps: {
        Row: {
          assignee_id: string | null
          company_id: string
          confidence: number | null
          created_at: string
          created_by: string | null
          department_id: string | null
          embedding: string | null
          first_seen: string
          id: string
          last_seen: string
          occurrences: number
          question_normalized: string
          question_sample: string
          resolution: string | null
          resolution_date: string | null
          resolved_document_id: string | null
          resolved_faq_id: string | null
          source_message_id: string | null
          source_thread_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          company_id: string
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          embedding?: string | null
          first_seen?: string
          id?: string
          last_seen?: string
          occurrences?: number
          question_normalized: string
          question_sample: string
          resolution?: string | null
          resolution_date?: string | null
          resolved_document_id?: string | null
          resolved_faq_id?: string | null
          source_message_id?: string | null
          source_thread_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          company_id?: string
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          embedding?: string | null
          first_seen?: string
          id?: string
          last_seen?: string
          occurrences?: number
          question_normalized?: string
          question_sample?: string
          resolution?: string | null
          resolution_date?: string | null
          resolved_document_id?: string | null
          resolved_faq_id?: string | null
          source_message_id?: string | null
          source_thread_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_gaps_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_gaps_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_gaps_resolved_document_id_fkey"
            columns: ["resolved_document_id"]
            isOneToOne: false
            referencedRelation: "knowledge_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_gaps_resolved_faq_id_fkey"
            columns: ["resolved_faq_id"]
            isOneToOne: false
            referencedRelation: "faqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_gaps_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_gaps_source_thread_id_fkey"
            columns: ["source_thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      message_feedback: {
        Row: {
          comment: string | null
          company_id: string
          created_at: string
          id: string
          message_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          company_id: string
          created_at?: string
          id?: string
          message_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          company_id?: string
          created_at?: string
          id?: string
          message_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_feedback_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_feedback_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          company_id: string
          confidence: number | null
          content: string
          created_at: string
          id: string
          parts: Json | null
          role: Database["public"]["Enums"]["message_role"]
          sources: Json | null
          thread_id: string
          user_id: string
        }
        Insert: {
          company_id: string
          confidence?: number | null
          content?: string
          created_at?: string
          id?: string
          parts?: Json | null
          role: Database["public"]["Enums"]["message_role"]
          sources?: Json | null
          thread_id: string
          user_id: string
        }
        Update: {
          company_id?: string
          confidence?: number | null
          content?: string
          created_at?: string
          id?: string
          parts?: Json | null
          role?: Database["public"]["Enums"]["message_role"]
          sources?: Json | null
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          company_id: string
          created_at: string
          id: string
          kind: string
          link: string | null
          payload: Json
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          company_id: string
          created_at?: string
          id?: string
          kind: string
          link?: string | null
          payload?: Json
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          company_id?: string
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          payload?: Json
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string
          created_at: string
          department: string | null
          department_id: string | null
          first_name: string | null
          full_name: string | null
          id: string
          is_active: boolean
          language_pref: string
          last_name: string | null
          phone: string | null
          position: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          department?: string | null
          department_id?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          language_pref?: string
          last_name?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          department?: string | null
          department_id?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          language_pref?: string
          last_name?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      sop_acknowledgements: {
        Row: {
          acknowledged_at: string
          company_id: string
          document_id: string
          document_version: number
          id: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string
          company_id: string
          document_id: string
          document_version: number
          id?: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string
          company_id?: string
          document_id?: string
          document_version?: number
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sop_acknowledgements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_acknowledgements_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "knowledge_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      threads: {
        Row: {
          company_id: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "threads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_artifacts: {
        Row: {
          company_id: string
          created_at: string
          expires_at: string | null
          file_name: string
          id: string
          kind: string
          session_id: string
          storage_path: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          expires_at?: string | null
          file_name: string
          id?: string
          kind: string
          session_id: string
          storage_path: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          expires_at?: string | null
          file_name?: string
          id?: string
          kind?: string
          session_id?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_artifacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_artifacts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workspace_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_files: {
        Row: {
          company_id: string
          created_at: string
          expires_at: string | null
          extracted_text: string | null
          file_name: string
          id: string
          mime: string | null
          session_id: string
          size_bytes: number | null
          status: string
          storage_path: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          expires_at?: string | null
          extracted_text?: string | null
          file_name: string
          id?: string
          mime?: string | null
          session_id: string
          size_bytes?: number | null
          status?: string
          storage_path: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          expires_at?: string | null
          extracted_text?: string | null
          file_name?: string
          id?: string
          mime?: string | null
          session_id?: string
          size_bytes?: number | null
          status?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_files_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_files_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workspace_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_messages: {
        Row: {
          attachments: Json | null
          company_id: string
          content: string
          created_at: string
          id: string
          parts: Json | null
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          company_id: string
          content?: string
          created_at?: string
          id?: string
          parts?: Json | null
          role: string
          session_id: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          company_id?: string
          content?: string
          created_at?: string
          id?: string
          parts?: Json | null
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workspace_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_sessions: {
        Row: {
          company_id: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cron_mark_outdated_knowledge: { Args: never; Returns: undefined }
      cron_quarterly_knowledge_report: { Args: never; Returns: undefined }
      current_company_id: { Args: never; Returns: string }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_platform_admin: { Args: never; Returns: boolean }
      match_document_chunks: {
        Args: {
          match_count?: number
          min_similarity?: number
          query_embedding: string
        }
        Returns: {
          chunk_id: string
          chunk_index: number
          content: string
          doc_category: string
          doc_code: string
          doc_title: string
          document_id: string
          similarity: number
        }[]
      }
      match_document_chunks_for_company: {
        Args: {
          _company_id?: string
          match_count?: number
          min_similarity?: number
          query_embedding: string
        }
        Returns: {
          chunk_id: string
          chunk_index: number
          content: string
          doc_category: string
          doc_code: string
          doc_title: string
          document_id: string
          similarity: number
        }[]
      }
      match_knowledge_gap: {
        Args: {
          _company_id: string
          _embedding: string
          _question: string
          _question_normalized: string
          _threshold?: number
        }
        Returns: string
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      workspace_cleanup_expired: {
        Args: never
        Returns: {
          artifacts_deleted: number
          files_deleted: number
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "employee"
        | "manager"
        | "team_leader"
        | "platform_admin"
        | "platform_owner"
        | "supervisor"
        | "operator"
        | "viewer"
      message_role: "user" | "assistant" | "system"
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
      app_role: [
        "admin",
        "employee",
        "manager",
        "team_leader",
        "platform_admin",
        "platform_owner",
        "supervisor",
        "operator",
        "viewer",
      ],
      message_role: ["user", "assistant", "system"],
    },
  },
} as const
