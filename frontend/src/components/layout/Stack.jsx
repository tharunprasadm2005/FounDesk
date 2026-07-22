export function Stack({ children, className = "", gap = "gap-6", items = "items-stretch", justify = "justify-start" }) {
  return (
    <div className={`flex flex-col ${gap} ${items} ${justify} ${className}`}>
      {children}
    </div>
  );
}
