import { supabase } from './supabase';
import { ORDER_SELECT } from './ordersFeed';
import { errorKey } from './format';
import type { Order, OrderStatus } from './types';

export class OrderActionError extends Error {
  constructor(public key: string) {
    super(key);
  }
}

async function update(id: string, patch: Partial<Pick<Order, 'status' | 'delivery_fee' | 'admin_note'>>): Promise<Order> {
  const { data, error } = await supabase.from('orders').update(patch).eq('id', id).select(ORDER_SELECT).single();
  if (error) throw new OrderActionError(errorKey(error));
  return data as Order;
}

export const setOrderStatus = (id: string, status: OrderStatus) => update(id, { status });
export const setDeliveryFee = (id: string, fee: number | null) => update(id, { delivery_fee: fee });

export async function fetchOrder(id: string): Promise<Order | null> {
  const { data, error } = await supabase.from('orders').select(ORDER_SELECT).eq('id', id).maybeSingle();
  if (error) throw new OrderActionError(errorKey(error));
  if (data?.order_items) (data as Order).order_items!.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  return (data as Order) ?? null;
}
