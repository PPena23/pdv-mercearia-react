/** Marca: um broto de feijão saindo do "grão". SVG inline, sem dependências. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <rect width="48" height="48" rx="14" fill="#9BD93C" />
      <ellipse cx="24" cy="34" rx="11" ry="7.5" fill="#4A1D5C" />
      <ellipse cx="20.5" cy="32" rx="3" ry="1.6" fill="#fff" opacity=".35" />
      <path d="M24 27c0-6 0-10 2-14" stroke="#2B4307" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M26 15c4-4 9-3 11-1-3 3-7 4-11 1z" fill="#2B4307" />
      <path d="M25 19c-4-3-8-2-10 0 3 3 7 3 10 0z" fill="#4C7510" />
    </svg>
  )
}
