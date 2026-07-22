export function Split({ children, className = "", ratio = "lg:grid-cols-[7fr_5fr]", gap = "gap-5" }) {
  return (
    <div className={`grid grid-cols-1 ${ratio} ${gap} w-full ${className}`}>
      {children}
    </div>
  );
}
