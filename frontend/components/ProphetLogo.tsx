'use client';

interface ProphetLogoProps {
  className?: string;
  size?: number;
}

export default function ProphetLogo({ className = "", size = 40 }: ProphetLogoProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 40 40" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer abstract eye/lens shape */}
      <circle cx="20" cy="20" r="18" stroke="url(#prophet_gradient_minimal)" strokeWidth="2.5" />
      
      {/* Inner core node (The Centroid) */}
      <circle cx="20" cy="20" r="6" fill="url(#prophet_gradient_minimal)" />
      
      {/* 4 Directional Data Anchors (Foresight/Predictions) */}
      <rect x="19" y="4" width="2" height="6" rx="1" fill="#6366f1" />
      <rect x="19" y="30" width="2" height="6" rx="1" fill="#ec4899" />
      <rect x="4" y="19" width="6" height="2" rx="1" fill="#6366f1" />
      <rect x="30" y="19" width="6" height="2" rx="1" fill="#ec4899" />
      
      <defs>
        <linearGradient id="prophet_gradient_minimal" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#ec4899" />
        </linearGradient>
      </defs>
    </svg>
  );
}
