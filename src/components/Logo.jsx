/** ReWear mark: the T-shirt icon with a leaf, in the app's green and cream. Decorative next to the name. */
export default function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="14" fill="#2c4f36" />
      <path d="M22 18l-8 6 4 8 4-2v16h20V30l4 2 4-8-8-6h-6a6 6 0 0 1-12 0z" fill="#f7f1e6" />
      <path d="M32 42c-5-1-7-5-6-10 5 0 8 4 6 10z" fill="#5c7f5a" />
      <path d="M32 42c-1-3-2-5-4-7" stroke="#f7f1e6" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
