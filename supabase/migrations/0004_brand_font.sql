-- Brand typography for public pages, PDFs, and previews.
alter table public.business
  add column if not exists brand_font text not null default 'inter';

comment on column public.business.brand_font is
  'Curated brand font id (inter, plus-jakarta-sans, manrope, …).';
