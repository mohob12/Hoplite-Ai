-- Expose when the order last changed status so the customer tracker can show "since HH:MM".
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
    'status_changed_at', o.status_changed_at,
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
