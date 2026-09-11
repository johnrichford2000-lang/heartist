import { supabase } from "./supabase";

const broadcastChannel = supabase.channel('public-notifications');
broadcastChannel.subscribe();

export interface Notification {
  id: string;
  sender_id: string;
  sender_name: string;
  recipient_id: string;
  type: string; // 'message', 'alert', 'penalty', 'appeal'
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
  try {
     broadcastChannel.send({ type: 'broadcast', event: 'new_notif', payload: insertedNotif });
  } catch(e) {}
  
  return insertedNotif;
};

export const markNotificationRead = async (id: string) => {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);
  
  if (error) {
    console.error("Error marking notification read:", error);
  }
};

export const markAllNotificationsRead = async (userId: string) => {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("recipient_id", userId);
  
  if (error) {
    console.error("Error marking all read:", error);
  }
};

export const deleteNotification = async (id: string) => {
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", id);
  
  if (error) {
    console.error("Error deleting notification:", error);
  }
};

// Helper to bridge local storage notification format to Supabase Database
export const dispatchNotification = async (notifLocal: any) => {
  const recipient_id = notifLocal.userId || notifLocal.postAuthor || "everyone";
  const type = notifLocal.type || "MESSAGE";
  const sender_name = notifLocal.sourceName || "System";
  const sender_id = notifLocal.senderId || "system";
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
  
  // Broadcast realtime for immediate UI update (like badges)
  try {
     broadcastChannel.send({ type: 'broadcast', event: 'new_notif', payload: notifLocal });
  } catch(e) {}
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
