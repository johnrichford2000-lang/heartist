export default function HeartistLogo({ className = "", width = 45, height = 45 }: { className?: string, width?: number, height?: number }) {
  return (
    <svg 
      className={className}
      width={width} 
      height={height} 
      viewBox="0 0 40 45" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Horizontal Yellow Bar (Back) */}
      <rect x="8" y="15" width="30" height="12" rx="2" fill="#ffea00" />
      
      {/* Left White Bar (Front) */}
      <rect x="2" y="2" width="10" height="38" rx="2" fill="white" />
      
      {/* Right White Bar (Front) */}
      <rect x="20" y="8" width="10" height="36" rx="2" fill="white" />
    </svg>
  );
}
