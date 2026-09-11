import React from 'react';

export default function UserAvatar({ 
  src, 
  name, 
  size = "45px", 
  fontSize = "1.2rem", 
  isPrivate = false, 
  teamColor = "transparent",
  style = {}
}: any) {
  let initials = "AN";
  if (!isPrivate && name) {
    const parts = name.trim().split(" ").filter(Boolean);
    initials = (parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "");
  }

  const hasTeam = teamColor && teamColor !== 'none' && teamColor !== 'transparent';
  const borderStyle = hasTeam ? `2px solid ${teamColor}` : "none";

  return (
    <div style={{
      width: size,
      height: size,
      minWidth: size,
      minHeight: size,
      borderRadius: "50%",
      overflow: "hidden",
      border: borderStyle,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#000",
      ...style
    }}>
      {src && typeof src === 'string' && src.length > 10 && src.startsWith('http') ? (
        <img src={src} alt={name || "Avatar"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <span style={{ 
          color: "var(--neon-yellow)", 
          fontWeight: "900", 
          fontSize: fontSize, 
          fontFamily: "var(--font-outfit)", 
          textTransform: "uppercase" 
        }}>
          {initials}
        </span>
      )}
    </div>
  );
}
