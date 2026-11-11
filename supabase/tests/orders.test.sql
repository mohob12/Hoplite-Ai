begin;
select plan(24);

-- Fixtures ------------------------------------------------------------------
create temp table fx as
select
  (select v.id from public.product_variants v join public.products p on p.id = v.product_id
    where p.name_fr = 'Pizza Margherita' and v.name_fr = 'Grande') as pizza_large,      -- 900
  (select v.id from public.product_variants v join public.products p on p.id = v.product_id
    where p.name_fr = 'Burger Classique') as burger,                                      -- 400
  (select e.id from public.product_extras e join public.products p on p.id = e.product_id
    where p.name_fr = 'Burger Classique' and e.name_fr = 'Fromage') as burger_cheese,    -- 50
  (select e.id from public.product_extras e join public.products p on p.id = e.product_id
    where p.name_fr = 'Pizza Margherita' and e.name_fr = 'Champignons') as pizza_mush,   -- 80
  (select v.id from public.product_variants v join public.products p on p.id = v.product_id
    where p.name_fr = 'Salade de thon' and v.price = 350) as salad_pending;
grant select on fx to anon, authenticated;

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.local', 'authenticated', 'authenticated');
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-0000000000a1');

-- Customer (anon) -----------------------------------------------------------
set local role anon;

select results_eq(
  $$ select count(*)::int from public.product_variants where id = (select salad_pending from fx) $$,
  array[0], 'anon cannot see pending variants');

create temp table r1 as select public.place_order(jsonb_build_object(
  'order_type', 'takeaway', 'customer_name', 'Amine', 'customer_phone', '0555 12 34 56',
  'unit_price', 1, 'subtotal', 1,
  'items', jsonb_build_array(
    jsonb_build_object('variant_id', (select pizza_large from fx), 'quantity', 2, 'extra_ids', jsonb_build_array((select pizza_mush from fx)), 'unit_price', 1),
    jsonb_build_object('variant_id', (select burger from fx), 'quantity', 3, 'extra_ids', jsonb_build_array((select burger_cheese from fx)))
  ))) as res;
select ok((select res ? 'reference' and res ? 'access_token' from r1), 'place_order returns reference and token');

select is(
  (select (public.get_order_public(res->>'reference', (res->>'access_token')::uuid)->>'subtotal')::int from r1),
  (900 + 80) * 2 + (400 + 50) * 3,
  'subtotal computed from database prices, client prices ignored');
select is(
  (select public.get_order_public(res->>'reference', (res->>'access_token')::uuid)->>'payment_method' from r1),
  'cash', 'payment is cash');
select is(
  (select public.get_order_public(res->>'reference', gen_random_uuid()) from r1),
  null, 'wrong token reveals nothing');

select throws_ok(
  $$ select public.place_order(jsonb_build_object('order_type','takeaway','customer_name','Amine','customer_phone','0555123456',
     'items', jsonb_build_array(jsonb_build_object('variant_id', (select salad_pending from fx), 'quantity', 1)))) $$,
  'P0001', 'item_unavailable', 'pending variant cannot be ordered');
select throws_ok(
  $$ select public.place_order(jsonb_build_object('order_type','takeaway','customer_name','Amine','customer_phone','0555123456',
     'items', jsonb_build_array(jsonb_build_object('variant_id', (select burger from fx), 'quantity', 1,
       'extra_ids', jsonb_build_array((select pizza_mush from fx)))))) $$,
  'P0001', 'extra_unavailable', 'extra from another product is rejected');
select throws_ok(
  $$ select public.place_order(jsonb_build_object('order_type','dine_in','customer_name','Amine',
     'items', jsonb_build_array(jsonb_build_object('variant_id', (select burger from fx), 'quantity', 1)))) $$,
  'P0001', 'invalid_table', 'dine-in requires a table number');
select throws_ok(
  $$ select public.place_order(jsonb_build_object('order_type','takeaway','customer_name','Amine',
     'items', jsonb_build_array(jsonb_build_object('variant_id', (select burger from fx), 'quantity', 1)))) $$,
  'P0001', 'invalid_phone', 'takeaway requires a phone');
select throws_ok(
  $$ select public.place_order(jsonb_build_object('order_type','delivery','customer_name','Amine','customer_phone','0555123456',
     'items', jsonb_build_array(jsonb_build_object('variant_id', (select burger from fx), 'quantity', 1)))) $$,
  'P0001', 'invalid_address', 'delivery requires an address');
select throws_ok(
  $$ select public.place_order(jsonb_build_object('order_type','takeaway','customer_name','Amine','customer_phone','0555123456',
     'items', jsonb_build_array(jsonb_build_object('variant_id', (select burger from fx), 'quantity', 0)))) $$,
  'P0001', 'invalid_quantity', 'quantity must be positive');

create temp table r2 as select public.place_order(jsonb_build_object(
  'order_type', 'delivery', 'customer_name', 'Nadia', 'customer_phone', '0661 00 11 22',
  'delivery_address', 'Cité 120 logements, Bt 4, Bab Ezzouar',
  'items', jsonb_build_array(jsonb_build_object('variant_id', (select burger from fx), 'quantity', 2)))) as res;
select is(
  (select public.get_order_public(res->>'reference', (res->>'access_token')::uuid)->>'delivery_fee_status' from r2),
  'pending', 'delivery fee starts pending');
select is(
  (select (public.get_order_public(res->>'reference', (res->>'access_token')::uuid)->>'total')::int from r2),
  800, 'total excludes the unconfirmed delivery fee');

select throws_ok($$ select * from public.orders $$, '42501', null, 'anon cannot read orders table');
select throws_ok($$ insert into public.orders (order_type, customer_name, subtotal, delivery_fee_status, table_number)
  values ('dine_in','X',0,'not_applicable','1') $$, '42501', null, 'anon cannot insert orders directly');

grant select on r1, r2 to authenticated;

-- Admin ---------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select is((select count(*)::int from public.orders where reference in ((select res->>'reference' from r1), (select res->>'reference' from r2))), 2, 'admin sees orders');

select throws_ok(
  $$ update public.orders set status = 'confirmed' where reference = (select res->>'reference' from r2) $$,
  'P0001', 'delivery_fee_required', 'delivery order cannot be confirmed before fee is set');

update public.orders set delivery_fee = 250 where reference = (select res->>'reference' from r2);
select results_eq(
  $$ select delivery_fee_status::text, total from public.orders where reference = (select res->>'reference' from r2) $$,
  $$ values ('confirmed'::text, 1050) $$, 'setting fee confirms it and recalculates total');

update public.orders set status = 'confirmed' where reference = (select res->>'reference' from r2);
update public.orders set status = 'preparing' where reference = (select res->>'reference' from r2);
update public.orders set status = 'ready' where reference = (select res->>'reference' from r2);
select throws_ok(
  $$ update public.orders set status = 'completed' where reference = (select res->>'reference' from r2) $$,
  'P0001', 'invalid_status_transition', 'delivery must go out for delivery before completion');
update public.orders set status = 'out_for_delivery' where reference = (select res->>'reference' from r2);
update public.orders set status = 'completed' where reference = (select res->>'reference' from r2);
select is((select status::text from public.orders where reference = (select res->>'reference' from r2)),
  'completed', 'delivery workflow completes');

select throws_ok(
  $$ update public.orders set status = 'ready' where reference = (select res->>'reference' from r1) $$,
  'P0001', 'invalid_status_transition', 'cannot skip workflow steps');

update public.orders set subtotal = 1, customer_name = 'Hacked' where reference = (select res->>'reference' from r1);
select results_eq(
  $$ select subtotal, customer_name from public.orders where reference = (select res->>'reference' from r1) $$,
  $$ values (3310, 'Amine'::text) $$, 'order snapshot fields are immutable');

update public.orders set status = 'rejected' where reference = (select res->>'reference' from r1);
select is((select status::text from public.orders where reference = (select res->>'reference' from r1)),
  'rejected', 'new order can be rejected');

select is((select count(*)::int from public.order_items i join public.orders o on o.id = i.order_id where o.reference in ((select res->>'reference' from r1), (select res->>'reference' from r2))), 3, 'admin reads order item snapshots');

select * from finish();
rollback;
