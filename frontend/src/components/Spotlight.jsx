export function Spotlight({ className, style, fill = "white" }) {
  return (
    <svg
      className={className}
      style={{
        pointerEvents: "none",
        position: "absolute",
        zIndex: 1,
        height: "169%",
        width: "138%",
        opacity: 0,
        animation: "sp-fade-in 1.5s ease-in-out forwards",
        ...style,
      }}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 3787 2842"
      fill="none"
    >
      <g filter="url(#sp-filter)">
        <ellipse
          cx="1924.71"
          cy="273.501"
          rx="1924.71"
          ry="273.501"
          transform="matrix(-0.822377 -0.568943 -0.568943 0.822377 3631.88 2291.09)"
          fill={fill}
          fillOpacity="0.21"
        />
      </g>
      <defs>
        <filter
          id="sp-filter"
          x="0.860352"
          y="0.838989"
          width="3785.16"
          height="2840.26"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="151" result="effect1_foregroundBlur_1065_8" />
        </filter>
      </defs>
      <style>{`
        @keyframes sp-fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
      `}</style>
    </svg>
  );
}
