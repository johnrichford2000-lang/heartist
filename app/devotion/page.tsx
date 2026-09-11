"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import HeartistLogo from "@/components/HeartistLogo";
import CustomDropdown from "@/components/CustomDropdown";
import { supabase } from "@/lib/supabase";
import { getCurrentUser, CurrentUser } from "@/lib/authHelper";
import { 
  fetchUserDevotions, 
  saveUserDevotion, 
  deleteUserDevotion,
  formatDevotionDate,
  DevotionEntry 
} from "@/lib/devotionSync";
import { 
  DevotionStreakData, 
  fetchUserStreak, 
  saveUserStreak, 
  recordDevotionSaved, 
  evaluateStreak, 
  getLocalDateString,
  StreakTierStyle,
  getStreakTierColor,
  getDailyRotatingBoxColor
} from "@/lib/devotionStreakSync";

function getActiveBoxTheme(streakData: DevotionStreakData, currentDateStr?: string) {
  // 1. If not completed and not restored -> Gray Box
  if (!streakData.completedToday && !streakData.isRestoredToday) {
    return {
      name: "gray",
      isGray: true,
      border: streakData.isBroken ? "1px solid rgba(160, 160, 160, 0.35)" : "1px solid rgba(255, 255, 255, 0.15)",
      background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(20, 20, 20, 0.9) 100%)",
      boxShadow: "none",
      heartWrapperBg: streakData.isBroken ? "rgba(100, 100, 100, 0.15)" : "rgba(255, 255, 255, 0.06)",
      heartWrapperBorder: "1px solid rgba(255, 255, 255, 0.1)",
      heartWrapperShadow: "none",
      textColor: streakData.isBroken ? "#888888" : "#CCCCCC",
      textShadow: "none",
      labelColor: "var(--text-muted)",
      statusColor: streakData.isBroken ? "var(--lemon-yellow)" : "var(--text-muted)",
      secondaryColor: "var(--lemon-yellow)"
    };
  }

  // 2. If restored today -> Red Box
  if (streakData.isRestoredToday) {
    return {
      name: "red",
      isGray: false,
      border: "1px solid #FF3366",
      background: "linear-gradient(135deg, rgba(255, 51, 102, 0.15) 0%, rgba(20, 20, 20, 0.9) 100%)",
      boxShadow: "0 0 25px rgba(255, 51, 102, 0.3)",
      heartWrapperBg: "rgba(255, 51, 102, 0.2)",
      heartWrapperBorder: "1px solid #FF3366",
      heartWrapperShadow: "0 0 15px rgba(255, 51, 102, 0.5)",
      textColor: "#FF3366",
      textShadow: "0 0 15px rgba(255, 51, 102, 0.8)",
      labelColor: "#FF4D6D",
      statusColor: "#FF3366",
      secondaryColor: "#FFA3B8"
    };
  }

  // 3. 365+ days -> Daily rotating box color between: Yellow, Orange, Purple, Blue, Green
  if (streakData.currentStreak > 365) {
    const rotating = getDailyRotatingBoxColor(currentDateStr);
    return {
      name: rotating.name,
      isGray: false,
      border: `1px solid ${rotating.primary}`,
      background: `linear-gradient(135deg, ${rotating.bgGlow} 0%, rgba(20, 20, 20, 0.9) 100%)`,
      boxShadow: `0 0 25px ${rotating.boxGlow}`,
      heartWrapperBg: rotating.bgGlow,
      heartWrapperBorder: `1px solid ${rotating.primary}`,
      heartWrapperShadow: `0 0 15px ${rotating.boxGlow}`,
      textColor: rotating.primary,
      textShadow: rotating.textShadow,
      labelColor: rotating.primary,
      statusColor: rotating.primary,
      secondaryColor: rotating.secondary
    };
  }

  // 4. Normal completed -> Uniform box matching heart color tier
  const tier = getStreakTierColor(streakData.currentStreak);
  return {
    name: tier.name,
    isGray: false,
    border: `1px solid ${tier.primary}`,
    background: `linear-gradient(135deg, ${tier.bgGlow} 0%, rgba(20, 20, 20, 0.9) 100%)`,
    boxShadow: `0 0 25px ${tier.boxGlow}`,
    heartWrapperBg: tier.bgGlow,
    heartWrapperBorder: `1px solid ${tier.primary}`,
    heartWrapperShadow: `0 0 15px ${tier.boxGlow}`,
    textColor: tier.primary,
    textShadow: tier.textShadow,
    labelColor: tier.primary,
    statusColor: tier.primary,
    secondaryColor: tier.secondary
  };
}

function DevotionStreakHeart({ 
  completedToday, 
  isBroken, 
  isRestoredToday,
  streak = 0,
  size = 32 
}: { 
  completedToday: boolean; 
  isBroken: boolean; 
  isRestoredToday?: boolean;
  streak?: number;
  size?: number; 
}) {
  // If restored today, show Restored Heart (❤️‍🩹 Glowing Heart with Medical Bandage & Cross)
  if (isRestoredToday) {
    return (
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        style={{ 
          flexShrink: 0,
          display: "block",
          filter: "drop-shadow(0 0 8px rgba(255, 51, 102, 0.95)) drop-shadow(0 0 16px rgba(255, 51, 102, 0.45))",
          transition: "all 0.4s ease"
        }}
      >
        <defs>
          <linearGradient id="restoredHeartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF6584" />
            <stop offset="100%" stopColor="#E11D48" />
          </linearGradient>
        </defs>
        {/* Heart Base */}
        <path 
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          fill="url(#restoredHeartGrad)"
        />
        {/* Angled Bandage across heart */}
        <g transform="rotate(32 12 11)">
          {/* Bandage strip */}
          <rect 
            x="5.2" 
            y="9.2" 
            width="13.6" 
            height="4" 
            rx="1.5" 
            fill="#FFFFFF" 
            opacity="0.95" 
            stroke="#BE123C" 
            strokeWidth="0.4"
          />
          {/* Medical mending cross */}
          <rect x="11.4" y="9.8" width="1.2" height="2.8" rx="0.3" fill="#E11D48" />
          <rect x="10.6" y="10.6" width="2.8" height="1.2" rx="0.3" fill="#E11D48" />
        </g>
      </svg>
    );
  }

  if (completedToday) {
    if (streak > 365) {
      // 365+ days: Fiery Red Heart ❤️🔥
      return (
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 24 24" 
          style={{ 
            flexShrink: 0,
            display: "block",
            filter: "drop-shadow(0 0 8px rgba(255, 42, 42, 0.95)) drop-shadow(0 0 16px rgba(255, 122, 0, 0.7))",
            transition: "all 0.4s ease"
          }}
        >
          <defs>
            <linearGradient id="fireHeartGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#DC2626" />
              <stop offset="60%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
          </defs>
          <path 
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            fill="url(#fireHeartGrad)"
          />
          {/* Flame flare in upper center */}
          <path
            d="M12 4.5c0.5 1.5 1.5 2 2 3-0.5-0.2-1.2-0.3-1.8 0.2 0.8 1 0.4 2.2-0.2 2.8-0.3-0.8-0.8-1-1.2-1-0.4 1-0.2 1.8 0 2.2-1-0.6-1.5-1.8-1-3 0.4-1 1.2-1.5 1.2-2.5 0-0.6-0.3-1.2-0.5-1.7 0.8 0.4 1.3 1 1.5 2z"
            fill="#FEF08A"
            opacity="0.9"
          />
        </svg>
      );
    }

    const tier = getStreakTierColor(streak);
    return (
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill={tier.primary}
        style={{ 
          flexShrink: 0,
          display: "block",
          filter: `drop-shadow(0 0 8px ${tier.boxGlow}) drop-shadow(0 0 16px ${tier.boxGlow})`,
          transition: "all 0.4s ease"
        }}
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
    );
  }

  if (isBroken) {
    // Gray broken heart (missed a day / broken streak)
    return (
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="rgba(140, 140, 140, 0.65)" 
        style={{ 
          flexShrink: 0,
          display: "block",
          filter: "drop-shadow(0 0 4px rgba(0, 0, 0, 0.6))",
          transition: "all 0.4s ease" 
        }}
      >
        {/* Left half with jagged crack */}
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09l-1.8 3.5 3.2 2-2.5 3.5 1.5 2.5L12 21.35z"/>
        {/* Right half with jagged crack */}
        <path d="M12.8 5.09C13.89 3.81 15.56 3 17.3 3 20.38 3 22.8 5.42 22.8 8.5c0 3.78-3.4 6.86-8.55 11.54L12.8 21.35l1.2-3.15-1.5-2.5 2.5-3.5-3.2-2 1-3.11z"/>
      </svg>
    );
  }

  // Gray heart (pending today's devotion)
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="rgba(180, 180, 180, 0.6)" 
      style={{ 
        flexShrink: 0,
        display: "block",
        filter: "drop-shadow(0 0 3px rgba(255, 255, 255, 0.15))",
        transition: "all 0.4s ease" 
      }}
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
  );
}

const DEVOTIONS = [
  {
    verse: "Jeremiah 29:11",
    text: '"For I know the plans I have for you," declares the Lord, "plans to prosper you and not to harm you, plans to give you hope and a future."',
    reflection: "Gods timing is perfect. Even when things seem uncertain, trust that He is working behind the scenes for your good."
  },
  {
    verse: "Philippians 4:13",
    text: '"I can do all this through him who gives me strength."',
    reflection: "Whatever challenges you face today, you dont have to face them alone. Draw your strength from Him."
  },
  {
    verse: "Proverbs 3:5-6",
    text: '"Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight."',
    reflection: "Surrender your worries today. When we stop trying to control everything, God steps in and guides our way."
  },
  {
    verse: "Isaiah 40:31",
    text: '"But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint."',
    reflection: "Are you feeling tired or burned out? Rest in Gods presence today and let Him renew your spirit."
  },
  {
    verse: "Romans 8:28",
    text: '"And we know that in all things God works for the good of those who love him, who have been called according to his purpose."',
    reflection: "Every piece of your story has a purpose. Keep loving God, and watch how He weaves everything together for good."
  }
];

export interface MethodField {
  key: string;
  label: string;
  placeholder: string;
  rows?: number;
}

export interface DevotionMethodDef {
  value: string;
  name: string;
  details: string;
  label: string;
  badgeLabel: string;
  description: string;
  fields: MethodField[];
}

const DEVOTION_METHODS: DevotionMethodDef[] = [
  {
    value: "default",
    name: "Default",
    details: "(Freeform)",
    label: "Default (Freeform)",
    badgeLabel: "Freeform",
    description: "Free writing without any rigid structure.",
    fields: [
      {
        key: "reflection",
        label: "Your Reflection / Prayer",
        placeholder: "(What is God speaking into your heart today? Write freely...)",
        rows: 7
      }
    ]
  },
  {
    value: "soap",
    name: "SOAP",
    details: "(Scripture, Observation, Application, Prayer)",
    label: "SOAP (Scripture, Observation, Application, Prayer)",
    badgeLabel: "SOAP",
    description: "Scripture, Observation, Application, Prayer (Auto-syncs with Today's Verse)",
    fields: [
      {
        key: "scripture",
        label: "Scripture",
        placeholder: "(Write the verse or passage that spoke to you)",
        rows: 3
      },
      {
        key: "observation",
        label: "Observation",
        placeholder: "(What spiritual truth or context do you notice?)",
        rows: 3
      },
      {
        key: "application",
        label: "Application",
        placeholder: "(How will you put this into practice in your life today?)",
        rows: 3
      },
      {
        key: "prayer",
        label: "Prayer",
        placeholder: "(Talk to God about what He revealed to you)",
        rows: 3
      }
    ]
  },
  {
    value: "apple",
    name: "APPLE",
    details: "(Attributes, Promises, Principles, Lessons, Examples)",
    label: "APPLE (Attributes, Promises, Principles, Lessons, Examples)",
    badgeLabel: "APPLE",
    description: "Attributes of God, Promises, Principles, Lessons, Examples",
    fields: [
      {
        key: "attributes",
        label: "Attributes of God",
        placeholder: "(What does this text reveal about who God is?)",
        rows: 3
      },
      {
        key: "promises",
        label: "Promises",
        placeholder: "(What promises can you hold onto in faith?)",
        rows: 3
      },
      {
        key: "principles",
        label: "Principles",
        placeholder: "(What timeless biblical principles or commands are taught?)",
        rows: 3
      },
      {
        key: "lessons",
        label: "Lessons",
        placeholder: "(What personal convictions or lessons are you learning?)",
        rows: 3
      },
      {
        key: "examples",
        label: "Examples",
        placeholder: "(What examples are shown to follow or avoid?)",
        rows: 3
      }
    ]
  },
  {
    value: "feast",
    name: "FEAST",
    details: "(Focus, Engage, Assess, Spark, Transform)",
    label: "FEAST (Focus, Engage, Assess, Spark, Transform)",
    badgeLabel: "FEAST",
    description: "Focus, Engage, Assess, Spark, Transform",
    fields: [
      {
        key: "focus",
        label: "Focus",
        placeholder: "(Quiet your heart and center your mind on today's verse)",
        rows: 3
      },
      {
        key: "engage",
        label: "Engage",
        placeholder: "(Immerse yourself in the story, imagery, and context)",
        rows: 3
      },
      {
        key: "assess",
        label: "Assess",
        placeholder: "(Examine your heart honestly in light of God's truth)",
        rows: 3
      },
      {
        key: "spark",
        label: "Spark",
        placeholder: "(What holy desire, vision, or urge is being ignited?)",
        rows: 3
      },
      {
        key: "transform",
        label: "Transform",
        placeholder: "(How will you allow God to change your habits or mindset?)",
        rows: 3
      }
    ]
  },
  {
    value: "pray",
    name: "PRAY",
    details: "(Praise, Repent, Ask, Yield)",
    label: "PRAY (Praise, Repent, Ask, Yield)",
    badgeLabel: "PRAY",
    description: "Praise, Repent, Ask, Yield",
    fields: [
      {
        key: "praise",
        label: "Praise",
        placeholder: "(Worship and thank God for who He is and His mighty works)",
        rows: 3
      },
      {
        key: "repent",
        label: "Repent",
        placeholder: "(Humbly confess shortcomings and receive His forgiveness)",
        rows: 3
      },
      {
        key: "ask",
        label: "Ask",
        placeholder: "(Lay your needs, burdens, family, and intercessions before Him)",
        rows: 3
      },
      {
        key: "yield",
        label: "Yield",
        placeholder: "(Surrender your will, timeline, and desires into His hands)",
        rows: 3
      }
    ]
  },
  {
    value: "acts",
    name: "ACTS",
    details: "(Adoration, Confession, Thanksgiving, Supplication)",
    label: "ACTS (Adoration, Confession, Thanksgiving, Supplication)",
    badgeLabel: "ACTS",
    description: "Adoration, Confession, Thanksgiving, Supplication",
    fields: [
      {
        key: "adoration",
        label: "Adoration",
        placeholder: "(Worship and adore the Lord for His holiness and majesty)",
        rows: 3
      },
      {
        key: "confession",
        label: "Confession",
        placeholder: "(Acknowledge sin and invite the Holy Spirit to cleanse your heart)",
        rows: 3
      },
      {
        key: "thanksgiving",
        label: "Thanksgiving",
        placeholder: "(Express gratitude for specific blessings and answers to prayer)",
        rows: 3
      },
      {
        key: "supplication",
        label: "Supplication",
        placeholder: "(Present your earnest prayers for yourself and others)",
        rows: 3
      }
    ]
  }
];

function buildCombinedText(methodValue: string, inputs: Record<string, string>, reflectionQuote?: string): string {
  const sections: string[] = [];

  if (reflectionQuote && reflectionQuote.trim()) {
    sections.push(`Reflection:\n"${reflectionQuote.trim()}"`);
  }

  const methodDef = DEVOTION_METHODS.find(m => m.value === methodValue) || DEVOTION_METHODS[0];
  if (methodDef.value === "default") {
    const ref = (inputs["reflection"] || "").trim();
    if (ref) sections.push(ref);
    return sections.join("\n\n").trim();
  }

  for (const f of methodDef.fields) {
    const val = (inputs[f.key] || "").trim();
    if (val) {
      sections.push(`${f.label}:\n${val}`);
    }
  }
  return sections.join("\n\n").trim();
}

function extractSavedReflection(text: string): { reflectionQuote: string | null; cleanText: string } {
  const lines = text.split("\n");
  if (lines.length > 0 && lines[0].trim().toLowerCase() === "reflection:") {
    const quoteLines: string[] = [];
    let idx = 1;
    while (idx < lines.length) {
      const line = lines[idx];
      const trimmed = line.trim();
      if (ALL_METHOD_HEADERS.some(h => h.toLowerCase() !== "reflection:" && trimmed.toLowerCase() === h.toLowerCase())) {
        break;
      }
      quoteLines.push(line);
      idx++;
    }
    const rawQuote = quoteLines.join("\n").trim().replace(/^"|"$/g, "").replace(/^“|”$/g, "").trim();
    const cleanText = lines.slice(idx).join("\n").trim();
    return { reflectionQuote: rawQuote || null, cleanText };
  }
  return { reflectionQuote: null, cleanText: text };
}

function parseEntryToInputs(text: string, methodValue: string): Record<string, string> {
  const methodDef = DEVOTION_METHODS.find(m => m.value === methodValue) || DEVOTION_METHODS[0];
  if (methodDef.value === "default" || methodDef.fields.length <= 1) {
    return { reflection: text };
  }

  const inputs: Record<string, string> = {};
  const lines = text.split("\n");
  let currentKey: string | null = null;
  const accumulated: Record<string, string[]> = {};

  for (const f of methodDef.fields) {
    accumulated[f.key] = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();
    const matchedField = methodDef.fields.find(f =>
      trimmed.toLowerCase() === `${f.label.toLowerCase()}:` ||
      trimmed.toLowerCase() === f.label.toLowerCase()
    );

    if (matchedField) {
      currentKey = matchedField.key;
    } else if (currentKey) {
      accumulated[currentKey].push(line);
    } else {
      if (methodDef.fields[0]) {
        accumulated[methodDef.fields[0].key].push(line);
      }
    }
  }

  let hasMatched = false;
  for (const f of methodDef.fields) {
    const val = (accumulated[f.key] || []).join("\n").trim();
    if (val) {
      inputs[f.key] = val;
      hasMatched = true;
    }
  }

  if (!hasMatched && text.trim()) {
    inputs[methodDef.fields[0].key] = text.trim();
  }

  return inputs;
}

function checkHasUserContent(
  methodValue: string, 
  inputs: Record<string, string>, 
  dailyDevotion: { verse: string; text: string }
): boolean {
  const methodDef = DEVOTION_METHODS.find(m => m.value === methodValue) || DEVOTION_METHODS[0];

  if (methodDef.value === "default") {
    const text = inputs["reflection"] || "";
    return text.trim().length > 0;
  }

  if (methodDef.value === "soap") {
    // In SOAP, check if user filled in observation, application, or prayer:
    const otherFieldsFilled = ["observation", "application", "prayer"].some(key => {
      const val = inputs[key] || "";
      return val.trim().length > 0;
    });
    if (otherFieldsFilled) return true;

    // Check if user edited or added custom text to scripture beyond the auto-filled verse:
    const scriptureVal = (inputs["scripture"] || "").trim();
    const defaultAutoVerse = `${dailyDevotion.verse}\n${dailyDevotion.text}`.trim();
    if (scriptureVal && scriptureVal !== defaultAutoVerse) {
      return true;
    }

    return false;
  }

  // For other methods (apple, feast, pray, acts):
  // Check only the fields belonging to the active method
  return methodDef.fields.some(f => {
    const val = inputs[f.key] || "";
    return val.trim().length > 0;
  });
}

const ALL_METHOD_HEADERS = [
  "Reflection:",
  "Scripture:", "Observation:", "Application:", "Prayer:",
  "Attributes of God:", "Promises:", "Principles:", "Lessons:", "Examples:",
  "Focus:", "Engage:", "Assess:", "Spark:", "Transform:",
  "Praise:", "Repent:", "Ask:", "Yield:",
  "Adoration:", "Confession:", "Thanksgiving:", "Supplication:"
];

function renderFormattedDevotionText(text: string) {
  const lines = text.split("\n");
  const isHeader = (l: string) => {
    const trimmed = l.trim();
    return ALL_METHOD_HEADERS.some(h => trimmed.toLowerCase() === h.toLowerCase());
  };

  const hasAnyHeader = lines.some(isHeader);
  if (!hasAnyHeader) {
    return (
      <p style={{ color: "var(--text-main)", fontSize: "0.95rem", lineHeight: "1.6", whiteSpace: "pre-wrap", margin: 0 }}>
        {text}
      </p>
    );
  }

  const sections: { header?: string; content: string[] }[] = [];
  let current: { header?: string; content: string[] } = { content: [] };

  for (const line of lines) {
    if (isHeader(line)) {
      if (current.header || current.content.length > 0) {
        sections.push(current);
      }
      current = { header: line.trim(), content: [] };
    } else {
      current.content.push(line);
    }
  }
  if (current.header || current.content.length > 0) {
    sections.push(current);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {sections.map((sec, idx) => (
        <div key={idx}>
          {sec.header && (
            <div style={{ 
              color: "var(--neon-yellow)", 
              fontWeight: "bold", 
              fontSize: "0.95rem", 
              fontFamily: "var(--font-outfit)",
              marginBottom: "3px" 
            }}>
              {sec.header}
            </div>
          )}
          {sec.content.length > 0 && (
            <div style={{ 
              color: "var(--text-main)", 
              fontSize: "0.95rem", 
              lineHeight: "1.6", 
              whiteSpace: "pre-wrap" 
            }}>
              {sec.content.join("\n").trim()}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function DevotionPage() {
  const [dailyDevotion, setDailyDevotion] = useState(DEVOTIONS[0]);
  const [currentDate, setCurrentDate] = useState("");
  const [journalTitle, setJournalTitle] = useState("");
  const [methodInputs, setMethodInputs] = useState<Record<string, string>>({});
  const [selectedMethod, setSelectedMethod] = useState("default");
  const [history, setHistory] = useState<DevotionEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editingDailyReflection, setEditingDailyReflection] = useState<string | null>(null);
  const activeReflectionQuote = editingDailyReflection || dailyDevotion.reflection;
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Custom branded confirmation modal state
  const [deletingEntry, setDeletingEntry] = useState<DevotionEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [streakData, setStreakData] = useState<DevotionStreakData>({
    currentStreak: 0,
    lastDevotionDate: "",
    lastEvaluatedDate: getLocalDateString(),
    completedToday: false,
    isBroken: false,
    monthlyCount: 0,
    currentMonthName: new Date().toLocaleString("en-US", { month: "long" }),
    yearlyCount: 0,
    currentYear: new Date().getFullYear(),
    restoresRemaining: 2,
    maxRestores: 2,
    testMode: {
      active: false,
      lastSavedTimestamp: 0,
      baseStreak: 0
    }
  });

  useEffect(() => {
    const formatted = formatDevotionDate(new Date());
    setCurrentDate(formatted);

    const today = new Date();
    const start = new Date(today.getFullYear(), 0, 0);
    const diff = today.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    setDailyDevotion(DEVOTIONS[dayOfYear % DEVOTIONS.length]);

    let devotionsChannel: any = null;

    const initUserAndDevotions = async () => {
      setIsLoading(true);
      const user = await getCurrentUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }
      setCurrentUser(user);

      // Fetch all entries directly from Supabase database (no localStorage)
      const userDevotions = await fetchUserDevotions(user.id);
      setHistory(userDevotions);

      // Fetch and evaluate streak for user directly from Supabase database
      const userStreak = await fetchUserStreak(user.id, userDevotions);
      setStreakData(userStreak);
      setIsLoading(false);

      // Realtime listener for cross-tab and cross-device live sync via Supabase
      const channelTopic = `devotions_realtime_${user.id}_broadcast`;
      devotionsChannel = supabase.channel(channelTopic)
        .on("broadcast", { event: "devotions_updated" }, async () => {
          const fresh = await fetchUserDevotions(user.id);
          setHistory(fresh);
          const freshStreak = await fetchUserStreak(user.id, fresh);
          setStreakData(freshStreak);
        })
        .on("broadcast", { event: "streak_updated" }, async (payload: any) => {
          if (payload.payload?.streak) {
            setStreakData(payload.payload.streak);
          }
        })
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "system_settings", filter: `id=eq.user_devotions_${user.id}` },
          async () => {
            const fresh = await fetchUserDevotions(user.id);
            setHistory(fresh);
            const freshStreak = await fetchUserStreak(user.id, fresh);
            setStreakData(freshStreak);
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "system_settings", filter: `id=eq.user_streak_${user.id}` },
          async (payload: any) => {
            if (payload.new?.value) {
              setStreakData(payload.new.value);
            }
          }
        )
        .subscribe();
    };

    initUserAndDevotions();

    return () => {
      if (devotionsChannel) supabase.removeChannel(devotionsChannel);
    };
  }, []);

  // Midnight 00:00 check: resets devotion streak to gray or applies penalty in real-time
  useEffect(() => {
    let currentDayStr = getLocalDateString();

    const interval = setInterval(async () => {
      const newDayStr = getLocalDateString();
      if (newDayStr !== currentDayStr) {
        // A new day has arrived (00:00 passed)!
        currentDayStr = newDayStr;
        setCurrentDate(formatDevotionDate(new Date()));

        // Re-evaluate streak for the new day
        if (currentUser) {
          const updated = await fetchUserStreak(currentUser.id, history);
          setStreakData(updated);
        }
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [currentUser, history]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      const textareas = document.querySelectorAll<HTMLTextAreaElement>(".seamless-devotion-input");
      textareas.forEach(ta => {
        ta.style.height = "auto";
        ta.style.height = Math.max(45, ta.scrollHeight) + "px";
      });
    }
  }, [methodInputs, selectedMethod]);

  const handleMethodChange = (newVal: string) => {
    setSelectedMethod(newVal);
    if (newVal === "soap") {
      setMethodInputs(prev => {
        if (!prev.scripture || !prev.scripture.trim()) {
          return {
            ...prev,
            scripture: `${dailyDevotion.verse}\n${dailyDevotion.text}`
          };
        }
        return prev;
      });
    }
  };

  const hasContent = checkHasUserContent(selectedMethod, methodInputs, dailyDevotion);

  const handleSave = async () => {
    if (!hasContent || !currentUser || isSaving) return;

    const combinedText = buildCombinedText(selectedMethod, methodInputs, activeReflectionQuote);
    if (!combinedText.trim()) return;

    setIsSaving(true);
    const targetDate = editingDate || currentDate;
    const titleToSave = journalTitle.trim() ? journalTitle.trim() : targetDate;

    const ok = await saveUserDevotion(
      currentUser.id, 
      targetDate, 
      combinedText, 
      titleToSave, 
      selectedMethod,
      editingEntryId
    );
    if (ok) {
      const updated = await fetchUserDevotions(currentUser.id);
      setHistory(updated);

      // Record devotion saved and immediately update streak
      const updatedStreak = await recordDevotionSaved(currentUser.id, updated, false);
      setStreakData(updatedStreak);

      setIsSaved(true);
      setMethodInputs({});
      setJournalTitle("");
      setSelectedMethod("default");
      setEditingDate(null);
      setEditingEntryId(null);
      setEditingDailyReflection(null);
      setTimeout(() => setIsSaved(false), 2500);
    }
    setIsSaving(false);
  };

  const handleStartEdit = (entry: DevotionEntry) => {
    const m = entry.method || "default";
    setEditingEntryId(entry.id);
    setEditingDate(entry.date);
    setJournalTitle(entry.title !== entry.date ? entry.title : "");
    setSelectedMethod(m);

    const { reflectionQuote, cleanText } = extractSavedReflection(entry.text);
    setEditingDailyReflection(reflectionQuote);
    setMethodInputs(parseEntryToInputs(cleanText, m));

    window.scrollTo({ top: 350, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingEntryId(null);
    setEditingDate(null);
    setJournalTitle("");
    setMethodInputs({});
    setSelectedMethod("default");
    setEditingDailyReflection(null);
  };

  const confirmDelete = async () => {
    if (!deletingEntry || !currentUser || isDeleting) return;

    setIsDeleting(true);
    const ok = await deleteUserDevotion(deletingEntry.id, currentUser.id);
    if (ok) {
      const remaining = history.filter(item => item.id !== deletingEntry.id);
      setHistory(remaining);
      if (expandedId === deletingEntry.id) setExpandedId(null);
      if (editingEntryId === deletingEntry.id) handleCancelEdit();

      // Re-evaluate streak after deletion
      const reevaluated = evaluateStreak(streakData, remaining);
      setStreakData(reevaluated);
      await saveUserStreak(currentUser.id, reevaluated);
    }
    setIsDeleting(false);
    setDeletingEntry(null);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const filteredHistory = history.filter(entry => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      entry.title.toLowerCase().includes(q) ||
      entry.date.toLowerCase().includes(q) ||
      entry.text.toLowerCase().includes(q) ||
      (entry.method && entry.method.toLowerCase().includes(q))
    );
  });

  const activeMethodObj = DEVOTION_METHODS.find(m => m.value === selectedMethod) || DEVOTION_METHODS[0];
  const boxTheme = getActiveBoxTheme(streakData, currentDate);

  return (
    <main className="main-container" style={{ padding: "80px 20px" }}>
      {/* Top-Left Back Button (Pure SVG Icon, Fixed to Screen Top-Left, Navigates to Main Home) */}
      <Link
        href="/"
        aria-label="Back to Main"
        style={{
          position: "fixed",
          top: "18px",
          left: "18px",
          zIndex: 9999,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "44px",
          height: "44px",
          borderRadius: "12px",
          background: "rgba(10, 10, 10, 0.75)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid var(--neon-yellow)",
          color: "var(--neon-yellow)",
          textDecoration: "none",
          boxShadow: "0 0 14px rgba(255, 234, 0, 0.2)",
          transition: "all 0.25s ease",
          cursor: "pointer"
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = "rgba(255, 234, 0, 0.18)";
          e.currentTarget.style.boxShadow = "0 0 20px rgba(255, 234, 0, 0.45)";
          e.currentTarget.style.transform = "translateX(-3px)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = "rgba(10, 10, 10, 0.75)";
          e.currentTarget.style.boxShadow = "0 0 14px rgba(255, 234, 0, 0.2)";
          e.currentTarget.style.transform = "translateX(0)";
        }}
      >
        <svg 
          width="22" 
          height="22" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
      </Link>

      <header style={{ marginBottom: "30px", textAlign: "center" }}>
        <HeartistLogo className="animated-glow-text" width={45} height={45} />
        <h1 
          className="header-title glow-text-yellow" 
          style={{ fontFamily: "var(--font-outfit)", fontSize: "2.5rem", marginTop: "15px", textTransform: "uppercase" }}
        >
          Devotion Journal
        </h1>
        <h2 style={{ color: "var(--neon-white)", fontSize: "1.1rem", marginTop: "10px", fontFamily: "var(--font-outfit)", fontStyle: "italic" }}>
          Spend time with God and write your reflections.
        </h2>
        {currentUser && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginTop: "10px", padding: "6px 14px", background: "rgba(255,255,255,0.05)", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.1)" }}>
            <span style={{ fontSize: "0.8rem", color: "#00FF80", fontWeight: "bold" }}>Realtime Live</span>
            <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>|</span>
            <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
              Cloud Synced for <strong style={{ color: "var(--neon-yellow)" }}>{currentUser.fullName}</strong>
            </span>
          </div>
        )}
      </header>

      <div style={{ maxWidth: "800px", margin: "0 auto", display: "grid", gap: "30px" }}>
        
        {/* Devotion Streak & Monthly Tracker Banner */}
        <style>{`
          .devotion-streak-banner {
            padding: 16px 18px;
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          @media (min-width: 680px) {
            .devotion-streak-banner {
              flex-direction: row;
              justify-content: space-between;
              align-items: center;
              padding: 20px 25px;
              gap: 20px;
            }
          }
          .devotion-streak-left {
            display: flex;
            align-items: center;
            gap: 14px;
            width: 100%;
            flex: 1 1 auto;
            min-width: 0;
          }
          @media (min-width: 680px) {
            .devotion-streak-left {
              gap: 16px;
              width: auto;
            }
          }
          .devotion-heart-wrapper {
            width: 54px;
            height: 54px;
            min-width: 54px;
            min-height: 54px;
            max-width: 54px;
            max-height: 54px;
            flex-shrink: 0;
            aspect-ratio: 1 / 1;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .devotion-monthly-card {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 18px;
            background: rgba(255, 255, 255, 0.04);
            border-radius: 14px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          }
          @media (min-width: 680px) {
            .devotion-monthly-card {
              width: auto;
              min-width: 180px;
              flex-direction: column;
              align-items: flex-start;
              justify-content: center;
              padding: 12px 18px;
            }
          }
        `}</style>
        <section 
          className="devotion-streak-banner"
          style={{
            background: boxTheme.background,
            border: boxTheme.border,
            borderRadius: "15px",
            boxShadow: boxTheme.boxShadow,
            transition: "all 0.4s ease"
          }}
        >
          {/* Left: Streak Counter */}
          <div className="devotion-streak-left">
            <div 
              className="devotion-heart-wrapper"
              style={{
                background: boxTheme.heartWrapperBg,
                border: boxTheme.heartWrapperBorder,
                boxShadow: boxTheme.heartWrapperShadow,
                transition: "all 0.3s ease"
              }}
            >
              <DevotionStreakHeart 
                completedToday={streakData.completedToday} 
                isBroken={streakData.isBroken} 
                isRestoredToday={streakData.isRestoredToday}
                streak={streakData.currentStreak}
                size={32} 
              />
            </div>

            <div style={{ minWidth: 0, flex: "1 1 auto" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <span style={{ 
                  fontFamily: "var(--font-outfit)", 
                  fontSize: "2.2rem", 
                  fontWeight: 900, 
                  lineHeight: "1",
                  color: boxTheme.textColor,
                  textShadow: boxTheme.textShadow,
                  transition: "all 0.3s ease"
                }}>
                  {streakData.currentStreak}
                </span>
                <span style={{ 
                  fontFamily: "var(--font-outfit)", 
                  fontSize: "0.85rem", 
                  fontWeight: 700, 
                  letterSpacing: "1.5px", 
                  textTransform: "uppercase",
                  color: boxTheme.labelColor
                }}>
                  Day Streak
                </span>
              </div>

              {/* Status text */}
              <p style={{ 
                margin: "4px 0 0 0", 
                fontSize: "0.8rem", 
                fontFamily: "var(--font-outfit)",
                color: boxTheme.statusColor
              }}>
                {streakData.isBroken ? (
                  streakData.restoresRemaining > 0 ? (
                    <strong style={{ color: "var(--lemon-yellow)" }}>
                      Do devotion to restore streak
                    </strong>
                  ) : (
                    <strong style={{ color: "#f87171" }}>
                      Do devotion to rebuild streak
                    </strong>
                  )
                ) : (streakData.completedToday || streakData.isRestoredToday) ? (
                  <strong style={{ color: boxTheme.textColor }}>
                    {streakData.isRestoredToday 
                      ? "Devotion completed today • Streak restored" 
                      : "Devotion completed today • Streak active"}
                  </strong>
                ) : (
                  <strong style={{ color: "#CCCCCC" }}>
                    {streakData.currentStreak > 0 
                      ? "Do devotion today to keep your streak" 
                      : "Do devotion today to start your streak"}
                  </strong>
                )}
              </p>

              {/* Restores bank */}
              <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ 
                  fontSize: "0.72rem", 
                  color: "var(--text-muted)", 
                  fontFamily: "var(--font-outfit)",
                  background: "rgba(255, 255, 255, 0.05)",
                  padding: "3px 8px",
                  borderRadius: "12px",
                  border: "1px solid rgba(255, 255, 255, 0.08)"
                }}>
                  Restores: <strong style={{ color: streakData.restoresRemaining > 0 ? "white" : "#f87171" }}>{streakData.restoresRemaining}/{streakData.maxRestores}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Right: Monthly Devotions Stats (Responsive for Mobile/CP Mode) */}
          <div className="devotion-monthly-card">
            <div>
              <span style={{ 
                fontFamily: "var(--font-outfit)", 
                fontSize: "0.72rem", 
                fontWeight: 700, 
                color: "var(--text-muted)", 
                textTransform: "uppercase", 
                letterSpacing: "1px", 
                display: "block" 
              }}>
                Monthly Devotions
              </span>
              <p style={{ margin: "2px 0 0 0", fontSize: "0.72rem", color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-outfit)" }}>
                In {streakData.currentMonthName || "This Month"}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
              <span style={{ fontFamily: "var(--font-outfit)", fontSize: "1.75rem", fontWeight: 900, color: "white", lineHeight: 1 }}>
                {streakData.monthlyCount}
              </span>
            </div>
          </div>
        </section>
        
        {/* Today's Verse Devotion */}
        <section style={{ padding: "25px", background: "rgba(255, 234, 0, 0.05)", border: "1px solid var(--neon-yellow)", borderRadius: "15px", boxShadow: "0 0 15px rgba(255, 234, 0, 0.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
            <h2 className="glow-text-yellow" style={{ fontFamily: "var(--font-outfit)", margin: 0, fontSize: "1.5rem" }}>
              {currentDate}
            </h2>
          </div>
          <p style={{ color: "var(--neon-white)", fontSize: "1.15rem", fontStyle: "italic", marginBottom: "10px", lineHeight: "1.5" }}>
            {dailyDevotion.text}
          </p>
          <p style={{ color: "var(--neon-yellow)", fontSize: "1rem", fontWeight: "bold", marginBottom: "20px", fontFamily: "var(--font-outfit)" }}>
            - {dailyDevotion.verse}
          </p>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "15px" }}>
            <p style={{ color: "var(--text-main)", fontSize: "0.95rem", lineHeight: "1.6", fontFamily: "var(--font-outfit)" }}>
              <strong style={{ color: "white" }}>Reflection:</strong> {dailyDevotion.reflection}
            </p>
          </div>
        </section>

        {/* Journal Editor */}
        <section style={{ padding: "25px", background: "var(--bg-card)", borderTop: "3px solid var(--neon-white)", borderRadius: "15px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h3 style={{ color: "white", fontSize: "1.2rem", fontFamily: "var(--font-outfit)", margin: 0 }}>
                {editingDate ? `Editing Reflection for ${editingDate}` : "Write Personal Reflection"}
              </h3>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "3px 10px",
                background: streakData.completedToday 
                  ? "rgba(255, 234, 0, 0.15)" 
                  : streakData.isBroken 
                    ? "rgba(100, 100, 100, 0.15)" 
                    : "rgba(255, 255, 255, 0.08)",
                border: streakData.completedToday 
                  ? "1px solid var(--neon-yellow)" 
                  : streakData.isBroken 
                    ? "1px solid rgba(160, 160, 160, 0.3)" 
                    : "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "12px",
                fontSize: "0.75rem",
                fontWeight: "bold",
                fontFamily: "var(--font-outfit)",
                color: streakData.completedToday 
                  ? "var(--neon-yellow)" 
                  : streakData.isBroken 
                    ? "#888888" 
                    : "#BBBBBB"
              }}>
                <DevotionStreakHeart completedToday={streakData.completedToday} isBroken={streakData.isBroken} size={14} />
                <span>{streakData.currentStreak} {streakData.currentStreak === 1 ? "day" : "days"}</span>
              </div>
            </div>
            <span style={{ fontSize: "0.85rem", color: "var(--neon-yellow)", background: "rgba(255,234,0,0.1)", padding: "4px 10px", borderRadius: "12px", border: "1px solid rgba(255,234,0,0.3)" }}>
              {editingDate || currentDate}
            </span>
          </div>

          {/* Devotion Method Dropdown */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", color: "var(--neon-white)", fontSize: "0.85rem", fontFamily: "var(--font-outfit)", fontWeight: "bold", marginBottom: "8px" }}>
              Devotion Method
            </label>
            
            <CustomDropdown
              options={DEVOTION_METHODS.map(m => ({ 
                value: m.value, 
                label: m.label,
                renderLabel: (
                  <span>
                    <strong style={{ color: "var(--neon-yellow)", fontWeight: "bold", marginRight: "6px" }}>
                      {m.name}
                    </strong>
                    <span style={{ color: "rgba(255,255,255,0.85)" }}>
                      {m.details}
                    </span>
                  </span>
                )
              }))}
              value={selectedMethod}
              onChange={handleMethodChange}
            />

            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "6px", fontFamily: "var(--font-outfit)" }}>
              <strong style={{ color: "var(--neon-yellow)" }}>{activeMethodObj.name}:</strong> {activeMethodObj.description}
            </p>
          </div>

          {/* Title Field */}
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", color: "var(--neon-white)", fontSize: "0.85rem", marginBottom: "6px", fontFamily: "var(--font-outfit)" }}>
              Reflection Title <span style={{ color: "var(--text-muted)" }}>(Optional - default will be &quot;{editingDate || currentDate}&quot;)</span>
            </label>
            <input 
              type="text"
              placeholder={`Title (e.g. Finding Peace) - Leave blank for ${editingDate || currentDate}`}
              value={journalTitle}
              onChange={(e) => setJournalTitle(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 15px",
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "8px",
                color: "white",
                outline: "none",
                fontFamily: "var(--font-outfit)",
                fontSize: "0.95rem"
              }}
            />
          </div>

          {/* Single Unified Journal Text Box */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", color: "var(--neon-white)", fontSize: "0.85rem", marginBottom: "6px", fontFamily: "var(--font-outfit)" }}>
              Your Reflection / Prayer *
            </label>
            <div className="unified-journal-box">
              {/* Fixed Daily Reflection Quote - permanently fixed and unmodifiable across all methods */}
              <div style={{
                marginBottom: "14px",
                paddingBottom: "14px",
                borderBottom: "1px dashed rgba(255, 255, 255, 0.12)"
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "8px",
                  flexWrap: "wrap",
                  lineHeight: "1.6"
                }}>
                  <span style={{
                    color: "var(--neon-yellow)",
                    fontWeight: "bold",
                    fontSize: "1rem",
                    fontFamily: "var(--font-outfit)",
                    userSelect: "none"
                  }}>
                    Reflection:
                  </span>
                  <span style={{
                    color: "var(--neon-white)",
                    fontSize: "0.95rem",
                    fontFamily: "var(--font-outfit)",
                    fontStyle: "italic",
                    userSelect: "none"
                  }}>
                    &ldquo;{activeReflectionQuote}&rdquo;
                  </span>
                </div>
              </div>

              {activeMethodObj.value === "default" ? (
                <textarea
                  id="devotion-input-reflection"
                  className="seamless-devotion-input"
                  placeholder="(What is God speaking into your heart today? Write freely...)"
                  value={methodInputs["reflection"] || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMethodInputs(prev => ({ ...prev, reflection: val }));
                    e.target.style.height = "auto";
                    e.target.style.height = Math.max(180, e.target.scrollHeight) + "px";
                  }}
                  rows={8}
                  style={{ minHeight: "180px" }}
                />
              ) : (
                activeMethodObj.fields.map((field, idx) => {
                  const isFilled = Boolean(methodInputs[field.key]?.trim());
                  return (
                    <div 
                      key={field.key}
                      style={{
                        marginBottom: idx === activeMethodObj.fields.length - 1 ? 0 : "14px",
                        paddingBottom: idx === activeMethodObj.fields.length - 1 ? 0 : "14px",
                        borderBottom: idx === activeMethodObj.fields.length - 1 ? "none" : "1px dashed rgba(255, 255, 255, 0.1)"
                      }}
                    >
                      <div 
                        onClick={() => document.getElementById(`method-input-${field.key}`)?.focus()}
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: "8px",
                          flexWrap: "wrap",
                          marginBottom: "4px",
                          cursor: "text"
                        }}
                      >
                        {/* Fixed Yellow Label - permanently fixed and unremovable */}
                        <span style={{
                          color: "var(--neon-yellow)",
                          fontWeight: "bold",
                          fontSize: "1rem",
                          fontFamily: "var(--font-outfit)",
                          userSelect: "none"
                        }}>
                          {field.label}:
                        </span>

                        {/* Gray meaning prompt - disappears automatically when typed */}
                        {!isFilled && (
                          <span style={{
                            color: "#888888",
                            fontSize: "0.85rem",
                            fontFamily: "var(--font-outfit)",
                            fontStyle: "italic",
                            userSelect: "none"
                          }}>
                            {field.placeholder}
                          </span>
                        )}
                      </div>

                      <textarea
                        id={`method-input-${field.key}`}
                        className="seamless-devotion-input"
                        value={methodInputs[field.key] || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMethodInputs(prev => ({ ...prev, [field.key]: val }));
                          e.target.style.height = "auto";
                          e.target.style.height = Math.max(45, e.target.scrollHeight) + "px";
                        }}
                        rows={2}
                        style={{ minHeight: "45px" }}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            {editingDate && (
              <button 
                onClick={handleCancelEdit}
                style={{
                  padding: "12px 20px",
                  background: "transparent",
                  color: "var(--text-muted)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontFamily: "var(--font-outfit)",
                  fontSize: "0.95rem",
                  transition: "all 0.2s"
                }}
              >
                Cancel Edit
              </button>
            )}
            <button 
              onClick={handleSave}
              disabled={isSaving || !hasContent}
              style={{
                padding: "12px 25px",
                background: isSaved 
                  ? "rgba(0, 255, 128, 0.2)" 
                  : !hasContent 
                    ? "rgba(255, 255, 255, 0.08)" 
                    : "var(--neon-yellow)",
                color: isSaved 
                  ? "#00FF80" 
                  : !hasContent 
                    ? "rgba(255, 255, 255, 0.3)" 
                    : "black",
                border: isSaved 
                  ? "1px solid #00FF80" 
                  : !hasContent 
                    ? "1px solid rgba(255, 255, 255, 0.1)" 
                    : "none",
                borderRadius: "8px",
                cursor: (isSaving || !hasContent) ? "not-allowed" : "pointer",
                fontFamily: "var(--font-outfit)",
                fontWeight: "bold",
                fontSize: "1rem",
                opacity: (isSaving || !hasContent) ? 0.6 : 1,
                transition: "all 0.2s"
              }}
            >
              {isSaving ? "Saving to Cloud..." : isSaved ? "Saved! Streak Active 💛" : "Save Journal"}
            </button>
          </div>
        </section>

        {/* Past Devotions Section */}
        <section style={{ marginTop: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h3 style={{ color: "var(--neon-white)", fontSize: "1.4rem", fontFamily: "var(--font-outfit)", margin: 0 }}>
                Past Devotions
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "4px 0 0 0" }}>
                {filteredHistory.length} {filteredHistory.length === 1 ? "devotion" : "devotions"} saved
              </p>
            </div>

            {/* Quick Search */}
            {history.length > 2 && (
              <input 
                type="text"
                placeholder="Search devotions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: "8px 14px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "20px",
                  color: "white",
                  fontSize: "0.85rem",
                  outline: "none",
                  fontFamily: "var(--font-outfit)",
                  minWidth: "180px"
                }}
              />
            )}
          </div>

          {isLoading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", background: "rgba(255,255,255,0.02)", borderRadius: "10px" }}>
              Loading your cloud reflections...
            </div>
          ) : filteredHistory.length === 0 ? (
            <div style={{ textAlign: "center", padding: "35px", background: "rgba(255,255,255,0.02)", borderRadius: "10px", color: "var(--text-muted)", border: "1px dashed rgba(255,255,255,0.1)" }}>
              {searchQuery ? "No devotions matched your search." : "No saved devotions yet. Write your first reflection above!"}
            </div>
          ) : (
            <div style={{ 
              display: "flex", 
              flexDirection: "column", 
              gap: "10px",
              maxHeight: "650px", 
              overflowY: "auto",
              paddingRight: "5px"
            }}>
              {filteredHistory.map((entry) => {
                const isExpanded = expandedId === entry.id;
                const methodBadge = DEVOTION_METHODS.find(m => m.value === entry.method)?.badgeLabel || (entry.method && entry.method !== "default" ? entry.method.toUpperCase().replace(/ METHOD/i, "") : "Freeform");

                return (
                  <div 
                    key={entry.id || entry.date} 
                    style={{ 
                      padding: "14px 18px", 
                      background: isExpanded ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)", 
                      border: isExpanded ? "1px solid var(--neon-yellow)" : "1px solid rgba(255,255,255,0.1)", 
                      borderRadius: "12px",
                      transition: "all 0.2s"
                    }}
                  >
                    {/* Top Row: Clickable header showing Title, Date, Method, and Actions */}
                    <div 
                      onClick={() => toggleExpand(entry.id)}
                      style={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center", 
                        gap: "10px", 
                        flexWrap: "wrap",
                        cursor: "pointer"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "1.05rem", fontWeight: "bold", color: "white", fontFamily: "var(--font-outfit)" }}>
                          {entry.title}
                        </span>
                        <span style={{ 
                          fontSize: "0.75rem", 
                          color: "var(--neon-yellow)", 
                          background: "rgba(255,234,0,0.1)", 
                          padding: "2px 8px", 
                          borderRadius: "10px", 
                          fontWeight: "bold",
                          border: "1px solid rgba(255,234,0,0.2)"
                        }}>
                          {entry.date}
                        </span>
                        <span style={{
                          fontSize: "0.75rem",
                          color: "var(--neon-yellow)",
                          background: "rgba(255,234,0,0.1)",
                          padding: "2px 8px",
                          borderRadius: "8px",
                          border: "1px solid rgba(255,234,0,0.25)",
                          fontWeight: "bold",
                          fontFamily: "var(--font-outfit)"
                        }}>
                          {methodBadge}
                        </span>
                      </div>

                      {/* Right side: Action Buttons (only visible when expanded) & Expand Arrow */}
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {isExpanded && (
                          <div 
                            style={{ display: "flex", alignItems: "center", gap: "8px" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button 
                              onClick={() => handleStartEdit(entry)}
                              style={{ 
                                background: "transparent", 
                                border: "1px solid rgba(255,234,0,0.4)", 
                                color: "var(--neon-yellow)", 
                                borderRadius: "6px", 
                                padding: "4px 12px", 
                                fontSize: "0.82rem", 
                                cursor: "pointer", 
                                fontFamily: "var(--font-outfit)",
                                transition: "all 0.2s"
                              }}
                              onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255,234,0,0.1)")}
                              onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => setDeletingEntry(entry)}
                              style={{ 
                                background: "transparent", 
                                border: "1px solid rgba(255,77,77,0.4)", 
                                color: "#ff6666", 
                                borderRadius: "6px", 
                                padding: "4px 12px", 
                                fontSize: "0.82rem", 
                                cursor: "pointer", 
                                fontFamily: "var(--font-outfit)",
                                transition: "all 0.2s"
                              }}
                              onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255,77,77,0.15)")}
                              onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                              Delete
                            </button>
                          </div>
                        )}

                        <span style={{ 
                          color: isExpanded ? "var(--neon-yellow)" : "var(--text-muted)", 
                          fontSize: "0.75rem", 
                          transition: "transform 0.2s",
                          display: "inline-block",
                          transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)"
                        }}>
                          ▼
                        </span>
                      </div>
                    </div>

                    {/* Content only reveals when clicked/expanded */}
                    {isExpanded && (
                      <div style={{ 
                        marginTop: "14px", 
                        paddingTop: "14px", 
                        borderTop: "1px solid rgba(255, 255, 255, 0.1)" 
                      }}>
                        {renderFormattedDevotionText(entry.text)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <Link href="/" className="nav-item" style={{ padding: "10px 20px", border: "1px solid var(--neon-yellow)", borderRadius: "8px", textDecoration: "none", color: "var(--neon-yellow)" }}>
            Back to Home
          </Link>
        </div>
      </div>

      {/* Custom CSS Branded Delete Confirmation Modal */}
      {deletingEntry && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px"
        }}>
          <div style={{
            background: "var(--bg-card)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderTop: "3px solid #ff4d4d",
            borderRadius: "14px",
            padding: "28px 24px",
            maxWidth: "420px",
            width: "100%",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
            textAlign: "center"
          }}>
            <h3 style={{
              fontFamily: "var(--font-outfit)",
              color: "white",
              fontSize: "1.3rem",
              marginBottom: "12px"
            }}>
              Delete Reflection
            </h3>
            <p style={{
              color: "var(--text-muted)",
              fontSize: "0.95rem",
              lineHeight: "1.5",
              marginBottom: "24px"
            }}>
              Are you sure you want to delete <strong style={{ color: "var(--neon-white)" }}>&quot;{deletingEntry.title}&quot;</strong>? This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                onClick={() => setDeletingEntry(null)}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: "11px 18px",
                  background: "transparent",
                  color: "var(--text-muted)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "8px",
                  fontFamily: "var(--font-outfit)",
                  fontSize: "0.95rem",
                  cursor: isDeleting ? "not-allowed" : "pointer",
                  transition: "all 0.2s"
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: "11px 18px",
                  background: "#ff4d4d",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontFamily: "var(--font-outfit)",
                  fontWeight: "bold",
                  fontSize: "0.95rem",
                  cursor: isDeleting ? "not-allowed" : "pointer",
                  opacity: isDeleting ? 0.7 : 1,
                  transition: "all 0.2s"
                }}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}