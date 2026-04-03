import React from "react";

export function RudrikLogo({ size = 20, color = "#ffffff" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Trishul-inspired mark — three prongs with central shaft */}
      <path
        d="M12 2L12 22"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M12 6C12 6 12 3 12 2"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Left prong */}
      <path
        d="M12 8L6 3"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Right prong */}
      <path
        d="M12 8L18 3"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Cross guard */}
      <path
        d="M8 12L16 12"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Energy bolt accent */}
      <path
        d="M14 15L11 18.5L13 18.5L10 22"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
