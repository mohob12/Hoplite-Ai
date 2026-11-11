import { Link } from 'react-router-dom';

export function LogoMark({ className = 'logo-mark' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill="#F2B705" />
      <path
        d="M17 46V22l9 14 6-10 6 10 9-14v24"
        fill="none"
        stroke="#fff"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="logo" aria-label="Mac Kiffan">
      <LogoMark />
      <span className="logo-word">
        <small>Mac</small>kiffan
      </span>
    </Link>
  );
}
