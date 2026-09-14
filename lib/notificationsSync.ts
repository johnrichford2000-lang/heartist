import { supabase } from "./supabase";

// Shared Supabase Realtime channel for notifications
let supabaseRealtimeChannel: any = null;
const getSupabaseBroadcastChannel = () => {
  if (!supabaseRealtimeChannel) {
    supabaseRealtimeChannel = supabase.channel('public-notifications');
    supabaseRealtimeChannel.subscribe();
  }
  return supabaseRealtimeChannel;
};

// Web BroadcastChannel for instant, zero-latency same-browser sync
let webBroadcastChannel: any = null;
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    webBroadcastChannel = new window.BroadcastChannel("heartist_notifs_sync");
  } catch (e) {
    console.error("BroadcastChannel error:", e);
  }
}

/**
 * Broadcasts a notification across tabs (Web BroadcastChannel), across devices (Supabase),
 * and inside the current window (CustomEvent & storage).
 */
export const broadcastNotification = (payload: any) => {
  // 1. Instant local window event
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("heartist_notification_event", { detail: payload }));
      window.dispatchEvent(new Event("storage"));
    } catch (e) {}
  }

  // 2. Inter-tab same browser sync (0ms latency)
  if (webBroadcastChannel) {
    try {
      webBroadcastChannel.postMessage(payload);
    } catch (e) {}
  }

  // 3. Supabase Realtime Broadcast across devices
  try {
    const chan = getSupabaseBroadcastChannel();
    chan.send({
      type: 'broadcast',
      event: 'new_notif',
      payload: payload
    });
  } catch (e) {}
};

export interface Notification {
  id: string;
  sender_id: string;
  sender_name: string;
  recipient_id: string;
  type: string; // 'message', 'alert', 'penalty', 'appeal', etc.
  message: string;
  is_read: boolean;
  post_id?: string;
  created_at: string;
}

export const fetchNotifications = async (userId: string) => {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
  return data as Notification[];
};

export const createNotification = async (notif: Omit<Notification, "id" | "created_at" | "is_read">) => {
  const { data, error } = await supabase
    .from("notifications")
    .insert([notif])
    .select();

  if (error) {
    console.error("Error creating notification:", error);
    return null;
  }
  
  const insertedNotif = data[0] as Notification;
  
  // Broadcast for real-time UI updates
  broadcastNotification(insertedNotif);
  
  return insertedNotif;
};

export const markNotificationRead = async (id: string) => {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);
  
  if (error) {
    console.error("Error marking notification read:", error);
  } else {
    broadcastNotification({ type: 'notification_read', id });
  }
};

export const markAllNotificationsRead = async (userIdOrIds: string | string[]) => {
  const ids = Array.isArray(userIdOrIds) ? userIdOrIds : [userIdOrIds];
  if (ids.length === 0) return;

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .in("recipient_id", ids)
    .eq("is_read", false);
  
  if (error) {
    console.error("Error marking all read:", error);
  } else {
    broadcastNotification({ type: 'mark_all_read', recipient_ids: ids });
  }
};

export const deleteNotification = async (id: string) => {
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", id);
  
  if (error) {
    console.error("Error deleting notification:", error);
  } else {
    broadcastNotification({ type: 'notification_deleted', id });
  }
};

// Helper to bridge local storage notification format to Supabase Database
export const dispatchNotification = async (notifLocal: any) => {
  const recipient_id = notifLocal.userId || notifLocal.postAuthor || "everyone";
  const type = notifLocal.type || "MESSAGE";
  const sender_name = notifLocal.sourceName || notifLocal.fromUser || "System";
  const sender_id = notifLocal.senderId || notifLocal.fromUser || "system";
  const message = JSON.stringify(notifLocal);

  const dbNotif = {
    sender_id,
    sender_name,
    recipient_id,
    type,
    message,
    post_id: notifLocal.postId ? String(notifLocal.postId) : undefined,
  };
  
  await createNotification(dbNotif);
  
  // Run auto-cleanup to prevent storage bloat
  if (recipient_id !== "everyone") {
    autoCleanupNotifications(recipient_id);
  }
  
  // Broadcast local payload fields as well (for instant badge / client sync)
  broadcastNotification(notifLocal);
};

export const autoCleanupNotifications = async (userId: string) => {
  if (!userId) return;
  try {
    // 1. Delete notifications older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    await supabase
      .from('notifications')
      .delete()
      .eq('recipient_id', userId)
      .lt('created_at', thirtyDaysAgo.toISOString());

    // 2. Keep only the 50 most recent notifications
    const { data } = await supabase
      .from('notifications')
      .select('id')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false });
      
    if (data && data.length > 50) {
      const idsToDelete = data.slice(50).map(n => n.id);
      await supabase
        .from('notifications')
        .delete()
        .in('id', idsToDelete);
    }
  } catch (e) {
    console.error('Error in auto cleanup:', e);
  }
};
