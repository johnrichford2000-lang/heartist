"use client";

import { useState, useRef, useEffect } from "react";

export interface DropdownOption {
  value: string;
  label: string;
  renderLabel?: React.ReactNode;
}

interface CustomDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

export default function CustomDropdown({ options, value, onChange, placeholder, style }: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

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
    <div ref={dropdownRef} style={{ position: "relative", width: "100%", ...style }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: "8px",
          background: "rgba(0,0,0,0.5)",
          border: isOpen ? "1px solid var(--neon-yellow)" : "1px solid rgba(255,255,255,0.2)",
          color: "white",
          fontFamily: "var(--font-outfit)",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          transition: "all 0.3s ease"
        }}
      >
        <span>{selectedOption ? (selectedOption.renderLabel || selectedOption.label) : placeholder || "Select Option"}</span>
        <span style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s ease", fontSize: "0.8rem" }}>
          ▼
        </span>
      </div>

      {isOpen && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          marginTop: "5px",
          background: "#111",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "8px",
          overflow: "hidden",
          zIndex: 1000,
          boxShadow: "0 10px 20px rgba(0,0,0,0.5)"
        }}>
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              style={{
                padding: "12px",
                cursor: "pointer",
                color: value === opt.value ? "var(--neon-yellow)" : "white",
                background: value === opt.value ? "rgba(255, 234, 0, 0.1)" : "transparent",
                fontFamily: "var(--font-outfit)",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                transition: "background 0.2s"
              }}
              onMouseEnter={(e) => {
                if (value !== opt.value) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              }}
              onMouseLeave={(e) => {
                if (value !== opt.value) e.currentTarget.style.background = "transparent";
              }}
            >
              {opt.renderLabel || opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
