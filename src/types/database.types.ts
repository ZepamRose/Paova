/**
 * Database types.
 *
 * This mirrors `supabase/migrations/0001_init.sql`. Once the schema is applied,
 * you can regenerate this file from the live database with:
 *
 *   supabase gen types typescript --project-id <id> > src/types/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
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
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      business: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          logo_url: string | null;
          brand_color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          logo_url?: string | null;
          brand_color?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["business"]["Insert"]>;
        Relationships: [];
      };
      waiver_template: {
        Row: {
          id: string;
          business_id: string;
          title: string;
          legal_text: string;
          fields: Json;
          public_slug: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          title: string;
          legal_text: string;
          fields?: Json;
          public_slug: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["waiver_template"]["Insert"]>;
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
        Update: Partial<Database["public"]["Tables"]["submission"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
