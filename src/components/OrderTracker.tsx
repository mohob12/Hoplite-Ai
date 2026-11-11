import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useI18n } from '../lib/i18n';
import { STATUS_FLOW, formatTime } from '../lib/format';
import type { DeliveryFeeStatus, OrderStatus, OrderType } from '../lib/types';

const ICONS: Partial<Record<OrderStatus, string>> = {
  new: '📝',
  confirmed: '👍',
  preparing: '👨‍🍳',
  ready: '🛎️',
  out_for_delivery: '🛵',
  completed: '🎉',
};

type StepState = 'done' | 'current' | 'todo';

export default function OrderTracker({
  type,
  status,
  since,
  feeStatus,
}: {
  type: OrderType;
  status: OrderStatus;
  since?: string | null;
  feeStatus: DeliveryFeeStatus;
}) {
  const { t, locale } = useI18n();
  const steps = STATUS_FLOW[type];
  const current = steps.indexOf(status);
  const finished = status === 'completed';

  // Only a step reached while the page is open gets the "pop" animation.
  const prev = useRef(current);
  const [justReached, setJustReached] = useState<number | null>(null);
  useEffect(() => {
    if (current > prev.current) {
      setJustReached(current);
      prev.current = current;
      const id = setTimeout(() => setJustReached(null), 1500);
      return () => clearTimeout(id);
    }
    prev.current = current;
  }, [current]);

  const label = (s: OrderStatus) => t(s === 'new' ? 'track.s.new' : `status.${s}`);
  const description =
    status === 'ready'
      ? t(`track.d.ready.${type}`)
      : status === 'new' && type === 'delivery' && feeStatus === 'pending'
        ? t('track.d.new_delivery')
        : t(`track.d.${status}`);

  if (status === 'cancelled' || status === 'rejected') {
    return (
      <section className="card card-pad tracker-failed" role="status" data-testid="order-status">
        <span className="tf-x" aria-hidden="true">
          ✕
        </span>
        <div>
          <strong>{t(`status.${status}`)}</strong>
          <p>{description}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="card card-pad tracker-card">
      <h2>{t('track.title')}</h2>
      <ol className="tracker" data-testid="order-tracker" data-type={type}>
        {steps.map((s, i) => {
          const state: StepState = i < current || (finished && i === current) ? 'done' : i === current ? 'current' : 'todo';
          const link: StepState = i < current ? 'done' : i === current ? 'current' : 'todo';
          return (
            <Fragment key={s}>
              <li
                className={`tstep ${state} ${justReached === i ? 'pop' : ''}`}
                data-testid="tracker-step"
                data-status={s}
                data-state={state}
                aria-current={state === 'current' ? 'step' : undefined}
              >
                <span className="tdot" aria-hidden="true">
                  {state === 'done' ? '✓' : ICONS[s]}
                </span>
                <span className="tlabel">
                  {label(s)}
                  {i === current && since && <small className="num">{t('track.since', { time: formatTime(since, locale) })}</small>}
                </span>
              </li>
              {i < steps.length - 1 && (
                <li
                  role="presentation"
                  className={`tlink ${link}`}
                  data-testid="tracker-link"
                  data-state={link}
                  style={{ '--i': i } as CSSProperties}
                />
              )}
            </Fragment>
          );
        })}
      </ol>
      <div className={`tracker-now ${finished ? 'finished' : ''}`} role="status" aria-live="polite" data-testid="order-status">
        <strong>{label(status)}</strong>
        <span>{description}</span>
      </div>
    </section>
  );
}
