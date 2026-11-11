begin;
select plan(10);

-- Checks on the imported Mac Kiffan menu (migration 20261111000003).
select is((select count(*)::int from public.categories), 12, '12 categories');
select is((select count(*)::int from public.products), 87, '87 products');

select results_eq(
  $$ select v.name_fr, v.price, v.verification::text from public.product_variants v
       join public.products p on p.id = v.product_id where p.name_fr = 'Tacos Poulet' order by v.sort_order $$,
  $$ values ('M'::text, 500, 'verified'::text), ('L', 700, 'verified'), ('XL', 900, 'verified') $$,
  'tacos sizes M/L/XL are named and verified');

select results_eq(
  $$ select v.name_fr, v.price, v.verification::text from public.product_variants v
       join public.products p on p.id = v.product_id where p.name_fr = 'Pizza Marguerite' order by v.sort_order $$,
  $$ values ('Petite'::text, 450, 'verified'::text), ('Méga', 1300, 'verified') $$,
  'pizza with fixed prices: Petite / Méga verified');

select is(
  (select count(*)::int from public.product_variants v join public.products p on p.id = v.product_id
    where p.name_fr = 'Pizza Chicken' and v.verification = 'pending'),
  2, 'pizza with a price range stays entirely pending');

select results_eq(
  $$ select v.price, v.verification::text, v.name_fr from public.product_variants v
       join public.products p on p.id = v.product_id where p.name_fr = 'Salade de thon' order by v.sort_order $$,
  $$ values (350, 'pending'::text, ''::text), (400, 'pending', '') $$,
  'unexplained "350 DA / 400 DA" is pending and unnamed');

select results_eq(
  $$ select v.name_fr, v.price from public.product_variants v
       join public.products p on p.id = v.product_id where p.name_fr = 'Sandwich Chawarma' order by v.sort_order $$,
  $$ values ('Pain libanais'::text, 300), ('Pain tunisien', 300), ('Pain normal', 300) $$,
  'chawarma sandwich offers the three breads at the same price');

select is(
  (select count(*)::int from public.products p
    where not exists (select 1 from public.product_variants v where v.product_id = p.id)),
  0, 'every product has at least one price');

select is(
  (select count(distinct p.id)::int from public.products p
    where exists (select 1 from public.product_variants v where v.product_id = p.id and v.verification = 'pending')),
  20, '20 products await price confirmation');

select is(
  (select count(*)::int from public.products p
    where not exists (select 1 from public.product_images i where i.product_id = p.id)),
  0, 'every product has a photo');

select * from finish();
rollback;
