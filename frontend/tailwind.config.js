/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Base neutrals
        "washi-white": "#F7F4EF",
        "linen-100": "#EFEAE2",
        "stone-200": "#E3DDD2",
        "stone-400": "#B7AE9E",
        "sumi-900": "#2B2A27",
        
        // Accents
        "indigo-ink": "#3C4A5E",
        "moss-600": "#6B7A5E",
        "clay-500": "#B5654A",
        "sand-400": "#C9A876",
        
        // Semantic overrides
        background: "#F7F4EF",
        foreground: "#2B2A27",
        primary: "#3C4A5E",
        border: "#E3DDD2",
        input: "#EFEAE2",
        ring: "#3C4A5E",
      },
      borderRadius: {
        lg: "4px",
        md: "4px",
        sm: "2px"
      },
      fontFamily: {
        heading: ["Fraunces", "serif"],
        sans: ["Inter", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      spacing: {
        "1": "8px",
        "2": "16px",
        "3": "24px",
        "4": "32px",
        "5": "48px",
        "6": "64px",
        "8": "96px",
      },
      transitionTimingFunction: {
        "ease-out-soft": "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
      transitionDuration: {
        "200": "200ms",
        "280": "280ms",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};