-- Structured daily hours (drive the "open now / closed" badge) and social media links.
alter table public.restaurant_settings
  add column opens_at time,
  add column closes_at time,
  add column facebook_url text not null default '',
  add column instagram_url text not null default '',
  add column tiktok_url text not null default '',
  -- Only https links: these are rendered as <a href> on the public site.
  add constraint restaurant_settings_social_https check (
    (facebook_url = '' or facebook_url ~* '^https://[^\s<>"]+$') and
    (instagram_url = '' or instagram_url ~* '^https://[^\s<>"]+$') and
    (tiktok_url = '' or tiktok_url ~* '^https://[^\s<>"]+$')
  );

comment on column public.restaurant_settings.opens_at is 'Daily opening time (Africa/Algiers).';
comment on column public.restaurant_settings.closes_at is 'Daily closing time (Africa/Algiers); earlier than opens_at means after midnight, 00:00 = midnight.';

-- The owner confirmed closing at midnight; opening time is editable in Settings.
update public.restaurant_settings set opens_at = '11:00', closes_at = '00:00' where id = 1 and opens_at is null;
