export type Locale = 'ar' | 'fr' | 'en';

export type OrderType = 'dine_in' | 'takeaway' | 'delivery';
export type OrderStatus =
  | 'new'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'completed'
  | 'cancelled'
  | 'rejected';
export type DeliveryFeeStatus = 'not_applicable' | 'pending' | 'confirmed';
export type Verification = 'pending' | 'verified';

export interface Localized {
  name_ar: string;
  name_fr: string;
  name_en: string;
}

export interface Category extends Localized {
  id: string;
  sort_order: number;
  is_active: boolean;
}

export interface Variant extends Localized {
  id: string;
  product_id: string;
  description_ar: string;
  description_fr: string;
  description_en: string;
  price: number;
  is_available: boolean;
  verification: Verification;
  sort_order: number;
}

export interface Extra extends Localized {
  id: string;
  product_id: string;
  price: number;
  is_available: boolean;
  sort_order: number;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  sort_order: number;
}

export interface Product extends Localized {
  id: string;
  category_id: string;
  description_ar: string;
  description_fr: string;
  description_en: string;
  is_available: boolean;
  is_published: boolean;
  sort_order: number;
  product_variants: Variant[];
  product_extras: Extra[];
  product_images: ProductImage[];
}

export interface RestaurantSettings {
  id: number;
  name: string;
  phone: string;
  phone_secondary: string;
  email: string;
  address_ar: string;
  address_fr: string;
  address_en: string;
  opening_hours_ar: string;
  opening_hours_fr: string;
  opening_hours_en: string;
  ordering_enabled: boolean;
  delivery_enabled: boolean;
}

export interface OrderItemExtra extends Localized {
  id?: string;
  price: number;
}

export interface OrderItem {
  id?: string;
  product_name_ar: string;
  product_name_fr: string;
  product_name_en: string;
  variant_name_ar: string;
  variant_name_fr: string;
  variant_name_en: string;
  unit_price: number;
  extras_unit_total: number;
  quantity: number;
  line_total: number;
  sort_order?: number;
  order_item_extras?: OrderItemExtra[];
  extras?: OrderItemExtra[];
}

export interface Order {
  id: string;
  order_number: number;
  reference: string;
  order_type: OrderType;
  status: OrderStatus;
  customer_name: string;
  customer_phone: string | null;
  table_number: string | null;
  delivery_address: string | null;
  notes: string | null;
  payment_method: 'cash';
  subtotal: number;
  delivery_fee: number | null;
  delivery_fee_status: DeliveryFeeStatus;
  total: number;
  admin_note: string | null;
  locale: Locale;
  created_at: string;
  updated_at: string;
  status_changed_at: string;
  order_items?: OrderItem[];
}

/** Shape returned by the get_order_public RPC (customer view). */
export interface PublicOrder {
  reference: string;
  order_type: OrderType;
  status: OrderStatus;
  customer_name: string;
  customer_phone: string | null;
  table_number: string | null;
  delivery_address: string | null;
  notes: string | null;
  payment_method: 'cash';
  subtotal: number;
  delivery_fee: number | null;
  delivery_fee_status: DeliveryFeeStatus;
  total: number;
  created_at: string;
  items: OrderItem[];
}
