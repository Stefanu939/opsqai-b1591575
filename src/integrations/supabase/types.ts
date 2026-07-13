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
      academy_certificates: {
        Row: {
          certificate_code: string
          company_id: string
          created_at: string
          enrollment_id: string
          final_score: number
          id: string
          issued_at: string
          path_id: string
          pdf_path: string | null
          qr_payload: string | null
          revoked: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          certificate_code?: string
          company_id: string
          created_at?: string
          enrollment_id: string
          final_score?: number
          id?: string
          issued_at?: string
          path_id: string
          pdf_path?: string | null
          qr_payload?: string | null
          revoked?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          certificate_code?: string
          company_id?: string
          created_at?: string
          enrollment_id?: string
          final_score?: number
          id?: string
          issued_at?: string
          path_id?: string
          pdf_path?: string | null
          qr_payload?: string | null
          revoked?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_certificates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_certificates_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: true
            referencedRelation: "academy_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_certificates_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "academy_learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_chapters: {
        Row: {
          company_id: string
          created_at: string
          id: string
          order_index: number
          path_id: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          order_index?: number
          path_id: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          order_index?: number
          path_id?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_chapters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_chapters_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "academy_learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_departments: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_enrollments: {
        Row: {
          assigned_by: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          due_at: string | null
          id: string
          mandatory: boolean
          notified_stages: string[]
          path_id: string
          priority: string
          started_at: string | null
          status: Database["public"]["Enums"]["academy_enrollment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          mandatory?: boolean
          notified_stages?: string[]
          path_id: string
          priority?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["academy_enrollment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          mandatory?: boolean
          notified_stages?: string[]
          path_id?: string
          priority?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["academy_enrollment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_enrollments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_enrollments_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "academy_learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_learning_paths: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          difficulty: string
          employment_type: string | null
          experience_level: string | null
          id: string
          language: string
          mandatory: boolean
          order_index: number
          passing_score: number
          publish_status: Database["public"]["Enums"]["academy_publish_status"]
          target_position: string | null
          target_role: string | null
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          difficulty?: string
          employment_type?: string | null
          experience_level?: string | null
          id?: string
          language?: string
          mandatory?: boolean
          order_index?: number
          passing_score?: number
          publish_status?: Database["public"]["Enums"]["academy_publish_status"]
          target_position?: string | null
          target_role?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          difficulty?: string
          employment_type?: string | null
          experience_level?: string | null
          id?: string
          language?: string
          mandatory?: boolean
          order_index?: number
          passing_score?: number
          publish_status?: Database["public"]["Enums"]["academy_publish_status"]
          target_position?: string | null
          target_role?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_learning_paths_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_learning_paths_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "academy_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_lesson_progress: {
        Row: {
          attempts: number
          company_id: string
          completed_at: string | null
          created_at: string
          enrollment_id: string
          id: string
          last_activity_at: string | null
          last_score: number | null
          lesson_id: string
          notes: string | null
          status: Database["public"]["Enums"]["academy_progress_status"]
          time_spent_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          company_id: string
          completed_at?: string | null
          created_at?: string
          enrollment_id: string
          id?: string
          last_activity_at?: string | null
          last_score?: number | null
          lesson_id: string
          notes?: string | null
          status?: Database["public"]["Enums"]["academy_progress_status"]
          time_spent_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          company_id?: string
          completed_at?: string | null
          created_at?: string
          enrollment_id?: string
          id?: string
          last_activity_at?: string | null
          last_score?: number | null
          lesson_id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["academy_progress_status"]
          time_spent_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_lesson_progress_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_lesson_progress_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "academy_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "academy_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_lesson_versions: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          lesson_id: string
          snapshot: Json
          version: number
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          lesson_id: string
          snapshot: Json
          version: number
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          lesson_id?: string
          snapshot?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "academy_lesson_versions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_lesson_versions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "academy_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_lessons: {
        Row: {
          best_practices: string | null
          chapter_id: string
          company_id: string
          created_at: string
          created_by: string | null
          estimated_minutes: number
          examples: string | null
          explanation: string | null
          id: string
          language: string
          objectives: Json
          order_index: number
          publish_status: Database["public"]["Enums"]["academy_publish_status"]
          source_document_id: string | null
          source_document_version: number | null
          summary: string | null
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          best_practices?: string | null
          chapter_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          estimated_minutes?: number
          examples?: string | null
          explanation?: string | null
          id?: string
          language?: string
          objectives?: Json
          order_index?: number
          publish_status?: Database["public"]["Enums"]["academy_publish_status"]
          source_document_id?: string | null
          source_document_version?: number | null
          summary?: string | null
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          best_practices?: string | null
          chapter_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          estimated_minutes?: number
          examples?: string | null
          explanation?: string | null
          id?: string
          language?: string
          objectives?: Json
          order_index?: number
          publish_status?: Database["public"]["Enums"]["academy_publish_status"]
          source_document_id?: string | null
          source_document_version?: number | null
          summary?: string | null
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "academy_lessons_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "academy_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_lessons_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_lessons_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "knowledge_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_quiz_attempts: {
        Row: {
          answers: Json
          company_id: string
          created_at: string
          duration_seconds: number | null
          id: string
          lesson_id: string
          passed: boolean
          questions: Json
          score: number
          user_id: string
        }
        Insert: {
          answers: Json
          company_id: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          lesson_id: string
          passed: boolean
          questions: Json
          score: number
          user_id: string
        }
        Update: {
          answers?: Json
          company_id?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          lesson_id?: string
          passed?: boolean
          questions?: Json
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_quiz_attempts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_quiz_attempts_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "academy_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_retraining_events: {
        Row: {
          affected_count: number
          company_id: string
          created_at: string
          id: string
          lesson_id: string
          reason: string
          source_document_id: string | null
        }
        Insert: {
          affected_count?: number
          company_id: string
          created_at?: string
          id?: string
          lesson_id: string
          reason: string
          source_document_id?: string | null
        }
        Update: {
          affected_count?: number
          company_id?: string
          created_at?: string
          id?: string
          lesson_id?: string
          reason?: string
          source_document_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academy_retraining_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_retraining_events_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "academy_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_retraining_events_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "knowledge_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_settings: {
        Row: {
          certificate_template: Json
          company_id: string
          default_difficulty: string
          languages: string[]
          passing_score: number
          quiz_max: number
          quiz_min: number
          updated_at: string
        }
        Insert: {
          certificate_template?: Json
          company_id: string
          default_difficulty?: string
          languages?: string[]
          passing_score?: number
          quiz_max?: number
          quiz_min?: number
          updated_at?: string
        }
        Update: {
          certificate_template?: Json
          company_id?: string
          default_difficulty?: string
          languages?: string[]
          passing_score?: number
          quiz_max?: number
          quiz_min?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_audits: {
        Row: {
          company_id: string
          created_at: string
          critical: number
          id: string
          maturity: string
          passed: number
          pdf_path: string | null
          requested_by: string | null
          score: number
          summary: Json
          warnings: number
        }
        Insert: {
          company_id: string
          created_at?: string
          critical?: number
          id?: string
          maturity?: string
          passed?: number
          pdf_path?: string | null
          requested_by?: string | null
          score?: number
          summary?: Json
          warnings?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          critical?: number
          id?: string
          maturity?: string
          passed?: number
          pdf_path?: string | null
          requested_by?: string | null
          score?: number
          summary?: Json
          warnings?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_audits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          scopes: string[]
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          scopes?: string[]
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          scopes?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string | null
          answer_preview: string | null
          company_id: string
          created_at: string
          id: string
          ip: string | null
          is_demo_ephemeral: boolean
          module: string | null
          new_value: Json | null
          old_value: Json | null
          question: string
          resource: string | null
          severity: string
          sources: Json | null
          success: boolean
          thread_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action?: string | null
          answer_preview?: string | null
          company_id: string
          created_at?: string
          id?: string
          ip?: string | null
          is_demo_ephemeral?: boolean
          module?: string | null
          new_value?: Json | null
          old_value?: Json | null
          question: string
          resource?: string | null
          severity?: string
          sources?: Json | null
          success?: boolean
          thread_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string | null
          answer_preview?: string | null
          company_id?: string
          created_at?: string
          id?: string
          ip?: string | null
          is_demo_ephemeral?: boolean
          module?: string | null
          new_value?: Json | null
          old_value?: Json | null
          question?: string
          resource?: string | null
          severity?: string
          sources?: Json | null
          success?: boolean
          thread_id?: string | null
          user_agent?: string | null
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
      audit_log_terminated_archive: {
        Row: {
          action: string | null
          archived_at: string
          event_at: string
          id: string
          module: string | null
          resource: string | null
          severity: string | null
          success: boolean | null
          tenant_label: string
        }
        Insert: {
          action?: string | null
          archived_at?: string
          event_at: string
          id?: string
          module?: string | null
          resource?: string | null
          severity?: string | null
          success?: boolean | null
          tenant_label: string
        }
        Update: {
          action?: string | null
          archived_at?: string
          event_at?: string
          id?: string
          module?: string | null
          resource?: string | null
          severity?: string | null
          success?: boolean | null
          tenant_label?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          active: boolean
          billing_override: boolean
          cancelled_at: string | null
          created_at: string
          display_name: string | null
          grace_period_days: number
          grace_period_ends_at: string | null
          id: string
          install_id: string | null
          internal_notes: string | null
          is_demo_tenant: boolean
          is_system: boolean
          last_payment_at: string | null
          max_users: number
          min_confidence: number
          name: string
          next_invoice_due_at: string | null
          renewal_date: string | null
          subscription_plan: string
          subscription_status: string
          suspended_at: string | null
          suspension_reason: string | null
          terminated_at: string | null
          terminated_by: string | null
          termination_reason: string | null
          trial_ends_at: string | null
          updated_at: string
          workspace_retention: string
        }
        Insert: {
          active?: boolean
          billing_override?: boolean
          cancelled_at?: string | null
          created_at?: string
          display_name?: string | null
          grace_period_days?: number
          grace_period_ends_at?: string | null
          id?: string
          install_id?: string | null
          internal_notes?: string | null
          is_demo_tenant?: boolean
          is_system?: boolean
          last_payment_at?: string | null
          max_users?: number
          min_confidence?: number
          name: string
          next_invoice_due_at?: string | null
          renewal_date?: string | null
          subscription_plan?: string
          subscription_status?: string
          suspended_at?: string | null
          suspension_reason?: string | null
          terminated_at?: string | null
          terminated_by?: string | null
          termination_reason?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          workspace_retention?: string
        }
        Update: {
          active?: boolean
          billing_override?: boolean
          cancelled_at?: string | null
          created_at?: string
          display_name?: string | null
          grace_period_days?: number
          grace_period_ends_at?: string | null
          id?: string
          install_id?: string | null
          internal_notes?: string | null
          is_demo_tenant?: boolean
          is_system?: boolean
          last_payment_at?: string | null
          max_users?: number
          min_confidence?: number
          name?: string
          next_invoice_due_at?: string | null
          renewal_date?: string | null
          subscription_plan?: string
          subscription_status?: string
          suspended_at?: string | null
          suspension_reason?: string | null
          terminated_at?: string | null
          terminated_by?: string | null
          termination_reason?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          workspace_retention?: string
        }
        Relationships: []
      }
      company_integrations: {
        Row: {
          company_id: string
          config: Json
          connected_at: string | null
          connected_by: string | null
          created_at: string
          id: string
          last_error: string | null
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          config?: Json
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          provider: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          config?: Json
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_integrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          company: string | null
          country: string | null
          created_at: string
          email: string
          id: string
          ip_hash: string | null
          message: string
          name: string
          phone: string | null
          reference_code: string
          routed_to: string
          status: Database["public"]["Enums"]["contact_status"]
          subject: Database["public"]["Enums"]["contact_subject"]
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          company?: string | null
          country?: string | null
          created_at?: string
          email: string
          id?: string
          ip_hash?: string | null
          message: string
          name: string
          phone?: string | null
          reference_code?: string
          routed_to: string
          status?: Database["public"]["Enums"]["contact_status"]
          subject?: Database["public"]["Enums"]["contact_subject"]
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string
          id?: string
          ip_hash?: string | null
          message?: string
          name?: string
          phone?: string | null
          reference_code?: string
          routed_to?: string
          status?: Database["public"]["Enums"]["contact_status"]
          subject?: Database["public"]["Enums"]["contact_subject"]
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      customer_compliance: {
        Row: {
          area: string
          company_id: string
          evidence: string | null
          id: string
          notes: string | null
          owner: string | null
          status: string
          updated_at: string
        }
        Insert: {
          area: string
          company_id: string
          evidence?: string | null
          id?: string
          notes?: string | null
          owner?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          area?: string
          company_id?: string
          evidence?: string | null
          id?: string
          notes?: string | null
          owner?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_compliance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_document_versions: {
        Row: {
          created_at: string
          created_by: string | null
          document_id: string
          id: string
          markdown: string
          metadata: Json
          title: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          document_id: string
          id?: string
          markdown: string
          metadata?: Json
          title: string
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          document_id?: string
          id?: string
          markdown?: string
          metadata?: Json
          title?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "customer_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_documents: {
        Row: {
          category: string
          company_id: string
          created_at: string
          created_by: string | null
          doc_type: string
          id: string
          input_hash: string | null
          markdown: string
          metadata: Json
          needs_update: boolean
          status: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          category?: string
          company_id: string
          created_at?: string
          created_by?: string | null
          doc_type: string
          id?: string
          input_hash?: string | null
          markdown?: string
          metadata?: Json
          needs_update?: boolean
          status?: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          doc_type?: string
          id?: string
          input_hash?: string | null
          markdown?: string
          metadata?: Json
          needs_update?: boolean
          status?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_features: {
        Row: {
          company_id: string
          feature_key: string
          id: string
          notes: string | null
          state: string
          updated_at: string
        }
        Insert: {
          company_id: string
          feature_key: string
          id?: string
          notes?: string | null
          state?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          feature_key?: string
          id?: string
          notes?: string | null
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_features_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_profiles: {
        Row: {
          account_manager_id: string | null
          ai_config: Json
          branding: Json
          commercial: Json
          company_id: string
          contract_status: string
          created_at: string
          general: Json
          implementation: Json
          integrations: Json
          onboarding_pct: number
          renewal_date: string | null
          sla: Json
          updated_at: string
        }
        Insert: {
          account_manager_id?: string | null
          ai_config?: Json
          branding?: Json
          commercial?: Json
          company_id: string
          contract_status?: string
          created_at?: string
          general?: Json
          implementation?: Json
          integrations?: Json
          onboarding_pct?: number
          renewal_date?: string | null
          sla?: Json
          updated_at?: string
        }
        Update: {
          account_manager_id?: string | null
          ai_config?: Json
          branding?: Json
          commercial?: Json
          company_id?: string
          contract_status?: string
          created_at?: string
          general?: Json
          implementation?: Json
          integrations?: Json
          onboarding_pct?: number
          renewal_date?: string | null
          sla?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_security: {
        Row: {
          area: string
          company_id: string
          controls: Json
          id: string
          notes: string | null
          summary: string | null
          updated_at: string
        }
        Insert: {
          area: string
          company_id: string
          controls?: Json
          id?: string
          notes?: string | null
          summary?: string | null
          updated_at?: string
        }
        Update: {
          area?: string
          company_id?: string
          controls?: Json
          id?: string
          notes?: string | null
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_security_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_timeline: {
        Row: {
          company_id: string
          created_by: string | null
          event_type: string
          id: string
          occurred_at: string
          payload: Json
          title: string
        }
        Insert: {
          company_id: string
          created_by?: string | null
          event_type: string
          id?: string
          occurred_at?: string
          payload?: Json
          title: string
        }
        Update: {
          company_id?: string
          created_by?: string | null
          event_type?: string
          id?: string
          occurred_at?: string
          payload?: Json
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_timeline_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip: string | null
          started_at: string
          token: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          ip?: string | null
          started_at?: string
          token: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip?: string | null
          started_at?: string
          token?: string
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
      dr_bootstrap_tokens: {
        Row: {
          expires_at: string
          id: string
          install_id: string
          issued_at: string
          issued_by: string | null
          key_id: string
          nonce: string
          reason: string | null
          redeemed_at: string | null
        }
        Insert: {
          expires_at: string
          id?: string
          install_id: string
          issued_at?: string
          issued_by?: string | null
          key_id: string
          nonce: string
          reason?: string | null
          redeemed_at?: string | null
        }
        Update: {
          expires_at?: string
          id?: string
          install_id?: string
          issued_at?: string
          issued_by?: string | null
          key_id?: string
          nonce?: string
          reason?: string | null
          redeemed_at?: string | null
        }
        Relationships: []
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
      exports: {
        Row: {
          bytes: number | null
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          deletion_status: string | null
          deletion_typed: string | null
          error: string | null
          expires_at: string
          file_count: number | null
          format: string
          id: string
          kind: string
          manifest: Json | null
          mode: string
          progress: number
          sha256: string | null
          status: string
          storage_path: string | null
        }
        Insert: {
          bytes?: number | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          deletion_status?: string | null
          deletion_typed?: string | null
          error?: string | null
          expires_at?: string
          file_count?: number | null
          format?: string
          id?: string
          kind: string
          manifest?: Json | null
          mode: string
          progress?: number
          sha256?: string | null
          status?: string
          storage_path?: string | null
        }
        Update: {
          bytes?: number | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          deletion_status?: string | null
          deletion_typed?: string | null
          error?: string | null
          expires_at?: string
          file_count?: number | null
          format?: string
          id?: string
          kind?: string
          manifest?: Json | null
          mode?: string
          progress?: number
          sha256?: string | null
          status?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      installation_package_downloads: {
        Row: {
          actor_email: string | null
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          id: string
          install_id: string
          ip_address: string | null
          signed_url_expires_at: string | null
          storage_path: string | null
          user_agent: string | null
        }
        Insert: {
          actor_email?: string | null
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          install_id: string
          ip_address?: string | null
          signed_url_expires_at?: string | null
          storage_path?: string | null
          user_agent?: string | null
        }
        Update: {
          actor_email?: string | null
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          install_id?: string
          ip_address?: string | null
          signed_url_expires_at?: string | null
          storage_path?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "installation_package_downloads_install_id_fkey"
            columns: ["install_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["install_id"]
          },
        ]
      }
      installer_releases: {
        Row: {
          created_at: string
          exe_sha256: string | null
          exe_size_bytes: number | null
          id: string
          is_active: boolean
          published_at: string
          tag_name: string
          updated_at: string
          version: string
          zip_size_bytes: number | null
          zip_url: string
        }
        Insert: {
          created_at?: string
          exe_sha256?: string | null
          exe_size_bytes?: number | null
          id?: string
          is_active?: boolean
          published_at?: string
          tag_name: string
          updated_at?: string
          version: string
          zip_size_bytes?: number | null
          zip_url: string
        }
        Update: {
          created_at?: string
          exe_sha256?: string | null
          exe_size_bytes?: number | null
          id?: string
          is_active?: boolean
          published_at?: string
          tag_name?: string
          updated_at?: string
          version?: string
          zip_size_bytes?: number | null
          zip_url?: string
        }
        Relationships: []
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
          knowledge_type: string
          page: number | null
          parent_document_id: string | null
          replaced_at: string | null
          section: string | null
          status: string
          system_slug: string | null
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
          knowledge_type?: string
          page?: number | null
          parent_document_id?: string | null
          replaced_at?: string | null
          section?: string | null
          status?: string
          system_slug?: string | null
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
          knowledge_type?: string
          page?: number | null
          parent_document_id?: string | null
          replaced_at?: string | null
          section?: string | null
          status?: string
          system_slug?: string | null
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
      license_installs: {
        Row: {
          app_version: string | null
          created_at: string
          host_info: Json | null
          id: string
          install_id: string
          installer_version: string | null
          ip_address: string | null
          last_heartbeat_at: string | null
          package_checksum_sha256: string | null
          package_generated_at: string | null
          package_generation_count: number
          package_installer_version: string | null
          package_storage_path: string | null
          previous_bundle_revoked_at: string | null
          updated_at: string
          user_count: number | null
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          host_info?: Json | null
          id?: string
          install_id: string
          installer_version?: string | null
          ip_address?: string | null
          last_heartbeat_at?: string | null
          package_checksum_sha256?: string | null
          package_generated_at?: string | null
          package_generation_count?: number
          package_installer_version?: string | null
          package_storage_path?: string | null
          previous_bundle_revoked_at?: string | null
          updated_at?: string
          user_count?: number | null
        }
        Update: {
          app_version?: string | null
          created_at?: string
          host_info?: Json | null
          id?: string
          install_id?: string
          installer_version?: string | null
          ip_address?: string | null
          last_heartbeat_at?: string | null
          package_checksum_sha256?: string | null
          package_generated_at?: string | null
          package_generation_count?: number
          package_installer_version?: string | null
          package_storage_path?: string | null
          previous_bundle_revoked_at?: string | null
          updated_at?: string
          user_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "license_installs_install_id_fkey"
            columns: ["install_id"]
            isOneToOne: true
            referencedRelation: "licenses"
            referencedColumns: ["install_id"]
          },
        ]
      }
      license_orders: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          id: string
          install_id: string
          invoice_url: string | null
          module_key: string
          notes: string | null
          paid_at: string | null
          status: string
          stripe_payment_intent: string | null
          unit_price_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          install_id: string
          invoice_url?: string | null
          module_key: string
          notes?: string | null
          paid_at?: string | null
          status?: string
          stripe_payment_intent?: string | null
          unit_price_cents?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          install_id?: string
          invoice_url?: string | null
          module_key?: string
          notes?: string | null
          paid_at?: string | null
          status?: string
          stripe_payment_intent?: string | null
          unit_price_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "license_orders_install_id_fkey"
            columns: ["install_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["install_id"]
          },
        ]
      }
      license_releases: {
        Row: {
          channel: string
          checksum: string | null
          created_at: string
          created_by: string | null
          docker_image: string
          id: string
          is_current: boolean
          min_supported: string | null
          published_at: string
          release_notes_url: string | null
          updated_at: string
          version: string
        }
        Insert: {
          channel?: string
          checksum?: string | null
          created_at?: string
          created_by?: string | null
          docker_image: string
          id?: string
          is_current?: boolean
          min_supported?: string | null
          published_at?: string
          release_notes_url?: string | null
          updated_at?: string
          version: string
        }
        Update: {
          channel?: string
          checksum?: string | null
          created_at?: string
          created_by?: string | null
          docker_image?: string
          id?: string
          is_current?: boolean
          min_supported?: string | null
          published_at?: string
          release_notes_url?: string | null
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      license_signing_keys: {
        Row: {
          active: boolean
          algorithm: string
          created_at: string
          id: string
          key_id: string
          private_key_pem: string
          public_key_pem: string
        }
        Insert: {
          active?: boolean
          algorithm?: string
          created_at?: string
          id?: string
          key_id: string
          private_key_pem: string
          public_key_pem: string
        }
        Update: {
          active?: boolean
          algorithm?: string
          created_at?: string
          id?: string
          key_id?: string
          private_key_pem?: string
          public_key_pem?: string
        }
        Relationships: []
      }
      licenses: {
        Row: {
          company_name: string
          contact_email: string | null
          created_at: string
          expires_at: string | null
          handed_over_at: string | null
          handover_notes: string | null
          id: string
          install_id: string
          issued_at: string
          issued_by: string | null
          kind: string
          license_version: number
          maintenance_expires_at: string | null
          max_users: number
          module_key: string | null
          modules: Json
          notes: string | null
          owner_since: string
          owner_type: string
          pinned_installer_version: string | null
          revoked: boolean
          revoked_at: string | null
          revoked_reason: string | null
          seats: number | null
          signed_token: string | null
          suspended: boolean
          suspended_at: string | null
          suspended_reason: string | null
          technical_contact_email: string | null
          tier: string
          updated_at: string
        }
        Insert: {
          company_name: string
          contact_email?: string | null
          created_at?: string
          expires_at?: string | null
          handed_over_at?: string | null
          handover_notes?: string | null
          id?: string
          install_id: string
          issued_at?: string
          issued_by?: string | null
          kind?: string
          license_version?: number
          maintenance_expires_at?: string | null
          max_users?: number
          module_key?: string | null
          modules?: Json
          notes?: string | null
          owner_since?: string
          owner_type?: string
          pinned_installer_version?: string | null
          revoked?: boolean
          revoked_at?: string | null
          revoked_reason?: string | null
          seats?: number | null
          signed_token?: string | null
          suspended?: boolean
          suspended_at?: string | null
          suspended_reason?: string | null
          technical_contact_email?: string | null
          tier?: string
          updated_at?: string
        }
        Update: {
          company_name?: string
          contact_email?: string | null
          created_at?: string
          expires_at?: string | null
          handed_over_at?: string | null
          handover_notes?: string | null
          id?: string
          install_id?: string
          issued_at?: string
          issued_by?: string | null
          kind?: string
          license_version?: number
          maintenance_expires_at?: string | null
          max_users?: number
          module_key?: string | null
          modules?: Json
          notes?: string | null
          owner_since?: string
          owner_type?: string
          pinned_installer_version?: string | null
          revoked?: boolean
          revoked_at?: string | null
          revoked_reason?: string | null
          seats?: number | null
          signed_token?: string | null
          suspended?: boolean
          suspended_at?: string | null
          suspended_reason?: string | null
          technical_contact_email?: string | null
          tier?: string
          updated_at?: string
        }
        Relationships: []
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
          is_demo_ephemeral: boolean
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
          is_demo_ephemeral?: boolean
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
          is_demo_ephemeral?: boolean
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
      platform_config: {
        Row: {
          ai_provider_config: Json | null
          backup_config: Json | null
          break_glass_created_at: string | null
          break_glass_hash: string | null
          break_glass_used_at: string | null
          created_at: string
          eula_accepted_at: string | null
          id: boolean
          install_id: string | null
          installer_version: string | null
          recovery_mode: boolean
          recovery_mode_reason: string | null
          recovery_mode_since: string | null
          setup_completed_at: string | null
          setup_progress: Json
          updated_at: string
        }
        Insert: {
          ai_provider_config?: Json | null
          backup_config?: Json | null
          break_glass_created_at?: string | null
          break_glass_hash?: string | null
          break_glass_used_at?: string | null
          created_at?: string
          eula_accepted_at?: string | null
          id?: boolean
          install_id?: string | null
          installer_version?: string | null
          recovery_mode?: boolean
          recovery_mode_reason?: string | null
          recovery_mode_since?: string | null
          setup_completed_at?: string | null
          setup_progress?: Json
          updated_at?: string
        }
        Update: {
          ai_provider_config?: Json | null
          backup_config?: Json | null
          break_glass_created_at?: string | null
          break_glass_hash?: string | null
          break_glass_used_at?: string | null
          created_at?: string
          eula_accepted_at?: string | null
          id?: boolean
          install_id?: string | null
          installer_version?: string | null
          recovery_mode?: boolean
          recovery_mode_reason?: string | null
          recovery_mode_since?: string | null
          setup_completed_at?: string | null
          setup_progress?: Json
          updated_at?: string
        }
        Relationships: []
      }
      platform_email_settings: {
        Row: {
          company_name: string
          contact_email: string
          footer_text: string
          id: boolean
          logo_url: string
          privacy_email: string
          provider: string
          reply_to_email: string
          security_email: string
          sender_email: string
          sender_name: string
          support_email: string
          updated_at: string
          updated_by: string | null
          website_url: string
        }
        Insert: {
          company_name?: string
          contact_email?: string
          footer_text?: string
          id?: boolean
          logo_url?: string
          privacy_email?: string
          provider?: string
          reply_to_email?: string
          security_email?: string
          sender_email?: string
          sender_name?: string
          support_email?: string
          updated_at?: string
          updated_by?: string | null
          website_url?: string
        }
        Update: {
          company_name?: string
          contact_email?: string
          footer_text?: string
          id?: boolean
          logo_url?: string
          privacy_email?: string
          provider?: string
          reply_to_email?: string
          security_email?: string
          sender_email?: string
          sender_name?: string
          support_email?: string
          updated_at?: string
          updated_by?: string | null
          website_url?: string
        }
        Relationships: []
      }
      platform_owner_allowlist: {
        Row: {
          created_at: string
          email: string
          note: string | null
        }
        Insert: {
          created_at?: string
          email: string
          note?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          note?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_id: string
          created_at: string
          dashboard_layout: Json | null
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
          dashboard_layout?: Json | null
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
          dashboard_layout?: Json | null
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
      role_permissions: {
        Row: {
          permission: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          permission: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          permission?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
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
      sso_configurations: {
        Row: {
          company_id: string
          created_at: string
          display_name: string | null
          email_domains: string[]
          id: string
          idp_type: Database["public"]["Enums"]["sso_idp_type"]
          metadata_url: string | null
          notes: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["sso_config_status"]
          submitted_at: string | null
          submitted_by: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          display_name?: string | null
          email_domains?: string[]
          id?: string
          idp_type?: Database["public"]["Enums"]["sso_idp_type"]
          metadata_url?: string | null
          notes?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["sso_config_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          display_name?: string | null
          email_domains?: string[]
          id?: string
          idp_type?: Database["public"]["Enums"]["sso_idp_type"]
          metadata_url?: string | null
          notes?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["sso_config_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sso_configurations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_events: {
        Row: {
          actor_id: string | null
          actor_kind: string
          company_id: string
          created_at: string
          event_type: string
          from_status: string | null
          id: string
          metadata: Json
          reason: string | null
          to_status: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_kind?: string
          company_id: string
          created_at?: string
          event_type: string
          from_status?: string | null
          id?: string
          metadata?: Json
          reason?: string | null
          to_status?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_kind?: string
          company_id?: string
          created_at?: string
          event_type?: string
          from_status?: string | null
          id?: string
          metadata?: Json
          reason?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      support_conversations: {
        Row: {
          assigned_to: string | null
          company_id: string
          context: Json
          created_at: string
          id: string
          last_message_at: string
          opened_by: string
          priority: Database["public"]["Enums"]["support_priority"]
          status: Database["public"]["Enums"]["support_status"]
          subject: string
          unread_for_customer: number
          unread_for_platform: number
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          company_id: string
          context?: Json
          created_at?: string
          id?: string
          last_message_at?: string
          opened_by: string
          priority?: Database["public"]["Enums"]["support_priority"]
          status?: Database["public"]["Enums"]["support_status"]
          subject: string
          unread_for_customer?: number
          unread_for_platform?: number
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          company_id?: string
          context?: Json
          created_at?: string
          id?: string
          last_message_at?: string
          opened_by?: string
          priority?: Database["public"]["Enums"]["support_priority"]
          status?: Database["public"]["Enums"]["support_status"]
          subject?: string
          unread_for_customer?: number
          unread_for_platform?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          attachments: Json
          body: string
          context: Json
          conversation_id: string
          created_at: string
          id: string
          internal_note: boolean
          sender_id: string
          sender_kind: Database["public"]["Enums"]["support_sender_kind"]
        }
        Insert: {
          attachments?: Json
          body: string
          context?: Json
          conversation_id: string
          created_at?: string
          id?: string
          internal_note?: boolean
          sender_id: string
          sender_kind: Database["public"]["Enums"]["support_sender_kind"]
        }
        Update: {
          attachments?: Json
          body?: string
          context?: Json
          conversation_id?: string
          created_at?: string
          id?: string
          internal_note?: boolean
          sender_id?: string
          sender_kind?: Database["public"]["Enums"]["support_sender_kind"]
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "support_conversations"
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
      system_doc_catalog: {
        Row: {
          body_hash: string
          body_md: string
          category: string
          created_at: string
          document_id: string | null
          feature_key: string | null
          related_slugs: string[]
          slug: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          body_hash: string
          body_md: string
          category: string
          created_at?: string
          document_id?: string | null
          feature_key?: string | null
          related_slugs?: string[]
          slug: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          body_hash?: string
          body_md?: string
          category?: string
          created_at?: string
          document_id?: string | null
          feature_key?: string | null
          related_slugs?: string[]
          slug?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "system_doc_catalog_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "knowledge_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      threads: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_demo_ephemeral: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_demo_ephemeral?: boolean
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_demo_ephemeral?: boolean
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
          immutable_owner: boolean
          is_platform_owner: boolean
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          immutable_owner?: boolean
          is_platform_owner?: boolean
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          immutable_owner?: boolean
          is_platform_owner?: boolean
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
      webhook_deliveries: {
        Row: {
          attempt: number
          company_id: string
          created_at: string
          endpoint_id: string
          error: string | null
          event: string
          id: string
          latency_ms: number | null
          ok: boolean
          response_body: string | null
          status_code: number | null
        }
        Insert: {
          attempt?: number
          company_id: string
          created_at?: string
          endpoint_id: string
          error?: string | null
          event: string
          id?: string
          latency_ms?: number | null
          ok?: boolean
          response_body?: string | null
          status_code?: number | null
        }
        Update: {
          attempt?: number
          company_id?: string
          created_at?: string
          endpoint_id?: string
          error?: string | null
          event?: string
          id?: string
          latency_ms?: number | null
          ok?: boolean
          response_body?: string | null
          status_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_deliveries_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          active: boolean
          company_id: string
          created_at: string
          created_by: string | null
          events: string[]
          failure_count: number
          id: string
          last_failure_at: string | null
          last_success_at: string | null
          name: string
          secret: string
          updated_at: string
          url: string
        }
        Insert: {
          active?: boolean
          company_id: string
          created_at?: string
          created_by?: string | null
          events?: string[]
          failure_count?: number
          id?: string
          last_failure_at?: string | null
          last_success_at?: string | null
          name: string
          secret: string
          updated_at?: string
          url: string
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          created_by?: string | null
          events?: string[]
          failure_count?: number
          id?: string
          last_failure_at?: string | null
          last_success_at?: string | null
          name?: string
          secret?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_company_id_fkey"
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
      academy_company_visible: { Args: { _company: string }; Returns: boolean }
      academy_department_performance: {
        Args: { p_company: string }
        Returns: Json
      }
      academy_heatmap: { Args: { p_company: string }; Returns: Json }
      academy_kpis: { Args: { p_company: string }; Returns: Json }
      academy_resolve_targets: {
        Args: {
          _company_id: string
          _department_ids: string[]
          _entire_company: boolean
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_ids: string[]
        }
        Returns: {
          user_id: string
        }[]
      }
      academy_send_reminders: { Args: never; Returns: number }
      academy_verify_certificate: { Args: { _code: string }; Returns: Json }
      audit_companies: { Args: never; Returns: Json }
      audit_entries: {
        Args: {
          p_action?: string
          p_company: string
          p_from?: string
          p_limit?: number
          p_module?: string
          p_severity?: string
          p_to?: string
          p_user: string
        }
        Returns: Json
      }
      audit_users: { Args: { p_company: string }; Returns: Json }
      audit_write: {
        Args: {
          p_action: string
          p_company: string
          p_ip: string
          p_module: string
          p_new: Json
          p_old: Json
          p_resource: string
          p_severity: string
          p_success: boolean
          p_ua: string
          p_user: string
        }
        Returns: string
      }
      cron_mark_outdated_knowledge: { Args: never; Returns: undefined }
      cron_quarterly_knowledge_report: { Args: never; Returns: undefined }
      current_company_id: { Args: never; Returns: string }
      customer_health: { Args: { p_company: string }; Returns: Json }
      dashboard_activity: {
        Args: {
          p_bucket?: string
          p_company: string
          p_from: string
          p_to: string
        }
        Returns: Json
      }
      dashboard_critical_sops: { Args: { p_company: string }; Returns: Json }
      dashboard_health: { Args: { p_company: string }; Returns: Json }
      dashboard_knowledge_status: { Args: { p_company: string }; Returns: Json }
      dashboard_kpis: { Args: { p_company: string }; Returns: Json }
      dashboard_last_ai_audit: { Args: { p_company: string }; Returns: Json }
      dashboard_top_sops: {
        Args: { p_company: string; p_limit?: number }
        Returns: Json
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      demo_cleanup: { Args: never; Returns: undefined }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      ensure_platform_owner: { Args: never; Returns: number }
      first_run_bootstrap_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
      gap_companies: { Args: never; Returns: Json }
      gap_user_questions: {
        Args: {
          p_company: string
          p_department?: string
          p_from?: string
          p_status?: string
          p_to?: string
          p_user: string
        }
        Returns: Json
      }
      gap_users: { Args: { p_company: string }; Returns: Json }
      get_profile_phone: { Args: { _id: string }; Returns: string }
      get_subscription_state: {
        Args: { _company: string }
        Returns: {
          billing_override: boolean
          cancelled_at: string
          company_id: string
          grace_period_days: number
          grace_period_ends_at: string
          is_read_only: boolean
          last_payment_at: string
          name: string
          next_invoice_due_at: string
          renewal_date: string
          subscription_plan: string
          subscription_status: string
          suspended_at: string
          suspension_reason: string
          trial_ends_at: string
        }[]
      }
      has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_workspace_write_access: {
        Args: { _company: string }
        Returns: boolean
      }
      is_demo_company: { Args: { _company_id: string }; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      is_platform_owner: { Args: { _user_id?: string }; Returns: boolean }
      is_workspace_suspended: { Args: { _company: string }; Returns: boolean }
      knowledge_health: { Args: { p_company: string }; Returns: Json }
      log_workspace_switch: {
        Args: { p_next: string; p_previous: string }
        Returns: undefined
      }
      mark_tenant_terminated: {
        Args: { _company: string; _reason?: string }
        Returns: string
      }
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
      my_permissions: {
        Args: never
        Returns: {
          permission: string
        }[]
      }
      purge_archived_audit_log: { Args: never; Returns: Json }
      purge_terminated_tenants: { Args: never; Returns: Json }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      restore_terminated_tenant: {
        Args: { _company: string }
        Returns: boolean
      }
      search_everywhere: {
        Args: { p_company: string; p_limit?: number; p_q: string }
        Returns: Json
      }
      subscription_apply_status: {
        Args: {
          _actor_kind?: string
          _company: string
          _reason?: string
          _to_status: string
        }
        Returns: undefined
      }
      subscription_lifecycle_tick: { Args: never; Returns: Json }
      subscription_notify_admins: {
        Args: { _body: string; _company: string; _kind: string; _title: string }
        Returns: undefined
      }
      system_company_id: { Args: never; Returns: string }
      user_belongs_to_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      verify_api_key: {
        Args: { _hash: string }
        Returns: {
          company_id: string
          key_id: string
          scopes: string[]
        }[]
      }
      workspace_cleanup_expired: {
        Args: never
        Returns: {
          artifacts_deleted: number
          files_deleted: number
        }[]
      }
    }
    Enums: {
      academy_enrollment_status:
        | "assigned"
        | "in_progress"
        | "completed"
        | "overdue"
        | "revoked"
      academy_progress_status:
        | "not_started"
        | "in_progress"
        | "completed"
        | "needs_review"
      academy_publish_status: "draft" | "published" | "archived"
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
        | "workspace_owner"
        | "champion"
      contact_status: "new" | "in_progress" | "resolved" | "spam"
      contact_subject:
        | "general"
        | "demo"
        | "sales"
        | "pricing"
        | "support"
        | "bug"
        | "security"
        | "privacy"
        | "partnership"
        | "other"
      message_role: "user" | "assistant" | "system"
      sso_config_status: "draft" | "pending_review" | "active" | "rejected"
      sso_idp_type:
        | "azure_ad"
        | "okta"
        | "onelogin"
        | "ping"
        | "google_workspace"
        | "other"
      support_priority: "low" | "normal" | "high" | "critical"
      support_sender_kind: "customer" | "platform"
      support_status: "open" | "pending" | "resolved" | "closed"
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
      academy_enrollment_status: [
        "assigned",
        "in_progress",
        "completed",
        "overdue",
        "revoked",
      ],
      academy_progress_status: [
        "not_started",
        "in_progress",
        "completed",
        "needs_review",
      ],
      academy_publish_status: ["draft", "published", "archived"],
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
        "workspace_owner",
        "champion",
      ],
      contact_status: ["new", "in_progress", "resolved", "spam"],
      contact_subject: [
        "general",
        "demo",
        "sales",
        "pricing",
        "support",
        "bug",
        "security",
        "privacy",
        "partnership",
        "other",
      ],
      message_role: ["user", "assistant", "system"],
      sso_config_status: ["draft", "pending_review", "active", "rejected"],
      sso_idp_type: [
        "azure_ad",
        "okta",
        "onelogin",
        "ping",
        "google_workspace",
        "other",
      ],
      support_priority: ["low", "normal", "high", "critical"],
      support_sender_kind: ["customer", "platform"],
      support_status: ["open", "pending", "resolved", "closed"],
    },
  },
} as const
