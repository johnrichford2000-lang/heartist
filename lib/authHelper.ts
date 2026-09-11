import { supabase } from "./supabase";
import { fetchSystemSetting } from "./fusionSync";

export interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatar: string;
  badge: string;
  team: string;
  isAdmin: boolean;
}

/**
 * Returns the currently authenticated user with their profile from Supabase.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      // Fallback check for transition
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("activeUser");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            return {
              id: parsed.id,
              email: parsed.email || "",
              firstName: parsed.firstName || "",
              lastName: parsed.lastName || "",
              fullName: `${parsed.firstName || ""} ${parsed.lastName || ""}`.trim(),
              avatar: parsed.avatar || "????",
              badge: parsed.badge || "Heart-Seeker",
              team: parsed.team || "none",
              isAdmin: parsed.badge === "Admin" || parsed.badge === "admin"
            };
          } catch {}
        }
      }
      return null;
    }

    // Fetch profile from `profiles` table
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    let adminEmails = await fetchSystemSetting("admin_emails");
    if (typeof adminEmails === "string") {
      try { adminEmails = JSON.parse(adminEmails); } catch {}
    }
    if (!Array.isArray(adminEmails)) adminEmails = ["heartistrichford@gmail.com"];
    const isAdmin = adminEmails.includes(user.email || "") || profile?.badge === "Admin" || profile?.badge === "admin";

    const firstName = profile?.first_name || user.user_metadata?.first_name || "Heartist";
    const lastName = profile?.last_name || user.user_metadata?.last_name || "";
    const fullName = `${firstName} ${lastName}`.trim();

    return {
      id: user.id,
      email: user.email || "",
      firstName,
      lastName,
      fullName,
      avatar: profile?.avatar_url || user.user_metadata?.avatar_url || "????",
      badge: profile?.badge || (isAdmin ? "Admin" : "first-timer"),
      team: profile?.team || "none",
      isAdmin
    };
  } catch (err) {
    console.error("Error in getCurrentUser:", err);
    return null;
  }
}

/**
 * Log out user from Supabase and clear local cache.
 */
export async function logoutUser() {
  await supabase.auth.signOut();
  if (typeof window !== "undefined") {
    localStorage.removeItem("isHeartistLoggedIn");
    localStorage.removeItem("isAdminLoggedIn");
    localStorage.removeItem("activeUser");
    window.location.href = "/login";
  }
}
