"use client";
import React, { useState, useEffect, useRef } from "react";

export default function AnimatedDropdown({ 
  value, 
  options, 
  onChange, 
  label 
}: { 
  value: string, 
  options: string[], 
  onChange: (val: string) => void, 
  label?: string 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} style={{ position: "relative", width: "100%", marginBottom: "15px", zIndex: isOpen ? 50 : 1 }}>
      {label && <label style={{ display: "block", marginBottom: "5px", color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px" }}>{label}</label>}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          padding: "12px 20px",
          borderRadius: isOpen ? "20px 20px 0 0" : "20px",
          border: isOpen ? "1px solid var(--neon-yellow)" : "1px solid rgba(255,255,255,0.2)",
          background: isOpen ? "rgba(255,234,0,0.1)" : "rgba(255,255,255,0.05)",
          color: isOpen ? "var(--neon-yellow)" : "var(--neon-white)",
          cursor: "pointer",
          fontFamily: "var(--font-outfit)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          transition: "all 0.3s ease",
          boxShadow: isOpen ? "0 0 10px rgba(255,234,0,0.2)" : "none"
        }}
      >
        <span style={{ fontWeight: isOpen ? 700 : 400 }}>{value}</span>
        <span style={{ 
          transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", 
          transition: "transform 0.3s ease",
          fontSize: "0.8rem"
        }}>▼</span>
      </div>

      <div style={{
        position: "absolute",
        top: "100%",
        left: 0,
        width: "100%",
        background: "rgba(10,10,10,0.95)",
        backdropFilter: "blur(10px)",
        border: "1px solid var(--neon-yellow)",
        borderTop: "none",
        borderRadius: "0 0 20px 20px",
        overflowY: "auto",
        maxHeight: isOpen ? "250px" : "0",
        opacity: isOpen ? 1 : 0,
        visibility: isOpen ? "visible" : "hidden",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: "0 10px 15px rgba(0,0,0,0.5)"
      }}>
        {options.map(opt => (
          <div 
            key={opt} 
            onClick={() => {
              onChange(opt);
              setIsOpen(false);
            }}
            style={{ 
              padding: "12px 20px", 
              color: value === opt ? "var(--neon-yellow)" : "white", 
              cursor: "pointer",
              fontFamily: "var(--font-outfit)",
              fontWeight: value === opt ? 700 : 400,
              background: value === opt ? "rgba(255,234,0,0.1)" : "transparent",
              transition: "background 0.2s"
            }}
            onMouseOver={(e) => {
              if (value !== opt) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            }}
            onMouseOut={(e) => {
              if (value !== opt) e.currentTarget.style.background = "transparent";
            }}
          >
            {opt}
          </div>
        ))}
      </div>
    </div>
  );
}
