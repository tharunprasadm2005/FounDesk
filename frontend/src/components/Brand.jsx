export default function Brand({ light = false, compact = false }) {
  return (
    <div
      className="fd-body"
      style={{
        display: "flex",
        alignItems: "center",
        gap: compact ? 10 : 12,
        userSelect: "none",
      }}
    >
      <div
        className={light ? "fd-glass-ink" : "fd-chip"}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: compact ? 34 : 42,
          height: compact ? 34 : 42,
          borderRadius: "14px",
          fontFamily: '"Cormorant Garamond", serif',
          fontSize: compact ? 17 : 21,
          fontStyle: "italic",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: light ? "#F8F5F2" : "#2D2D2D",
        }}
      >
        f
      </div>
      {!compact && (
        <span
          style={{
            fontFamily: '"Cormorant Garamond", serif',
            fontSize: 21,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: light ? "#F8F5F2" : "#2D2D2D",
            whiteSpace: "nowrap",
            marginTop: 2,
          }}
        >
          FounDesk
        </span>
      )}
    </div>
  );
}