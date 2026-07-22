export function Section({ children, className = "", spacing = "", padding = "" }) {
  return (
    <section className={`fd-section ${padding} ${spacing} ${className}`}>
      {children}
    </section>
  );
}
