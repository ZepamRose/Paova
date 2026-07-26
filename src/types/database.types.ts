/**
 * Database types.
 * Mirrors `supabase/migrations/0001_init.sql` (+ later migrations).
 * Shape matches what @supabase/supabase-js expects (GenericSchema).
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          stripe_customer_id: string | null;
          plan: string;
          subscription_status: string;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          stripe_customer_id?: string | null;
          plan?: string;
          subscription_status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          stripe_customer_id?: string | null;
          plan?: string;
          subscription_status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      business: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          plan: string;
          subscription_status: string;
          stripe_customer_id: string | null;
          logo_url: string | null;
          brand_color: string;
          brand_font: string;
          tagline: string | null;
          brand_accent: string | null;
          contact_address: string | null;
          contact_phone: string | null;
          contact_email: string | null;
          website_url: string | null;
          thank_you_title: string | null;
          thank_you_message: string | null;
          thank_you_button_label: string | null;
          thank_you_button_url: string | null;
          brand_button_radius: string;
          public_theme: string;
          custom_domain: string | null;
          custom_domain_status: string;
          public_header_style: string;
          public_show_logo: boolean;
          public_show_name: boolean;
          public_show_tagline: boolean;
          public_show_contact: boolean;
          pdf_show_logo: boolean;
          pdf_show_name: boolean;
          pdf_show_contact: boolean;
          pdf_show_website: boolean;
          pdf_show_phone: boolean;
          pdf_show_footer: boolean;
          email_from_name: string | null;
          email_subject_template: string | null;
          email_signature: string | null;
          email_footer: string | null;
          email_show_logo: boolean;
          enabled_locales: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          plan?: string;
          subscription_status?: string;
          stripe_customer_id?: string | null;
          logo_url?: string | null;
          brand_color?: string;
          brand_font?: string;
          tagline?: string | null;
          brand_accent?: string | null;
          contact_address?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          website_url?: string | null;
          thank_you_title?: string | null;
          thank_you_message?: string | null;
          thank_you_button_label?: string | null;
          thank_you_button_url?: string | null;
          brand_button_radius?: string;
          public_theme?: string;
          custom_domain?: string | null;
          custom_domain_status?: string;
          public_header_style?: string;
          public_show_logo?: boolean;
          public_show_name?: boolean;
          public_show_tagline?: boolean;
          public_show_contact?: boolean;
          pdf_show_logo?: boolean;
          pdf_show_name?: boolean;
          pdf_show_contact?: boolean;
          pdf_show_website?: boolean;
          pdf_show_phone?: boolean;
          pdf_show_footer?: boolean;
          email_from_name?: string | null;
          email_subject_template?: string | null;
          email_signature?: string | null;
          email_footer?: string | null;
          email_show_logo?: boolean;
          enabled_locales?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          plan?: string;
          subscription_status?: string;
          stripe_customer_id?: string | null;
          logo_url?: string | null;
          brand_color?: string;
          brand_font?: string;
          tagline?: string | null;
          brand_accent?: string | null;
          contact_address?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          website_url?: string | null;
          thank_you_title?: string | null;
          thank_you_message?: string | null;
          thank_you_button_label?: string | null;
          thank_you_button_url?: string | null;
          brand_button_radius?: string;
          public_theme?: string;
          custom_domain?: string | null;
          custom_domain_status?: string;
          public_header_style?: string;
          public_show_logo?: boolean;
          public_show_name?: boolean;
          public_show_tagline?: boolean;
          public_show_contact?: boolean;
          pdf_show_logo?: boolean;
          pdf_show_name?: boolean;
          pdf_show_contact?: boolean;
          pdf_show_website?: boolean;
          pdf_show_phone?: boolean;
          pdf_show_footer?: boolean;
          email_from_name?: string | null;
          email_subject_template?: string | null;
          email_signature?: string | null;
          email_footer?: string | null;
          email_show_logo?: boolean;
          enabled_locales?: string[];
          created_at?: string;
        };
        Relationships: [];
      };
      business_member: {
        Row: {
          id: string;
          business_id: string;
          user_id: string | null;
          role: string;
          status: string;
          invited_email: string | null;
          invited_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id?: string | null;
          role: string;
          status?: string;
          invited_email?: string | null;
          invited_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          user_id?: string | null;
          role?: string;
          status?: string;
          invited_email?: string | null;
          invited_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      waiver_template: {
        Row: {
          id: string;
          business_id: string;
          title: string;
          legal_text: string;
          fields: Json;
          signer_name_label: string | null;
          public_slug: string;
          is_active: boolean;
          status: string;
          expiration_mode: string;
          expiration_days: number | null;
          expires_at: string | null;
          deleted_at: string | null;
          signature_hours_enabled: boolean;
          signature_timezone: string;
          signature_hours_start: string | null;
          signature_hours_end: string | null;
          signature_hours_days: number[];
          starter_pack_id: string | null;
          version: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          title: string;
          legal_text: string;
          fields?: Json;
          signer_name_label?: string | null;
          public_slug: string;
          is_active?: boolean;
          status?: string;
          expiration_mode?: string;
          expiration_days?: number | null;
          expires_at?: string | null;
          deleted_at?: string | null;
          signature_hours_enabled?: boolean;
          signature_timezone?: string;
          signature_hours_start?: string | null;
          signature_hours_end?: string | null;
          signature_hours_days?: number[];
          starter_pack_id?: string | null;
          version?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          title?: string;
          legal_text?: string;
          fields?: Json;
          signer_name_label?: string | null;
          public_slug?: string;
          is_active?: boolean;
          status?: string;
          expiration_mode?: string;
          expiration_days?: number | null;
          expires_at?: string | null;
          deleted_at?: string | null;
          signature_hours_enabled?: boolean;
          signature_timezone?: string;
          signature_hours_start?: string | null;
          signature_hours_end?: string | null;
          signature_hours_days?: number[];
          starter_pack_id?: string | null;
          version?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      submission: {
        Row: {
          id: string;
          template_id: string;
          business_id: string;
          signer_name: string;
          signer_email: string | null;
          answers: Json;
          signature_url: string | null;
          pdf_url: string | null;
          ip_address: string | null;
          signed_at: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          business_id: string;
          signer_name: string;
          signer_email?: string | null;
          answers?: Json;
          signature_url?: string | null;
          pdf_url?: string | null;
          ip_address?: string | null;
          signed_at?: string;
        };
        Update: {
          id?: string;
          template_id?: string;
          business_id?: string;
          signer_name?: string;
          signer_email?: string | null;
          answers?: Json;
          signature_url?: string | null;
          pdf_url?: string | null;
          ip_address?: string | null;
          signed_at?: string;
        };
        Relationships: [];
      };
      signing_group: {
        Row: {
          id: string;
          business_id: string;
          template_id: string;
          name: string;
          public_token: string;
          status: string;
          kind: string;
          closes_at: string | null;
          archived_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          template_id: string;
          name: string;
          public_token: string;
          status?: string;
          kind?: string;
          closes_at?: string | null;
          archived_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          template_id?: string;
          name?: string;
          public_token?: string;
          status?: string;
          kind?: string;
          closes_at?: string | null;
          archived_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      signing_group_member: {
        Row: {
          id: string;
          group_id: string;
          full_name: string;
          dob: string | null;
          parent_email: string | null;
          note: string | null;
          signed_submission_id: string | null;
          signed_at: string | null;
          reminder_sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          full_name: string;
          dob?: string | null;
          parent_email?: string | null;
          note?: string | null;
          signed_submission_id?: string | null;
          signed_at?: string | null;
          reminder_sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          full_name?: string;
          dob?: string | null;
          parent_email?: string | null;
          note?: string | null;
          signed_submission_id?: string | null;
          signed_at?: string | null;
          reminder_sent_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      signature_proof: {
        Row: {
          id: string;
          submission_id: string;
          reference: string;
          signed_at: string;
          timezone: string | null;
          timezone_offset_minutes: number | null;
          ip_address: string | null;
          user_agent: string | null;
          device_hint: string | null;
          template_id: string;
          template_version: number;
          template_version_id: string | null;
          content_snapshot: Json;
          content_sha256: string;
          hash_algorithm: string;
          evidence: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          submission_id: string;
          reference: string;
          signed_at: string;
          timezone?: string | null;
          timezone_offset_minutes?: number | null;
          ip_address?: string | null;
          user_agent?: string | null;
          device_hint?: string | null;
          template_id: string;
          template_version: number;
          template_version_id?: string | null;
          content_snapshot: Json;
          content_sha256: string;
          hash_algorithm?: string;
          evidence?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          submission_id?: string;
          reference?: string;
          signed_at?: string;
          timezone?: string | null;
          timezone_offset_minutes?: number | null;
          ip_address?: string | null;
          user_agent?: string | null;
          device_hint?: string | null;
          template_id?: string;
          template_version?: number;
          template_version_id?: string | null;
          content_snapshot?: Json;
          content_sha256?: string;
          hash_algorithm?: string;
          evidence?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      rate_limit: {
        Row: {
          bucket: string;
          identifier: string;
          window_start: string;
          hits: number;
        };
        Insert: {
          bucket: string;
          identifier: string;
          window_start: string;
          hits?: number;
        };
        Update: {
          bucket?: string;
          identifier?: string;
          window_start?: string;
          hits?: number;
        };
        Relationships: [];
      };
      waiver_template_version: {
        Row: {
          id: string;
          template_id: string;
          version: number;
          title: string;
          legal_text: string;
          fields: Json;
          signer_name_label: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          version: number;
          title: string;
          legal_text: string;
          fields?: Json;
          signer_name_label?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          template_id?: string;
          version?: number;
          title?: string;
          legal_text?: string;
          fields?: Json;
          signer_name_label?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      audit_event: {
        Row: {
          id: string;
          business_id: string;
          actor_user_id: string | null;
          actor_kind: string;
          entity_type: string;
          entity_id: string | null;
          template_id: string | null;
          submission_id: string | null;
          event_type: string;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          actor_user_id?: string | null;
          actor_kind: string;
          entity_type: string;
          entity_id?: string | null;
          template_id?: string | null;
          submission_id?: string | null;
          event_type: string;
          payload?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          actor_user_id?: string | null;
          actor_kind?: string;
          entity_type?: string;
          entity_id?: string | null;
          template_id?: string | null;
          submission_id?: string | null;
          event_type?: string;
          payload?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      submission_search: {
        Row: {
          submission_id: string;
          business_id: string;
          template_id: string;
          signer_name: string;
          signer_email: string | null;
          phone: string | null;
          proof_reference: string | null;
          content_sha256: string | null;
          template_title: string;
          business_name: string | null;
          template_version: number | null;
          status: string;
          answers_text: string | null;
          signed_at: string;
          search_vector: unknown;
        };
        Insert: {
          submission_id: string;
          business_id: string;
          template_id: string;
          signer_name: string;
          signer_email?: string | null;
          phone?: string | null;
          proof_reference?: string | null;
          content_sha256?: string | null;
          template_title: string;
          business_name?: string | null;
          template_version?: number | null;
          status?: string;
          answers_text?: string | null;
          signed_at: string;
        };
        Update: {
          submission_id?: string;
          business_id?: string;
          template_id?: string;
          signer_name?: string;
          signer_email?: string | null;
          phone?: string | null;
          proof_reference?: string | null;
          content_sha256?: string | null;
          template_title?: string;
          business_name?: string | null;
          template_version?: number | null;
          status?: string;
          answers_text?: string | null;
          signed_at?: string;
        };
        Relationships: [];
      };
      stripe_webhook_event: {
        Row: {
          id: string;
          event_type: string;
          received_at: string;
          processed_at: string | null;
        };
        Insert: {
          id: string;
          event_type: string;
          received_at?: string;
          processed_at?: string | null;
        };
        Update: {
          id?: string;
          event_type?: string;
          received_at?: string;
          processed_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      dashboard_template_stats: {
        Args: { p_business_id: string };
        Returns: {
          template_id: string;
          signature_count: number;
          last_signed_at: string | null;
        }[];
      };
      dashboard_group_stats: {
        Args: { p_business_id: string };
        Returns: {
          group_id: string;
          total: number;
          signed: number;
        }[];
      };
      dashboard_signature_days: {
        Args: { p_business_id: string; p_from: string };
        Returns: {
          day: string;
          cnt: number;
        }[];
      };
      template_proof_version_counts: {
        Args: { p_template_id: string };
        Returns: {
          template_version: number;
          signature_count: number;
        }[];
      };
      rate_limit_hit: {
        Args: {
          p_bucket: string;
          p_identifier: string;
          p_window_seconds: number;
          p_max_hits: number;
        };
        Returns: boolean;
      };
      rate_limit_peek: {
        Args: {
          p_bucket: string;
          p_identifier: string;
          p_window_seconds: number;
        };
        Returns: number;
      };
      claim_stripe_webhook_event: {
        Args: {
          p_event_id: string;
          p_event_type: string;
          p_stale_after_seconds?: number;
        };
        Returns: boolean;
      };
      complete_stripe_webhook_event: {
        Args: { p_event_id: string };
        Returns: undefined;
      };
      transfer_business_ownership: {
        Args: { p_business_id: string; p_new_owner_member_id: string };
        Returns: undefined;
      };
      search_submissions_for_owner: {
        Args: {
          p_query?: string | null;
          p_template_id?: string | null;
          p_from?: string | null;
          p_to?: string | null;
          p_status?: string | null;
          p_limit?: number;
          p_offset?: number;
          p_group_id?: string | null;
          p_group_mode?: string | null;
          p_business_id?: string | null;
        };
        Returns: {
          submission_id: string;
          business_id: string;
          template_id: string;
          signer_name: string;
          signer_email: string | null;
          phone: string | null;
          proof_reference: string | null;
          content_sha256: string | null;
          template_title: string;
          business_name: string | null;
          template_version: number | null;
          status: string;
          answers_text: string | null;
          signed_at: string;
          search_vector: unknown;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
