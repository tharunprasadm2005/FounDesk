export function AppContainer({ children, className = "" }) {
  return (
    <div className={`min-h-screen w-full bg-[var(--surface-page)] text-[var(--text-primary)] ${className}`}>
      {children}
    </div>
  );
}
