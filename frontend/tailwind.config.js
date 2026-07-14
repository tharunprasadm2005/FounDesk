/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "var(--edge)",
        input: "var(--dark-gray)",
        ring: "var(--brand-orange)",
        background: "var(--primary)",
        foreground: "var(--white)",
        
        primary: "var(--primary)",
        "brand-orange": "var(--brand-orange)",
        white: "var(--white)",
        "light-gray": "var(--light-gray)",
        gray: "var(--gray)",
        "dark-gray": "var(--dark-gray)",
        
        success: "var(--success)",
        error: "var(--error)",
        warning: "var(--warning)",
        info: "var(--info)",
        
        edge: "var(--edge)",
        "edge-strong": "var(--edge-strong)",
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" },
      fontFamily: {
        display: ["Clash Display", "sans-serif"],
        interface: ["Satoshi", "sans-serif"],
        instrument: ["JetBrains Mono", "monospace"],
        sans: ["Satoshi", "sans-serif"],
      },
      spacing: {
        "1": "var(--space-1)",
        "2": "var(--space-2)",
        "3": "var(--space-3)",
        "4": "var(--space-4)",
        "5": "var(--space-5)",
        "6": "var(--space-6)",
        "8": "var(--space-8)",
        "10": "var(--space-10)",
        "12": "var(--space-12)",
      },
      keyframes: { "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } }, "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } } },
      animation: { "accordion-down": "accordion-down 0.2s ease-out", "accordion-up": "accordion-up 0.2s ease-out" },
    },
  },
  plugins: [require("tailwindcss-animate")],
};