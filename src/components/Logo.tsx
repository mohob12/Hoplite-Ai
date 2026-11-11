import { Link } from 'react-router-dom';

export default function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="logo" aria-label="Mac Kiffan">
      <img src="/brand/logo.png" alt="Mac Kiffan" width={317} height={96} />
    </Link>
  );
}

/** Shown for dishes without a photo yet. */
export function ImagePlaceholder({ className = '' }: { className?: string }) {
  return (
    <span className={`img-ph ${className}`} aria-hidden="true">
      <img className="img-ph-mark" src="/brand/mark.png" alt="" />
    </span>
  );
}
