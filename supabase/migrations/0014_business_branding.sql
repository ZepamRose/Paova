-- Richer business branding: tagline, accent, contact, thank-you page, button radius.
alter table public.business
  add column if not exists tagline text,
  add column if not exists brand_accent text,
  add column if not exists contact_address text,
  add column if not exists contact_phone text,
  add column if not exists contact_email text,
  add column if not exists thank_you_title text,
  add column if not exists thank_you_message text,
  add column if not exists thank_you_button_label text,
  add column if not exists thank_you_button_url text,
  add column if not exists brand_button_radius text not null default 'soft';

alter table public.business
  drop constraint if exists business_brand_button_radius_check;

alter table public.business
  add constraint business_brand_button_radius_check
  check (brand_button_radius in ('soft', 'square'));

comment on column public.business.tagline is
  'Short brand line under the business name on public pages and PDFs.';
comment on column public.business.brand_accent is
  'Secondary / accent brand color (hex). Falls back to brand_color when null.';
comment on column public.business.brand_button_radius is
  'Public CTA corner style: soft (rounded) or square.';
comment on column public.business.thank_you_title is
  'Optional custom thank-you page title.';
comment on column public.business.thank_you_message is
  'Optional custom thank-you page message. Supports {nom} for business name.';
comment on column public.business.thank_you_button_url is
  'Optional external CTA URL on the thank-you page (https).';
