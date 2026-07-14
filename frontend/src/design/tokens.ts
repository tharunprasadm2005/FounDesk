export const COLORS = {
  primary: "#000000",
  brandOrange: "#E85002",
  white: "#F9F9F9",
  lightGray: "#A7A7A7",
  gray: "#646464",
  darkGray: "#333333",

  // Status
  success: "#3E8E5A",
  error: "#C10801",
  warning: "#F16001",
  info: "#A7A7A7",
};

export const FONTS = {
  display: "'Clash Display', sans-serif",
  interface: "'Satoshi', sans-serif",
  instrument: "'JetBrains Mono', monospace",
};

export const SPACING = {
  space1: "4px",
  space2: "8px",
  space3: "12px",
  space4: "16px",
  space5: "24px",
  space6: "32px",
  space8: "48px",
  space10: "64px",
  space12: "96px",
};

export const TIERS = {
  panel: {
    background: "var(--dark-gray)",
    border: "1px solid var(--edge)",
    borderRadius: "12px",
  },
  neuControl: {
    background: "var(--dark-gray)",
    borderRadius: "14px",
    boxShadow: "6px 6px 14px rgba(0,0,0,0.8), -6px -6px 14px rgba(100,100,100,0.12)",
  },
  glassPanel: {
    background: "rgba(51, 51, 51, 0.5)",
    backdropFilter: "blur(20px) saturate(140%)",
    border: "1px solid var(--edge)",
    borderRadius: "16px",
  },
};

// Exact Ember Gradient percentages: 0% / 38% / 72% / 100%
export const GRADIENT_EMBER = {
  stops: [
    { offset: "0%", color: "#000000" },
    { offset: "38%", color: "#C10801" },
    { offset: "72%", color: "#F16001" },
    { offset: "100%", color: "#D9C3AB" },
  ],
  cssString: "linear-gradient(135deg, #000000 0%, #C10801 38%, #F16001 72%, #D9C3AB 100%)",
};
