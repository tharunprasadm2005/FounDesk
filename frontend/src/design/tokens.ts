export const colors = {
  washiWhite: "#F7F4EF",
  linen100: "#EFEAE2",
  stone100: "#EBE5DC",
  stone200: "#E3DDD2",
  stone300: "#CEC6B8",
  stone400: "#B7AE9E",
  stone600: "#706A60",
  sumi900: "#2B2A27",
  indigoInk: "#3C4A5E",
  moss600: "#6B7A5E",
  clay500: "#B5654A",
  sand400: "#C9A876",
};

export const semanticColors = {
  page: colors.washiWhite,
  panel: colors.linen100,
  raised: "#FBF8F2",
  text: colors.sumi900,
  muted: colors.stone600,
  subtle: colors.stone400,
  border: colors.stone200,
  borderStrong: colors.stone300,
  primary: colors.indigoInk,
  success: colors.moss600,
  warning: colors.sand400,
  danger: colors.clay500,
};

export const fonts = {
  heading: '"Fraunces", Georgia, serif',
  ui: '"Inter", "IBM Plex Sans", system-ui, sans-serif',
  mono: '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace',
};

export const typeScale = {
  display: "40px",
  h1: "32px",
  h2: "24px",
  h3: "19px",
  body: "16px",
  small: "14px",
  caption: "12px",
};

export const spacing = {
  1: "8px",
  2: "16px",
  3: "24px",
  4: "32px",
  5: "48px",
  6: "64px",
  7: "96px",
};

export const radii = {
  sm: "2px",
  md: "4px",
  lg: "4px",
};

export const motion = {
  durationFast: "200ms",
  durationNormal: "240ms",
  durationSlow: "280ms",
  easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
};

export const status = {
  success: semanticColors.success,
  warning: semanticColors.warning,
  danger: semanticColors.danger,
  info: semanticColors.primary,
  neutral: semanticColors.subtle,
};

export const COLORS = colors;
export const FONTS = fonts;
export const SPACING = spacing;
