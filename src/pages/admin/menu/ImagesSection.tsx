import { useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useI18n } from '../../../lib/i18n';
import type { Product } from '../../../lib/types';
import { amError, bySort, safeFileName } from './shared';

const BUCKET = 'product-images';
const MAX_BYTES = 5 * 1024 * 1024;

export default function ImagesSection({ product, reload }: { product: Product; reload: () => Promise<void> }) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [url, setUrl] = useState('');
  const images = [...product.product_images].sort(bySort);
  const nextSort = images.reduce((m, i) => Math.max(m, i.sort_order), -1) + 1;

  async function run(fn: () => Promise<string | null>) {
    setBusy(true);
    setError('');
    const msg = await fn();
    if (msg) setError(msg);
    else await reload();
    setBusy(false);
  }

  const insertImage = async (imgUrl: string, sort: number) => {
    const { error: err } = await supabase
      .from('product_images')
      .insert({ product_id: product.id, url: imgUrl, sort_order: sort });
    return err ? amError(err, t) : null;
  };

  function upload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError(t('am.img.notImage'));
    if (file.size > MAX_BYTES) return setError(t('am.img.tooBig'));
    void run(async () => {
      const path = `${product.id}/${Date.now()}-${safeFileName(file.name)}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
      if (upErr) return amError(upErr, t);
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      return insertImage(data.publicUrl, nextSort);
    });
    if (fileRef.current) fileRef.current.value = '';
  }

  function addUrl() {
    const value = url.trim();
    if (!/^(https?:\/\/|\/)\S+$/i.test(value)) return setError(t('am.img.badUrl'));
    void run(async () => {
      const msg = await insertImage(value, nextSort);
      if (!msg) setUrl('');
      return msg;
    });
  }

  function makeMain(id: string) {
    void run(async () => {
      const ordered = [images.find((i) => i.id === id)!, ...images.filter((i) => i.id !== id)];
      const results = await Promise.all(
        ordered.map((img, idx) =>
          img.sort_order === idx
            ? Promise.resolve({ error: null })
            : supabase.from('product_images').update({ sort_order: idx }).eq('id', img.id),
        ),
      );
      const failed = results.find((r) => r.error);
      return failed?.error ? amError(failed.error, t) : null;
    });
  }

  function remove(id: string) {
    if (!window.confirm(t('am.img.confirmDelete'))) return;
    const img = images.find((i) => i.id === id);
    void run(async () => {
      const { error: err } = await supabase.from('product_images').delete().eq('id', id);
      if (err) return amError(err, t);
      // Best-effort cleanup of the stored file; the row is already gone.
      const marker = `/${BUCKET}/`;
      const idx = img?.url.indexOf(marker) ?? -1;
      if (img && idx >= 0) await supabase.storage.from(BUCKET).remove([decodeURIComponent(img.url.slice(idx + marker.length))]);
      return null;
    });
  }

  return (
    <section className="am-section">
      <h3>{t('am.img.title')}</h3>
      {images.length === 0 && <p className="muted">{t('am.img.none')}</p>}
      <div className="am-images">
        {images.map((img, idx) => (
          <div className={`am-image ${idx === 0 ? 'main' : ''}`} key={img.id}>
            <img src={img.url} alt="" loading="lazy" />
            <div className="am-image-actions">
              {idx === 0 ? (
                <span className="badge badge-solid-red" style={{ justifyContent: 'center' }}>
                  {t('am.img.main')}
                </span>
              ) : (
                <button className="btn btn-sm" disabled={busy} onClick={() => makeMain(img.id)}>
                  {t('am.img.makeMain')}
                </button>
              )}
              <button className="btn btn-sm btn-outline-red" disabled={busy} onClick={() => remove(img.id)}>
                {t('am.delete')}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="row wrap">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => upload(e.target.files)}
          aria-label={t('am.img.upload')}
        />
        <button className="btn btn-sm btn-dark" disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? t('common.loading') : t('am.img.upload')}
        </button>
        <span className="am-note">{t('am.img.uploadHint')}</span>
      </div>
      <div className="am-url-row">
        <input
          className="input"
          dir="ltr"
          style={{ textAlign: 'start' }}
          placeholder="https://…"
          aria-label={t('am.img.url')}
          value={url}
          onChange={(e) => {
            setError('');
            setUrl(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addUrl();
            }
          }}
        />
        <button className="btn btn-sm" disabled={busy || !url.trim()} onClick={addUrl}>
          {t('am.img.addUrl')}
        </button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
    </section>
  );
}
