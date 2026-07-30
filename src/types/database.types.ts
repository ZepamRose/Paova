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
      audit_event: {
        Row: {
          actor_kind: string
          actor_user_id: string | null
          business_id: string
          created_at: string
          entity_id: string | null
          entity_type: string
          event_type: string
          id: string
          payload: Json
          submission_id: string | null
          template_id: string | null
        }
        Insert: {
          actor_kind: string
          actor_user_id?: string | null
          business_id: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          event_type: string
          id?: string
          payload?: Json
          submission_id?: string | null
          template_id?: string | null
        }
        Update: {
          actor_kind?: string
          actor_user_id?: string | null
          business_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          event_type?: string
          id?: string
          payload?: Json
          submission_id?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_event_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_event_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_event_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submission"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_event_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "waiver_template"
            referencedColumns: ["id"]
          },
        ]
      }
      business: {
        Row: {
          brand_accent: string | null
          brand_button_radius: string
          brand_color: string
          brand_font: string
          contact_address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          custom_domain: string | null
          custom_domain_status: string
          email_footer: string | null
          email_from_name: string | null
          email_show_logo: boolean
          email_signature: string | null
          email_subject_template: string | null
          enabled_locales: string[]
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          pdf_show_contact: boolean
          pdf_show_footer: boolean
          pdf_show_logo: boolean
          pdf_show_name: boolean
          pdf_show_phone: boolean
          pdf_show_website: boolean
          plan: string
          public_header_style: string
          public_show_contact: boolean
          public_show_logo: boolean
          public_show_name: boolean
          public_show_tagline: boolean
          public_theme: string
          stripe_customer_id: string | null
          subscription_status: string
          tagline: string | null
          thank_you_button_label: string | null
          thank_you_button_url: string | null
          thank_you_message: string | null
          thank_you_title: string | null
          website_url: string | null
        }
        Insert: {
          brand_accent?: string | null
          brand_button_radius?: string
          brand_color?: string
          brand_font?: string
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          custom_domain?: string | null
          custom_domain_status?: string
          email_footer?: string | null
          email_from_name?: string | null
          email_show_logo?: boolean
          email_signature?: string | null
          email_subject_template?: string | null
          enabled_locales?: string[]
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          pdf_show_contact?: boolean
          pdf_show_footer?: boolean
          pdf_show_logo?: boolean
          pdf_show_name?: boolean
          pdf_show_phone?: boolean
          pdf_show_website?: boolean
          plan?: string
          public_header_style?: string
          public_show_contact?: boolean
          public_show_logo?: boolean
          public_show_name?: boolean
          public_show_tagline?: boolean
          public_theme?: string
          stripe_customer_id?: string | null
          subscription_status?: string
          tagline?: string | null
          thank_you_button_label?: string | null
          thank_you_button_url?: string | null
          thank_you_message?: string | null
          thank_you_title?: string | null
          website_url?: string | null
        }
        Update: {
          brand_accent?: string | null
          brand_button_radius?: string
          brand_color?: string
          brand_font?: string
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          custom_domain?: string | null
          custom_domain_status?: string
          email_footer?: string | null
          email_from_name?: string | null
          email_show_logo?: boolean
          email_signature?: string | null
          email_subject_template?: string | null
          enabled_locales?: string[]
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          pdf_show_contact?: boolean
          pdf_show_footer?: boolean
          pdf_show_logo?: boolean
          pdf_show_name?: boolean
          pdf_show_phone?: boolean
          pdf_show_website?: boolean
          plan?: string
          public_header_style?: string
          public_show_contact?: boolean
          public_show_logo?: boolean
          public_show_name?: boolean
          public_show_tagline?: boolean
          public_theme?: string
          stripe_customer_id?: string | null
          subscription_status?: string
          tagline?: string | null
          thank_you_button_label?: string | null
          thank_you_button_url?: string | null
          thank_you_message?: string | null
          thank_you_title?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_member: {
        Row: {
          business_id: string
          created_at: string
          display_name: string | null
          id: string
          invited_by: string | null
          invited_email: string | null
          invited_name: string | null
          last_seen_at: string | null
          role: string
          status: string
          user_id: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          display_name?: string | null
          id?: string
          invited_by?: string | null
          invited_email?: string | null
          invited_name?: string | null
          last_seen_at?: string | null
          role: string
          status?: string
          user_id?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          display_name?: string | null
          id?: string
          invited_by?: string | null
          invited_email?: string | null
          invited_name?: string | null
          last_seen_at?: string | null
          role?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_member_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_member_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          plan: string
          stripe_customer_id: string | null
          subscription_status: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          plan?: string
          stripe_customer_id?: string | null
          subscription_status?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          plan?: string
          stripe_customer_id?: string | null
          subscription_status?: string
        }
        Relationships: []
      }
      rate_limit: {
        Row: {
          bucket: string
          hits: number
          identifier: string
          window_start: string
        }
        Insert: {
          bucket: string
          hits?: number
          identifier: string
          window_start: string
        }
        Update: {
          bucket?: string
          hits?: number
          identifier?: string
          window_start?: string
        }
        Relationships: []
      }
      signature_proof: {
        Row: {
          content_sha256: string
          content_snapshot: Json
          created_at: string
          device_hint: string | null
          evidence: Json
          hash_algorithm: string
          id: string
          ip_address: string | null
          reference: string
          signed_at: string
          submission_id: string
          template_id: string
          template_version: number
          template_version_id: string | null
          timezone: string | null
          timezone_offset_minutes: number | null
          user_agent: string | null
        }
        Insert: {
          content_sha256: string
          content_snapshot: Json
          created_at?: string
          device_hint?: string | null
          evidence?: Json
          hash_algorithm?: string
          id?: string
          ip_address?: string | null
          reference: string
          signed_at: string
          submission_id: string
          template_id: string
          template_version: number
          template_version_id?: string | null
          timezone?: string | null
          timezone_offset_minutes?: number | null
          user_agent?: string | null
        }
        Update: {
          content_sha256?: string
          content_snapshot?: Json
          created_at?: string
          device_hint?: string | null
          evidence?: Json
          hash_algorithm?: string
          id?: string
          ip_address?: string | null
          reference?: string
          signed_at?: string
          submission_id?: string
          template_id?: string
          template_version?: number
          template_version_id?: string | null
          timezone?: string | null
          timezone_offset_minutes?: number | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_proof_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: true
            referencedRelation: "submission"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_proof_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "waiver_template"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_proof_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "waiver_template_version"
            referencedColumns: ["id"]
          },
        ]
      }
      signing_group: {
        Row: {
          archived_at: string | null
          business_id: string
          closes_at: string | null
          created_at: string
          id: string
          kind: string
          name: string
          public_token: string
          scheduled_at: string | null
          status: string
          template_id: string
        }
        Insert: {
          archived_at?: string | null
          business_id: string
          closes_at?: string | null
          created_at?: string
          id?: string
          kind?: string
          name: string
          public_token: string
          scheduled_at?: string | null
          status?: string
          template_id: string
        }
        Update: {
          archived_at?: string | null
          business_id?: string
          closes_at?: string | null
          created_at?: string
          id?: string
          kind?: string
          name?: string
          public_token?: string
          scheduled_at?: string | null
          status?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signing_group_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signing_group_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "waiver_template"
            referencedColumns: ["id"]
          },
        ]
      }
      signing_group_member: {
        Row: {
          created_at: string
          dob: string | null
          full_name: string
          group_id: string
          id: string
          note: string | null
          parent_email: string | null
          reminder_sent_at: string | null
          signed_at: string | null
          signed_submission_id: string | null
        }
        Insert: {
          created_at?: string
          dob?: string | null
          full_name: string
          group_id: string
          id?: string
          note?: string | null
          parent_email?: string | null
          reminder_sent_at?: string | null
          signed_at?: string | null
          signed_submission_id?: string | null
        }
        Update: {
          created_at?: string
          dob?: string | null
          full_name?: string
          group_id?: string
          id?: string
          note?: string | null
          parent_email?: string | null
          reminder_sent_at?: string | null
          signed_at?: string | null
          signed_submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signing_group_member_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "signing_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signing_group_member_signed_submission_id_fkey"
            columns: ["signed_submission_id"]
            isOneToOne: false
            referencedRelation: "submission"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_webhook_event: {
        Row: {
          event_type: string
          id: string
          processed_at: string | null
          received_at: string
        }
        Insert: {
          event_type: string
          id: string
          processed_at?: string | null
          received_at?: string
        }
        Update: {
          event_type?: string
          id?: string
          processed_at?: string | null
          received_at?: string
        }
        Relationships: []
      }
      submission: {
        Row: {
          answers: Json
          business_id: string
          id: string
          ip_address: string | null
          pdf_url: string | null
          signature_url: string | null
          signed_at: string
          signer_email: string | null
          signer_name: string
          template_id: string
        }
        Insert: {
          answers?: Json
          business_id: string
          id?: string
          ip_address?: string | null
          pdf_url?: string | null
          signature_url?: string | null
          signed_at?: string
          signer_email?: string | null
          signer_name: string
          template_id: string
        }
        Update: {
          answers?: Json
          business_id?: string
          id?: string
          ip_address?: string | null
          pdf_url?: string | null
          signature_url?: string | null
          signed_at?: string
          signer_email?: string | null
          signer_name?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "waiver_template"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_search: {
        Row: {
          answers_text: string | null
          business_id: string
          business_name: string | null
          content_sha256: string | null
          phone: string | null
          proof_reference: string | null
          search_vector: unknown
          signed_at: string
          signer_email: string | null
          signer_name: string
          status: string
          submission_id: string
          template_id: string
          template_title: string
          template_version: number | null
        }
        Insert: {
          answers_text?: string | null
          business_id: string
          business_name?: string | null
          content_sha256?: string | null
          phone?: string | null
          proof_reference?: string | null
          search_vector?: unknown
          signed_at: string
          signer_email?: string | null
          signer_name: string
          status?: string
          submission_id: string
          template_id: string
          template_title: string
          template_version?: number | null
        }
        Update: {
          answers_text?: string | null
          business_id?: string
          business_name?: string | null
          content_sha256?: string | null
          phone?: string | null
          proof_reference?: string | null
          search_vector?: unknown
          signed_at?: string
          signer_email?: string | null
          signer_name?: string
          status?: string
          submission_id?: string
          template_id?: string
          template_title?: string
          template_version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "submission_search_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_search_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: true
            referencedRelation: "submission"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_search_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "waiver_template"
            referencedColumns: ["id"]
          },
        ]
      }
      waiver_template: {
        Row: {
          business_id: string
          created_at: string
          deleted_at: string | null
          expiration_days: number | null
          expiration_mode: string
          expires_at: string | null
          fields: Json
          id: string
          is_active: boolean
          legal_text: string
          public_slug: string
          signature_hours_days: number[]
          signature_hours_enabled: boolean
          signature_hours_end: string | null
          signature_hours_start: string | null
          signature_timezone: string
          signer_name_label: string | null
          starter_pack_id: string | null
          status: string
          title: string
          version: number
        }
        Insert: {
          business_id: string
          created_at?: string
          deleted_at?: string | null
          expiration_days?: number | null
          expiration_mode?: string
          expires_at?: string | null
          fields?: Json
          id?: string
          is_active?: boolean
          legal_text: string
          public_slug: string
          signature_hours_days?: number[]
          signature_hours_enabled?: boolean
          signature_hours_end?: string | null
          signature_hours_start?: string | null
          signature_timezone?: string
          signer_name_label?: string | null
          starter_pack_id?: string | null
          status?: string
          title: string
          version?: number
        }
        Update: {
          business_id?: string
          created_at?: string
          deleted_at?: string | null
          expiration_days?: number | null
          expiration_mode?: string
          expires_at?: string | null
          fields?: Json
          id?: string
          is_active?: boolean
          legal_text?: string
          public_slug?: string
          signature_hours_days?: number[]
          signature_hours_enabled?: boolean
          signature_hours_end?: string | null
          signature_hours_start?: string | null
          signature_timezone?: string
          signer_name_label?: string | null
          starter_pack_id?: string | null
          status?: string
          title?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "waiver_template_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
        ]
      }
      waiver_template_version: {
        Row: {
          created_at: string
          created_by: string | null
          fields: Json
          id: string
          legal_text: string
          signer_name_label: string | null
          template_id: string
          title: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          fields?: Json
          id?: string
          legal_text: string
          signer_name_label?: string | null
          template_id: string
          title: string
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          fields?: Json
          id?: string
          legal_text?: string
          signer_name_label?: string | null
          template_id?: string
          title?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "waiver_template_version_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiver_template_version_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "waiver_template"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      business_member_directory: {
        Args: { p_business_id: string }
        Returns: {
          email: string
          full_name: string
          last_seen_at: string
          last_sign_in_at: string
          user_id: string
        }[]
      }
      claim_stripe_webhook_event: {
        Args: {
          p_event_id: string
          p_event_type: string
          p_stale_after_seconds?: number
        }
        Returns: boolean
      }
      complete_stripe_webhook_event: {
        Args: { p_event_id: string }
        Returns: undefined
      }
      current_user_business_ids: { Args: never; Returns: string[] }
      current_user_business_ids_with_roles: {
        Args: { p_roles: string[] }
        Returns: string[]
      }
      dashboard_group_stats: {
        Args: { p_business_id: string }
        Returns: {
          group_id: string
          signed: number
          total: number
        }[]
      }
      dashboard_signature_days: {
        Args: { p_business_id: string; p_from: string }
        Returns: {
          cnt: number
          day: string
        }[]
      }
      dashboard_template_stats: {
        Args: { p_business_id: string }
        Returns: {
          last_signed_at: string
          signature_count: number
          template_id: string
        }[]
      }
      free_monthly_signature_limit: { Args: never; Returns: number }
      rate_limit_hit: {
        Args: {
          p_bucket: string
          p_identifier: string
          p_max_hits: number
          p_window_seconds: number
        }
        Returns: boolean
      }
      rate_limit_peek: {
        Args: {
          p_bucket: string
          p_identifier: string
          p_window_seconds: number
        }
        Returns: number
      }
      search_submissions_for_owner:
        | {
            Args: {
              p_from?: string
              p_limit?: number
              p_offset?: number
              p_query?: string
              p_status?: string
              p_template_id?: string
              p_to?: string
            }
            Returns: {
              answers_text: string | null
              business_id: string
              business_name: string | null
              content_sha256: string | null
              phone: string | null
              proof_reference: string | null
              search_vector: unknown
              signed_at: string
              signer_email: string | null
              signer_name: string
              status: string
              submission_id: string
              template_id: string
              template_title: string
              template_version: number | null
            }[]
            SetofOptions: {
              from: "*"
              to: "submission_search"
              isOneToOne: false
              isSetofReturn: true
            }
          }
        | {
            Args: {
              p_business_id?: string
              p_from?: string
              p_group_id?: string
              p_group_mode?: string
              p_limit?: number
              p_offset?: number
              p_query?: string
              p_status?: string
              p_template_id?: string
              p_to?: string
            }
            Returns: {
              answers_text: string | null
              business_id: string
              business_name: string | null
              content_sha256: string | null
              phone: string | null
              proof_reference: string | null
              search_vector: unknown
              signed_at: string
              signer_email: string | null
              signer_name: string
              status: string
              submission_id: string
              template_id: string
              template_title: string
              template_version: number | null
            }[]
            SetofOptions: {
              from: "*"
              to: "submission_search"
              isOneToOne: false
              isSetofReturn: true
            }
          }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      storage_path_is_owned_business: {
        Args: { object_name: string }
        Returns: boolean
      }
      template_proof_version_counts: {
        Args: { p_template_id: string }
        Returns: {
          signature_count: number
          template_version: number
        }[]
      }
      transfer_business_ownership: {
        Args: { p_business_id: string; p_new_owner_member_id: string }
        Returns: undefined
      }
      update_member_activity: {
        Args: { p_business_id: string }
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

