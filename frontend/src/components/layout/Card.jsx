export function Card({ children, className = "", padding = "p-6" }) {
  return (
    <div className={`fd-panel ${padding} ${className}`}>
      {children}
    </div>
  );
}
