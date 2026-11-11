import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Localized } from './types';

export interface CartExtra extends Localized {
  id: string;
  price: number;
}

/** Display snapshot only — the server recomputes every price at checkout. */
export interface CartLine {
  key: string;
  productId: string;
  variantId: string;
  product: Localized;
  variant: Localized | null;
  unitPrice: number;
  extras: CartExtra[];
  quantity: number;
  image?: string;
}

interface CartValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  add: (line: Omit<CartLine, 'key'>) => void;
  setQuantity: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const CartContext = createContext<CartValue | null>(null);
const STORAGE_KEY = 'mk.cart.v1';
export const MAX_QTY = 50;

export function lineUnitTotal(l: Pick<CartLine, 'unitPrice' | 'extras'>): number {
  return l.unitPrice + l.extras.reduce((s, e) => s + e.price, 0);
}

function load(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(load);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines]);

  const add = useCallback((line: Omit<CartLine, 'key'>) => {
    // Same product + variant + extras merge into one line.
    const key = [line.variantId, ...line.extras.map((e) => e.id).sort()].join('|');
    setLines((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) =>
          l.key === key ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + line.quantity) } : l,
        );
      }
      return [...prev, { ...line, key }];
    });
  }, []);

  const setQuantity = useCallback((key: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.key !== key)
        : prev.map((l) => (l.key === key ? { ...l, quantity: Math.min(MAX_QTY, qty) } : l)),
    );
  }, []);

  const remove = useCallback((key: string) => setLines((prev) => prev.filter((l) => l.key !== key)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartValue>(() => {
    const count = lines.reduce((s, l) => s + l.quantity, 0);
    const subtotal = lines.reduce((s, l) => s + lineUnitTotal(l) * l.quantity, 0);
    return { lines, count, subtotal, add, setQuantity, remove, clear, open, setOpen };
  }, [lines, add, setQuantity, remove, clear, open]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart outside CartProvider');
  return ctx;
}
