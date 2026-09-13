"use client";

import React from "react";

export interface BadgeDefinition {
  id: string;
  label: string;
  category: "member" | "leadership";
  description: string;
  color: string;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // MEMBER BADGES
  {
    id: "first-timer",
    label: "First Timer",
    category: "member",
    description: "For participants who are attending the camp for the first time.",
    color: "#FFEA00"
  },
  {
    id: "camp-veteran",
    label: "Camp Veteran",
    category: "member",
    description: "For participants who have attended the camp two or more times.",
    color: "#F59E0B"
  },
  {
    id: "supporter",
    label: "Supporter",
    category: "member",
    description: "For individuals who did not attend the camp or only participated in the Night Service. It is also intended for users who are not part of the CAMP but wish to socialize and connect with others.",
    color: "#EC4899"
  },
  {
    id: "anonymous",
    label: "Anonymous",
    category: "member",
    description: "For members who choose to post or comment in the community feed while keeping their identity hidden.",
    color: "#94A3B8"
  },

  // LEADERSHIP AND MINISTRY BADGES
  {
    id: "pastor",
    label: "Pastor",
    category: "leadership",
    description: "For pastors serving in the ministry.",
    color: "#60A5FA"
  },
  {
    id: "camp-coordinator",
    label: "Camp Coordinator",
    category: "leadership",
    description: "For individuals responsible for organizing, managing, and coordinating camp activities and operations.",
    color: "#EF4444"
  },
  {
    id: "facilitator",
    label: "Facilitator",
    category: "leadership",
    description: "For those who served as camp facilitators during the previous camp.",
    color: "#FACC15"
  },
  {
    id: "media-team",
    label: "Media Team",
    category: "leadership",
    description: "For members of the media team who captured photos and videos during the camp.",
    color: "#38BDF8"
  },
  {
    id: "music-team",
    label: "Music Team",
    category: "leadership",
    description: "For members who served in the camp's music ministry.",
    color: "#A855F7"
  },
  {
    id: "dance-ministry",
    label: "Dance Ministry",
    category: "leadership",
    description: "For members who served in the dance ministry during the camp.",
    color: "#FB7185"
  },
  {
    id: "Admin",
    label: "Admin",
    category: "leadership",
    description: "For official page and community administrators.",
    color: "#FFEA00"
  }
];

export function normalizeBadgeId(id: string | null | undefined): string {
  if (!id) return "first-timer";
  const clean = id.trim().toLowerCase();
  if (clean === "admin") return "Admin";
  if (clean === "camp-coordinator" || clean === "camp coordinator" || clean === "coordinator") return "camp-coordinator";
  if (clean === "camp-veteran" || clean === "camp veteran" || clean === "veteran") return "camp-veteran";
  if (clean === "first-timer" || clean === "first timer" || clean === "firsttimer") return "first-timer";
  if (clean === "media-team" || clean === "media team" || clean === "media") return "media-team";
  if (clean === "music-team" || clean === "music team" || clean === "music") return "music-team";
  if (clean === "dance-ministry" || clean === "dance ministry" || clean === "dance") return "dance-ministry";
  return clean;
}

export function getBadgeDefinition(badgeId: string | null | undefined): BadgeDefinition {
  const norm = normalizeBadgeId(badgeId);
  const found = BADGE_DEFINITIONS.find(b => b.id.toLowerCase() === norm.toLowerCase());
  return found || {
    id: norm,
    label: norm.charAt(0).toUpperCase() + norm.slice(1).replace(/-/g, " "),
    category: "member",
    description: "",
    color: "var(--neon-yellow)"
  };
}

interface BadgeIconProps {
  badge: string | null | undefined;
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function BadgeIcon({ badge, size = 16, color, className, style }: BadgeIconProps) {
  const norm = normalizeBadgeId(badge).toLowerCase();
  const def = getBadgeDefinition(badge);
  const strokeColor = color || def.color;

  switch (norm) {
    case "first-timer":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: "inline-block", verticalAlign: "middle", ...style }}>
          <path d="M12 2C8.5 2 6 5 6 9c0 1.5.5 3 1.5 4.5l2-1.5 2.5 2.5 2-2 2.5 2 1.5-1.5C19 11 19.5 9.5 19.5 9c0-4-3.5-7-7.5-7z" fill={strokeColor + "1a"} />
          <path d="M4 14c0 4.5 3.5 8 8 8s8-3.5 8-8l-3 1.5-2.5-2.5L12 15l-2.5-2L7 15.5 4 14z" fill={strokeColor + "33"} />
          <circle cx="10" cy="8" r="1" fill={strokeColor} />
          <circle cx="14" cy="8" r="1" fill={strokeColor} />
          <polygon points="11,9.5 13,9.5 12,10.5" fill={strokeColor} strokeWidth="0" />
        </svg>
      );

    case "camp-veteran":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: "inline-block", verticalAlign: "middle", ...style }}>
          <polygon points="7 2 17 2 14 9 10 9" fill={strokeColor + "33"} />
          <line x1="8" y1="2" x2="11" y2="9" />
          <line x1="16" y1="2" x2="13" y2="9" />
          <circle cx="12" cy="16" r="6" fill={strokeColor + "1a"} />
          <polygon points="12 13 13 15 15.5 15.2 13.7 16.6 14.2 19 12 17.8 9.8 19 10.3 16.6 8.5 15.2 11 15" fill={strokeColor} strokeWidth="0" />
        </svg>
      );

    case "supporter":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: "inline-block", verticalAlign: "middle", ...style }}>
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill={strokeColor + "26"} />
          <path d="M19 2l.7 1.4L21 4.1l-1.3.7-.7 1.4-.7-1.4L17 4.1l1.3-.7L19 2z" fill={strokeColor} strokeWidth="0" />
        </svg>
      );

    case "anonymous":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: "inline-block", verticalAlign: "middle", ...style }}>
          <path d="M3 11h18" />
          <path d="M6 11l1.5-6h9L18 11" fill={strokeColor + "26"} />
          <rect x="5" y="13" width="5.5" height="3" rx="1.5" fill={strokeColor + "40"} />
          <rect x="13.5" y="13" width="5.5" height="3" rx="1.5" fill={strokeColor + "40"} />
          <line x1="10.5" y1="14.5" x2="13.5" y2="14.5" />
          <path d="M8 19c2 1.5 6 1.5 8 0" />
        </svg>
      );

    case "pastor":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: "inline-block", verticalAlign: "middle", ...style }}>
          <path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z" fill={strokeColor + "26"} />
          <path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z" fill={strokeColor + "26"} />
          <line x1="12" y1="5" x2="12" y2="14" strokeWidth="2.5" />
          <line x1="9" y1="8" x2="15" y2="8" strokeWidth="2.5" />
        </svg>
      );

    case "camp-coordinator":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: "inline-block", verticalAlign: "middle", ...style }}>
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" fill={strokeColor + "26"} />
          <circle cx="12" cy="12" r="2" fill={strokeColor} strokeWidth="0" />
          <line x1="12" y1="2" x2="12" y2="5" />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="2" y1="12" x2="5" y2="12" />
          <line x1="19" y1="12" x2="22" y2="12" />
        </svg>
      );

    case "facilitator":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: "inline-block", verticalAlign: "middle", ...style }}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill={strokeColor + "33"} />
          <line x1="12" y1="10" x2="12" y2="14" strokeWidth="1.5" />
          <line x1="10" y1="12" x2="14" y2="12" strokeWidth="1.5" />
        </svg>
      );

    case "media-team":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: "inline-block", verticalAlign: "middle", ...style }}>
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" fill={strokeColor + "20"} />
          <circle cx="12" cy="13" r="4" fill={strokeColor + "26"} />
          <circle cx="12" cy="13" r="1.5" fill={strokeColor} strokeWidth="0" />
          <circle cx="18" cy="9" r="1" fill={strokeColor} strokeWidth="0" />
        </svg>
      );

    case "music-team":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: "inline-block", verticalAlign: "middle", ...style }}>
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" fill={strokeColor} />
          <circle cx="18" cy="16" r="3" fill={strokeColor} />
          <line x1="9" y1="9" x2="21" y2="7" strokeWidth="2.5" />
        </svg>
      );

    case "dance-ministry":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: "inline-block", verticalAlign: "middle", ...style }}>
          <circle cx="12" cy="3.5" r="2" fill={strokeColor} />
          <path d="M6 8c2-2 4-3 6-3s4 1 6 3" />
          <path d="M12 5.5v5l-3 4-2 7.5m5-11.5l3 4 2 7.5" />
          <path d="M4 14c4-2 8 2 12-1s4 2 4 4" strokeDasharray="3 2" />
        </svg>
      );

    case "admin":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: "inline-block", verticalAlign: "middle", ...style }}>
          <path d="M2 19h20v2H2z" fill={strokeColor} />
          <path d="M3 16l3-10 6 5 6-5 3 10H3z" fill={strokeColor + "33"} />
          <circle cx="3" cy="6" r="1.5" fill={strokeColor} strokeWidth="0" />
          <circle cx="12" cy="3.5" r="1.5" fill={strokeColor} strokeWidth="0" />
          <circle cx="21" cy="6" r="1.5" fill={strokeColor} strokeWidth="0" />
          <polygon points="12 11 13.5 13.5 12 16 10.5 13.5" fill={strokeColor} strokeWidth="0" />
        </svg>
      );

    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: "inline-block", verticalAlign: "middle", ...style }}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
  }
}

export function BadgePill({ badge, size = 14 }: { badge: string | null | undefined; size?: number }) {
  const def = getBadgeDefinition(badge);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "3px 8px",
        borderRadius: "20px",
        background: def.color + "15",
        border: "1px solid " + def.color + "4d",
        color: def.color,
        fontSize: "0.8rem",
        fontWeight: "600",
        fontFamily: "var(--font-outfit)",
        letterSpacing: "0.3px",
      }}
      title={def.description || def.label}
    >
      <BadgeIcon badge={badge} size={size} color={def.color} />
      <span>{def.label}</span>
    </span>
  );
}
