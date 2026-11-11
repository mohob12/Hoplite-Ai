-- Mac Kiffan: core schema, RLS, order RPCs and realtime.
-- All money values are integer Algerian Dinars (DA).

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.order_type as enum ('dine_in', 'takeaway', 'delivery');
create type public.order_status as enum (
  'new', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled', 'rejected'
);
create type public.delivery_fee_status as enum ('not_applicable', 'pending', 'confirmed');
create type public.verification_status as enum ('pending', 'verified');

-- ---------------------------------------------------------------------------
-- Admins
-- ---------------------------------------------------------------------------
create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Restaurant settings (single row)
-- ---------------------------------------------------------------------------
create table public.restaurant_settings (
  id smallint primary key default 1 check (id = 1),
  name text not null default 'Mac Kiffan',
  phone text not null default '',
  phone_secondary text not null default '',
  email text not null default '',
  address_ar text not null default '',
  address_fr text not null default '',
  address_en text not null default '',
  opening_hours_ar text not null default '',
  opening_hours_fr text not null default '',
  opening_hours_en text not null default '',
  ordering_enabled boolean not null default true,
  delivery_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.restaurant_settings (id) values (1);
create trigger restaurant_settings_touch before update on public.restaurant_settings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Menu
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_fr text not null,
  name_en text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  name_ar text not null,
  name_fr text not null,
  name_en text not null,
  description_ar text not null default '',
  description_fr text not null default '',
  description_en text not null default '',
  is_available boolean not null default true,
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_idx on public.products (category_id);
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id);

-- A product with one price has a single variant. Products whose source menu
-- lists "350/400" get one variant per price, kept 'pending' until an admin
-- confirms what each price means; pending variants are never sold.
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name_ar text not null default '',
  name_fr text not null default '',
  name_en text not null default '',
  description_ar text not null default '',
  description_fr text not null default '',
  description_en text not null default '',
  price integer not null check (price >= 0),
  is_available boolean not null default true,
  verification public.verification_status not null default 'pending',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint verified_variant_named check (
    verification = 'pending'
    or (btrim(name_ar) <> '' and btrim(name_fr) <> '' and btrim(name_en) <> '')
  )
);
create index product_variants_product_idx on public.product_variants (product_id);
create trigger product_variants_touch before update on public.product_variants
  for each row execute function public.touch_updated_at();

create table public.product_extras (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name_ar text not null,
  name_fr text not null,
  name_en text not null,
  price integer not null default 0 check (price >= 0),
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index product_extras_product_idx on public.product_extras (product_id);

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create sequence public.order_number_seq start with 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint not null unique default nextval('public.order_number_seq'),
  reference text generated always as ('MK-' || order_number::text) stored unique,
  access_token uuid not null default gen_random_uuid(),
  order_type public.order_type not null,
  status public.order_status not null default 'new',
  customer_name text not null check (char_length(btrim(customer_name)) between 2 and 80),
  customer_phone text,
  table_number text,
  delivery_address text,
  notes text check (notes is null or char_length(notes) <= 500),
  payment_method text not null default 'cash' check (payment_method = 'cash'),
  subtotal integer not null check (subtotal >= 0),
  delivery_fee integer check (delivery_fee is null or delivery_fee >= 0),
  delivery_fee_status public.delivery_fee_status not null,
  total integer generated always as (subtotal + coalesce(delivery_fee, 0)) stored,
  admin_note text,
  locale text not null default 'ar' check (locale in ('ar', 'fr', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status_changed_at timestamptz not null default now(),
  constraint dine_in_fields check (order_type <> 'dine_in' or nullif(btrim(table_number), '') is not null),
  constraint phone_required check (order_type = 'dine_in' or nullif(btrim(customer_phone), '') is not null),
  constraint address_required check (order_type <> 'delivery' or nullif(btrim(delivery_address), '') is not null),
  constraint fee_status_matches_type check (
    (order_type = 'delivery') = (delivery_fee_status <> 'not_applicable')
  ),
  constraint fee_confirmed_has_value check (
    (delivery_fee_status = 'confirmed') = (delivery_fee is not null)
  )
);
create index orders_created_idx on public.orders (created_at desc);
create index orders_status_idx on public.orders (status);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  product_name_ar text not null,
  product_name_fr text not null,
  product_name_en text not null,
  variant_name_ar text not null default '',
  variant_name_fr text not null default '',
  variant_name_en text not null default '',
  unit_price integer not null check (unit_price >= 0),
  extras_unit_total integer not null default 0 check (extras_unit_total >= 0),
  quantity integer not null check (quantity between 1 and 50),
  line_total integer not null check (line_total >= 0),
  sort_order integer not null default 0
);
create index order_items_order_idx on public.order_items (order_id);

create table public.order_item_extras (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items (id) on delete cascade,
  extra_id uuid references public.product_extras (id) on delete set null,
  name_ar text not null,
  name_fr text not null,
  name_en text not null,
  price integer not null check (price >= 0)
);
create index order_item_extras_item_idx on public.order_item_extras (order_item_id);

-- ---------------------------------------------------------------------------
-- Reviews & employment applications
-- ---------------------------------------------------------------------------
create table public.customer_reviews (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (char_length(btrim(customer_name)) between 2 and 80),
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 1000),
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.employment_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(btrim(full_name)) between 2 and 100),
  phone text not null check (char_length(btrim(phone)) between 6 and 20),
  email text check (email is null or char_length(email) <= 200),
  position text not null check (char_length(btrim(position)) between 2 and 100),
  message text not null default '' check (char_length(message) <= 2000),
  status text not null default 'new' check (status in ('new', 'reviewed', 'archived')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Order creation: prices are always read from the database, never the client.
-- Payload: { order_type, customer_name, customer_phone?, table_number?,
--            delivery_address?, notes?, locale?, items: [{ variant_id, quantity, extra_ids? }] }
-- ---------------------------------------------------------------------------
create or replace function public.place_order(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.restaurant_settings;
  v_type public.order_type;
  v_name text := btrim(coalesce(payload->>'customer_name', ''));
  v_phone text := nullif(regexp_replace(coalesce(payload->>'customer_phone', ''), '[^0-9+]', '', 'g'), '');
  v_table text := nullif(btrim(coalesce(payload->>'table_number', '')), '');
  v_address text := nullif(btrim(coalesce(payload->>'delivery_address', '')), '');
  v_notes text := nullif(btrim(coalesce(payload->>'notes', '')), '');
  v_locale text := coalesce(nullif(payload->>'locale', ''), 'ar');
  v_items jsonb := payload->'items';
  v_item jsonb;
  v_qty integer;
  v_variant record;
  v_extra record;
  v_extra_ids uuid[];
  v_extras_total integer;
  v_subtotal integer := 0;
  v_order public.orders;
  v_item_id uuid;
  v_idx integer := 0;
begin
  select * into v_settings from public.restaurant_settings where id = 1;
  if not v_settings.ordering_enabled then
    raise exception 'ordering_disabled' using errcode = 'P0001';
  end if;

  begin
    v_type := (payload->>'order_type')::public.order_type;
  exception when others then
    raise exception 'invalid_order_type' using errcode = 'P0001';
  end;
  if v_type is null then
    raise exception 'invalid_order_type' using errcode = 'P0001';
  end if;
  if v_type = 'delivery' and not v_settings.delivery_enabled then
    raise exception 'delivery_disabled' using errcode = 'P0001';
  end if;

  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'invalid_name' using errcode = 'P0001';
  end if;
  if v_type <> 'dine_in' and (v_phone is null or char_length(regexp_replace(v_phone, '\D', '', 'g')) not between 9 and 15) then
    raise exception 'invalid_phone' using errcode = 'P0001';
  end if;
  if v_type = 'dine_in' and (v_table is null or char_length(v_table) > 10) then
    raise exception 'invalid_table' using errcode = 'P0001';
  end if;
  if v_type = 'delivery' and (v_address is null or char_length(v_address) < 8 or char_length(v_address) > 300) then
    raise exception 'invalid_address' using errcode = 'P0001';
  end if;
  if v_notes is not null and char_length(v_notes) > 500 then
    raise exception 'invalid_notes' using errcode = 'P0001';
  end if;
  if v_locale not in ('ar', 'fr', 'en') then
    v_locale := 'ar';
  end if;
  if jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) = 0 or jsonb_array_length(v_items) > 40 then
    raise exception 'invalid_items' using errcode = 'P0001';
  end if;

  insert into public.orders (
    order_type, customer_name, customer_phone, table_number, delivery_address, notes,
    subtotal, delivery_fee, delivery_fee_status, locale
  ) values (
    v_type, v_name,
    v_phone,
    case when v_type = 'dine_in' then v_table end,
    case when v_type = 'delivery' then v_address end,
    v_notes, 0, null,
    case when v_type = 'delivery' then 'pending'::public.delivery_fee_status else 'not_applicable' end,
    v_locale
  ) returning * into v_order;

  for v_item in select * from jsonb_array_elements(v_items) loop
    v_idx := v_idx + 1;
    begin
      v_qty := (v_item->>'quantity')::integer;
    exception when others then
      raise exception 'invalid_quantity' using errcode = 'P0001';
    end;
    if v_qty is null or v_qty < 1 or v_qty > 50 then
      raise exception 'invalid_quantity' using errcode = 'P0001';
    end if;

    select v.id, v.price, v.name_ar as v_ar, v.name_fr as v_fr, v.name_en as v_en,
           p.id as product_id, p.name_ar, p.name_fr, p.name_en,
           (select count(*) from public.product_variants v2
             where v2.product_id = p.id and v2.verification = 'verified') as verified_count
      into v_variant
      from public.product_variants v
      join public.products p on p.id = v.product_id
      join public.categories c on c.id = p.category_id
     where v.id = (v_item->>'variant_id')::uuid
       and v.verification = 'verified' and v.is_available
       and p.is_published and p.is_available and c.is_active;
    if not found then
      raise exception 'item_unavailable' using errcode = 'P0001';
    end if;

    v_extras_total := 0;
    v_extra_ids := array(
      select distinct (x #>> '{}')::uuid
        from jsonb_array_elements(coalesce(v_item->'extra_ids', '[]'::jsonb)) x
    );

    insert into public.order_items (
      order_id, product_id, variant_id,
      product_name_ar, product_name_fr, product_name_en,
      variant_name_ar, variant_name_fr, variant_name_en,
      unit_price, quantity, line_total, sort_order
    ) values (
      v_order.id, v_variant.product_id, v_variant.id,
      v_variant.name_ar, v_variant.name_fr, v_variant.name_en,
      -- A single-variant product's variant label adds no information.
      case when v_variant.verified_count > 1 then v_variant.v_ar else '' end,
      case when v_variant.verified_count > 1 then v_variant.v_fr else '' end,
      case when v_variant.verified_count > 1 then v_variant.v_en else '' end,
      v_variant.price, v_qty, 0, v_idx
    ) returning id into v_item_id;

    if cardinality(v_extra_ids) > 0 then
      for v_extra in
        select e.* from public.product_extras e
         where e.id = any (v_extra_ids) and e.product_id = v_variant.product_id and e.is_available
      loop
        insert into public.order_item_extras (order_item_id, extra_id, name_ar, name_fr, name_en, price)
        values (v_item_id, v_extra.id, v_extra.name_ar, v_extra.name_fr, v_extra.name_en, v_extra.price);
        v_extras_total := v_extras_total + v_extra.price;
      end loop;
      if (select count(*) from public.order_item_extras where order_item_id = v_item_id) <> cardinality(v_extra_ids) then
        raise exception 'extra_unavailable' using errcode = 'P0001';
      end if;
    end if;

    update public.order_items
       set extras_unit_total = v_extras_total,
           line_total = (v_variant.price + v_extras_total) * v_qty
     where id = v_item_id;
    v_subtotal := v_subtotal + (v_variant.price + v_extras_total) * v_qty;
  end loop;

  -- Bypasses the admin transition guard: this is the only legitimate subtotal write.
  perform set_config('mackiffan.placing_order', 'on', true);
  update public.orders set subtotal = v_subtotal where id = v_order.id
    returning * into v_order;
  perform set_config('mackiffan.placing_order', 'off', true);

  return jsonb_build_object(
    'id', v_order.id,
    'reference', v_order.reference,
    'access_token', v_order.access_token
  );
end;
$$;

revoke all on function public.place_order(jsonb) from public;
grant execute on function public.place_order(jsonb) to anon, authenticated;

-- Customer-facing order lookup: requires the secret token returned at checkout.
create or replace function public.get_order_public(p_reference text, p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'reference', o.reference,
    'order_type', o.order_type,
    'status', o.status,
    'customer_name', o.customer_name,
    'customer_phone', o.customer_phone,
    'table_number', o.table_number,
    'delivery_address', o.delivery_address,
    'notes', o.notes,
    'payment_method', o.payment_method,
    'subtotal', o.subtotal,
    'delivery_fee', o.delivery_fee,
    'delivery_fee_status', o.delivery_fee_status,
    'total', o.total,
    'created_at', o.created_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_name_ar', i.product_name_ar, 'product_name_fr', i.product_name_fr, 'product_name_en', i.product_name_en,
        'variant_name_ar', i.variant_name_ar, 'variant_name_fr', i.variant_name_fr, 'variant_name_en', i.variant_name_en,
        'unit_price', i.unit_price, 'extras_unit_total', i.extras_unit_total,
        'quantity', i.quantity, 'line_total', i.line_total,
        'extras', coalesce((
          select jsonb_agg(jsonb_build_object('name_ar', e.name_ar, 'name_fr', e.name_fr, 'name_en', e.name_en, 'price', e.price))
            from public.order_item_extras e where e.order_item_id = i.id
        ), '[]'::jsonb)
      ) order by i.sort_order)
      from public.order_items i where i.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  where o.reference = p_reference and o.access_token = p_token;
$$;

revoke all on function public.get_order_public(text, uuid) from public;
grant execute on function public.get_order_public(text, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin order updates: only status, delivery fee and admin note may change,
-- and status must follow the restaurant workflow.
-- ---------------------------------------------------------------------------
create or replace function public.guard_order_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  allowed public.order_status[];
begin
  if current_setting('mackiffan.placing_order', true) = 'on' then
    return new;
  end if;

  -- Immutable snapshot fields.
  new.id := old.id;
  new.order_number := old.order_number;
  new.access_token := old.access_token;
  new.order_type := old.order_type;
  new.customer_name := old.customer_name;
  new.customer_phone := old.customer_phone;
  new.table_number := old.table_number;
  new.delivery_address := old.delivery_address;
  new.notes := old.notes;
  new.payment_method := old.payment_method;
  new.subtotal := old.subtotal;
  new.locale := old.locale;
  new.created_at := old.created_at;

  if old.order_type <> 'delivery' then
    new.delivery_fee := null;
    new.delivery_fee_status := 'not_applicable';
  elsif new.delivery_fee is distinct from old.delivery_fee then
    if old.status in ('completed', 'cancelled', 'rejected') then
      raise exception 'order_closed' using errcode = 'P0001';
    end if;
    new.delivery_fee_status := case when new.delivery_fee is null then 'pending' else 'confirmed' end;
  else
    new.delivery_fee_status := old.delivery_fee_status;
  end if;

  if new.status is distinct from old.status then
    allowed := case old.status
      when 'new' then array['confirmed', 'rejected', 'cancelled']::public.order_status[]
      when 'confirmed' then array['preparing', 'cancelled']::public.order_status[]
      when 'preparing' then array['ready', 'cancelled']::public.order_status[]
      when 'ready' then case when old.order_type = 'delivery'
        then array['out_for_delivery', 'cancelled']::public.order_status[]
        else array['completed', 'cancelled']::public.order_status[] end
      when 'out_for_delivery' then array['completed', 'cancelled']::public.order_status[]
      else array[]::public.order_status[]
    end;
    if not (new.status = any (allowed)) then
      raise exception 'invalid_status_transition' using errcode = 'P0001',
        detail = format('%s -> %s', old.status, new.status);
    end if;
    if new.status = 'confirmed' and old.order_type = 'delivery' and new.delivery_fee is null then
      raise exception 'delivery_fee_required' using errcode = 'P0001';
    end if;
    new.status_changed_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger orders_guard before update on public.orders
  for each row execute function public.guard_order_update();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.admin_users enable row level security;
alter table public.restaurant_settings enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_extras enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_item_extras enable row level security;
alter table public.customer_reviews enable row level security;
alter table public.employment_applications enable row level security;

create policy "admins read admins" on public.admin_users for select to authenticated using (public.is_admin());

create policy "public read settings" on public.restaurant_settings for select to anon, authenticated using (true);
create policy "admins update settings" on public.restaurant_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Public menu: only active / published / verified rows.
create policy "public read categories" on public.categories for select to anon, authenticated
  using (is_active or public.is_admin());
create policy "public read products" on public.products for select to anon, authenticated
  using (is_published or public.is_admin());
create policy "public read images" on public.product_images for select to anon, authenticated using (true);
create policy "public read variants" on public.product_variants for select to anon, authenticated
  using (verification = 'verified' or public.is_admin());
create policy "public read extras" on public.product_extras for select to anon, authenticated using (true);

create policy "admins write categories" on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admins write products" on public.products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admins write images" on public.product_images for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admins write variants" on public.product_variants for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admins write extras" on public.product_extras for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Orders: no direct customer access at all (creation goes through place_order,
-- reading through get_order_public with the secret token).
create policy "admins read orders" on public.orders for select to authenticated using (public.is_admin());
create policy "admins update orders" on public.orders for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admins read order items" on public.order_items for select to authenticated using (public.is_admin());
create policy "admins read order extras" on public.order_item_extras for select to authenticated using (public.is_admin());

create policy "public submit reviews" on public.customer_reviews for insert to anon, authenticated
  with check (is_approved = false);
create policy "public read approved reviews" on public.customer_reviews for select to anon, authenticated
  using (is_approved or public.is_admin());
create policy "admins moderate reviews" on public.customer_reviews for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admins delete reviews" on public.customer_reviews for delete to authenticated using (public.is_admin());

create policy "public submit applications" on public.employment_applications for insert to anon, authenticated
  with check (status = 'new');
create policy "admins read applications" on public.employment_applications for select to authenticated using (public.is_admin());
create policy "admins update applications" on public.employment_applications for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admins delete applications" on public.employment_applications for delete to authenticated using (public.is_admin());

-- Column-level hardening: the access token never leaves the database via the table API.
revoke select on public.orders from anon;
revoke insert, delete on public.orders from anon, authenticated;
revoke insert, update, delete on public.order_items, public.order_item_extras from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.orders;

-- ---------------------------------------------------------------------------
-- Storage for product photos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "public read product images" on storage.objects for select to anon, authenticated
  using (bucket_id = 'product-images');
create policy "admins upload product images" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());
create policy "admins update product images" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
create policy "admins delete product images" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
