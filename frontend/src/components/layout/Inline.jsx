export function Inline({ children, className = "", gap = "gap-4", items = "items-center", justify = "justify-start" }) {
  return (
    <div className={`flex flex-row ${gap} ${items} ${justify} ${className}`}>
      {children}
    </div>
  );
}
