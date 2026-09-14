"use client";

import { useState, useRef, useEffect } from "react";

export interface DropdownOption {
  value: string;
  label: string;
  renderLabel?: React.ReactNode | ((isSelected: boolean) => React.ReactNode);
  color?: string;
}

interface CustomDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

export default function CustomDropdown({ options, value, onChange, placeholder, style, disabled = false }: CustomDropdownProps) {
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

  const triggerColor = selectedOption?.color || "white";
  const triggerBorder = disabled
    ? "1px solid rgba(255,255,255,0.15)"
    : isOpen
      ? (selectedOption?.color ? `1px solid ${selectedOption.color}` : "1px solid var(--neon-yellow)")
      : (selectedOption?.color ? `1px solid ${selectedOption.color}80` : "1px solid rgba(255,255,255,0.2)");

  return (
    <div ref={dropdownRef} style={{ position: "relative", width: "100%", opacity: disabled ? 0.75 : 1, ...style }}>
      <div 
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: "8px",
          background: disabled ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.5)",
          border: triggerBorder,
          color: triggerColor,
          fontFamily: "var(--font-outfit)",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          transition: "all 0.3s ease"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
          {selectedOption ? (
            typeof selectedOption.renderLabel === "function"
              ? selectedOption.renderLabel(true)
              : (selectedOption.renderLabel || selectedOption.label)
          ) : (
            <span style={{ color: "rgba(255,255,255,0.5)" }}>{placeholder || "Select Option"}</span>
          )}
        </div>
        {disabled ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, marginLeft: "8px", flexShrink: 0 }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        ) : (
          <span style={{ 
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", 
            transition: "transform 0.3s ease", 
            fontSize: "0.8rem",
            color: selectedOption?.color || "rgba(255,255,255,0.6)",
            marginLeft: "8px"
          }}>
            ▼
          </span>
        )}
      </div>

      {isOpen && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          marginTop: "5px",
          background: "#111115",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: "8px",
          overflow: "hidden",
          zIndex: 1000,
          boxShadow: "0 10px 25px rgba(0,0,0,0.7)"
        }}>
          {options.map((opt) => {
            const isSelected = value === opt.value;
            const activeColor = opt.color || "var(--neon-yellow)";
            return (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                style={{
                  padding: "12px",
                  cursor: "pointer",
                  color: isSelected ? activeColor : "white",
                  background: isSelected 
                    ? (opt.color ? `${opt.color}22` : "rgba(255, 234, 0, 0.1)") 
                    : "transparent",
                  fontFamily: "var(--font-outfit)",
                  fontWeight: isSelected ? "600" : "400",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  transition: "background 0.2s, color 0.2s",
                  display: "flex",
                  alignItems: "center"
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "transparent";
                }}
              >
                {typeof opt.renderLabel === "function" 
                  ? opt.renderLabel(isSelected) 
                  : (opt.renderLabel || opt.label)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
