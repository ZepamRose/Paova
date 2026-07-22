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
          logo_url: string | null;
          brand_color: string;
          brand_font: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          logo_url?: string | null;
          brand_color?: string;
          brand_font?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          logo_url?: string | null;
          brand_color?: string;
          brand_font?: string;
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      search_submissions_for_owner: {
        Args: {
          p_query?: string | null;
          p_template_id?: string | null;
          p_from?: string | null;
          p_to?: string | null;
          p_status?: string | null;
          p_limit?: number;
          p_offset?: number;
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
