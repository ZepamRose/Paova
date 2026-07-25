-- Force light or dark appearance on public signing / thank-you pages.
alter table public.business
  add column if not exists public_theme text not null default 'light';

alter table public.business
  drop constraint if exists business_public_theme_check;

alter table public.business
  add constraint business_public_theme_check
  check (public_theme in ('light', 'dark'));

comment on column public.business.public_theme is
  'Theme forced on public waiver pages: light or dark (independent of the owner dashboard theme).';
