import { supabase } from "./supabase";

export const FOUR_WEEKS_MS = 28 * 24 * 60 * 60 * 1000; // 4 weeks = 28 days (~30 days)

/**
 * Formats relative timestamp strictly adhering to user requirements:
 * - < 60 seconds: "just now"
 * - 60 - 119 seconds: "1 minute ago"
 * - 2 - 59 minutes: "X minutes ago"
 * - 60 - 119 minutes: "1 hour ago"
 * - 2 - 23 hours: "X hours ago"
 * - 24 - 47 hours: "1 day ago"
 * - 2 - 6 days: "X days ago"
 * - 7 - 13 days: "1 week ago"
 * - 14 - 27 days: "X weeks ago" (2 or 3 weeks ago)
 * - >= 28 days: "4 weeks ago" (Threshold for automatic purge)
 */
export function formatTimeAgo(timestamp: any): string {
  if (!timestamp) return "just now";
  let ts = Number(timestamp);
  if (isNaN(ts) || ts <= 0) {
    if (typeof timestamp === "string") {
      const parsed = Date.parse(timestamp);
      if (!isNaN(parsed) && parsed > 0) {
        ts = parsed;
      } else {
        return "just now";
      }
    } else {
      return "just now";
    }
  }

  const diff = Math.max(0, Date.now() - ts);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  // 1. Less than 60 seconds
  if (seconds < 60) return "just now";

  // 2. Greater than 60 seconds (1 minute)
  if (minutes === 1) return "1 minute ago";

  // 3. 2-59 minutes
  if (minutes >= 2 && minutes < 60) return `${minutes} minutes ago`;

  // 4. Exactly 60 minutes (1 hour)
  if (hours === 1) return "1 hour ago";

  // 5. 2-23 hours
  if (hours >= 2 && hours < 24) return `${hours} hours ago`;

  // 6. 24 hours (1 day)
  if (days === 1) return "1 day ago";

  // 7. 2-6 days
  if (days >= 2 && days <= 6) return `${days} days ago`;

  // 8. 7 days (1 week)
  if (weeks === 1) return "1 week ago";

  // 9. 2-3 weeks
  if (weeks >= 2 && weeks <= 3) return `${weeks} weeks ago`;

  // 10. 4 weeks or more (auto-cleanup threshold)
  return `${weeks} weeks ago`;
}

/**
 * Returns true if the notification is 4 weeks (28 days) or older.
 */
export function isNotificationExpired(timestamp: any): boolean {
  if (!timestamp) return false;
  let ts = Number(timestamp);
  if (isNaN(ts) || ts <= 0) {
    if (typeof timestamp === "string") {
      const parsed = Date.parse(timestamp);
      if (!isNaN(parsed) && parsed > 0) {
        ts = parsed;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }
  return (Date.now() - ts) >= FOUR_WEEKS_MS;
}

/**
 * Ensures notification messages are always displayed in clean, human-readable English
 * and NEVER as raw JSON strings.
 */
export function formatNotificationMessage(msg: any): string {
  if (!msg) return "";
  if (typeof msg === "object") {
    if (msg.message && typeof msg.message === "string") return formatNotificationMessage(msg.message);
    if (msg.text && typeof msg.text === "string") return formatNotificationMessage(msg.text);
    if (msg.type === "team_add" || msg.type === "team_update") {
      return msg.team && msg.team !== "none" ? `Assigned to Team ${msg.team}` : "Removed from team";
    }
    if (msg.type === "team_remove") return "Removed from team";
    if (msg.type === "badge_update") return `Assigned role badge: ${msg.badgeLabel || msg.badge}`;
    if (msg.postContent) return String(msg.postContent);
    if (msg.content) {
      if (typeof msg.content === "string") return formatNotificationMessage(msg.content);
      if (msg.content.text) return formatNotificationMessage(msg.content.text);
      if (msg.content.action) return String(msg.content.action);
    }
    return "";
  }

  if (typeof msg === "string") {
    const trimmed = msg.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        return formatNotificationMessage(parsed);
      } catch (e) {
        return trimmed;
      }
    }
    return trimmed;
  }

  return String(msg);
}

/**
 * Automatically purges notifications older than 4 weeks (28 days) from:
 * 1. Supabase 'notifications' table
 * 2. localStorage 'communityNotifications'
 * 3. localStorage 'fusionInbox'
 */
export async function purgeExpiredNotifications(): Promise<void> {
  const cutoffTime = Date.now() - FOUR_WEEKS_MS;
  const cutoffIso = new Date(cutoffTime).toISOString();

  // 1. Delete from Supabase
  try {
    await supabase.from("notifications").delete().lt("created_at", cutoffIso);
  } catch (err) {
    console.error("Failed to purge expired Supabase notifications:", err);
  }

  // 2. Clean localStorage
  if (typeof window !== "undefined") {
    try {
      const localNotifs = JSON.parse(localStorage.getItem("communityNotifications") || "[]");
      const filteredNotifs = localNotifs.filter((n: any) => {
        const t = Number(n.timestamp) || (n.created_at ? new Date(n.created_at).getTime() : 0);
        return t > 0 && t > cutoffTime;
      });
      localStorage.setItem("communityNotifications", JSON.stringify(filteredNotifs));
    } catch (e) {}

    try {
      const inboxData = JSON.parse(localStorage.getItem("fusionInbox") || "{}");
      let modified = false;
      for (const k in inboxData) {
        if (Array.isArray(inboxData[k])) {
          const prevLen = inboxData[k].length;
          inboxData[k] = inboxData[k].filter((m: any) => {
            const t = Number(m.timestamp) || (m.created_at ? new Date(m.created_at).getTime() : 0);
            return t > 0 && t > cutoffTime;
          });
          if (inboxData[k].length !== prevLen) modified = true;
        }
      }
      if (modified) {
        localStorage.setItem("fusionInbox", JSON.stringify(inboxData));
      }
    } catch (e) {}
  }
}
