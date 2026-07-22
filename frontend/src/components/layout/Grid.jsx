export function Grid({ children, className = "", cols = "grid-cols-1 md:grid-cols-12", gap = "gap-3" }) {
  return (
    <div className={`grid ${cols} ${gap} w-full ${className}`}>
      {children}
    </div>
  );
}
