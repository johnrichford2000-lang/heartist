import { supabase } from "./supabase";

export interface Report {
  id: string;
  reporter_id: string;
  reporter_name: string;
  post_id?: string;
  prayer_id?: string;
  reason: string;
  status: string; // 'pending', 'reviewed', 'dismissed'
  created_at: string;
}

export interface Appeal {
  id: string;
  user_id: string;
  user_name: string;
  reason: string;
  status: string; // 'pending', 'approved', 'rejected'
  created_at: string;
}

export interface Penalty {
  id: string;
  user_id: string;
  type: string; // 'cooldown', 'blocked'
  reason?: string;
  expires_at?: string;
  created_at: string;
}

// --- Reports ---
export const fetchReports = async () => {
  const { data, error } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
  return error ? [] : (data as Report[]);
};

export const createReport = async (report: Omit<Report, "id" | "created_at" | "status">) => {
  const { data, error } = await supabase.from("reports").insert([report]).select();
  return error ? null : (data[0] as Report);
};

export const updateReportStatus = async (id: string, status: string) => {
  await supabase.from("reports").update({ status }).eq("id", id);
};

// --- Appeals ---
export const fetchAppeals = async () => {
  const { data, error } = await supabase.from("appeals").select("*").order("created_at", { ascending: false });
  return error ? [] : (data as Appeal[]);
};

export const createAppeal = async (appeal: Omit<Appeal, "id" | "created_at" | "status">) => {
  const { data, error } = await supabase.from("appeals").insert([appeal]).select();
  return error ? null : (data[0] as Appeal);
};

export const updateAppealStatus = async (id: string, status: string) => {
  await supabase.from("appeals").update({ status }).eq("id", id);
};

// --- Penalties ---
export const fetchPenalties = async () => {
  const { data, error } = await supabase.from("penalties").select("*");
  return error ? [] : (data as Penalty[]);
};

export const fetchUserPenalty = async (userId: string, type: string) => {
  const { data, error } = await supabase
    .from("penalties")
    .select("*")
    .eq("user_id", userId)
    .eq("type", type)
    .order("created_at", { ascending: false })
    .limit(1);
    
  return error || data.length === 0 ? null : (data[0] as Penalty);
};

export const createPenalty = async (penalty: Omit<Penalty, "id" | "created_at">) => {
  const { data, error } = await supabase.from("penalties").insert([penalty]).select();
  return error ? null : (data[0] as Penalty);
};

export const deletePenalty = async (id: string) => {
  await supabase.from("penalties").delete().eq("id", id);
};

export const deletePenaltyByUserId = async (userId: string) => {
  await supabase.from("penalties").delete().eq("user_id", userId);
};

// --- Profiles Ban Status ---
export const updateUserBanStatus = async (userId: string, isBanned: boolean, bannedUntil: string | null = null, banReason: string | null = null) => {
  let { data } = await supabase.from("profiles").select("id").eq("id", userId);
  
  if (!data || data.length === 0) {
    const { data: nameData } = await supabase.from("profiles").select("id").eq("first_name", userId);
    if (nameData && nameData.length > 0) {
      await supabase.from("profiles").update({ 
        is_banned: isBanned, 
        banned_until: bannedUntil,
        ban_reason: banReason 
      }).eq("id", nameData[0].id);
      return;
    }
  }

  // Update profile by UUID
  await supabase.from("profiles").update({ 
    is_banned: isBanned, 
    banned_until: bannedUntil,
    ban_reason: banReason 
  }).eq("id", userId);
};

export const fetchUserBanStatus = async (userId: string) => {
  let { data } = await supabase.from("profiles").select("id, is_banned, banned_until, ban_reason, warning_count").eq("id", userId).single();
  if (!data) {
     const { data: nameData } = await supabase.from("profiles").select("id, is_banned, banned_until, ban_reason, warning_count").eq("first_name", userId).single();
     if (nameData) data = nameData;
  }
  
  if (data) {
     const { data: penalty } = await supabase.from("penalties").select("expires_at").eq("user_id", data.id).eq("type", "cooldown").order("expires_at", { ascending: false }).limit(1).single();
     if (penalty && penalty.expires_at) {
        const pTime = new Date(penalty.expires_at).getTime();
        const bTime = data.banned_until ? new Date(data.banned_until).getTime() : 0;
        if (pTime > bTime && pTime > Date.now()) {
           data.banned_until = penalty.expires_at;
        }
     }
  }
  
  return data;
};

// --- Deletions ---
export const deleteReport = async (id: string) => {
  await supabase.from("reports").delete().eq("id", id);
};

export const deleteAppeal = async (id: string) => {
  await supabase.from("appeals").delete().eq("id", id);
};

// --- Warnings ---
export const fetchWarnings = async () => {
  const { data, error } = await supabase.from("warnings").select("*");
  return error ? [] : (data as any[]);
};

export const createWarning = async (warning: { post_id: string, user_id: string }) => {
  const { data, error } = await supabase.from("warnings").insert([warning]).select();
  return error ? null : data[0];
};

export const deleteWarning = async (postId: string) => {
  await supabase.from("warnings").delete().eq("post_id", postId);
};

export const incrementWarningCount = async (userId: string) => {
  // We need to fetch current and increment
  const status = await fetchUserBanStatus(userId);
  if (status) {
    const current = status.warning_count || 0;
    
    // Fallback ID or Name lookup
    let { data: checkId } = await supabase.from("profiles").select("id").eq("id", userId);
    if (!checkId || checkId.length === 0) {
       await supabase.from("profiles").update({ warning_count: current + 1 }).eq("first_name", userId);
    } else {
       await supabase.from("profiles").update({ warning_count: current + 1 }).eq("id", userId);
    }
  }
};
