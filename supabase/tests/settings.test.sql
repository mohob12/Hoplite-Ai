begin;
select plan(6);

-- Social links and daily hours on restaurant_settings (migration 20261111000005).
select is((select closes_at from public.restaurant_settings where id = 1), '00:00'::time, 'closes at midnight by default');

select lives_ok(
  $$ update public.restaurant_settings set facebook_url = 'https://www.facebook.com/mackiffan',
       instagram_url = 'https://instagram.com/mackiffan', tiktok_url = '' where id = 1 $$,
  'https links and empty values are accepted');

select throws_ok(
  $$ update public.restaurant_settings set facebook_url = 'javascript:alert(1)' where id = 1 $$,
  '23514', null, 'non-https link is rejected');

select throws_ok(
  $$ update public.restaurant_settings set tiktok_url = 'http://tiktok.com/@x' where id = 1 $$,
  '23514', null, 'plain http link is rejected');

-- Anonymous visitors can read but not change settings.
set local role anon;
select is((select instagram_url from public.restaurant_settings where id = 1), 'https://instagram.com/mackiffan', 'anon can read social links');
update public.restaurant_settings set instagram_url = 'https://evil.example' where id = 1;
reset role;
select is((select instagram_url from public.restaurant_settings where id = 1), 'https://instagram.com/mackiffan', 'anon update is ignored');

select * from finish();
rollback;
