import { supabase } from "./supabase";

export interface DevotionEntry {
  id: string;
  title: string;
  date: string;
  text: string;
  method?: string;
  timestamp?: number;
  image?: string;
}

const MONTH_NAMES = [
  "Jan.", "Feb.", "Mar.", "Apr.", "May", "June", 
  "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."
];

/**
 * Formats any date into clean user-requested style (e.g. "Sept. 30, 2026")
 */
export function formatDevotionDate(dateInput?: Date | string): string {
  if (!dateInput) {
    const now = new Date();
    return `${MONTH_NAMES[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  }

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    if (typeof dateInput === "string" && dateInput.trim()) {
      return dateInput;
    }
    const now = new Date();
    return `${MONTH_NAMES[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  }

  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

const SETTING_PREFIX = "user_devotions_";

/**
 * Fetches all devotion journal entries for a given user from Supabase cloud.
 * Reads from `system_settings` table (key: `user_devotions_${userId}`),
 * with graceful fallback to `forms` table if not initialized yet.
 */
export async function fetchUserDevotions(userId: string): Promise<DevotionEntry[]> {
  if (!userId) return [];

  try {
    // 1. Primary: fetch from system_settings where full CRUD is supported
    const { data: settingData, error: settingError } = await supabase
      .from("system_settings")
      .select("value")
      .eq("id", `${SETTING_PREFIX}${userId}`)
      .single();

    if (!settingError && settingData && Array.isArray(settingData.value)) {
      return settingData.value.map((item: any) => ({
        id: item.id || `dev-${item.timestamp || Date.now()}`,
        title: item.title || formatDevotionDate(item.date),
        date: formatDevotionDate(item.date),
        text: item.text || "",
        method: item.method || "default",
        timestamp: item.timestamp || (item.date ? new Date(item.date).getTime() : Date.now()),
        image: item.image || undefined
      }));
    }

    // 2. Fallback: check legacy `forms` table if system_settings has not been initialized yet
    const { data: formsData } = await supabase
      .from("forms")
      .select("*")
      .eq("type", "DEVOTION")
      .eq("user_id", userId)
      .neq("status", "deleted")
      .order("created_at", { ascending: false });

    if (formsData && formsData.length > 0) {
      const migrated: DevotionEntry[] = formsData.map((f: any) => ({
        id: f.id,
        title: f.data?.title?.trim() ? f.data.title.trim() : formatDevotionDate(f.data?.date || f.created_at),
        date: formatDevotionDate(f.data?.date || f.created_at),
        text: f.data?.text || "",
        method: f.data?.method || "default",
        timestamp: new Date(f.created_at).getTime(),
        image: f.data?.image || undefined
      }));

      // Initialize system_settings entry with the migrated records
      await supabase
        .from("system_settings")
        .upsert({
          id: `${SETTING_PREFIX}${userId}`,
          value: migrated,
          updated_at: new Date().toISOString()
        });

      return migrated;
    }

    return [];
  } catch (err) {
    console.error("Failed to fetch devotions:", err);
    return [];
  }
}

/**
 * Saves or updates a devotion journal entry in Supabase cloud.
 */
export async function saveUserDevotion(
  userId: string, 
  date: string, 
  text: string, 
  title?: string,
  method: string = "default",
  entryId?: string | null,
  image?: string | null
): Promise<boolean> {
  if (!userId || (!text.trim() && !image)) return false;

  const formattedDate = formatDevotionDate(date);
  const finalTitle = title?.trim() ? title.trim() : formattedDate;

  try {
    const currentList = await fetchUserDevotions(userId);
    const now = Date.now();
    let updatedList: DevotionEntry[];

    if (entryId) {
      // Update existing entry by ID
      const index = currentList.findIndex(item => item.id === entryId);
      if (index >= 0) {
        updatedList = [...currentList];
        updatedList[index] = {
          ...updatedList[index],
          title: finalTitle,
          date: formattedDate,
          text: text || (image ? "(Photo Reflection)" : ""),
          method,
          timestamp: now,
          image: image !== undefined ? (image || undefined) : updatedList[index].image
        };
      } else {
        updatedList = [
          { id: entryId, title: finalTitle, date: formattedDate, text: text || (image ? "(Photo Reflection)" : ""), method, timestamp: now, image: image || undefined },
          ...currentList
        ];
      }
    } else {
      // Check if entry for the exact same date already exists
      const existingDateIndex = currentList.findIndex(item => item.date === formattedDate);
      if (existingDateIndex >= 0) {
        updatedList = [...currentList];
        updatedList[existingDateIndex] = {
          ...updatedList[existingDateIndex],
          title: finalTitle,
          text: text || (image ? "(Photo Reflection)" : ""),
          method,
          timestamp: now,
          image: image !== undefined ? (image || undefined) : updatedList[existingDateIndex].image
        };
      } else {
        const newEntry: DevotionEntry = {
          id: `dev-${now}-${Math.random().toString(36).substring(2, 7)}`,
          title: finalTitle,
          date: formattedDate,
          text: text || (image ? "(Photo Reflection)" : ""),
          method,
          timestamp: now,
          image: image || undefined
        };
        updatedList = [newEntry, ...currentList];
      }
    }

    // Persist to Supabase cloud
    const { error } = await supabase
      .from("system_settings")
      .upsert({
        id: `${SETTING_PREFIX}${userId}`,
        value: updatedList,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error("Error saving devotion to system_settings:", error);
      return false;
    }

    notifyDevotionUpdate(userId);
    return true;
  } catch (err) {
    console.error("Failed to save devotion:", err);
    return false;
  }
}

/**
 * Permanently deletes a devotion entry from Supabase cloud.
 */
export async function deleteUserDevotion(id: string, userId: string): Promise<boolean> {
  if (!id || !userId) return false;

  try {
    const currentList = await fetchUserDevotions(userId);
    const updatedList = currentList.filter(item => item.id !== id);

    // Save updated list back to Supabase cloud
    const { error } = await supabase
      .from("system_settings")
      .upsert({
        id: `${SETTING_PREFIX}${userId}`,
        value: updatedList,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error("Error deleting devotion from system_settings:", error);
      return false;
    }

    notifyDevotionUpdate(userId);
    return true;
  } catch (err) {
    console.error("Failed to delete devotion:", err);
    return false;
  }
}

function notifyDevotionUpdate(userId: string) {
  try {
    const channel = supabase.channel(`devotions_realtime_${userId}_broadcast`);
    channel.send({
      type: "broadcast",
      event: "devotions_updated",
      payload: { userId, timestamp: Date.now() }
    });
  } catch {}
}

export async function migrateLocalDevotions(userId: string): Promise<number> {
  if (typeof window === "undefined" || !userId) return 0;

  try {
    const local = localStorage.getItem("devotionHistory");
    if (!local) return 0;

    let entries: { date: string; text: string; title?: string; method?: string }[] = [];
    try {
      entries = JSON.parse(local);
    } catch {
      return 0;
    }

    if (!Array.isArray(entries) || entries.length === 0) return 0;

    let migratedCount = 0;
    for (const entry of entries) {
      if (entry.text) {
        const ok = await saveUserDevotion(userId, entry.date, entry.text, entry.title, entry.method || "default");
        if (ok) migratedCount++;
      }
    }

    localStorage.removeItem("devotionHistory");
    return migratedCount;
  } catch (err) {
    console.error("Error migrating local devotions:", err);
    return 0;
  }
}