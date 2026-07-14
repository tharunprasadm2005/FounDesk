import React from "react";

export function HeroNumber({ value, variant = "neutral", className = "", style = {}, as: Component = "span" }) {
  const isZero = value === 0 || value === "0" || value === 0.0 || value === "0.0";
  let finalVariant = variant;
  if (variant === "neutral" && isZero) {
    finalVariant = "zero";
  }

  return (
    <Component
      className={`card-hero-value ${finalVariant} ${className}`}
      style={style}
    >
      {value}
    </Component>
  );
}

export default HeroNumber;
