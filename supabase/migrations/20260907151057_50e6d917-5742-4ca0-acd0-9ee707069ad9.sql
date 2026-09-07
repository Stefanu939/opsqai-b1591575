alter table public.installer_releases
  add column if not exists channel text not null default 'stable',
  add column if not exists notes text,
  add column if not exists min_version text,
  add column if not exists package_storage_path text,
  add column if not exists is_published boolean not null default false;

create index if not exists installer_releases_channel_published_idx
  on public.installer_releases (channel, is_published, published_at desc);

update public.installer_releases set is_published = true where is_active = true;