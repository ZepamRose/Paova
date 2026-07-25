-- Business settings v2: domain, display toggles, PDF/email prefs, locales.
alter table public.business
  add column if not exists website_url text,
  add column if not exists custom_domain text,
  add column if not exists custom_domain_status text not null default 'unavailable',
  add column if not exists public_header_style text not null default 'logo_name',
  add column if not exists public_show_logo boolean not null default true,
  add column if not exists public_show_name boolean not null default true,
  add column if not exists public_show_tagline boolean not null default true,
  add column if not exists public_show_contact boolean not null default true,
  add column if not exists pdf_show_logo boolean not null default true,
  add column if not exists pdf_show_name boolean not null default true,
  add column if not exists pdf_show_contact boolean not null default true,
  add column if not exists pdf_show_website boolean not null default false,
  add column if not exists pdf_show_phone boolean not null default true,
  add column if not exists pdf_show_footer boolean not null default true,
  add column if not exists email_from_name text,
  add column if not exists email_subject_template text,
  add column if not exists email_signature text,
  add column if not exists email_footer text,
  add column if not exists email_show_logo boolean not null default true,
  add column if not exists enabled_locales text[] not null default array['fr']::text[];

alter table public.business
  drop constraint if exists business_custom_domain_status_check;
alter table public.business
  add constraint business_custom_domain_status_check
  check (custom_domain_status in ('unavailable', 'none', 'pending', 'active'));

alter table public.business
  drop constraint if exists business_public_header_style_check;
alter table public.business
  add constraint business_public_header_style_check
  check (public_header_style in ('logo', 'logo_name', 'banner'));

comment on column public.business.custom_domain is
  'Optional custom hostname for public signing pages (wired later).';
comment on column public.business.enabled_locales is
  'Locale codes enabled for future multilingual public pages.';
