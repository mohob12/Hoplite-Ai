import type { Category, Product } from './types';

/** Case/accent-insensitive form; Arabic hamza, taa marbuta, alif maqsura, tashkeel and tatweel folded. */
export function normalizeSearch(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Searchable text for a product in every language, including its category name. */
export function productHaystack(p: Product, cat?: Category): string {
  return normalizeSearch(
    [
      p.name_ar, p.name_fr, p.name_en,
      p.description_ar, p.description_fr, p.description_en,
      cat?.name_ar, cat?.name_fr, cat?.name_en,
    ]
      .filter(Boolean)
      .join(' '),
  );
}

/** Every word of the query must appear somewhere in the haystack. */
export function matchesQuery(haystack: string, query: string): boolean {
  const words = normalizeSearch(query).split(' ').filter(Boolean);
  return words.every((w) => haystack.includes(w));
}
