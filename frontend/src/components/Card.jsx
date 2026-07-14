const styles = {
  card: {
    borderRadius: "12px",
    border: "0.5px solid #E6E2DA",
    background: "#FFFFFF",
    color: "#1A1916",
    boxShadow: "0 1px 3px rgba(26,25,22,0.06)",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    padding: "24px 24px 0",
  },
  title: {
    fontSize: "20px",
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: "-0.02em",
    margin: 0,
    fontFamily: "'Fraunces', Georgia, serif",
  },
  description: {
    fontSize: "14px",
    color: "#6B6860",
    lineHeight: 1.5,
    margin: 0,
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  content: {
    padding: "24px",
  },
  footer: {
    display: "flex",
    alignItems: "center",
    padding: "0 24px 24px",
  },
};

export function Card({ children, style, ...props }) {
  return <div style={{ ...styles.card, ...style }} {...props}>{children}</div>;
}

export function CardHeader({ children, style, ...props }) {
  return <div style={{ ...styles.header, ...style }} {...props}>{children}</div>;
}

export function CardTitle({ children, style, ...props }) {
  return <h3 style={{ ...styles.title, ...style }} {...props}>{children}</h3>;
}

export function CardDescription({ children, style, ...props }) {
  return <p style={{ ...styles.description, ...style }} {...props}>{children}</p>;
}

export function CardContent({ children, style, ...props }) {
  return <div style={{ ...styles.content, ...style }} {...props}>{children}</div>;
}

export function CardFooter({ children, style, ...props }) {
  return <div style={{ ...styles.footer, ...style }} {...props}>{children}</div>;
}
