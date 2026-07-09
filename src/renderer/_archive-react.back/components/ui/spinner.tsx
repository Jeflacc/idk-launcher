export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <div
      className="animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]"
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  );
}
