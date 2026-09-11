import { supabase } from "./supabase";
import { DevotionEntry, formatDevotionDate } from "./devotionSync";

export interface DevotionStreakData {
  currentStreak: number;
  lastDevotionDate: string;  // "YYYY-MM-DD"
  lastEvaluatedDate: string; // "YYYY-MM-DD"
  completedToday: boolean;
  isBroken: boolean;
  missedDays?: number;
  isRestoredToday?: boolean;
  monthlyCount: number;
  currentMonthName: string;
  yearlyCount?: number;
  currentYear?: number;
  restoresRemaining: number;
  maxRestores: number;
  testMode?: {
    active: boolean;
    lastSavedTimestamp: number;
    baseStreak: number;
    isRestored?: boolean;
    missedMinutes?: number;
  };
}

/**
 * Restore allowance based on user streak length:
 * - 0 - 20 days: 2 restores
 * - 21 - 50 days: 3 restores
 * - 51 - 75 days: 4 restores
 * - 76 - 100 days: 5 restores
 * - 101 - 365 days: 10 restores
 * - 365+ days: 15 restores
 */
export function getMaxRestoresForStreak(streak: number): number {
  if (streak <= 20) return 2;
  if (streak <= 50) return 3;
  if (streak <= 75) return 4;
  if (streak <= 100) return 5;
  if (streak <= 365) return 10;
  return 15;
}

export function resolveRestores(
  currentStreak: number,
  storedStreak?: DevotionStreakData | null
): { restoresRemaining: number; maxRestores: number } {
  const maxRestores = getMaxRestoresForStreak(currentStreak);
  if (!storedStreak || storedStreak.restoresRemaining === undefined) {
    return { restoresRemaining: maxRestores, maxRestores };
  }
  const oldMax = storedStreak.maxRestores || getMaxRestoresForStreak(storedStreak.currentStreak);
  const bonus = Math.max(0, maxRestores - oldMax);
  const restoresRemaining = Math.max(0, Math.min(maxRestores, storedStreak.restoresRemaining + bonus));
  return { restoresRemaining, maxRestores };
}

export interface StreakTierStyle {
  name: string;
  primary: string;      // main hex color
  secondary: string;    // lighter/accent glow
  bgGlow: string;       // rgba for background gradient
  boxGlow: string;      // rgba for box shadow
  textShadow: string;   // text-shadow glow
}

export function getStreakTierColor(streak: number): StreakTierStyle {
  if (streak <= 20) {
    // 0 – 20 days: Yellow 💛
    return {
      name: "yellow",
      primary: "#FFE600",
      secondary: "#FFF066",
      bgGlow: "rgba(255, 230, 0, 0.12)",
      boxGlow: "rgba(255, 230, 0, 0.3)",
      textShadow: "0 0 15px rgba(255, 230, 0, 0.8)"
    };
  }
  if (streak <= 50) {
    // 21 – 50 days: Orange 🧡
    return {
      name: "orange",
      primary: "#FF7A00",
      secondary: "#FFA043",
      bgGlow: "rgba(255, 122, 0, 0.14)",
      boxGlow: "rgba(255, 122, 0, 0.35)",
      textShadow: "0 0 15px rgba(255, 122, 0, 0.8)"
    };
  }
  if (streak <= 75) {
    // 51 – 75 days: Purple 💜
    return {
      name: "purple",
      primary: "#B026FF",
      secondary: "#D946EF",
      bgGlow: "rgba(176, 38, 255, 0.14)",
      boxGlow: "rgba(176, 38, 255, 0.35)",
      textShadow: "0 0 15px rgba(176, 38, 255, 0.8)"
    };
  }
  if (streak <= 100) {
    // 76 – 100 days: Blue 💙
    return {
      name: "blue",
      primary: "#00D2FF",
      secondary: "#38BDF8",
      bgGlow: "rgba(0, 210, 255, 0.14)",
      boxGlow: "rgba(0, 210, 255, 0.35)",
      textShadow: "0 0 15px rgba(0, 210, 255, 0.8)"
    };
  }
  if (streak <= 365) {
    // 101 – 365 days: Green 💚
    return {
      name: "green",
      primary: "#00FF88",
      secondary: "#34D399",
      bgGlow: "rgba(0, 255, 136, 0.14)",
      boxGlow: "rgba(0, 255, 136, 0.35)",
      textShadow: "0 0 15px rgba(0, 255, 136, 0.8)"
    };
  }

  // 365+ days: Fiery Red ❤️🔥
  return {
    name: "red_fire",
    primary: "#FF2A2A",
    secondary: "#FF7A00",
    bgGlow: "rgba(255, 42, 42, 0.15)",
    boxGlow: "rgba(255, 42, 42, 0.4)",
    textShadow: "0 0 18px rgba(255, 42, 42, 0.9)"
  };
}

export const ROTATING_BOX_COLORS: StreakTierStyle[] = [
  // Yellow
  {
    name: "yellow",
    primary: "#FFE600",
    secondary: "#FFF066",
    bgGlow: "rgba(255, 230, 0, 0.12)",
    boxGlow: "rgba(255, 230, 0, 0.3)",
    textShadow: "0 0 15px rgba(255, 230, 0, 0.8)"
  },
  // Orange
  {
    name: "orange",
    primary: "#FF7A00",
    secondary: "#FFA043",
    bgGlow: "rgba(255, 122, 0, 0.14)",
    boxGlow: "rgba(255, 122, 0, 0.35)",
    textShadow: "0 0 15px rgba(255, 122, 0, 0.8)"
  },
  // Purple
  {
    name: "purple",
    primary: "#B026FF",
    secondary: "#D946EF",
    bgGlow: "rgba(176, 38, 255, 0.14)",
    boxGlow: "rgba(176, 38, 255, 0.35)",
    textShadow: "0 0 15px rgba(176, 38, 255, 0.8)"
  },
  // Blue
  {
    name: "blue",
    primary: "#00D2FF",
    secondary: "#38BDF8",
    bgGlow: "rgba(0, 210, 255, 0.14)",
    boxGlow: "rgba(0, 210, 255, 0.35)",
    textShadow: "0 0 15px rgba(0, 210, 255, 0.8)"
  },
  // Green
  {
    name: "green",
    primary: "#00FF88",
    secondary: "#34D399",
    bgGlow: "rgba(0, 255, 136, 0.14)",
    boxGlow: "rgba(0, 255, 136, 0.35)",
    textShadow: "0 0 15px rgba(0, 255, 136, 0.8)"
  }
];

export function getDailyRotatingBoxColor(dateStr?: string): StreakTierStyle {
  let d = new Date();
  if (dateStr) {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) d = parsed;
  }
  const dayNumber = Math.floor(d.getTime() / (1000 * 60 * 60 * 24));
  const idx = Math.abs(dayNumber) % ROTATING_BOX_COLORS.length;
  return ROTATING_BOX_COLORS[idx];
}

const STREAK_PREFIX = "user_streak_";

/**
 * Returns the current local calendar date in "YYYY-MM-DD" format.
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalDateString(dateStr: string): Date {
  const parts = dateStr.split("-");
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

/**
 * Computes difference in calendar days between two "YYYY-MM-DD" dates (d2 - d1).
 */
export function getDaysDiff(dateStr1: string, dateStr2: string): number {
  if (!dateStr1 || !dateStr2) return 0;
  const d1 = parseLocalDateString(dateStr1);
  const d2 = parseLocalDateString(dateStr2);
  const diffTime = d2.getTime() - d1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculates total unique calendar days on which the user completed a devotion in the given year.
 */
export function calculateYearlyDevotions(history: DevotionEntry[], targetYear: number = new Date().getFullYear()): number {
  const uniqueDates = new Set<string>();
  for (const entry of history) {
    let year: number | null = null;
    let dateKey = entry.date;
    if (entry.timestamp) {
      const d = new Date(entry.timestamp);
      year = d.getFullYear();
      dateKey = getLocalDateString(d);
    } else if (entry.date) {
      const match = entry.date.match(/\b(20\d\d)\b/);
      if (match) year = Number(match[1]);
    }
    if (year === targetYear) {
      uniqueDates.add(dateKey);
    }
  }
  return uniqueDates.size;
}

/**
 * Calculates total devotions completed in the given month (defaults to current month).
 */
export function calculateMonthlyDevotions(
  history: DevotionEntry[],
  targetYear: number = new Date().getFullYear(),
  targetMonth: number = new Date().getMonth()
): number {
  return history.filter(entry => {
    let d: Date | null = null;
    if (entry.timestamp) {
      d = new Date(entry.timestamp);
    } else if (entry.date) {
      const parsed = new Date(entry.date);
      if (!isNaN(parsed.getTime())) d = parsed;
    }
    if (d && !isNaN(d.getTime())) {
      return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
    }
    return false;
  }).length;
}

/**
 * Evaluates streak under 1-minute test mode:
 * - 0s to 59s: Yellow glowing heart (active)
 * - 60s to 119s: Gray heart (pending / reset after 1 min)
 * - 120s+: Gray broken heart & -1 penalty for every missed minute (floored at 0)
 */
export function evaluateTestStreak(
  storedStreak: DevotionStreakData | null,
  history: DevotionEntry[],
  nowMs: number = Date.now()
): DevotionStreakData {
  const currentMonthName = new Date().toLocaleString("en-US", { month: "long" });
  const monthlyCount = calculateMonthlyDevotions(history);
  const currentYear = new Date().getFullYear();
  const yearlyCount = calculateYearlyDevotions(history, currentYear);

  if (!storedStreak?.testMode || !storedStreak.testMode.lastSavedTimestamp) {
    const s = storedStreak?.currentStreak || 0;
    const { restoresRemaining, maxRestores } = resolveRestores(s, storedStreak);
    return {
      currentStreak: s,
      lastDevotionDate: getLocalDateString(),
      lastEvaluatedDate: getLocalDateString(),
      completedToday: false,
      isBroken: false,
      isRestoredToday: false,
      monthlyCount,
      currentMonthName,
      yearlyCount,
      currentYear,
      restoresRemaining,
      maxRestores,
      testMode: {
        active: true,
        lastSavedTimestamp: 0,
        baseStreak: s,
        isRestored: false
      }
    };
  }

  const { lastSavedTimestamp, baseStreak, isRestored } = storedStreak.testMode;
  const elapsedSec = Math.floor((nowMs - lastSavedTimestamp) / 1000);
  const wasRestored = Boolean(isRestored || storedStreak.isRestoredToday);

  if (elapsedSec < 60) {
    // Phase 1: 0 - 59s -> Active (Restored heart if restored, else yellow glow)
    const { restoresRemaining, maxRestores } = resolveRestores(baseStreak, storedStreak);
    return {
      currentStreak: baseStreak,
      lastDevotionDate: getLocalDateString(),
      lastEvaluatedDate: getLocalDateString(),
      completedToday: wasRestored ? Boolean(storedStreak.completedToday) : true,
      isBroken: false,
      isRestoredToday: wasRestored,
      monthlyCount,
      currentMonthName,
      yearlyCount,
      currentYear,
      restoresRemaining,
      maxRestores,
      testMode: {
        active: true,
        lastSavedTimestamp,
        baseStreak,
        isRestored: wasRestored
      }
    };
  } else if (elapsedSec < 120) {
    // Phase 2: 60 - 119s -> Gray heart (reset after 1 min, ready for next devotion)
    const { restoresRemaining, maxRestores } = resolveRestores(baseStreak, storedStreak);
    return {
      currentStreak: baseStreak,
      lastDevotionDate: getLocalDateString(),
      lastEvaluatedDate: getLocalDateString(),
      completedToday: false,
      isBroken: false,
      isRestoredToday: false,
      monthlyCount,
      currentMonthName,
      yearlyCount,
      currentYear,
      restoresRemaining,
      maxRestores,
      testMode: {
        active: true,
        lastSavedTimestamp,
        baseStreak,
        isRestored: false
      }
    };
  } else {
    // Phase 3: 120s+ -> 1 min after turning gray -> Broken heart & -1 penalty per missed minute
    const missedMinutes = Math.max(1, Math.floor((elapsedSec - 60) / 60));
    const penalizedStreak = Math.max(0, baseStreak - missedMinutes);
    const { restoresRemaining, maxRestores } = resolveRestores(penalizedStreak, storedStreak);

    return {
      currentStreak: penalizedStreak,
      lastDevotionDate: getLocalDateString(),
      lastEvaluatedDate: getLocalDateString(),
      completedToday: false,
      isBroken: true,
      missedDays: missedMinutes,
      isRestoredToday: false,
      monthlyCount,
      currentMonthName,
      yearlyCount,
      currentYear,
      restoresRemaining,
      maxRestores,
      testMode: {
        active: true,
        lastSavedTimestamp,
        baseStreak,
        isRestored: false,
        missedMinutes
      }
    };
  }
}

/**
 * Evaluates the user's streak given existing stored streak, history, and today's local date.
 * Implements the -1 thrill penalty for missed days (floored at 0) and the 00:00 reset to gray.
 */
export function evaluateStreak(
  storedStreak: DevotionStreakData | null,
  history: DevotionEntry[],
  todayStr: string = getLocalDateString()
): DevotionStreakData {
  const currentYear = new Date().getFullYear();
  const yearlyCount = calculateYearlyDevotions(history, currentYear);
  const monthlyCount = calculateMonthlyDevotions(history);
  const currentMonthName = new Date().toLocaleString("en-US", { month: "long" });

  // If test mode is active, use 1-minute test evaluation
  if (storedStreak?.testMode?.active) {
    return evaluateTestStreak(storedStreak, history);
  }

  // Check if today has at least one devotion in history
  const todayFormatted = formatDevotionDate(todayStr);
  const hasDevotionToday = history.some(entry => {
    if (entry.timestamp && getLocalDateString(new Date(entry.timestamp)) === todayStr) {
      return true;
    }
    if (entry.date === todayFormatted) {
      return true;
    }
    return false;
  });

  // Extract all sorted unique devotion dates from history (YYYY-MM-DD)
  const historyDates = Array.from(new Set(history.map(entry => {
    if (entry.timestamp) return getLocalDateString(new Date(entry.timestamp));
    const d = new Date(entry.date);
    if (!isNaN(d.getTime())) return getLocalDateString(d);
    return "";
  }).filter(Boolean))).sort();

  const latestHistoryDate = historyDates.length > 0 ? historyDates[historyDates.length - 1] : "";

  // If no stored streak exists yet, initialize or infer from history
  if (!storedStreak) {
    if (historyDates.length === 0) {
      const { restoresRemaining, maxRestores } = resolveRestores(0, null);
      return {
        currentStreak: 0,
        lastDevotionDate: "",
        lastEvaluatedDate: todayStr,
        completedToday: false,
        isBroken: false,
        monthlyCount,
        currentMonthName,
        yearlyCount: 0,
        currentYear,
        restoresRemaining,
        maxRestores,
        testMode: { active: false, lastSavedTimestamp: 0, baseStreak: 0 }
      };
    }

    // Infer consecutive days leading up to today or yesterday
    const daysSinceLatest = getDaysDiff(latestHistoryDate, todayStr);
    let consecutive = 1;
    for (let i = historyDates.length - 1; i > 0; i--) {
      if (getDaysDiff(historyDates[i - 1], historyDates[i]) === 1) {
        consecutive++;
      } else {
        break;
      }
    }

    if (daysSinceLatest === 0) {
      const { restoresRemaining, maxRestores } = resolveRestores(consecutive, null);
      return {
        currentStreak: consecutive,
        lastDevotionDate: todayStr,
        lastEvaluatedDate: todayStr,
        completedToday: true,
        isBroken: false,
        monthlyCount,
        currentMonthName,
        yearlyCount,
        currentYear,
        restoresRemaining,
        maxRestores,
        testMode: { active: false, lastSavedTimestamp: 0, baseStreak: consecutive }
      };
    } else if (daysSinceLatest === 1) {
      const { restoresRemaining, maxRestores } = resolveRestores(consecutive, null);
      return {
        currentStreak: consecutive,
        lastDevotionDate: latestHistoryDate,
        lastEvaluatedDate: todayStr,
        completedToday: false,
        isBroken: false,
        monthlyCount,
        currentMonthName,
        yearlyCount,
        currentYear,
        restoresRemaining,
        maxRestores,
        testMode: { active: false, lastSavedTimestamp: 0, baseStreak: consecutive }
      };
    } else {
      const missed = daysSinceLatest - 1;
      const s = Math.max(0, consecutive - missed);
      const { restoresRemaining, maxRestores } = resolveRestores(s, null);
      return {
        currentStreak: s,
        lastDevotionDate: latestHistoryDate,
        lastEvaluatedDate: todayStr,
        completedToday: false,
        isBroken: true,
        missedDays: Math.max(1, missed),
        isRestoredToday: false,
        monthlyCount,
        currentMonthName,
        yearlyCount,
        currentYear,
        restoresRemaining,
        maxRestores,
        testMode: { active: false, lastSavedTimestamp: 0, baseStreak: consecutive }
      };
    }
  }

  // If stored streak exists, evaluate with stored reference
  const effectiveLastDate = hasDevotionToday 
    ? todayStr 
    : (storedStreak.lastDevotionDate || latestHistoryDate);

  const testModeObj = storedStreak.testMode ? { ...storedStreak.testMode, active: false } : { active: false, lastSavedTimestamp: 0, baseStreak: storedStreak.currentStreak, isRestored: false };

  if (hasDevotionToday) {
    const s = Math.max(1, storedStreak.currentStreak);
    const { restoresRemaining, maxRestores } = resolveRestores(s, storedStreak);
    const wasRestoredToday = Boolean(storedStreak.lastEvaluatedDate === todayStr && storedStreak.isRestoredToday);
    return {
      currentStreak: s,
      lastDevotionDate: todayStr,
      lastEvaluatedDate: todayStr,
      completedToday: true,
      isBroken: false,
      isRestoredToday: wasRestoredToday,
      monthlyCount,
      currentMonthName,
      yearlyCount,
      currentYear,
      restoresRemaining,
      maxRestores,
      testMode: testModeObj
    };
  }

  // If user restored today, preserve restored heart state for the rest of today
  if (storedStreak.lastEvaluatedDate === todayStr && storedStreak.isRestoredToday) {
    const { restoresRemaining, maxRestores } = resolveRestores(storedStreak.currentStreak, storedStreak);
    return {
      currentStreak: storedStreak.currentStreak,
      lastDevotionDate: effectiveLastDate,
      lastEvaluatedDate: todayStr,
      completedToday: false,
      isBroken: false,
      isRestoredToday: true,
      monthlyCount,
      currentMonthName,
      yearlyCount,
      currentYear,
      restoresRemaining,
      maxRestores,
      testMode: testModeObj
    };
  }

  // If no devotion completed today yet
  if (!effectiveLastDate) {
    const { restoresRemaining, maxRestores } = resolveRestores(0, storedStreak);
    return {
      currentStreak: 0,
      lastDevotionDate: "",
      lastEvaluatedDate: todayStr,
      completedToday: false,
      isBroken: false,
      isRestoredToday: false,
      monthlyCount,
      currentMonthName,
      yearlyCount,
      currentYear,
      restoresRemaining,
      maxRestores,
      testMode: testModeObj
    };
  }

  const daysSinceLast = getDaysDiff(effectiveLastDate, todayStr);

  if (daysSinceLast <= 0) {
    const s = Math.max(0, storedStreak.currentStreak - 1);
    const { restoresRemaining, maxRestores } = resolveRestores(s, storedStreak);
    return {
      currentStreak: s,
      lastDevotionDate: latestHistoryDate,
      lastEvaluatedDate: todayStr,
      completedToday: false,
      isBroken: false,
      isRestoredToday: false,
      monthlyCount,
      currentMonthName,
      yearlyCount,
      currentYear,
      restoresRemaining,
      maxRestores,
      testMode: testModeObj
    };
  }

  if (daysSinceLast === 1) {
    const { restoresRemaining, maxRestores } = resolveRestores(storedStreak.currentStreak, storedStreak);
    return {
      currentStreak: storedStreak.currentStreak,
      lastDevotionDate: effectiveLastDate,
      lastEvaluatedDate: todayStr,
      completedToday: false,
      isBroken: false,
      isRestoredToday: false,
      monthlyCount,
      currentMonthName,
      yearlyCount,
      currentYear,
      restoresRemaining,
      maxRestores,
      testMode: testModeObj
    };
  }

  // daysSinceLast > 1: At least 1 full day was missed! Apply -1 penalty per missed day
  const missedDays = daysSinceLast - 1;
  const penalizedStreak = Math.max(0, storedStreak.currentStreak - missedDays);
  const { restoresRemaining, maxRestores } = resolveRestores(penalizedStreak, storedStreak);

  return {
    currentStreak: penalizedStreak,
    lastDevotionDate: effectiveLastDate,
    lastEvaluatedDate: todayStr,
    completedToday: false,
    isBroken: true,
    missedDays: Math.max(1, missedDays),
    isRestoredToday: false,
    monthlyCount,
    currentMonthName,
    yearlyCount,
    currentYear,
    restoresRemaining,
    maxRestores,
    testMode: testModeObj
  };
}

/**
 * Fetches the user streak directly from Supabase cloud database.
 */
export async function fetchUserStreak(userId: string, history: DevotionEntry[] = []): Promise<DevotionStreakData> {
  const todayStr = getLocalDateString();
  let stored: DevotionStreakData | null = null;

  try {
    const { data, error } = await supabase
      .from("system_settings")
      .select("value")
      .eq("id", `${STREAK_PREFIX}${userId}`)
      .single();

    if (!error && data && data.value) {
      stored = data.value;
    }
  } catch (err) {
    console.error("Error fetching streak from Supabase:", err);
  }

  // Ensure testMode is inactive for standard 24-hour evaluation
  if (stored && stored.testMode) {
    stored.testMode.active = false;
  }

  const evaluated = evaluateStreak(stored, history, todayStr);

  // If evaluated state changed from stored, save back
  if (!stored || stored.currentStreak !== evaluated.currentStreak || stored.completedToday !== evaluated.completedToday || stored.isBroken !== evaluated.isBroken) {
    await saveUserStreak(userId, evaluated);
  }

  return evaluated;
}

/**
 * Saves streak data directly to Supabase cloud database.
 */
export async function saveUserStreak(userId: string, streak: DevotionStreakData): Promise<boolean> {
  if (!userId) return false;

  try {
    const { error } = await supabase
      .from("system_settings")
      .upsert({
        id: `${STREAK_PREFIX}${userId}`,
        value: streak,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error("Failed to save streak to Supabase:", error);
      return false;
    }

    try {
      const channel = supabase.channel(`devotions_realtime_${userId}_broadcast`);
      channel.send({
        type: "broadcast",
        event: "streak_updated",
        payload: { userId, streak }
      });
    } catch {}

    return true;
  } catch (err) {
    console.error("Error saving streak:", err);
    return false;
  }
}

/**
 * Called when a user completes and saves a devotion.
 * In 1-minute test mode: increments streak by 1, starts 60-second timer, turns heart to yellow.
 * In standard mode: increments streak if today was not yet completed.
 */
export async function recordDevotionSaved(
  userId: string, 
  history: DevotionEntry[],
  isTestMode: boolean = false
): Promise<DevotionStreakData> {
  const todayStr = getLocalDateString();
  const currentYear = new Date().getFullYear();
  const currentMonthName = new Date().toLocaleString("en-US", { month: "long" });
  const monthlyCount = calculateMonthlyDevotions(history);
  const yearlyCount = calculateYearlyDevotions(history, currentYear);
  const currentStreakData = await fetchUserStreak(userId, history);

  // 1-minute Test Mode:
  if (isTestMode || currentStreakData.testMode?.active) {
    let nextStreak = currentStreakData.currentStreak + 1;
    let baseRemaining = currentStreakData.restoresRemaining ?? 0;
    let wasRestored = Boolean(currentStreakData.isRestoredToday || currentStreakData.testMode?.isRestored);

    // If broken: use up to missedDays/missedMinutes worth of restores
    if (currentStreakData.isBroken) {
      const daysMissed = Math.max(1, currentStreakData.missedDays || 1);
      const restoresToUse = Math.min(daysMissed, baseRemaining);

      if (restoresToUse > 0) {
        baseRemaining = Math.max(0, baseRemaining - restoresToUse);
        nextStreak = currentStreakData.currentStreak + restoresToUse + 1;
        wasRestored = true;
      } else {
        nextStreak = currentStreakData.currentStreak + 1;
        wasRestored = false;
      }
    }

    const now = Date.now();
    const { restoresRemaining, maxRestores } = resolveRestores(nextStreak, {
      ...currentStreakData,
      restoresRemaining: baseRemaining
    });

    const updated: DevotionStreakData = {
      currentStreak: nextStreak,
      lastDevotionDate: todayStr,
      lastEvaluatedDate: todayStr,
      completedToday: true,
      isBroken: false,
      missedDays: 0,
      isRestoredToday: wasRestored,
      monthlyCount,
      currentMonthName,
      yearlyCount,
      currentYear,
      restoresRemaining,
      maxRestores,
      testMode: {
        active: true,
        lastSavedTimestamp: now,
        baseStreak: nextStreak,
        isRestored: wasRestored,
        missedMinutes: 0
      }
    };
    await saveUserStreak(userId, updated);
    return updated;
  }

  // 24-hour Normal Mode:
  if (currentStreakData.completedToday) {
    const { restoresRemaining, maxRestores } = resolveRestores(currentStreakData.currentStreak, currentStreakData);
    const updated: DevotionStreakData = {
      ...currentStreakData,
      monthlyCount,
      currentMonthName,
      yearlyCount,
      restoresRemaining,
      maxRestores
    };
    await saveUserStreak(userId, updated);
    return updated;
  }

  let nextStreak = currentStreakData.currentStreak + 1;
  let baseRemaining = currentStreakData.restoresRemaining ?? 0;
  let wasRestoredToday = Boolean(
    currentStreakData.isRestoredToday && currentStreakData.lastEvaluatedDate === todayStr
  );

  // Auto-restore error trapping when broken:
  // If user missed multiple days (e.g. 4 days missed):
  // System uses up to Math.min(missedDays, restoresRemaining).
  // Example: 23 - 4 = 19 days. Restores = 2.
  // restoresToUse = min(4, 2) = 2.
  // Restores consumed: 2 (restores become 2 - 2 = 0).
  // Streak becomes: 19 + 2 (restores) + 1 (today) = 22 days!
  if (currentStreakData.isBroken) {
    const daysMissed = Math.max(1, currentStreakData.missedDays || 1);
    const restoresToUse = Math.min(daysMissed, baseRemaining);

    if (restoresToUse > 0) {
      baseRemaining = Math.max(0, baseRemaining - restoresToUse);
      nextStreak = currentStreakData.currentStreak + restoresToUse + 1; // restores recovered + today's devotion (+1)
      wasRestoredToday = true;
    } else {
      nextStreak = currentStreakData.currentStreak + 1; // only today's devotion (+1)
      wasRestoredToday = false;
    }
  }

  const { restoresRemaining, maxRestores } = resolveRestores(nextStreak, {
    ...currentStreakData,
    restoresRemaining: baseRemaining
  });

  const updated: DevotionStreakData = {
    currentStreak: nextStreak,
    lastDevotionDate: todayStr,
    lastEvaluatedDate: todayStr,
    completedToday: true,
    isBroken: false,
    missedDays: 0,
    isRestoredToday: wasRestoredToday,
    monthlyCount,
    currentMonthName,
    yearlyCount,
    currentYear,
    restoresRemaining,
    maxRestores,
    testMode: {
      active: false,
      lastSavedTimestamp: 0,
      baseStreak: nextStreak,
      isRestored: false,
      missedMinutes: 0
    }
  };

  await saveUserStreak(userId, updated);
  return updated;
}

/**
 * Restores a broken streak:
 * - Available only when isBroken === true and restoresRemaining > 0
 * - Increments currentStreak by +1 (recovers the penalty)
 * - Decrements restoresRemaining by 1
 * - Heals heart: isBroken = false, isRestoredToday = true
 * - In test mode: restarts 60s countdown with isRestored = true
 * - In 24h mode: sets isRestoredToday = true, completedToday = false so devotion can still be done today!
 */
export async function restoreUserStreak(
  userId: string, 
  history: DevotionEntry[] = []
): Promise<DevotionStreakData | null> {
  const current = await fetchUserStreak(userId, history);
  if (!current.isBroken || current.restoresRemaining <= 0) {
    return null;
  }

  const todayStr = getLocalDateString();
  const currentYear = new Date().getFullYear();
  const currentMonthName = new Date().toLocaleString("en-US", { month: "long" });
  const monthlyCount = calculateMonthlyDevotions(history);
  const yearlyCount = calculateYearlyDevotions(history, currentYear);

  const nextStreak = current.currentStreak + 1;
  const nextRestoresRemaining = Math.max(0, current.restoresRemaining - 1);
  const maxRestores = getMaxRestoresForStreak(nextStreak);
  const now = Date.now();

  const updated: DevotionStreakData = {
    currentStreak: nextStreak,
    lastDevotionDate: todayStr,
    lastEvaluatedDate: todayStr,
    completedToday: false,
    isBroken: false,
    isRestoredToday: true,
    monthlyCount,
    currentMonthName,
    yearlyCount,
    currentYear,
    restoresRemaining: nextRestoresRemaining,
    maxRestores,
    testMode: current.testMode?.active ? {
      active: true,
      lastSavedTimestamp: now,
      baseStreak: nextStreak,
      isRestored: true
    } : current.testMode
  };

  await saveUserStreak(userId, updated);
  return updated;
}
